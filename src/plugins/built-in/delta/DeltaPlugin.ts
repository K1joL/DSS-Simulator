import { ReplicationAlgorithmPlugin, ValidationResult, VmFailureEvent, VmRecoveryEvent } from '../../contracts/ReplicationAlgorithmPlugin';
import { PluginContext } from '../../contracts/PluginContext';
import { AlgorithmReaction } from '../../contracts/AlgorithmReaction';
import { TrafficEmission } from '../../contracts/TrafficEmission';
import { PacketKind } from '../../../domain/cluster/enums/PacketKind';
import { DeltaConfig } from './DeltaConfig';

export class DeltaPlugin implements ReplicationAlgorithmPlugin<DeltaConfig> {
  readonly id = 'delta';
  readonly name = 'Delta Replication';
  readonly version = '1.0.0';
  readonly description = 'Periodic delta synchronization with fixed-size sync bursts';
  getDefaultConfig(): DeltaConfig { return { syncIntervalMs: 500, packetsPerSync: 50, baseRtoMs: 200 }; }
  validateConfig(config: DeltaConfig): ValidationResult {
    const errors: string[] = [];
    if (config.syncIntervalMs <= 0) errors.push('syncIntervalMs must be > 0');
    if (config.packetsPerSync < 0) errors.push('packetsPerSync must be >= 0');
    if (config.baseRtoMs < 0) errors.push('baseRtoMs must be >= 0');
    return { ok: !errors.length, errors };
  }
  onSimulationStart(_ctx: PluginContext<DeltaConfig>): void {}
  emitBackgroundTraffic(ctx: PluginContext<DeltaConfig>, nowMs: number): TrafficEmission[] {
    if (nowMs === 0 || nowMs % ctx.config.syncIntervalMs !== 0) return [];
    return [{ timeMs: nowMs, sourceId: 'delta-plugin', packetKind: PacketKind.REPLICATION, packets: ctx.config.packetsPerSync }];
  }
  onVmFailure(ctx: PluginContext<DeltaConfig>, event: VmFailureEvent): AlgorithmReaction {
    const rto = this.estimateRto(ctx, event);
    const rpo = this.estimateRpo(ctx, event);
    return {
      extraTraffic: [{ timeMs: event.timeMs, sourceId: 'delta-plugin', packetKind: PacketKind.REPLICATION, packets: Math.max(1, Math.floor(ctx.config.packetsPerSync * 2)) }],
      migrations: [{ sourceVmId: event.vmId, targetVmId: 'auto-target', functionIds: [], trafficPackets: Math.max(1, Math.floor(ctx.config.packetsPerSync * 2)), estimatedRtoMs: rto, estimatedRpoMs: rpo }],
    };
  }
  onVmRecovery(_ctx: PluginContext<DeltaConfig>, _event: VmRecoveryEvent): AlgorithmReaction { return { extraTraffic: [], migrations: [] }; }
  estimateRto(ctx: PluginContext<DeltaConfig>): number { return ctx.config.baseRtoMs; }
  estimateRpo(ctx: PluginContext<DeltaConfig>, event: VmFailureEvent): number { return event.timeMs % ctx.config.syncIntervalMs; }
}
