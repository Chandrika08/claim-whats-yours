import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { matchAll } from '../lib/eligibility';
import { nextQuestions, type Question } from '../lib/questions';
import { loadSchemes } from '../lib/schemes';
import type { Profile } from '../types';
import sampleData from '../data/sample-profiles.json';

type Option = { value: string; label: string };

type FieldMeta = {
  label: string;
  kind: 'number' | 'boolean' | 'enum' | 'text';
  options?: Option[];
  unit?: string;
};

const GENDER_OPTIONS: Option[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const OCCUPATION_OPTIONS: Option[] = [
  { value: 'farmer', label: 'Farmer' },
  { value: 'agricultural_labourer', label: 'Farm labourer' },
  { value: 'student', label: 'Student' },
  { value: 'other', label: 'Other' },
];

const LAND_OWNERSHIP_OPTIONS: Option[] = [
  { value: 'owner', label: 'In your name' },
  { value: 'tenant', label: 'Leased' },
  { value: 'none', label: 'No land' },
];

const YES_NO_OPTIONS: Option[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const FIELD_META: Partial<Record<keyof Profile, FieldMeta>> = {
  state: { label: 'State', kind: 'text' },
  age: { label: 'Age', kind: 'number', unit: 'years' },
  gender: { label: 'Gender', kind: 'enum', options: GENDER_OPTIONS },
  occupation: { label: 'Work', kind: 'enum', options: OCCUPATION_OPTIONS },
  land_acres: { label: 'Land', kind: 'number', unit: 'acres' },
  land_ownership: { label: 'Land type', kind: 'enum', options: LAND_OWNERSHIP_OPTIONS },
  annual_household_income: { label: 'Family income', kind: 'number', unit: 'a year' },
  has_bank_account: { label: 'Savings bank account', kind: 'boolean' },
  household_has_senior: { label: 'Someone aged 60+ at home', kind: 'boolean' },
  household_has_student: { label: 'Student at home', kind: 'boolean' },
  is_income_taxpayer: { label: 'Income tax paid last year', kind: 'boolean' },
  is_govt_employee: { label: 'Government job in family', kind: 'boolean' },
  family_excluded_category: { label: 'Official, professional or high pension in family', kind: 'boolean' },
  in_land_records_aug_2019: { label: 'In land records on 1 Aug 2019', kind: 'boolean' },
  covered_by_other_pension: { label: 'Covered by another pension', kind: 'boolean' },
  is_widow: { label: 'Widow', kind: 'boolean' },
  is_bpl: { label: 'Below poverty line (BPL)', kind: 'boolean' },
  lives_in_rural_area: { label: 'Lives in a rural area', kind: 'boolean' },
  is_destitute: { label: 'Little or no means of living', kind: 'boolean' },
};

const SAMPLE_PROFILES: { id: string; label: string; story: string }[] = sampleData.profiles;

const schemesFallbackMeta: FieldMeta = { label: '', kind: 'text' };

function metaFor(field: string): FieldMeta {
  const meta = FIELD_META[field as keyof Profile];
  return meta ?? { ...schemesFallbackMeta, label: field };
}

function formatValue(field: string, value: unknown, meta: FieldMeta): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (field === 'annual_household_income') return `Rs ${value.toLocaleString('en-IN')} a year`;
    return meta.unit ? `${value} ${meta.unit}` : String(value);
  }
  if (meta.options) return meta.options.find((o) => o.value === value)?.label ?? String(value);
  return String(value);
}

