import { Cluster } from '../../domain/cluster/entities/Cluster';
import { Bus } from '../../domain/cluster/entities/Bus';
import { CommunicationModule } from '../../domain/cluster/entities/CommunicationModule';
import { FunctionUnit } from '../../domain/cluster/entities/FunctionUnit';
import { VirtualMachine } from '../../domain/cluster/entities/VirtualMachine';
import { TrafficClass } from '../../domain/cluster/enums/TrafficClass';
import { SeededRandomProvider } from '../../engine/rng/SeededRandomProvider';
import { FailureEngine } from '../../engine/failures/FailureEngine';
import { RecoveryEngine } from '../../engine/recovery/RecoveryEngine';
import { SimulationKernel, ExperimentConfig as KernelExperimentConfig } from '../../engine/orchestration/SimulationKernel';
import { SimulationOrchestrator } from '../../engine/orchestration/SimulationOrchestrator';
import { AlgorithmRegistry } from '../../plugins/registry/AlgorithmRegistry';
import { validateExperimentConfig } from '../../infrastructure/validation/experimentSchema';

export interface FunctionConfigInput { id: string; name: string; trafficClass: TrafficClass; baseTrafficPps: number; contextSizeKb: number; }
export interface VmConfigInput { id: string; localQueueCapacity: number; serviceRatePps: number; functions: FunctionConfigInput[]; }
export interface KmConfigInput { id: string; svFlows: number; svRatePerFlowPps: number; enabled?: boolean; }
export interface ExperimentConfigInput extends KernelExperimentConfig {
  algorithmId: string;
  bus: { capacityPackets: number; serviceRatePps: number; };
  kms: KmConfigInput[];
  vms: VmConfigInput[];
}

export class ExperimentService {
  constructor(private readonly registry: AlgorithmRegistry) {}
  createOrchestrator(config: ExperimentConfigInput): SimulationOrchestrator {
    const validation = validateExperimentConfig(config);
    if (!validation.ok) throw new Error(`Invalid experiment config: ${validation.errors.join('; ')}`);
    const bus = new Bus(config.bus.capacityPackets, config.bus.serviceRatePps);
    const kms = config.kms.map(km => new CommunicationModule(km.id, km.svFlows, km.svRatePerFlowPps, km.enabled ?? true));
    const vms = config.vms.map(vmConfig => {
      const vm = new VirtualMachine(vmConfig.id, vmConfig.localQueueCapacity, vmConfig.serviceRatePps);
      vmConfig.functions.forEach(fn => vm.assignFunction(new FunctionUnit(fn.id, fn.name, fn.trafficClass, fn.baseTrafficPps, fn.contextSizeKb)));
      return vm;
    });
    const cluster = new Cluster('cluster-1', bus, kms, vms);
    const rng = new SeededRandomProvider(config.seed);
    const plugin = this.registry.getById(config.algorithmId);
    const kernel = new SimulationKernel(cluster, rng, plugin, config);
    const failureEngine = new FailureEngine(cluster, rng, config.autoFailureProbabilityPerStep);
    const recoveryEngine = new RecoveryEngine(cluster);
    return new SimulationOrchestrator(cluster, kernel, failureEngine, recoveryEngine);
  }
}
