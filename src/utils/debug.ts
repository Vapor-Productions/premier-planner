const DEBUG_TRUTHY = new Set(['1', 'true', 'yes', 'on']);

/**
 * Enable verbose API / integration logging. Set `DEBUG_MODE=1` (or `true`, `yes`, `on`) in the environment.
 */
export function isDebugMode(): boolean {
  const v = process.env.DEBUG_MODE?.trim().toLowerCase();
  return v !== undefined && DEBUG_TRUTHY.has(v);
}

/**
 * Logs to stdout when {@link isDebugMode} is true. Prefix: `[debug:<scope>]`.
 */
export function debugLog(scope: string, ...args: unknown[]): void {
  if (!isDebugMode()) {
    return;
  }
  console.log(`[debug:${scope}]`, ...args);
}
