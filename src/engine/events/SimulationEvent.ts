export interface SimulationEvent<TPayload = unknown> {
  id: string;
  type: string;
  timeMs: number;
  payload: TPayload;
}
