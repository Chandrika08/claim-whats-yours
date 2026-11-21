import { describe, it, expect } from 'vitest';
import { extractProfile } from './extract';
import type { Profile } from '../types';
import samples from '../data/sample-profiles.json';

const PROFILE_KEYS: (keyof Profile)[] = [
  'state', 'age', 'gender', 'occupation', 'land_acres', 'land_ownership',
  'annual_household_income', 'social_category', 'has_bank_account',
  'household_has_senior', 'household_has_student', 'is_income_taxpayer',
  'is_govt_employee', 'family_excluded_category', 'in_land_records_aug_2019',
  'covered_by_other_pension', 'is_widow', 'is_bpl', 'lives_in_rural_area', 'is_destitute',
];

type Sample = {
  id: string;
  story: string;
  expected_extraction: Record<string, unknown>;
};

const cases = samples.profiles as unknown as Sample[];

describe('extractProfile on sample stories', () => {
  for (const sample of cases) {
    it(`${sample.id} extracts exactly the expected fields`, () => {
      const { profile } = extractProfile(sample.story);
      const expected = sample.expected_extraction;

      for (const key of Object.keys(expected)) {
        expect(profile[key as keyof Profile], key).toEqual(expected[key]);
      }
    });

    it(`${sample.id} leaves fields absent from expected_extraction null`, () => {
      const { profile } = extractProfile(sample.story);
      for (const key of PROFILE_KEYS) {
        if (key in sample.expected_extraction) continue;
        expect(profile[key] ?? null, key).toBeNull();
      }
    });

    it(`${sample.id} gives an evidence snippet for every extracted field`, () => {
      const { profile, evidence } = extractProfile(sample.story);
      for (const key of Object.keys(profile)) {
        expect(evidence[key], key).toBeTruthy();
        expect(sample.story.toLowerCase()).toContain(evidence[key].toLowerCase());
      }
    });
  }
});

describe('extractProfile rules', () => {
  it('converts a monthly income to a yearly figure', () => {
    expect(extractProfile('We earn 10000 rupees a month.').profile.annual_household_income).toBe(120000);
  });

  it('reads lakh as 100000', () => {
    expect(extractProfile('Income is 2 lakh per year.').profile.annual_household_income).toBe(200000);
  });

  it('does not guess income from a bare number with no period', () => {
    expect(extractProfile('We have 50000 in savings.').profile.annual_household_income).toBeUndefined();
  });

  it('reads a leased land statement as tenant', () => {
    expect(extractProfile('I lease 2 acres.').profile.land_ownership).toBe('tenant');
  });

  it('reads a woman as female and a man as male', () => {
    expect(extractProfile('I am a woman farmer.').profile.gender).toBe('female');
    expect(extractProfile('I am a man farmer.').profile.gender).toBe('male');
  });

  it('does not read husband as a gender', () => {
    expect(extractProfile('My husband works the land.').profile.gender).toBeUndefined();
  });

  it('reads "no bank account" as false', () => {
    expect(extractProfile('I have no bank account.').profile.has_bank_account).toBe(false);
  });

  it('extracts no identifiers from a story with a long number', () => {
    const { profile } = extractProfile('My number is 9876543210 and I am 45.');
    expect(profile.age).toBe(45);
    expect(Object.values(profile)).not.toContain(9876543210);
  });

  it('returns empty objects for text with no facts', () => {
    expect(extractProfile('hello there')).toEqual({ profile: {}, evidence: {} });
  });
});
