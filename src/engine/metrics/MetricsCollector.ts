export interface MetricsSnapshot {
  timeMs: number;
  arrivedPackets: number;
  servedBusPackets: number;
  servedVmPackets: number;
  droppedBusPackets: number;
  droppedVmPackets: number;
  busQueueLength: number;
  avgVmQueueLength: number;
  throughputPps: number;
  lossPercent: number;
  rtoMs?: number;
  rpoMs?: number;
}

export interface AggregateMetrics {
  totalArrivedPackets: number;
  totalServedPackets: number;
  totalDroppedPackets: number;
  minThroughputPps: number;
  maxThroughputPps: number;
  avgThroughputPps: number;
  minBusQueue: number;
  maxBusQueue: number;
  avgBusQueue: number;
}

export class MetricsCollector {
  private snapshots: MetricsSnapshot[] = [];
  record(snapshot: MetricsSnapshot): void { this.snapshots.push(snapshot); }
  getSnapshots(): MetricsSnapshot[] { return this.snapshots; }
  getLatest(): MetricsSnapshot | null { return this.snapshots[this.snapshots.length - 1] ?? null; }
  getAggregate(): AggregateMetrics {
    if (!this.snapshots.length) {
      return { totalArrivedPackets: 0, totalServedPackets: 0, totalDroppedPackets: 0, minThroughputPps: 0, maxThroughputPps: 0, avgThroughputPps: 0, minBusQueue: 0, maxBusQueue: 0, avgBusQueue: 0 };
    }
    const totalArrivedPackets = this.snapshots.reduce((s, x) => s + x.arrivedPackets, 0);
    const totalServedPackets = this.snapshots.reduce((s, x) => s + x.servedVmPackets, 0);
    const totalDroppedPackets = this.snapshots.reduce((s, x) => s + x.droppedBusPackets + x.droppedVmPackets, 0);
    const throughputs = this.snapshots.map(x => x.throughputPps);
    const queues = this.snapshots.map(x => x.busQueueLength);
    return {
      totalArrivedPackets,
      totalServedPackets,
      totalDroppedPackets,
      minThroughputPps: Math.min(...throughputs),
      maxThroughputPps: Math.max(...throughputs),
      avgThroughputPps: throughputs.reduce((a, b) => a + b, 0) / throughputs.length,
      minBusQueue: Math.min(...queues),
      maxBusQueue: Math.max(...queues),
      avgBusQueue: queues.reduce((a, b) => a + b, 0) / queues.length,
    };
  }
}
