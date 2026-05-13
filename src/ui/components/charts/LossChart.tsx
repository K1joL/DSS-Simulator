import { SparklineChart } from './SparklineChart';
export function LossChart({ snapshots }: { snapshots: any[] }) { return <SparklineChart title="Loss percent" values={snapshots.map((s) => s.lossPercent)} suffix=" %" color="#d64545" />; }
