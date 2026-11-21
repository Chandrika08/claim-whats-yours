import { describe, it, expect } from 'vitest';
import { nextQuestions } from './questions';
import { matchAll } from './eligibility';
import { loadSchemes } from './schemes';
import type { Profile, Rule, Scheme } from '../types';
import samples from '../data/sample-profiles.json';

const EMPTY: Profile = {
  state: null,
  age: null,
  gender: null,
  occupation: null,
  land_acres: null,
  land_ownership: null,
  annual_household_income: null,
  social_category: null,
  has_bank_account: null,
  household_has_senior: null,
  household_has_student: null,
  is_income_taxpayer: null,
  is_govt_employee: null,
  family_excluded_category: null,
  in_land_records_aug_2019: null,
  covered_by_other_pension: null,
  is_widow: null,
  is_bpl: null,
  lives_in_rural_area: null,
  is_destitute: null,
};

const SCHEMES = loadSchemes();

function ask(profile: Profile, schemes: Scheme[] = SCHEMES) {
  return nextQuestions(profile, schemes, matchAll(profile, schemes));
}

function scheme(id: string, rules: Rule[]): Scheme {
  return {
    id,
    name: id,
    level: 'central',
    state: 'ALL',
    category: 'test',
    benefit_summary: 'test',
    official_url: 'https://example.com',
    last_verified: '2026-01-01',
    rules,
    documents: [],
    apply_steps: [],
    deadline: { type: 'rolling', date: null, note: 'test' },
  };
}

function rule(id: string, field: keyof Profile, op: Rule['op'], value: unknown): Rule {
  return { id, field, op, value, hard: true, explain: 'test rule' };
}

describe('nextQuestions', () => {
  it('returns at most 3 questions', () => {
    expect(ask(EMPTY).length).toBeLessThanOrEqual(3);
    expect(ask(EMPTY).length).toBeGreaterThan(0);
  });

  it('asks the most-used fields first on an empty profile (land_acres, land_ownership, then table order)', () => {
    expect(ask(EMPTY).map((q) => q.field)).toEqual([
      'land_acres',
      'land_ownership',
      'is_income_taxpayer',
    ]);
  });

  it('uses the exact question wording from docs/ARCHITECTURE.md', () => {
    const byField = Object.fromEntries(ask(EMPTY).map((q) => [q.field, q.text]));
    expect(byField.land_acres).toBe('About how many acres do you cultivate?');
    expect(byField.land_ownership).toBe('Is the land in your name, or do you cultivate it on lease?');
    expect(byField.is_income_taxpayer).toBe('Did anyone in your family pay income tax last year?');
  });

  it('gives land_ownership the three chips from the table', () => {
    const q = ask(EMPTY).find((x) => x.field === 'land_ownership');
    expect(q?.options.map((o) => o.label)).toEqual(['In my name', 'Leased', 'No land']);
    expect(q?.options.map((o) => o.value)).toEqual(['owner', 'tenant', 'none']);
  });

  it('never asks a field that is already known', () => {
    for (const sample of samples.profiles as unknown as { full_profile: Profile }[]) {
      for (const q of ask(sample.full_profile)) {
        expect(sample.full_profile[q.field], q.field).toBeNull();
      }
    }
    const known = { ...EMPTY, land_acres: 2, land_ownership: 'owner' as const };
    expect(ask(known).map((q) => q.field)).not.toContain('land_acres');
    expect(ask(known).map((q) => q.field)).not.toContain('land_ownership');
  });

  it('never asks social_category', () => {
    expect(ask(EMPTY).map((q) => q.field)).not.toContain('social_category');
  });

  it('never asks the fields no scheme uses (is_widow, is_bpl, lives_in_rural_area, is_destitute)', () => {
    const fields = ask(EMPTY).map((q) => q.field as string);
    for (const f of ['is_widow', 'is_bpl', 'lives_in_rural_area', 'is_destitute']) {
      expect(fields).not.toContain(f);
    }
  });

  it('never asks a field used only by ruled-out schemes', () => {
    const dead = scheme('dead', [
      rule('dead-land', 'land_acres', 'gt', 0),
      rule('dead-tax', 'is_income_taxpayer', 'is_false', null),
    ]);
    const live = scheme('live', [rule('live-age', 'age', 'gte', 18)]);
    const profile = { ...EMPTY, land_acres: 0 };
    const questions = ask(profile, [dead, live]);
    expect(questions.map((q) => q.field)).toEqual(['age']);
  });

  it('returns [] when every askable field is known', () => {
    const full = { ...(samples.profiles[0].full_profile as unknown as Profile), social_category: 'general' as const };
    expect(ask(full)).toEqual([]);
  });
});
