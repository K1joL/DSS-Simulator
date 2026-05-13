export interface ValidationResult { ok: boolean; errors: string[]; }
export function validateExperimentConfig(config: any): ValidationResult {
  const errors: string[] = [];
  if (!config) errors.push('Config is required');
  if (!Number.isInteger(config?.seed)) errors.push('seed must be an integer');
  if (!(config?.durationMs > 0)) errors.push('durationMs must be > 0');
  if (!(config?.stepMs > 0)) errors.push('stepMs must be > 0');
  if (typeof config?.algorithmId !== 'string' || !config.algorithmId) errors.push('algorithmId is required');
  if (!(config?.bus?.capacityPackets >= 0)) errors.push('bus.capacityPackets must be >= 0');
  if (!(config?.bus?.serviceRatePps >= 0)) errors.push('bus.serviceRatePps must be >= 0');
  if (!Array.isArray(config?.kms) || config.kms.length === 0) errors.push('kms must be a non-empty array');
  if (!Array.isArray(config?.vms) || config.vms.length === 0) errors.push('vms must be a non-empty array');
  return { ok: !errors.length, errors };
}
