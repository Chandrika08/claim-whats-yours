import { describe, it, expect } from 'vitest';
import { buildIcs, escapeIcsText, type IcsEntry } from './ics';

const NOW = new Date('2025-01-01T00:00:00Z');

function entry(overrides: Partial<IcsEntry> = {}): IcsEntry {
  return {
    schemeId: 'pm-kisan',
    title: 'PM-KISAN installment',
    deadline: '2025-03-31',
    ...overrides,
  };
}

describe('buildIcs', () => {
  it('wraps the output in a VCALENDAR with one VEVENT', () => {
    const ics = buildIcs(entry(), NOW);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain('END:VEVENT');
  });

  it('emits an all-day DTSTART matching the deadline (YYYYMMDD) and an exclusive DTEND the next day', () => {
    const ics = buildIcs(entry({ deadline: '2025-03-31' }), NOW);
    expect(ics).toContain('DTSTART;VALUE=DATE:20250331');
    expect(ics).toContain('DTEND;VALUE=DATE:20250401');
  });

  it('rolls DTEND over a year boundary', () => {
    const ics = buildIcs(entry({ deadline: '2024-12-31' }), NOW);
    expect(ics).toContain('DTSTART;VALUE=DATE:20241231');
    expect(ics).toContain('DTEND;VALUE=DATE:20250101');
  });

  it('rejects a deadline that is not YYYY-MM-DD', () => {
    expect(() => buildIcs(entry({ deadline: '31/03/2025' }), NOW)).toThrow(/Invalid deadline/);
  });

  it('includes the title inside SUMMARY with the "Deadline: " prefix', () => {
    const ics = buildIcs(entry({ title: 'Scholarship renewal' }), NOW);
    expect(ics).toContain('SUMMARY:Deadline: Scholarship renewal');
  });

  it('derives the UID from schemeId, replacing unsafe characters', () => {
    const ics = buildIcs(entry({ schemeId: 'pm kisan/2024', deadline: '2025-03-31' }), NOW);
    expect(ics).toContain('UID:pm-kisan-2024-20250331@claim-what-yours');
  });

  it('escapes commas, semicolons, backslashes and newlines in the title (SUMMARY)', () => {
    const ics = buildIcs(entry({ title: 'Fees, aid; x\\ y\nnext' }), NOW);
    expect(ics).toContain('SUMMARY:Deadline: Fees\\, aid\\; x\\\\ y\\nnext');
  });

  it('escapes commas, semicolons, backslashes and newlines in notes (DESCRIPTION)', () => {
    const ics = buildIcs(entry({ notes: 'Bring form, ID; copy\\ \nsecond line' }), NOW);
    expect(ics).toContain('DESCRIPTION:Bring form\\, ID\\; copy\\\\ \\nsecond line');
  });

  it('omits DESCRIPTION when notes are empty or whitespace', () => {
    expect(buildIcs(entry({ notes: '   ' }), NOW)).not.toContain('DESCRIPTION:');
    expect(buildIcs(entry(), NOW)).not.toContain('DESCRIPTION:');
  });

  it('uses CRLF as the line separator and never a bare LF or CR', () => {
    const ics = buildIcs(entry({ notes: 'a\nb' }), NOW);
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(ics.split('\r\n').length).toBeGreaterThan(1);
  });
});

describe('escapeIcsText', () => {
  it('escapes backslash, semicolon, comma and newline per RFC 5545', () => {
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });

  it('normalises CRLF and CR newlines to \\n', () => {
    expect(escapeIcsText('x\r\ny')).toBe('x\\ny');
    expect(escapeIcsText('x\ry')).toBe('x\\ny');
  });

  it('leaves plain text unchanged', () => {
    expect(escapeIcsText('plain text 123')).toBe('plain text 123');
  });
});
