import { PacketKind } from '../../domain/cluster/enums/PacketKind';

export interface TrafficEmission {
  timeMs: number;
  sourceId: string;
  targetId?: string;
  packetKind: PacketKind;
  packets: number;
}
