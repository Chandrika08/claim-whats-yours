import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ListChecks, Pencil, Sparkles, X } from 'lucide-react';
import { Button, Card, Chip, SectionHeader } from '../components/ui';
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

const SAMPLE_AVATARS = ['🧑‍🌾', '👩‍🌾', '🧓', '🎓'];

const STEPS = [
  { number: 1, label: 'Tell us' },
  { number: 2, label: 'Confirm' },
  { number: 3, label: 'See schemes' },
];

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
    'min-h-12 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base focus:border-primary-600 focus:outline-none';

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
          className="min-h-12 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
        className="min-h-12 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base focus:border-primary-600 focus:outline-none sm:max-w-xs"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={parsed === null}
          onClick={() => {
            if (parsed !== null) onAnswer(parsed);
          }}
          className="min-h-12 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Save answer
        </button>
        <button
          type="button"
          onClick={onNotSure}
          className="min-h-12 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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

  const currentStep = !submitted ? 1 : questions.length > 0 ? 2 : 3;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-3">
        <p className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight text-primary-800"><Sparkles className="h-5 w-5 text-accent-700" aria-hidden="true" />Hakku</p>
        <h1 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
          Missing a government scheme? Find the ones you are likely eligible for.
        </h1>
        <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
          Like Ramesh, with 2 acres and a family of five, you may hear about schemes from neighbours without knowing
          which apply. Describe your family and land in plain words, no middleman needed. This is not a guarantee.
        </p>
      </header>

      <ol aria-label="Progress" className="grid grid-cols-3 gap-2">
        {STEPS.map((step) => {
          const isDone = step.number < currentStep;
          const isActive = step.number === currentStep;
          return (
            <li
              key={step.number}
              aria-current={isActive ? 'step' : undefined}
              className="flex flex-col items-center gap-1.5 text-center"
            >
              <span
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
                  isDone || isActive ? 'bg-primary-700 text-white' : 'bg-slate-200 text-slate-600',
                  isActive ? 'ring-4 ring-accent-300' : '',
                ].join(' ')}
              >
                {isDone ? <Check className="h-5 w-5" aria-hidden="true" /> : step.number}
              </span>
              <span className={['text-xs font-semibold sm:text-sm', isActive ? 'text-slate-900' : 'text-slate-600'].join(' ')}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      <section className="flex flex-col gap-4">
        <label htmlFor="context-text" className="text-lg font-semibold text-slate-900">
          Tell us about your family and land in your own words
        </label>
        <textarea
          id="context-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="For example: I am a farmer in Andhra Pradesh. I own 2 acres in my name. I am 45 years old. Our family earns about 1 lakh a year and we have a bank account."
          className="min-h-[12rem] w-full rounded-2xl border-2 border-slate-300 bg-white p-4 text-base text-slate-900 shadow-soft placeholder:text-slate-500 focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-accent-300"
        />

        <div>
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600">
            <Sparkles className="h-4 w-4 text-accent-700" aria-hidden="true" />
            Or try a sample story:
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SAMPLE_PROFILES.map((sample, index) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => loadSample(sample.story)}
                className="flex min-h-[48px] w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left text-base font-medium text-slate-800 shadow-soft transition duration-150 hover:border-primary-500 hover:bg-primary-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-50 text-2xl"
                >
                  {SAMPLE_AVATARS[index % SAMPLE_AVATARS.length]}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent-700">Try this story</span>
                  <span>{sample.label}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <Button type="button" onClick={submit} disabled={text.trim() === ''} className="w-full sm:w-auto">
          Find schemes
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </section>

      {submitted && (
        <section className="flex flex-col gap-3">
          <SectionHeader
            icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}
            title="I understood"
          />
          {understoodFields.length === 0 ? (
            <p className="text-base text-slate-600">
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
                    className="flex flex-col gap-3 rounded-2xl border border-primary-200 bg-primary-50 p-4"
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
                      <div className="flex flex-col gap-3">
                        <span className="text-base font-semibold text-slate-900">
                          {meta.label}: {formatValue(field, value, meta)}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <Chip
                            icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
                            onClick={() => setEditingField(field)}
                          >
                            Edit
                          </Chip>
                          <Chip
                            icon={<X className="h-4 w-4" aria-hidden="true" />}
                            onClick={() => removeField(key)}
                          >
                            Remove
                          </Chip>
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-slate-600">from: &quot;{evidence[field]}&quot;</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {submitted && questions.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHeader title="A few quick questions" />
          <Card className="flex flex-col gap-6 p-4 sm:p-6">
            {questions.map((question) => (
              <div
                key={question.field}
                className="flex flex-col gap-3 border-b border-slate-100 pb-6 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-lg font-semibold text-slate-900">{question.text}</p>
                  {question.helper && <p className="text-sm text-slate-600">{question.helper}</p>}
                </div>
                {question.input === 'number' ? (
                  <NumberQuestion
                    question={question}
                    onAnswer={(value) => answerQuestion(question.field, value)}
                    onNotSure={() => answerQuestion(question.field, null)}
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {question.options.map((option) => (
                      <Button
                        key={option.label}
                        variant="ghost"
                        onClick={() => answerQuestion(question.field, option.value)}
                        className="w-full border-2 border-primary-700"
                      >
                        {option.label}
                      </Button>
                    ))}
                    {!question.options.some((o) => /not sure/i.test(o.label)) && (
                      <Button
                        variant="ghost"
                        onClick={() => answerQuestion(question.field, null)}
                        className="w-full border-2 border-slate-400"
                      >
                        Not sure
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </section>
      )}

      {submitted && (
        <div>
          <Link
            to="/results"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-primary-700 px-5 text-base font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
          >
            See my results
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}

