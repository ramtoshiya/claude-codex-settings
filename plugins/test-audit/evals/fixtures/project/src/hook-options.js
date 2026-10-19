function normalizeDelay(value) {
  if (!Number.isInteger(value) || value < 0 || value > 60000) {
    throw new RangeError('delayMs must be an integer between 0 and 60000');
  }
  return value;
}

export function resolveHookOptions(input = {}) {
  if (input.enabled !== undefined && typeof input.enabled !== 'boolean') {
    throw new TypeError('enabled must be a boolean');
  }
  return {
    enabled: input.enabled ?? true,
    delayMs: normalizeDelay(input.delayMs ?? 25),
    mode: input.mode === 'manual' ? 'manual' : 'automatic',
  };
}

// Deliberate test-only seam fixture. No command or runtime caller needs this export.
export function normalizeDelayForTests(value) {
  return normalizeDelay(value);
}
