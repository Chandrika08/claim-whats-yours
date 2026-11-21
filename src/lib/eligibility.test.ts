import { describe, it, expect } from 'vitest';
import { evaluateRule, evaluateScheme, matchAll } from './eligibility';
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

function profile(over: Partial<Profile>): Profile {
  return { ...EMPTY, ...over };
}

function rule(field: keyof Profile, op: Rule['op'], value?: unknown, hard = true): Rule {
  return { id: `${field}-${op}`, field, op, value, hard, explain: 'test rule' };
}

function scheme(rules: Rule[]): Scheme {
  return {
    id: 'test-scheme',
    name: 'Test scheme',
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

describe('evaluateRule ops', () => {
  it('eq', () => {
    const r = rule('occupation', 'eq', 'farmer');
    expect(evaluateRule(r, profile({ occupation: 'farmer' })).result).toBe('pass');
    expect(evaluateRule(r, profile({ occupation: 'student' })).result).toBe('fail');
  });

  it('neq', () => {
    const r = rule('occupation', 'neq', 'student');
    expect(evaluateRule(r, profile({ occupation: 'farmer' })).result).toBe('pass');
    expect(evaluateRule(r, profile({ occupation: 'student' })).result).toBe('fail');
  });

  it('lt', () => {
    const r = rule('land_acres', 'lt', 2);
    expect(evaluateRule(r, profile({ land_acres: 1 })).result).toBe('pass');
    expect(evaluateRule(r, profile({ land_acres: 2 })).result).toBe('fail');
  });

  it('lte', () => {
    const r = rule('land_acres', 'lte', 2);
    expect(evaluateRule(r, profile({ land_acres: 2 })).result).toBe('pass');
    expect(evaluateRule(r, profile({ land_acres: 2.1 })).result).toBe('fail');
  });

  it('gt', () => {
    const r = rule('land_acres', 'gt', 0);
    expect(evaluateRule(r, profile({ land_acres: 0 })).result).toBe('fail');
    expect(evaluateRule(r, profile({ land_acres: 0.5 })).result).toBe('pass');
  });

  it('gte', () => {
    const r = rule('age', 'gte', 18);
    expect(evaluateRule(r, profile({ age: 18 })).result).toBe('pass');
    expect(evaluateRule(r, profile({ age: 17 })).result).toBe('fail');
  });

  it('in', () => {
    const r = rule('land_ownership', 'in', ['owner', 'tenant']);
    expect(evaluateRule(r, profile({ land_ownership: 'owner' })).result).toBe('pass');
    expect(evaluateRule(r, profile({ land_ownership: 'none' })).result).toBe('fail');
  });

  it('not_in', () => {
    const r = rule('land_ownership', 'not_in', ['none']);
    expect(evaluateRule(r, profile({ land_ownership: 'owner' })).result).toBe('pass');
    expect(evaluateRule(r, profile({ land_ownership: 'none' })).result).toBe('fail');
  });

  it('is_true', () => {
    const r = rule('has_bank_account', 'is_true');
    expect(evaluateRule(r, profile({ has_bank_account: true })).result).toBe('pass');
    expect(evaluateRule(r, profile({ has_bank_account: false })).result).toBe('fail');
  });

  it('is_false', () => {
    const r = rule('is_govt_employee', 'is_false');
    expect(evaluateRule(r, profile({ is_govt_employee: false })).result).toBe('pass');
    expect(evaluateRule(r, profile({ is_govt_employee: true })).result).toBe('fail');
  });
});

describe('null handling', () => {
  it('a null profile value gives unknown for every op', () => {
    const ops: Rule['op'][] = ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in', 'not_in', 'is_true', 'is_false'];
    for (const op of ops) {
      const result = evaluateRule(rule('land_acres', op, 1), EMPTY);
      expect(result.result, op).toBe('unknown');
      expect(result.profileValue, op).toBeNull();
    }
  });

  it('a hard unknown makes the scheme possibly_eligible and lists the field', () => {
    const s = scheme([rule('land_acres', 'gt', 0), rule('age', 'gte', 18)]);
    const result = evaluateScheme(s, profile({ land_acres: 2 }));
    expect(result.status).toBe('possibly_eligible');
    expect(result.missingFields).toEqual(['age']);
  });

  it('a hard fail beats a hard unknown', () => {
    const s = scheme([rule('land_acres', 'gt', 0), rule('age', 'gte', 18)]);
    const result = evaluateScheme(s, profile({ land_acres: 0 }));
    expect(result.status).toBe('not_eligible');
  });

  it('an unknown soft rule does not change status', () => {
    const s = scheme([rule('land_acres', 'gt', 0), rule('has_bank_account', 'is_true', null, false)]);
    const result = evaluateScheme(s, profile({ land_acres: 2 }));
    expect(result.status).toBe('likely_eligible');
    expect(result.missingFields).toEqual([]);
  });
});

describe('evaluateScheme', () => {
  it('all hard rules pass gives likely_eligible', () => {
    const s = scheme([rule('land_acres', 'gt', 0), rule('occupation', 'eq', 'farmer')]);
    const result = evaluateScheme(s, profile({ land_acres: 2, occupation: 'farmer' }));
    expect(result.status).toBe('likely_eligible');
    expect(result.ruleResults).toHaveLength(2);
  });

  it('a failed soft rule is reported but does not change status', () => {
    const s = scheme([rule('land_acres', 'gt', 0), rule('land_acres', 'lte', 1, false)]);
    const result = evaluateScheme(s, profile({ land_acres: 2 }));
    expect(result.status).toBe('likely_eligible');
    expect(result.ruleResults[1].result).toBe('fail');
  });
});

describe('matchAll', () => {
  it('returns one result per scheme, in order', () => {
    const schemes = [scheme([rule('age', 'gte', 18)]), { ...scheme([]), id: 'second' }];
    const results = matchAll(profile({ age: 30 }), schemes);
    expect(results.map((r) => r.schemeId)).toEqual(['test-scheme', 'second']);
  });
});

describe('sample profiles against seed schemes', () => {
  const schemes = loadSchemes();
  const cases = samples.profiles as unknown as { id: string; full_profile: Profile }[];

  const expected: Record<string, Record<string, 'likely_eligible' | 'not_eligible'>> = {
    p1: {
      'pm-kisan': 'likely_eligible',
      pmfby: 'likely_eligible',
      kcc: 'likely_eligible',
      'pm-kmy': 'not_eligible',
      'soil-health-card': 'likely_eligible',
      'pmksy-pdmc': 'likely_eligible',
    },
    p2: {
      'pm-kisan': 'not_eligible',
      pmfby: 'likely_eligible',
      kcc: 'likely_eligible',
      'pm-kmy': 'not_eligible',
      'soil-health-card': 'likely_eligible',
      'pmksy-pdmc': 'likely_eligible',
    },
    p3: {
      'pm-kisan': 'not_eligible',
      pmfby: 'not_eligible',
      kcc: 'not_eligible',
      'pm-kmy': 'not_eligible',
      'soil-health-card': 'not_eligible',
      'pmksy-pdmc': 'not_eligible',
    },
    p4: {
      'pm-kisan': 'likely_eligible',
      pmfby: 'likely_eligible',
      kcc: 'likely_eligible',
      'pm-kmy': 'likely_eligible',
      'soil-health-card': 'not_eligible',
      'pmksy-pdmc': 'not_eligible',
    },
  };

  for (const sample of cases) {
    it(`profile ${sample.id} matches expected outcomes`, () => {
      const results = matchAll(sample.full_profile, schemes);
      const byId = Object.fromEntries(results.map((r) => [r.schemeId, r.status]));
      expect(byId).toEqual(expected[sample.id]);
    });
  }
});
