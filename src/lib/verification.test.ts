import { describe, it, expect } from 'vitest';
import { dateStatus, DATE_PATTERN, REVERIFY_AFTER_DAYS } from './verification';

const today = new Date(2025, 5, 10); // 2025-06-10, local time

describe('dateStatus', () => {
  it('uses a 90-day window', () => {
    expect(REVERIFY_AFTER_DAYS).toBe(90);
    expect(DATE_PATTERN.test('2025-06-10')).toBe(true);
  });

  it('is current for today', () => {
    expect(dateStatus('2025-06-10', today)).toBe('current');
  });

  it('is current at exactly 90 days old', () => {
    expect(dateStatus('2025-03-12', today)).toBe('current');
  });

  it('is stale at 91 days old', () => {
    expect(dateStatus('2025-03-11', today)).toBe('stale');
  });

  it('rejects an impossible calendar date', () => {
    expect(dateStatus('2025-02-30', today)).toBe('invalid');
  });

  it('rejects a date that is not zero-padded', () => {
    expect(dateStatus('2025-1-5', today)).toBe('invalid');
  });

  it('rejects a timestamp', () => {
    expect(dateStatus('2025-01-01T00:00:00Z', today)).toBe('invalid');
  });

  it('rejects a long-form date', () => {
    expect(dateStatus('June 1 2025', today)).toBe('invalid');
  });

  it('rejects an empty string', () => {
    expect(dateStatus('', today)).toBe('invalid');
  });

  it('rejects a non-date string', () => {
    expect(dateStatus('not-a-date', today)).toBe('invalid');
  });

  it('rejects null, undefined and numbers', () => {
    expect(dateStatus(null, today)).toBe('invalid');
    expect(dateStatus(undefined, today)).toBe('invalid');
    expect(dateStatus(42, today)).toBe('invalid');
  });
});
