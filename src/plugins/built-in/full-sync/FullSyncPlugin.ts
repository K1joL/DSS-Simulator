import { ReplicationAlgorithmPlugin, ValidationResult, VmFailureEvent, VmRecoveryEvent } from '../../contracts/ReplicationAlgorithmPlugin';
import { PluginContext } from '../../contracts/PluginContext';
import { AlgorithmReaction } from '../../contracts/AlgorithmReaction';
import { TrafficEmission } from '../../contracts/TrafficEmission';
import { PacketKind } from '../../../domain/cluster/enums/PacketKind';
import { FullSyncConfig } from './FullSyncConfig';

export class FullSyncPlugin implements ReplicationAlgorithmPlugin<FullSyncConfig> {
  readonly id = 'full-sync';
  readonly name = 'Full Sync Replication';
  readonly version = '1.0.0';
  readonly description = 'Periodic full-state synchronization with higher network cost and lower RPO';
  getDefaultConfig(): FullSyncConfig { return { syncIntervalMs: 1000, packetsPerFullSync: 180, baseRtoMs: 140 }; }
  validateConfig(config: FullSyncConfig): ValidationResult {
    const errors: string[] = [];
    if (config.syncIntervalMs <= 0) errors.push('syncIntervalMs must be > 0');
    if (config.packetsPerFullSync < 0) errors.push('packetsPerFullSync must be >= 0');
    if (config.baseRtoMs < 0) errors.push('baseRtoMs must be >= 0');
    return { ok: !errors.length, errors };
  }
  onSimulationStart(_ctx: PluginContext<FullSyncConfig>): void {}
  emitBackgroundTraffic(ctx: PluginContext<FullSyncConfig>, nowMs: number): TrafficEmission[] {
    if (nowMs === 0 || nowMs % ctx.config.syncIntervalMs !== 0) return [];
    return [{ timeMs: nowMs, sourceId: 'full-sync-plugin', packetKind: PacketKind.REPLICATION, packets: ctx.config.packetsPerFullSync }];
  }
  onVmFailure(ctx: PluginContext<FullSyncConfig>, event: VmFailureEvent): AlgorithmReaction {
    const rto = this.estimateRto(ctx, event);
    const rpo = this.estimateRpo(ctx, event);
    return {
      extraTraffic: [{ timeMs: event.timeMs, sourceId: 'full-sync-plugin', packetKind: PacketKind.REPLICATION, packets: Math.max(1, Math.floor(ctx.config.packetsPerFullSync * 1.5)) }],
      migrations: [{ sourceVmId: event.vmId, targetVmId: 'auto-target', functionIds: [], trafficPackets: Math.max(1, Math.floor(ctx.config.packetsPerFullSync * 1.5)), estimatedRtoMs: rto, estimatedRpoMs: rpo }],
    };
  }
  onVmRecovery(_ctx: PluginContext<FullSyncConfig>, _event: VmRecoveryEvent): AlgorithmReaction { return { extraTraffic: [], migrations: [] }; }
  estimateRto(ctx: PluginContext<FullSyncConfig>): number { return ctx.config.baseRtoMs; }
  estimateRpo(ctx: PluginContext<FullSyncConfig>, event: VmFailureEvent): number { return Math.floor((event.timeMs % ctx.config.syncIntervalMs) / 2); }
}
