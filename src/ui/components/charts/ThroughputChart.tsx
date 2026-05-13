import { SparklineChart } from './SparklineChart';
export function ThroughputChart({ snapshots }: { snapshots: any[] }) { return <SparklineChart title="Throughput" values={snapshots.map((s) => s.throughputMbps ?? 0)} suffix=" Mbps" color="#1f9d6a" />; }
