import { ReplicationAlgorithmPlugin, ValidationResult, VmFailureEvent, VmRecoveryEvent } from '../../contracts/ReplicationAlgorithmPlugin';
import { PluginContext } from '../../contracts/PluginContext';
import { AlgorithmReaction } from '../../contracts/AlgorithmReaction';
import { TrafficEmission } from '../../contracts/TrafficEmission';
import { PacketKind } from '../../../domain/cluster/enums/PacketKind';
import { LazyCheckpointConfig } from './LazyCheckpointConfig';

export class LazyCheckpointPlugin implements ReplicationAlgorithmPlugin<LazyCheckpointConfig> {
  readonly id = 'lazy-checkpoint';
  readonly name = 'Lazy Checkpoint';
  readonly version = '1.0.0';
  readonly description = 'Low background traffic with heavier failover burst and larger expected RPO';
  getDefaultConfig(): LazyCheckpointConfig { return { heartbeatPacketsPerStep: 2, checkpointPacketsOnFailure: 260, baseRtoMs: 320, assumedRpoMs: 900 }; }
  validateConfig(config: LazyCheckpointConfig): ValidationResult {
    const errors: string[] = [];
    if (config.heartbeatPacketsPerStep < 0) errors.push('heartbeatPacketsPerStep must be >= 0');
    if (config.checkpointPacketsOnFailure < 0) errors.push('checkpointPacketsOnFailure must be >= 0');
    if (config.baseRtoMs < 0) errors.push('baseRtoMs must be >= 0');
    if (config.assumedRpoMs < 0) errors.push('assumedRpoMs must be >= 0');
    return { ok: !errors.length, errors };
  }
  onSimulationStart(_ctx: PluginContext<LazyCheckpointConfig>): void {}
  emitBackgroundTraffic(ctx: PluginContext<LazyCheckpointConfig>, nowMs: number): TrafficEmission[] {
    return [{ timeMs: nowMs, sourceId: 'lazy-checkpoint-plugin', packetKind: PacketKind.SERVICE, packets: ctx.config.heartbeatPacketsPerStep }];
  }
  onVmFailure(ctx: PluginContext<LazyCheckpointConfig>, event: VmFailureEvent): AlgorithmReaction {
    return {
      extraTraffic: [{ timeMs: event.timeMs, sourceId: 'lazy-checkpoint-plugin', packetKind: PacketKind.REPLICATION, packets: ctx.config.checkpointPacketsOnFailure }],
      migrations: [{ sourceVmId: event.vmId, targetVmId: 'auto-target', functionIds: [], trafficPackets: ctx.config.checkpointPacketsOnFailure, estimatedRtoMs: this.estimateRto(ctx, event), estimatedRpoMs: this.estimateRpo(ctx, event) }],
    };
  }
  onVmRecovery(_ctx: PluginContext<LazyCheckpointConfig>, _event: VmRecoveryEvent): AlgorithmReaction { return { extraTraffic: [], migrations: [] }; }
  estimateRto(ctx: PluginContext<LazyCheckpointConfig>): number { return ctx.config.baseRtoMs; }
  estimateRpo(ctx: PluginContext<LazyCheckpointConfig>): number { return ctx.config.assumedRpoMs; }
}
