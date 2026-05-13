import { Cluster } from '../../domain/cluster/entities/Cluster';
import { VMState } from '../../domain/cluster/enums/VMState';
import { TrafficEmission } from '../../plugins/contracts/TrafficEmission';

export interface QueueUpdateResult {
  arrivedPackets: number;
  acceptedPackets: number;
  droppedPackets: number;
  busQueueLength: number;
}
export interface QueueServeResult { servedPackets: number; busQueueLength: number; }
export interface VmDispatchResult { dispatchedPackets: number; droppedAtVmPackets: number; activeVmCount: number; }
export interface VmServiceResult { servedPackets: number; avgVmQueueLength: number; }

export class QueueNetworkSolver {
  constructor(private readonly cluster: Cluster) {}

  enqueueBusTraffic(emissions: TrafficEmission[]): QueueUpdateResult {
    const arrivedPackets = emissions.reduce((sum, e) => sum + e.packets, 0);
    const freeSpace = this.cluster.bus.capacityPackets - this.cluster.bus.queueLength;
    const acceptedPackets = Math.max(0, Math.min(arrivedPackets, freeSpace));
    const droppedPackets = Math.max(0, arrivedPackets - acceptedPackets);
    this.cluster.bus.queueLength += acceptedPackets;
    return { arrivedPackets, acceptedPackets, droppedPackets, busQueueLength: this.cluster.bus.queueLength };
  }

  serveBus(stepMs: number): QueueServeResult {
    const serviceCapacity = Math.floor((this.cluster.bus.serviceRatePps * stepMs) / 1000);
    const servedPackets = Math.min(serviceCapacity, this.cluster.bus.queueLength);
    this.cluster.bus.queueLength -= servedPackets;
    return { servedPackets, busQueueLength: this.cluster.bus.queueLength };
  }

  dispatchToVmQueues(servedPackets: number): VmDispatchResult {
    const activeVms = this.cluster.vms.filter(vm => vm.state === VMState.ACTIVE);
    if (!activeVms.length || servedPackets === 0) {
      return { dispatchedPackets: 0, droppedAtVmPackets: servedPackets, activeVmCount: activeVms.length };
    }
    let dispatchedPackets = 0;
    let droppedAtVmPackets = 0;
    const perVmBase = Math.floor(servedPackets / activeVms.length);
    const remainder = servedPackets % activeVms.length;
    activeVms.forEach((vm, index) => {
      const allocation = perVmBase + (index < remainder ? 1 : 0);
      const free = vm.localQueueCapacity - vm.localQueueLength;
      const accepted = Math.max(0, Math.min(allocation, free));
      const dropped = allocation - accepted;
      vm.localQueueLength += accepted;
      dispatchedPackets += accepted;
      droppedAtVmPackets += dropped;
    });
    return { dispatchedPackets, droppedAtVmPackets, activeVmCount: activeVms.length };
  }

  serveVmQueues(stepMs: number): VmServiceResult {
    let servedPackets = 0;
    let totalQueue = 0;
    const activeVms = this.cluster.vms.filter(v => v.state === VMState.ACTIVE);
    for (const vm of activeVms) {
      const capacity = Math.floor((vm.serviceRatePps * stepMs) / 1000);
      const served = Math.min(capacity, vm.localQueueLength);
      vm.localQueueLength -= served;
      servedPackets += served;
      totalQueue += vm.localQueueLength;
    }
    return { servedPackets, avgVmQueueLength: activeVms.length ? totalQueue / activeVms.length : 0 };
  }
}
