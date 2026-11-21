/**
 * Application tracker: remembers, per scheme, where the user is in the
 * application process. Stored only in localStorage; nothing personal
 * (no Aadhaar, phone or address) is ever recorded here.
 */

export const TRACKER_KEY = 'cwy.tracker.v1';

/** Dispatched on window after the tracker list is saved, so UI (e.g. the nav badge) can refresh. */
export const TRACKER_CHANGED_EVENT = 'cwy:tracker-changed';

export type TrackerStatus = 'not_started' | 'documents_ready' | 'applied' | 'approved' | 'rejected';

export const TRACKER_STATUS_LABELS: Record<TrackerStatus, string> = {
  not_started: 'Not started',
  documents_ready: 'Documents ready',
  applied: 'Applied',
  approved: 'Approved',
  rejected: 'Rejected',
};

export type TrackerEntry = {
  schemeId: string;
  status: TrackerStatus;
  /** ISO date, YYYY-MM-DD, or null when no deadline is known. */
  deadline: string | null;
  notes: string;
  /** ISO timestamp of the last change. */
  updatedAt: string;
};

export type DeadlineStatus = 'overdue' | 'due_soon' | 'ok' | 'none';

/** Minimal storage contract so tests can inject an in-memory store. */
export interface TrackerStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STATUSES: readonly TrackerStatus[] = [
  'not_started',
  'documents_ready',
  'applied',
  'approved',
  'rejected',
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function resolveStorage(storage?: TrackerStorage): TrackerStorage | null {
  if (storage) return storage;
  const g = globalThis as { localStorage?: TrackerStorage };
  return g.localStorage ?? null;
}

function isEntry(value: unknown): value is TrackerEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.schemeId === 'string' &&
    typeof e.status === 'string' &&
    (STATUSES as readonly string[]).includes(e.status) &&
    (e.deadline === null || (typeof e.deadline === 'string' && DATE_RE.test(e.deadline))) &&
    typeof e.notes === 'string' &&
    typeof e.updatedAt === 'string'
  );
}

/** Returns all tracker entries. Missing, corrupt or non-array data yields []. Never throws. */
export function loadTracker(storage?: TrackerStorage): TrackerEntry[] {
  try {
    const store = resolveStorage(storage);
    if (!store) return [];
    const raw = store.getItem(TRACKER_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

/** Replaces the stored tracker list. Silently does nothing if storage is unavailable. */
export function saveTracker(entries: TrackerEntry[], storage?: TrackerStorage): void {
  const store = resolveStorage(storage);
  if (!store) return;
  store.setItem(TRACKER_KEY, JSON.stringify(entries));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(TRACKER_CHANGED_EVENT));
  }
}

/**
 * Creates or updates the entry for schemeId, merging `patch` over the existing
 * values (or defaults for a new entry). Sets updatedAt to now. Returns the full updated list.
 */
export function upsertEntry(
  schemeId: string,
  patch: Partial<Omit<TrackerEntry, 'schemeId' | 'updatedAt'>>,
  storage?: TrackerStorage,
): TrackerEntry[] {
  const entries = loadTracker(storage);
  const existing = entries.find((e) => e.schemeId === schemeId);
  const merged: TrackerEntry = {
    schemeId,
    status: 'not_started',
    deadline: null,
    notes: '',
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  const next = existing
    ? entries.map((e) => (e.schemeId === schemeId ? merged : e))
    : [...entries, merged];
  saveTracker(next, storage);
  return next;
}

/** Removes the entry for schemeId (if any) and returns the remaining list. */
export function removeEntry(schemeId: string, storage?: TrackerStorage): TrackerEntry[] {
  const next = loadTracker(storage).filter((e) => e.schemeId !== schemeId);
  saveTracker(next, storage);
  return next;
}

/**
 * Classifies an entry's deadline against `today`, comparing calendar dates only.
 * overdue: before today. due_soon: today through 7 days ahead (inclusive). ok: later. none: no deadline.
 */
export function deadlineStatus(entry: Pick<TrackerEntry, 'deadline'>, today: Date): DeadlineStatus {
  if (!entry.deadline || !DATE_RE.test(entry.deadline)) return 'none';
  const [y, m, d] = entry.deadline.split('-').map(Number);
  const deadlineDay = Date.UTC(y, m - 1, d);
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((deadlineDay - todayDay) / DAY_MS);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'due_soon';
  return 'ok';
}
