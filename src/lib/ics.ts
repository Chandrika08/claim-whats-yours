/**
 * iCalendar (RFC 5545) export for tracker deadlines, plus a browser download helper.
 */

export type IcsEntry = {
  schemeId: string;
  title: string;
  /** ISO date, YYYY-MM-DD. */
  deadline: string;
  notes?: string;
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Escapes a TEXT value per RFC 5545 section 3.3.11: backslash, semicolon, comma, newline. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

function utf8Length(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

/** Folds a content line to at most 75 octets, continuing with a leading space (RFC 5545 section 3.1). */
function foldLine(line: string): string {
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const len = utf8Length(ch.codePointAt(0) ?? 0);
    if (bytes + len > limit) {
      out.push(current);
      current = ' ' + ch;
      bytes = 1 + len;
      limit = 75;
    } else {
      current += ch;
      bytes += len;
    }
  }
  out.push(current);
  return out.join('\r\n');
}

function formatUtcStamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}` +
    `T${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`
  );
}

/** Returns the calendar date after `deadline` (YYYYMMDD), used as the exclusive DTEND of an all-day event. */
function nextDay(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month - 1, day + 1));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`;
}

/**
 * Builds a VCALENDAR containing one all-day VEVENT for the entry's deadline.
 * Throws if the deadline is not YYYY-MM-DD.
 */
export function buildIcs(entry: IcsEntry, now: Date = new Date()): string {
  const match = DATE_RE.exec(entry.deadline);
  if (!match) {
    throw new Error(`Invalid deadline "${entry.deadline}"; expected YYYY-MM-DD`);
  }
  const [, y, m, d] = match;
  const dtStart = `${y}${m}${d}`;
  const dtEnd = nextDay(Number(y), Number(m), Number(d));
  const uid = `${entry.schemeId.replace(/[^A-Za-z0-9._-]/g, '-')}-${dtStart}@claim-what-yours`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Claim What\'s Yours//Tracker//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatUtcStamp(now)}`,
    `DTSTART;VALUE=DATE:${dtStart}`,
    `DTEND;VALUE=DATE:${dtEnd}`,
    `SUMMARY:${escapeIcsText(`Deadline: ${entry.title}`)}`,
  ];
  if (entry.notes && entry.notes.trim() !== '') {
    lines.push(`DESCRIPTION:${escapeIcsText(entry.notes)}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** Triggers a browser download of `content` as a .ics file. No-op outside a browser. */
export function downloadIcs(filename: string, content: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
