import { debugLog } from './debug.js';

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

/**
 * Stable ids for `isCommandInMaintenance`. Use `group.subcommand` when the slash command is grouped.
 */
export const MaintenanceCommandId = {
  riotLink: 'riot.link',
  riotUnlink: 'riot.unlink',
  riotLinkBackup: 'riot.link-backup',
  riotLinkVerify: 'riot.link-verify',
} as const;

function isTruthyEnv(value: string | undefined): boolean {
  const raw = value?.trim().toLowerCase();
  if (!raw) {
    return false;
  }
  return TRUTHY.has(raw);
}

function parsePerCommandList(): Set<string> {
  const raw = process.env.MAINTENANCE_COMMANDS?.trim();
  if (!raw) {
    return new Set();
  }
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Global kill-switch: any command that calls `isCommandInMaintenance` is treated as in maintenance.
 * Set `MAINTENANCE_MODE=1` (or `true`, `yes`, `on`).
 */
export function isGlobalMaintenanceMode(): boolean {
  const on = isTruthyEnv(process.env.MAINTENANCE_MODE);
  debugLog('maintenance', 'isGlobalMaintenanceMode', on);
  return on;
}

/**
 * Per-command maintenance. Set `MAINTENANCE_COMMANDS` to a comma-separated list of ids
 * (e.g. `riot.link,team.view`). See {@link MaintenanceCommandId} for supported ids.
 *
 * If {@link isGlobalMaintenanceMode} is true, this returns true for every `commandId`.
 */
export function isCommandInMaintenance(commandId: string): boolean {
  if (isGlobalMaintenanceMode()) {
    return true;
  }
  const result = parsePerCommandList().has(commandId.trim().toLowerCase());
  debugLog('maintenance', 'isCommandInMaintenance', { commandId, result });
  return result;
}
