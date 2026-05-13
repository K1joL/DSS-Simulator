import { ReplicationAlgorithmPlugin } from '../contracts/ReplicationAlgorithmPlugin';

export class AlgorithmRegistry {
  private readonly plugins = new Map<string, ReplicationAlgorithmPlugin<unknown>>();
  register(plugin: ReplicationAlgorithmPlugin<unknown>): void {
    if (this.plugins.has(plugin.id)) throw new Error(`Algorithm plugin already registered: ${plugin.id}`);
    this.plugins.set(plugin.id, plugin);
  }
  registerMany(plugins: ReplicationAlgorithmPlugin<unknown>[]): void { plugins.forEach(p => this.register(p)); }
  getById(id: string): ReplicationAlgorithmPlugin<unknown> {
    const plugin = this.plugins.get(id);
    if (!plugin) throw new Error(`Algorithm plugin not found: ${id}`);
    return plugin;
  }
  list(): ReplicationAlgorithmPlugin<unknown>[] { return Array.from(this.plugins.values()); }
  has(id: string): boolean { return this.plugins.has(id); }
}
