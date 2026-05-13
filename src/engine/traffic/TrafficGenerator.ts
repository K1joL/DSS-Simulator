import { Cluster } from '../../domain/cluster/entities/Cluster';
import { VMState } from '../../domain/cluster/enums/VMState';
import { PacketKind } from '../../domain/cluster/enums/PacketKind';
import { TrafficEmission } from '../../plugins/contracts/TrafficEmission';
import { ReplicationAlgorithmPlugin } from '../../plugins/contracts/ReplicationAlgorithmPlugin';
import { PluginContext } from '../../plugins/contracts/PluginContext';
import { RandomProvider } from '../rng/RandomProvider';

export interface TrafficGenerator { generate(nowMs: number, stepMs: number): TrafficEmission[]; }

export class DefaultTrafficGenerator implements TrafficGenerator {
  constructor(
    private readonly cluster: Cluster,
    private readonly plugin: ReplicationAlgorithmPlugin<unknown>,
    private readonly pluginConfig: unknown,
    private readonly rng: RandomProvider
  ) {}

  generate(nowMs: number, stepMs: number): TrafficEmission[] {
    const emissions: TrafficEmission[] = [];
    for (const km of this.cluster.kms) {
      if (!km.enabled) continue;
      const packets = Math.floor((km.svFlows * km.svRatePerFlowPps * stepMs) / 1000);
      if (packets > 0) emissions.push({ timeMs: nowMs, sourceId: km.id, packetKind: PacketKind.SV, packets });
    }
    for (const vm of this.cluster.vms) {
      if (vm.state !== VMState.ACTIVE) continue;
      const functionPackets = vm.functions.reduce((sum, fn) => sum + Math.floor((fn.baseTrafficPps * stepMs) / 1000), 0);
      if (functionPackets > 0) emissions.push({ timeMs: nowMs, sourceId: vm.id, packetKind: PacketKind.FUNCTION, packets: functionPackets });
    }
    const pluginCtx: PluginContext<unknown> = {
      nowMs,
      config: this.pluginConfig,
      cluster: {
        nowMs,
        busQueueLength: this.cluster.bus.queueLength,
        failedVmIds: this.cluster.vms.filter(v => v.state === VMState.FAILED).map(v => v.id),
      },
      rng: this.rng,
    };
    emissions.push(...this.plugin.emitBackgroundTraffic(pluginCtx, nowMs));
    return emissions.filter(e => e.packets > 0);
  }
}
