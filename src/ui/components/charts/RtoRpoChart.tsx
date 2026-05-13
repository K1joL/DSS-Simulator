import { SparklineChart } from './SparklineChart';
export function RtoRpoChart({ snapshots }: { snapshots: any[] }) { return <SparklineChart title="RTO / RPO" values={snapshots.map((s) => Math.max(s.rtoMs ?? 0, s.rpoMs ?? 0))} suffix=" ms" color="#d18b1f" />; }
