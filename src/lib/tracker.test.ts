import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadTracker,
  saveTracker,
  upsertEntry,
  removeEntry,
  deadlineStatus,
  TRACKER_KEY,
  type TrackerEntry,
  type TrackerStorage,
} from './tracker';
import { buildIcs } from './ics';

function memoryStorage(): TrackerStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => (data.has(k) ? (data.get(k) as string) : null),
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
}

function entry(overrides: Partial<TrackerEntry> = {}): TrackerEntry {
  return {
    schemeId: 'pm-kisan',
    status: 'not_started',
    deadline: null,
    notes: '',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('loadTracker', () => {
  let storage: ReturnType<typeof memoryStorage>;
  beforeEach(() => {
    storage = memoryStorage();
  });

  it('returns [] when nothing is stored', () => {
    expect(loadTracker(storage)).toEqual([]);
  });

  it('returns [] for corrupt JSON without throwing', () => {
    storage.setItem(TRACKER_KEY, '{not json');
    expect(() => loadTracker(storage)).not.toThrow();
    expect(loadTracker(storage)).toEqual([]);
  });

  it('returns [] when the stored value is not an array', () => {
    storage.setItem(TRACKER_KEY, JSON.stringify({ schemeId: 'kcc' }));
    expect(loadTracker(storage)).toEqual([]);
  });

  it('drops malformed entries but keeps valid ones', () => {
    const valid = entry({ schemeId: 'kcc', status: 'applied' });
    storage.setItem(TRACKER_KEY, JSON.stringify([valid, { schemeId: 'x', status: 'bogus' }]));
    expect(loadTracker(storage)).toEqual([valid]);
  });
});

describe('upsertEntry / loadTracker round trip', () => {
  let storage: ReturnType<typeof memoryStorage>;
  beforeEach(() => {
    storage = memoryStorage();
  });

  it('persists a new entry with defaults and a timestamp', () => {
    const result = upsertEntry('pm-kisan', { deadline: '2030-03-31' }, storage);
    expect(result).toHaveLength(1);
    const saved = loadTracker(storage);
    expect(saved).toEqual(result);
    expect(saved[0].schemeId).toBe('pm-kisan');
    expect(saved[0].status).toBe('not_started');
    expect(saved[0].deadline).toBe('2030-03-31');
    expect(saved[0].notes).toBe('');
    expect(saved[0].updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('changes the status of an existing entry without duplicating it', () => {
    upsertEntry('pm-kisan', {}, storage);
    const result = upsertEntry('pm-kisan', { status: 'applied', notes: 'Acknowledgement no. 12' }, storage);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('applied');
    expect(result[0].notes).toBe('Acknowledgement no. 12');
    expect(loadTracker(storage)[0].status).toBe('applied');
  });

  it('keeps other entries untouched', () => {
    upsertEntry('pm-kisan', {}, storage);
    upsertEntry('kcc', { status: 'documents_ready' }, storage);
    const list = upsertEntry('pm-kisan', { status: 'approved' }, storage);
    expect(list.map((e) => [e.schemeId, e.status])).toEqual([
      ['pm-kisan', 'approved'],
      ['kcc', 'documents_ready'],
    ]);
  });
});

describe('removeEntry', () => {
  it('removes only the matching scheme', () => {
    const storage = memoryStorage();
    saveTracker([entry({ schemeId: 'pm-kisan' }), entry({ schemeId: 'kcc' })], storage);
    const remaining = removeEntry('pm-kisan', storage);
    expect(remaining.map((e) => e.schemeId)).toEqual(['kcc']);
    expect(loadTracker(storage).map((e) => e.schemeId)).toEqual(['kcc']);
  });

  it('is a no-op for an unknown scheme', () => {
    const storage = memoryStorage();
    upsertEntry('kcc', {}, storage);
    expect(removeEntry('nope', storage)).toHaveLength(1);
  });
});

describe('deadlineStatus', () => {
  const today = new Date(2025, 5, 10); // 10 June 2025, local time

  it('is overdue when the deadline is before today', () => {
    expect(deadlineStatus(entry({ deadline: '2025-06-09' }), today)).toBe('overdue');
  });

  it('is due_soon when the deadline is today', () => {
    expect(deadlineStatus(entry({ deadline: '2025-06-10' }), today)).toBe('due_soon');
  });

  it('is due_soon at exactly 7 days ahead (inclusive)', () => {
    expect(deadlineStatus(entry({ deadline: '2025-06-17' }), today)).toBe('due_soon');
  });

  it('is ok beyond 7 days ahead', () => {
    expect(deadlineStatus(entry({ deadline: '2025-06-18' }), today)).toBe('ok');
  });

  it('is none when there is no deadline', () => {
    expect(deadlineStatus(entry({ deadline: null }), today)).toBe('none');
  });
});

describe('buildIcs', () => {
  const ics = buildIcs({
    schemeId: 'pm-kisan',
    title: 'PM-KISAN, instalment',
    deadline: '2025-07-01',
    notes: 'Bring passbook; keep copy',
  });

  it('produces a VCALENDAR with BEGIN and END markers', () => {
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
  });

  it('writes an all-day DTSTART with VALUE=DATE', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20250701');
  });

  it('escapes commas and semicolons in text values', () => {
    expect(ics).toContain('SUMMARY:Deadline: PM-KISAN\\, instalment');
    expect(ics).toContain('DESCRIPTION:Bring passbook\\; keep copy');
  });
});
