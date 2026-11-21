import type { MatchResult, Profile, Rule, RuleResult, Scheme } from '../types';

function applyOp(rule: Rule, value: unknown): boolean {
  switch (rule.op) {
    case 'eq':
      return value === rule.value;
    case 'neq':
      return value !== rule.value;
    case 'lt':
      return typeof value === 'number' && typeof rule.value === 'number' && value < rule.value;
    case 'lte':
      return typeof value === 'number' && typeof rule.value === 'number' && value <= rule.value;
    case 'gt':
      return typeof value === 'number' && typeof rule.value === 'number' && value > rule.value;
    case 'gte':
      return typeof value === 'number' && typeof rule.value === 'number' && value >= rule.value;
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(value);
    case 'not_in':
      return Array.isArray(rule.value) && !rule.value.includes(value);
    case 'is_true':
      return value === true;
    case 'is_false':
      return value === false;
  }
}

/** Evaluates one rule against the profile. A null profile value gives "unknown". */
export function evaluateRule(rule: Rule, profile: Profile): RuleResult {
  const value = profile[rule.field];
  if (value === null || value === undefined) {
    return { ruleId: rule.id, field: rule.field, result: 'unknown', explain: rule.explain, profileValue: null };
  }
  return {
    ruleId: rule.id,
    field: rule.field,
    result: applyOp(rule, value) ? 'pass' : 'fail',
    explain: rule.explain,
    profileValue: value,
  };
}

/**
 * Any hard fail -> not_eligible. No hard fail but a hard unknown -> possibly_eligible.
 * All hard rules pass -> likely_eligible. Soft rules are reported but never change status.
 */
export function evaluateScheme(scheme: Scheme, profile: Profile): MatchResult {
  const ruleResults = scheme.rules.map((rule) => evaluateRule(rule, profile));
  const hardResults = ruleResults.filter((_, i) => scheme.rules[i].hard);

  if (hardResults.some((r) => r.result === 'fail')) {
    return { schemeId: scheme.id, status: 'not_eligible', ruleResults, missingFields: [] };
  }

  const missing = hardResults.filter((r) => r.result === 'unknown');
  if (missing.length > 0) {
    const missingFields = [...new Set(missing.map((r) => r.field))];
    return { schemeId: scheme.id, status: 'possibly_eligible', ruleResults, missingFields };
  }

  return { schemeId: scheme.id, status: 'likely_eligible', ruleResults, missingFields: [] };
}

/** Evaluates every scheme against the profile, in the order given. */
export function matchAll(profile: Profile, schemes: Scheme[]): MatchResult[] {
  return schemes.map((scheme) => evaluateScheme(scheme, profile));
}
