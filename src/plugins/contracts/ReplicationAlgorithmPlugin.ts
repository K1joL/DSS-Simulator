import { AlgorithmReaction } from './AlgorithmReaction';
import { PluginContext } from './PluginContext';
import { TrafficEmission } from './TrafficEmission';

export interface VmFailureEvent {
  timeMs: number;
  vmId: string;
}

export interface VmRecoveryEvent {
  timeMs: number;
  vmId: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export interface ReplicationAlgorithmPlugin<TConfig = unknown> {
  id: string;
  name: string;
  version: string;
  description: string;
  getDefaultConfig(): TConfig;
  validateConfig(config: TConfig): ValidationResult;
  onSimulationStart(ctx: PluginContext<TConfig>): void;
  emitBackgroundTraffic(ctx: PluginContext<TConfig>, nowMs: number): TrafficEmission[];
  onVmFailure(ctx: PluginContext<TConfig>, event: VmFailureEvent): AlgorithmReaction;
  onVmRecovery?(ctx: PluginContext<TConfig>, event: VmRecoveryEvent): AlgorithmReaction;
  estimateRto(ctx: PluginContext<TConfig>, event: VmFailureEvent): number;
  estimateRpo(ctx: PluginContext<TConfig>, event: VmFailureEvent): number;
}
