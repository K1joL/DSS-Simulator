import { EventQueue } from './EventQueue';
import { SimulationEvent } from './SimulationEvent';

export class BinaryHeapEventQueue implements EventQueue {
  private heap: SimulationEvent[] = [];
  push(event: SimulationEvent): void { this.heap.push(event); this.siftUp(this.heap.length - 1); }
  popNext(): SimulationEvent | null {
    if (!this.heap.length) return null;
    const root = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length) { this.heap[0] = last; this.siftDown(0); }
    return root;
  }
  peekNext(): SimulationEvent | null { return this.heap[0] ?? null; }
  size(): number { return this.heap.length; }
  isEmpty(): boolean { return this.heap.length === 0; }
  clear(): void { this.heap = []; }
  private siftUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent].timeMs <= this.heap[index].timeMs) break;
      [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
      index = parent;
    }
  }
  private siftDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      if (left < length && this.heap[left].timeMs < this.heap[smallest].timeMs) smallest = left;
      if (right < length && this.heap[right].timeMs < this.heap[smallest].timeMs) smallest = right;
      if (smallest === index) break;
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}
