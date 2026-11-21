import type { Scheme } from '../types';
import schemesData from '../data/schemes.json';

export const OVERRIDE_KEY = 'cwy.schemes.override.v1';

const REQUIRED_SCHEME_FIELDS = [
  'id',
  'name',
  'level',
  'state',
  'category',
  'benefit_summary',
  'official_url',
  'last_verified',
  'rules',
  'documents',
  'apply_steps',
  'deadline',
] as const;

const REQUIRED_RULE_FIELDS = ['id', 'field', 'op', 'hard', 'explain'] as const;

/** Throws an Error naming the scheme id and the missing field. */
export function validateSchemes(data: unknown): Scheme[] {
  if (!Array.isArray(data)) {
    throw new Error('Schemes must be an array');
  }
  for (const raw of data) {
    const scheme = raw as Record<string, unknown>;
    for (const field of REQUIRED_SCHEME_FIELDS) {
      if (scheme[field] === undefined || scheme[field] === null) {
        throw new Error(`Scheme "${String(scheme.id)}" is missing field "${field}"`);
      }
    }
    if (!Array.isArray(scheme.rules)) {
      throw new Error(`Scheme "${String(scheme.id)}" has no rules array`);
    }
    for (const rawRule of scheme.rules) {
      const rule = rawRule as Record<string, unknown>;
      for (const field of REQUIRED_RULE_FIELDS) {
        if (rule[field] === undefined || rule[field] === null) {
          throw new Error(`Scheme "${String(scheme.id)}" rule "${String(rule.id)}" is missing field "${field}"`);
        }
      }
    }
  }
  return data as Scheme[];
}

/**
 * Loads schemes from src/data/schemes.json. A valid localStorage override
 * (same shape, an array of schemes) is merged in: override entries replace
 * bundled schemes with the same id and new ids are added.
 */
export function loadSchemes(): Scheme[] {
  const bundled = validateSchemes(schemesData);

  let override: Scheme[] = [];
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(OVERRIDE_KEY) : null;
  if (stored) {
    try {
      override = validateSchemes(JSON.parse(stored));
    } catch (err) {
      // Invalid JSON is ignored; a scheme missing a field is a real error and is rethrown.
      if (err instanceof SyntaxError) {
        override = [];
      } else {
        throw err;
      }
    }
  }

  const overrideIds = new Set(override.map((s) => s.id));
  return [...bundled.filter((s) => !overrideIds.has(s.id)), ...override];
}
