/** A scheme is due for re-verification when last_verified is more than this many days old. */
export const REVERIFY_AFTER_DAYS = 90;

/** The only accepted shape for last_verified: YYYY-MM-DD. */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type DateStatus = 'current' | 'stale' | 'invalid';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Verification state of last_verified, shared by SchemeCard and Admin.
 * Anything that is not a real YYYY-MM-DD calendar date is "invalid", never "stale" or "current".
 */
export function dateStatus(lastVerified: unknown, today: Date = new Date()): DateStatus {
  if (typeof lastVerified !== 'string' || !DATE_PATTERN.test(lastVerified)) return 'invalid';
  const [year, month, day] = lastVerified.split('-').map(Number);
  const verified = Date.UTC(year, month - 1, day);
  const parsed = new Date(verified);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return 'invalid';
  }
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return (todayUtc - verified) / DAY_MS > REVERIFY_AFTER_DAYS ? 'stale' : 'current';
}
