import type { MatchResult, Profile, Scheme } from '../types';

export type AnswerOption = {
  label: string;
  value: string | boolean | null;   // value written to the profile field; null = "Not sure", stays unknown
};

export type Question = {
  field: keyof Profile;
  text: string;                     // exact wording from docs/ARCHITECTURE.md
  input: 'chips' | 'yes_no' | 'number';
  options: AnswerOption[];          // empty for number inputs
  helper?: string;
};

const YES_NO: AnswerOption[] = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
  { label: 'Not sure', value: null },
];

// Table order from docs/ARCHITECTURE.md. Excludes social_category and the four unused fields.
const QUESTIONS: Question[] = [
  {
    field: 'land_ownership',
    text: 'Is the land in your name, or do you cultivate it on lease?',
    input: 'chips',
    options: [
      { label: 'In my name', value: 'owner' },
      { label: 'Leased', value: 'tenant' },
      { label: 'No land', value: 'none' },
    ],
  },
  {
    field: 'land_acres',
    text: 'About how many acres do you cultivate?',
    input: 'number',
    options: [],
  },
  {
    field: 'age',
    text: 'How old are you?',
    input: 'number',
    options: [],
  },
  {
    field: 'annual_household_income',
    text: 'About how much does your family earn in a year?',
    input: 'number',
    options: [],
    helper: '1 lakh = 1,00,000 rupees',
  },
  {
    field: 'has_bank_account',
    text: 'Do you have a savings bank account?',
    input: 'yes_no',
    options: YES_NO,
  },
  {
    field: 'is_income_taxpayer',
    text: 'Did anyone in your family pay income tax last year?',
    input: 'yes_no',
    options: YES_NO,
  },
  {
    field: 'is_govt_employee',
    text: 'Does anyone in your family work, or used to work, for the government? (Not counting peons or Class IV staff)',
    input: 'yes_no',
    options: YES_NO,
  },
  {
    field: 'family_excluded_category',
    text: 'Is anyone in your family a current or former minister, MP, MLA or mayor, a registered doctor, engineer, lawyer, CA or architect, or getting a pension of Rs 10,000 or more a month?',
    input: 'yes_no',
    options: YES_NO,
  },
  {
    field: 'in_land_records_aug_2019',
    text: 'Was your name in the land records on 1 August 2019?',
    input: 'yes_no',
    options: YES_NO,
  },
  {
    field: 'covered_by_other_pension',
    text: 'Are you already covered by any other pension scheme (such as NPS, ESIC or EPFO)?',
    input: 'yes_no',
    options: YES_NO,
  },
];

/**
 * Returns up to 3 follow-up questions. Only null fields that a hard rule of a
 * not-ruled-out scheme (result not 'not_eligible') depends on are considered.
 * Ordered by number of such schemes (descending), then by table order.
 */
export function nextQuestions(profile: Profile, schemes: Scheme[], results: MatchResult[]): Question[] {
  const ruledOut = new Set(results.filter((r) => r.status === 'not_eligible').map((r) => r.schemeId));
  const counts = new Map<keyof Profile, number>();

  for (const scheme of schemes) {
    if (ruledOut.has(scheme.id)) continue;
    const unknownFields = new Set(
      scheme.rules
        .filter((rule) => rule.hard && (profile[rule.field] === null || profile[rule.field] === undefined))
        .map((rule) => rule.field),
    );
    for (const field of unknownFields) {
      counts.set(field, (counts.get(field) ?? 0) + 1);
    }
  }

  return QUESTIONS.map((question, index) => ({ question, index, count: counts.get(question.field) ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .slice(0, 3)
    .map((entry) => entry.question);
}
