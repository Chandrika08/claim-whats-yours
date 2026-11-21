import type { Profile } from '../types';

export type Extraction = {
  profile: Partial<Profile>;
  evidence: Record<string, string>;   // profile field -> the text snippet that produced it
};

const ACRES_RE = /\b(\d+(?:\.\d+)?)\s*acres?\b/i;
const INCOME_RE =
  /\b(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|thousand)?\s*(?:rupees|rs\.?|₹)?\s*(a year|per year|yearly|annually|per annum|a month|per month|every month|each month|monthly)\b/i;
const AGE_RE = /\b(?:i am|i'm|aged?)\s+(\d{1,3})\b/i;
const AGE_OLD_RE = /\b(\d{1,3})\s+years?\s+old\b/i;
const COUPLE_AGE_RE = /\b(?:are|were)\s+(\d{1,3})\s+and\s+(\d{1,3})\b/i;
const SENIOR_WORD_RE = /\b(?:senior citizens?|elderly)\b/i;
const STUDENT_RE = /\b(?:student|studying|college)\b/i;
const LABOUR_RE = /\bfarm\s+labou?rers?\b|\bagricultural\s+labou?rers?\b/i;
const FARMER_RE = /\b(?:i am|i'm)\b[^.]*?\bfarmers?\b/i;
const NO_LAND_RE = /\bno\s+land\b|\blandless\b/i;
const TENANT_RE = /\b(?:lease|leased|tenant|rent|rented)\b/i;
const OWNER_RE = /\b(?:i|we)\s+own\b|\bmy\s+(?:own\s+)?land\b|\bown\s+land\b/i;
const WOMAN_RE = /\bwoman\b/i;
const MAN_RE = /\bman\b/i;
const NO_BANK_RE = /\b(?:no|without a|don'?t have a)\s+(?:bank|savings)\s+account\b/i;
const BANK_RE = /\b(?:bank|savings)\s+account\b/i;
const ANDHRA_RE = /\bandhra\s+pradesh\b/i;

/**
 * Reads a plain-language story and returns the profile fields it states.
 * Keyword and regex only. A field that is not stated stays absent (null in the form).
 */
export function extractProfile(text: string): Extraction {
  const profile: Partial<Profile> = {};
  const evidence: Record<string, string> = {};

  const set = <K extends keyof Profile>(field: K, value: Profile[K], snippet: string) => {
    profile[field] = value;
    evidence[field] = snippet.trim();
  };

  const state = ANDHRA_RE.exec(text);
  if (state) set('state', 'Andhra Pradesh', state[0]);

  const acres = ACRES_RE.exec(text);
  if (acres) set('land_acres', Number(acres[1]), acres[0]);

  const income = INCOME_RE.exec(text);
  if (income) {
    const multiplier = income[2] ? (/^lakh/i.test(income[2]) ? 100000 : 1000) : 1;
    const amount = Number(income[1].replace(/,/g, '')) * multiplier;
    const periods = /month/i.test(income[3]) ? 12 : 1;
    if (Number.isFinite(amount)) set('annual_household_income', amount * periods, income[0]);
  }

  const age = AGE_RE.exec(text) ?? AGE_OLD_RE.exec(text);
  if (age) {
    const years = Number(age[1]);
    if (years >= 1 && years <= 120) set('age', years, age[0]);
  }

  // Ages of other household members, e.g. "My husband and I are 67 and 70."
  const couple = COUPLE_AGE_RE.exec(text);
  if (couple && Math.max(Number(couple[1]), Number(couple[2])) >= 60) {
    set('household_has_senior', true, couple[0]);
  }
  const senior = SENIOR_WORD_RE.exec(text);
  if (senior) set('household_has_senior', true, senior[0]);
  if (profile.age !== undefined && profile.age !== null && profile.age >= 60) {
    set('household_has_senior', true, `age ${profile.age}`);
  }

  const student = STUDENT_RE.exec(text);
  if (student) {
    set('occupation', 'student', student[0]);
    set('household_has_student', true, student[0]);
  } else {
    const labour = LABOUR_RE.exec(text);
    const farmer = labour ? null : FARMER_RE.exec(text);
    if (labour) set('occupation', 'agricultural_labourer', labour[0]);
    else if (farmer) set('occupation', 'farmer', farmer[0]);
  }

  const noLand = NO_LAND_RE.exec(text);
  const tenant = TENANT_RE.exec(text);
  const owner = OWNER_RE.exec(text);
  if (noLand) set('land_ownership', 'none', noLand[0]);
  else if (tenant) set('land_ownership', 'tenant', tenant[0]);
  else if (owner) set('land_ownership', 'owner', owner[0]);

  const woman = WOMAN_RE.exec(text);
  const man = woman ? null : MAN_RE.exec(text);
  if (woman) set('gender', 'female', woman[0]);
  else if (man) set('gender', 'male', man[0]);

  const noBank = NO_BANK_RE.exec(text);
  const bank = BANK_RE.exec(text);
  if (noBank) set('has_bank_account', false, noBank[0]);
  else if (bank) set('has_bank_account', true, bank[0]);

  return { profile, evidence };
}
