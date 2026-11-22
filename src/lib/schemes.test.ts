import { describe, it, expect, beforeEach } from 'vitest';
import { loadSchemes, loadSchemesOrBundled, validateSchemes, OVERRIDE_KEY } from './schemes';

describe('loadSchemes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads the six central schemes from src/data/schemes.json', () => {
    const schemes = loadSchemes();
    expect(schemes.map((s) => s.id).sort()).toEqual(
      ['kcc', 'pm-kisan', 'pm-kmy', 'pmfby', 'pmksy-pdmc', 'soil-health-card'].sort(),
    );
  });

  it('gives every scheme a unique id, a source link and rules', () => {
    const schemes = loadSchemes();
    expect(new Set(schemes.map((s) => s.id)).size).toBe(schemes.length);
    for (const s of schemes) {
      expect(s.official_url).toMatch(/^https:\/\//);
      expect(s.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.rules.length).toBeGreaterThan(0);
    }
  });

  it('a valid localStorage override replaces the scheme with the same id', () => {
    const first = loadSchemes()[0];
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify([{ ...first, name: 'Edited name' }]));
    const schemes = loadSchemes();
    expect(schemes).toHaveLength(6);
    expect(schemes.find((s) => s.id === first.id)?.name).toBe('Edited name');
  });

  it('invalid JSON in the override is ignored', () => {
    localStorage.setItem(OVERRIDE_KEY, '{not json');
    expect(loadSchemes()).toHaveLength(6);
  });

  it('an override scheme missing a required field throws naming the scheme and field', () => {
    const broken = { ...loadSchemes()[0] } as Record<string, unknown>;
    delete broken.official_url;
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify([broken]));
    expect(() => loadSchemes()).toThrow(/pm-kisan.*official_url/);
  });

  it('loadSchemesOrBundled falls back to the six bundled schemes when the override is broken', () => {
    const broken = { ...loadSchemes()[0] } as Record<string, unknown>;
    delete broken.official_url;
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify([broken]));
    expect(() => loadSchemes()).toThrow();
    expect(loadSchemesOrBundled()).toHaveLength(6);
    localStorage.removeItem(OVERRIDE_KEY);
  });
});

describe('validateSchemes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Fresh deep copy of a valid scheme, so tests never mutate the shared data.
  const freshScheme = () =>
    JSON.parse(JSON.stringify(loadSchemes()[0])) as Record<string, unknown>;

  it('throws naming the scheme id and the missing field', () => {
    const scheme = freshScheme();
    delete scheme.benefit_summary;
    expect(() => validateSchemes([scheme])).toThrow(/pm-kisan.*benefit_summary/);
  });

  it('throws when a rule is missing a required field', () => {
    const scheme = freshScheme();
    scheme.rules = [{ id: 'bad-rule', field: 'land_acres', op: 'gt', explain: 'x' }];
    expect(() => validateSchemes([scheme])).toThrow(/bad-rule.*hard/);
  });

  it('throws when the data is not an array', () => {
    expect(() => validateSchemes({})).toThrow('array');
  });
});
