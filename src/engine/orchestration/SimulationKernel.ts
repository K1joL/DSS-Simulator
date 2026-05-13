import { Cluster } from '../../domain/cluster/entities/Cluster';
import { VMState } from '../../domain/cluster/enums/VMState';
import { QueueNetworkSolver } from '../queue-network/QueueNetworkSolver';
import { DefaultTrafficGenerator } from '../traffic/TrafficGenerator';
import { FailureEngine } from '../failures/FailureEngine';
import { MetricsCollector, MetricsSnapshot } from '../metrics/MetricsCollector';
import { RandomProvider } from '../rng/RandomProvider';
import { ReplicationAlgorithmPlugin } from '../../plugins/contracts/ReplicationAlgorithmPlugin';

export interface ExperimentConfig {
  seed: number;
  durationMs: number;
  stepMs: number;
  autoFailureProbabilityPerStep: number;
  algorithmConfig: unknown;
}

export class SimulationKernel {
  private nowMs = 0;
  private initialized = false;
  private readonly queueSolver: QueueNetworkSolver;
  private readonly trafficGenerator: DefaultTrafficGenerator;
  private readonly failureEngine: FailureEngine;
  private readonly metricsCollector: MetricsCollector;

  constructor(
    private readonly cluster: Cluster,
    private readonly rng: RandomProvider,
    private readonly plugin: ReplicationAlgorithmPlugin<unknown>,
    private readonly config: ExperimentConfig
  ) {
    this.queueSolver = new QueueNetworkSolver(cluster);
    this.trafficGenerator = new DefaultTrafficGenerator(cluster, plugin, config.algorithmConfig, rng);
    this.failureEngine = new FailureEngine(cluster, rng, config.autoFailureProbabilityPerStep);
    this.metricsCollector = new MetricsCollector();
  }

  initialize(): void {
    this.initialized = true;
    this.plugin.onSimulationStart({ nowMs: this.nowMs, config: this.config.algorithmConfig, cluster: { nowMs: this.nowMs, busQueueLength: this.cluster.bus.queueLength, failedVmIds: [] }, rng: this.rng });
  }

  step(): { nowMs: number; snapshot: MetricsSnapshot } {
    if (!this.initialized) throw new Error('Kernel not initialized');
    this.nowMs += this.config.stepMs;
    const emissions = this.trafficGenerator.generate(this.nowMs, this.config.stepMs);
    const enqueueResult = this.queueSolver.enqueueBusTraffic(emissions);
    const busServeResult = this.queueSolver.serveBus(this.config.stepMs);
    const dispatchResult = this.queueSolver.dispatchToVmQueues(busServeResult.servedPackets);
    const vmServeResult = this.queueSolver.serveVmQueues(this.config.stepMs);

    let lastRto: number | undefined;
    let lastRpo: number | undefined;
    const failures = this.failureEngine.evaluate(this.nowMs);
    for (const failure of failures) {
      const reaction = this.plugin.onVmFailure({
        nowMs: this.nowMs,
        config: this.config.algorithmConfig,
        cluster: {
          nowMs: this.nowMs,
          busQueueLength: this.cluster.bus.queueLength,
          failedVmIds: this.cluster.vms.filter(v => v.state === VMState.FAILED).map(v => v.id),
        },
        rng: this.rng,
      }, { timeMs: failure.timeMs, vmId: failure.vmId });
      if (reaction.extraTraffic.length > 0) this.queueSolver.enqueueBusTraffic(reaction.extraTraffic);
      if (reaction.migrations.length > 0) {
        lastRto = reaction.migrations[0].estimatedRtoMs;
        lastRpo = reaction.migrations[0].estimatedRpoMs;
      }
    }

    const totalDropped = enqueueResult.droppedPackets + dispatchResult.droppedAtVmPackets;
    const lossPercent = enqueueResult.arrivedPackets > 0 ? (totalDropped / enqueueResult.arrivedPackets) * 100 : 0;
    const throughputPps = Math.floor((vmServeResult.servedPackets * 1000) / this.config.stepMs);

    const snapshot: MetricsSnapshot = {
      timeMs: this.nowMs,
      arrivedPackets: enqueueResult.arrivedPackets,
      servedBusPackets: busServeResult.servedPackets,
      servedVmPackets: vmServeResult.servedPackets,
      droppedBusPackets: enqueueResult.droppedPackets,
      droppedVmPackets: dispatchResult.droppedAtVmPackets,
      busQueueLength: this.cluster.bus.queueLength,
      avgVmQueueLength: vmServeResult.avgVmQueueLength,
      throughputPps,
      lossPercent,
      rtoMs: lastRto,
      rpoMs: lastRpo,
    };
    this.metricsCollector.record(snapshot);
    return { nowMs: this.nowMs, snapshot };
  }

  runToEnd(): MetricsSnapshot[] {
    const result: MetricsSnapshot[] = [];
    while (this.nowMs < this.config.durationMs) result.push(this.step().snapshot);
    return result;
  }

  getMetricsCollector(): MetricsCollector { return this.metricsCollector; }
  getNowMs(): number { return this.nowMs; }
}
