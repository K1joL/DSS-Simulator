import { SparklineChart } from './SparklineChart';
export function QueueChart({ snapshots }: { snapshots: any[] }) { return <SparklineChart title="Queue length" values={snapshots.map((s) => s.busQueueLength)} />; }