function parseNumber(draft: string): number | null {
  const trimmed = draft.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function initialDraft(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (value === null || value === undefined) return '';
  return String(value);
}

type FieldEditorProps = {
  value: unknown;
  meta: FieldMeta;
  onSave: (value: unknown) => void;
  onCancel: () => void;
};

function FieldEditor({ value, meta, onSave, onCancel }: FieldEditorProps) {
  const [draft, setDraft] = useState(() => initialDraft(value));
  const options = meta.kind === 'boolean' ? YES_NO_OPTIONS : meta.options ?? [];

  const parsed: unknown =
    meta.kind === 'number'
      ? parseNumber(draft)
      : meta.kind === 'boolean'
        ? draft === 'yes'
        : draft.trim();
  const canSave = meta.kind === 'number' ? parsed !== null : draft.trim() !== '';

  const inputClass =
    'min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base focus:border-green-700 focus:outline-none';

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      {meta.kind === 'number' && (
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          aria-label={meta.label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={inputClass}
        />
      )}
      {meta.kind === 'text' && (
        <input
          type="text"
          aria-label={meta.label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={inputClass}
        />
      )}
      {(meta.kind === 'boolean' || meta.kind === 'enum') && (
        <select
          aria-label={meta.label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={inputClass}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave(parsed)}
          className="min-h-11 rounded-md bg-green-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-md border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

type NumberQuestionProps = {
  question: Question;
  onAnswer: (value: number) => void;
  onNotSure: () => void;
};

function NumberQuestion({ question, onAnswer, onNotSure }: NumberQuestionProps) {
  const [draft, setDraft] = useState('');
  const parsed = parseNumber(draft);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        aria-label={question.text}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base focus:border-green-700 focus:outline-none sm:max-w-xs"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={parsed === null}
          onClick={() => {
            if (parsed !== null) onAnswer(parsed);
          }}
          className="min-h-11 rounded-md bg-green-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Save answer
        </button>
        <button
          type="button"
          onClick={onNotSure}
          className="min-h-11 rounded-md border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Not sure
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const {
    text,
    setText,
    profile,
    evidence,
    submitted,
    dismissed,
    submit,
    loadSample,
    setField,
    removeField,
    answerQuestion,
  } = useProfile();

  const [editingField, setEditingField] = useState<string | null>(null);

  const schemes = useMemo(() => loadSchemes(), []);
  const results = matchAll(profile as Profile, schemes);
  const questions = nextQuestions(profile as Profile, schemes, results).filter(
    (q) => !dismissed.includes(q.field),
  );

  const understoodFields = submitted
    ? Object.keys(evidence).filter((field) => {
        if (field === 'social_category') return false;
        const value = profile[field as keyof Profile];
        return value !== undefined && value !== null;
      })
    : [];

  const buttonBase =
    'min-h-11 rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 hover:border-green-700 hover:text-green-700';
  const chipOptionClass =
    'min-h-11 rounded-full border border-green-700 bg-white px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-50';

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Claim What's Yours</h1>
        <p className="text-base text-gray-600">
          Describe your family and land in simple words. We will show schemes you are likely eligible for. This is
          not a guarantee.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <label htmlFor="context-text" className="text-base font-semibold text-gray-900">
          Tell us about your family and land in your own words
        </label>
        <textarea
          id="context-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[10rem] w-full rounded-md border border-gray-300 bg-white p-3 text-base focus:border-green-700 focus:outline-none"
        />

        <div>
          <p className="mb-2 text-sm text-gray-600">Or try a sample story:</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SAMPLE_PROFILES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => loadSample(sample.story)}
                className={buttonBase}
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={text.trim() === ''}
          className="min-h-11 rounded-md bg-green-700 px-6 py-2 text-base font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Find schemes
        </button>
      </section>

      {submitted && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-gray-900">I understood</h2>
          {understoodFields.length === 0 ? (
            <p className="text-sm text-gray-600">
              We could not pick out any details yet. Add a little more about your family or land.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {understoodFields.map((field) => {
                const key = field as keyof Profile;
                const meta = metaFor(field);
                const value = profile[key];
                const isEditing = editingField === field;
                return (
                  <li
                    key={field}
                    className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 p-3"
                  >
                    {isEditing ? (
                      <FieldEditor
                        value={value}
                        meta={meta}
                        onSave={(newValue) => {
                          setField(key, newValue);
                          setEditingField(null);
                        }}
                        onCancel={() => setEditingField(null)}
                      />
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-base font-medium text-gray-900">
                          {meta.label}: {formatValue(field, value, meta)}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingField(field)}
                            className="min-h-11 rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeField(key)}
                            className="min-h-11 rounded-md border border-red-300 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-600">from: &quot;{evidence[field]}&quot;</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {questions.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-900">A few quick questions</h2>
          {questions.map((question) => (
            <div key={question.field} className="flex flex-col gap-2">
              <p className="text-base font-medium text-gray-900">{question.text}</p>
              {question.helper && <p className="text-xs text-gray-500">{question.helper}</p>}
              {question.input === 'number' ? (
                <NumberQuestion
                  question={question}
                  onAnswer={(value) => answerQuestion(question.field, value)}
                  onNotSure={() => answerQuestion(question.field, null)}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {question.options.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => answerQuestion(question.field, option.value)}
                      className={chipOptionClass}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <div>
        <Link
          to="/results"
          className="inline-flex min-h-11 items-center text-base font-semibold text-green-700 underline hover:text-green-800"
        >
          See my results
        </Link>
      </div>
    </div>
  );
}
