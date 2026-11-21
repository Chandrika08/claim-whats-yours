import { describe, it, expect } from 'vitest';
import { LANG_STORAGE_KEY } from './types';
import { getStoredLang, translate } from './LanguageContext';
import { EN_MESSAGES, MESSAGES } from './messages';
import type { MessageKey } from './messages';
import { optionLabel, questionCopy } from './questionText';
import { localizeScheme, schemeTranslationGaps, SCHEME_TRANSLATION_IDS } from './schemeContent';
import schemesJson from '../data/schemes.json';
import sampleData from '../data/sample-profiles.json';

describe('language storage', () => {
  it('uses the hakku.lang.v1 storage key', () => {
    expect(LANG_STORAGE_KEY).toBe('hakku.lang.v1');
  });

  it('maps stored values to supported languages and falls back to English', () => {
    expect(getStoredLang(null)).toBe('en');
    expect(getStoredLang('xx')).toBe('en');
    expect(getStoredLang('te')).toBe('te');
    expect(getStoredLang('hi')).toBe('hi');
  });
});

describe('message completeness', () => {
  it('every English key has a non-empty Telugu and Hindi string', () => {
    const keys = Object.keys(EN_MESSAGES) as MessageKey[];
    for (const key of keys) {
      expect((MESSAGES.te[key] ?? '').trim(), `te: ${key}`).not.toBe('');
      expect((MESSAGES.hi[key] ?? '').trim(), `hi: ${key}`).not.toBe('');
    }
  });
});

describe('placeholder substitution', () => {
  it('substitutes {count} when the English text contains it', () => {
    expect(translate('en', 'home.schemesFound', { count: 3 })).toBe('We found 3 schemes that may fit.');
  });

  it('leaves an unknown placeholder untouched', () => {
    expect(translate('en', 'home.schemesFound', { other: 1 })).toBe('We found {count} schemes that may fit.');
  });
});

describe('question copy', () => {
  it('returns non-empty Telugu text for land_ownership', () => {
    expect(questionCopy('land_ownership', 'te').text).toBeTruthy();
  });

  it('returns undefined text for English so callers fall back', () => {
    expect(questionCopy('land_ownership', 'en').text).toBeUndefined();
  });
});

describe('home and tracker translations', () => {
  it('translates year and acre units and the income format in Telugu and Hindi', () => {
    expect(translate('te', 'unit.years')).toBe('సంవత్సరాలు');
    expect(translate('hi', 'unit.years')).toBe('साल');
    expect(translate('te', 'unit.acres')).toBe('ఎకరాలు');
    expect(translate('hi', 'unit.acres')).toBe('एकड़');
    expect(translate('te', 'format.incomePerYear', { amount: '1,00,000' })).toContain('1,00,000');
    expect(translate('hi', 'format.incomePerYear', { amount: '1,00,000' })).toContain('1,00,000');
  });

  it('keeps the English Home unit and income wording unchanged', () => {
    expect(translate('en', 'unit.years')).toBe('years');
    expect(translate('en', 'unit.acres')).toBe('acres');
    expect(translate('en', 'format.incomePerYear', { amount: '100,000' })).toBe('Rs 100,000 a year');
  });

  it('translates every sample story title in Telugu and Hindi', () => {
    for (const sample of sampleData.profiles) {
      const key = `sample.${sample.id}.label` as MessageKey;
      expect(EN_MESSAGES[key], `en: ${key}`).toBe(sample.label);
      expect(MESSAGES.te[key], `te: ${key}`).not.toBe(sample.label);
      expect(MESSAGES.hi[key], `hi: ${key}`).not.toBe(sample.label);
    }
  });

  it('translates the Tracker Notes label in Telugu and Hindi', () => {
    expect(translate('en', 'tracker.field.notes')).toBe('Notes');
    expect(translate('te', 'tracker.field.notes')).toBe('గమనికలు');
    expect(translate('hi', 'tracker.field.notes')).toBe('नोट्स');
  });

  it('has Telugu and Hindi prompts and helper text for the follow-up questions', () => {
    const fields = [
      'land_ownership',
      'land_acres',
      'age',
      'annual_household_income',
      'has_bank_account',
      'is_income_taxpayer',
      'is_govt_employee',
      'family_excluded_category',
      'in_land_records_aug_2019',
      'covered_by_other_pension',
    ];
    for (const lang of ['te', 'hi'] as const) {
      for (const field of fields) {
        expect(questionCopy(field, lang).text, `${lang}: ${field}`).toBeTruthy();
      }
      expect(questionCopy('annual_household_income', lang).helper, `${lang}: helper`).toBeTruthy();
    }
  });

  it('translates answer labels while leaving the English canonical values unchanged', () => {
    expect(optionLabel('land_ownership', 'owner', 'te')).toBe('మీ పేరు మీద');
    expect(optionLabel('land_ownership', 'tenant', 'hi')).toBe('पट्टे पर');
    expect(optionLabel('has_bank_account', true, 'hi')).toBe('हाँ');
    expect(optionLabel('has_bank_account', null, 'te')).toBe('తెలియదు');
    expect(optionLabel('land_ownership', 'owner', 'en')).toBeUndefined();
  });
});

describe('scheme translation mappings', () => {
  const SCHEMES = schemesJson as unknown as Array<Record<string, unknown> & { id: string }>;

  it('registers a mapping for every scheme in schemes.json', () => {
    expect([...SCHEME_TRANSLATION_IDS].sort()).toEqual(SCHEMES.map((s) => s.id).sort());
  });

  it('reports no translation gaps for Telugu or Hindi', () => {
    expect(schemeTranslationGaps(SCHEMES, 'te')).toEqual([]);
    expect(schemeTranslationGaps(SCHEMES, 'hi')).toEqual([]);
  });

  it('translates category and benefit summary, and keeps ids, URLs and deadline dates', () => {
    for (const scheme of SCHEMES) {
      for (const lang of ['te', 'hi'] as const) {
        const localized = localizeScheme(scheme, lang);
        expect(localized.id, `${lang}: ${scheme.id} id`).toBe(scheme.id);
        expect(localized.official_url, `${lang}: ${scheme.id} url`).toBe(scheme.official_url);
        expect(localized.category, `${lang}: ${scheme.id} category`).not.toBe(scheme.category);
        expect(localized.benefit_summary, `${lang}: ${scheme.id} summary`).not.toBe(scheme.benefit_summary);
        expect((localized.deadline as Record<string, unknown>).date).toBe(
          (scheme.deadline as Record<string, unknown>).date,
        );
      }
    }
  });
});
