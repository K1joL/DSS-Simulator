import { SimulationEvent } from './SimulationEvent';

export interface EventQueue {
  push(event: SimulationEvent): void;
  popNext(): SimulationEvent | null;
  peekNext(): SimulationEvent | null;
  size(): number;
  isEmpty(): boolean;
  clear(): void;
}
