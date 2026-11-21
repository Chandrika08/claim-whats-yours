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
import { useLanguage } from '../i18n/useLanguage';
import type { TranslateFn } from '../i18n/LanguageContext';
import type { MessageKey } from '../i18n/messages';
import { optionLabel, questionCopy } from '../i18n/questionText';

type Option = { value: string; labelKey: MessageKey };

type FieldMeta = {
  labelKey?: MessageKey;
  kind: 'number' | 'boolean' | 'enum' | 'text';
  options?: Option[];
  unitKey?: MessageKey;
};

const GENDER_OPTIONS: Option[] = [
  { value: 'male', labelKey: 'option.male' },
  { value: 'female', labelKey: 'option.female' },
  { value: 'other', labelKey: 'option.other' },
];

const OCCUPATION_OPTIONS: Option[] = [
  { value: 'farmer', labelKey: 'option.farmer' },
  { value: 'agricultural_labourer', labelKey: 'option.labourer' },
  { value: 'student', labelKey: 'option.student' },
  { value: 'other', labelKey: 'option.other' },
];

const LAND_OWNERSHIP_OPTIONS: Option[] = [
  { value: 'owner', labelKey: 'option.inYourName' },
  { value: 'tenant', labelKey: 'option.leased' },
  { value: 'none', labelKey: 'option.noLand' },
];

const YES_NO_OPTIONS: Option[] = [
  { value: 'yes', labelKey: 'option.yes' },
  { value: 'no', labelKey: 'option.no' },
];

const FIELD_META: Partial<Record<keyof Profile, FieldMeta>> = {
  state: { labelKey: 'field.label.state', kind: 'text' },
  age: { labelKey: 'field.label.age', kind: 'number', unitKey: 'unit.years' },
  gender: { labelKey: 'field.label.gender', kind: 'enum', options: GENDER_OPTIONS },
  occupation: { labelKey: 'field.label.work', kind: 'enum', options: OCCUPATION_OPTIONS },
  land_acres: { labelKey: 'field.label.land', kind: 'number', unitKey: 'unit.acres' },
  land_ownership: { labelKey: 'field.label.landType', kind: 'enum', options: LAND_OWNERSHIP_OPTIONS },
  annual_household_income: { labelKey: 'field.label.income', kind: 'number' },
  has_bank_account: { labelKey: 'field.label.bankAccount', kind: 'boolean' },
  household_has_senior: { labelKey: 'field.label.senior', kind: 'boolean' },
  household_has_student: { labelKey: 'field.label.student', kind: 'boolean' },
  is_income_taxpayer: { labelKey: 'field.label.taxpayer', kind: 'boolean' },
  is_govt_employee: { labelKey: 'field.label.govtJob', kind: 'boolean' },
  family_excluded_category: { labelKey: 'field.label.excluded', kind: 'boolean' },
  in_land_records_aug_2019: { labelKey: 'field.label.landRecords', kind: 'boolean' },
  covered_by_other_pension: { labelKey: 'field.label.otherPension', kind: 'boolean' },
  is_widow: { labelKey: 'field.label.widow', kind: 'boolean' },
  is_bpl: { labelKey: 'field.label.bpl', kind: 'boolean' },
  lives_in_rural_area: { labelKey: 'field.label.rural', kind: 'boolean' },
  is_destitute: { labelKey: 'field.label.destitute', kind: 'boolean' },
};

const SAMPLE_PROFILES: { id: string; label: string; story: string }[] = sampleData.profiles;

const SAMPLE_LABEL_KEYS: Record<string, MessageKey> = {
  p1: 'sample.p1.label',
  p2: 'sample.p2.label',
  p3: 'sample.p3.label',
  p4: 'sample.p4.label',
};

const SAMPLE_AVATARS = ['🧑‍🌾', '👩‍🌾', '🧓', '🎓'];

const STEPS: { number: number; labelKey: MessageKey }[] = [
  { number: 1, labelKey: 'progress.tellUs' },
  { number: 2, labelKey: 'progress.confirm' },
  { number: 3, labelKey: 'progress.seeSchemes' },
];

const schemesFallbackMeta: FieldMeta = { kind: 'text' };

function metaFor(field: string): FieldMeta {
  const meta = FIELD_META[field as keyof Profile];
  return meta ?? schemesFallbackMeta;
}

function formatValue(field: string, value: unknown, meta: FieldMeta, t: TranslateFn): string {
  if (typeof value === 'boolean') return value ? t('option.yes') : t('option.no');
  if (typeof value === 'number') {
    if (field === 'annual_household_income') return t('format.incomePerYear', { amount: value.toLocaleString('en-IN') });
    return meta.unitKey ? `${value} ${t(meta.unitKey)}` : String(value);
  }
  if (meta.options) {
    const option = meta.options.find((o) => o.value === value);
    return option ? t(option.labelKey) : String(value);
  }
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
  label: string;
  onSave: (value: unknown) => void;
  onCancel: () => void;
};

function FieldEditor({ value, meta, label, onSave, onCancel }: FieldEditorProps) {
  const { t } = useLanguage();
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
          aria-label={label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={inputClass}
        />
      )}
      {meta.kind === 'text' && (
        <input
          type="text"
          aria-label={label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={inputClass}
        />
      )}
      {(meta.kind === 'boolean' || meta.kind === 'enum') && (
        <select
          aria-label={label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={inputClass}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.labelKey)}
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
          {t('field.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {t('field.cancel')}
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
  const { t, lang } = useLanguage();
  const [draft, setDraft] = useState('');
  const parsed = parseNumber(draft);
  const text = questionCopy(question.field, lang).text ?? question.text;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        aria-label={text}
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
          {t('field.saveAnswer')}
        </button>
        <button
          type="button"
          onClick={onNotSure}
          className="min-h-12 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {t('option.notSure')}
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
  const { t, lang } = useLanguage();

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
          {t('home.heroTitle')}
        </h1>
        <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
          {t('home.heroBody')}
        </p>
      </header>

      <ol aria-label={t('progress.label')} className="grid grid-cols-3 gap-2">
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
                {t(step.labelKey)}
              </span>
            </li>
          );
        })}
      </ol>

      <section className="flex flex-col gap-4">
        <label htmlFor="context-text" className="text-lg font-semibold text-slate-900">
          {t('home.contextLabel')}
        </label>
        <textarea
          id="context-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('home.placeholder')}
          className="min-h-[12rem] w-full rounded-2xl border-2 border-slate-300 bg-white p-4 text-base text-slate-900 shadow-soft placeholder:text-slate-500 focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-accent-300"
        />

        <div>
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600">
            <Sparkles className="h-4 w-4 text-accent-700" aria-hidden="true" />
            {t('home.sampleIntro')}
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
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent-700">{t('story.try')}</span>
                  <span>{SAMPLE_LABEL_KEYS[sample.id] ? t(SAMPLE_LABEL_KEYS[sample.id]) : sample.label}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <Button type="button" onClick={submit} disabled={text.trim() === ''} className="w-full sm:w-auto">
          {t('home.findSchemes')}
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Button>
      </section>

      {submitted && (
        <section className="flex flex-col gap-3">
          <SectionHeader
            icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}
            title={t('home.understood')}
          />
          {understoodFields.length === 0 ? (
            <p className="text-base text-slate-600">
              {t('home.noDetails')}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {understoodFields.map((field) => {
                const key = field as keyof Profile;
                const meta = metaFor(field);
                const label = meta.labelKey ? t(meta.labelKey) : field;
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
                        label={label}
                        onSave={(newValue) => {
                          setField(key, newValue);
                          setEditingField(null);
                        }}
                        onCancel={() => setEditingField(null)}
                      />
                    ) : (
                      <div className="flex flex-col gap-3">
                        <span className="text-base font-semibold text-slate-900">
                          {label}: {formatValue(field, value, meta, t)}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <Chip
                            icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
                            onClick={() => setEditingField(field)}
                          >
                            {t('field.edit')}
                          </Chip>
                          <Chip
                            icon={<X className="h-4 w-4" aria-hidden="true" />}
                            onClick={() => removeField(key)}
                          >
                            {t('field.remove')}
                          </Chip>
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-slate-600">{t('home.from')} &quot;{evidence[field]}&quot;</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {submitted && questions.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHeader title={t('home.quickQuestions')} />
          <Card className="flex flex-col gap-6 p-4 sm:p-6">
            {questions.map((question) => {
              const copy = questionCopy(question.field, lang);
              return (
                <div
                  key={question.field}
                  className="flex flex-col gap-3 border-b border-slate-100 pb-6 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-col gap-1">
                    <p className="text-lg font-semibold text-slate-900">{copy.text ?? question.text}</p>
                    {(copy.helper ?? question.helper) && (
                      <p className="text-sm text-slate-600">{copy.helper ?? question.helper}</p>
                    )}
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
                          key={String(option.value)}
                          variant="ghost"
                          onClick={() => answerQuestion(question.field, option.value)}
                          className="w-full border-2 border-primary-700"
                        >
                          {optionLabel(question.field, option.value, lang) ?? option.label}
                        </Button>
                      ))}
                      {!question.options.some((o) => o.value === null) && (
                        <Button
                          variant="ghost"
                          onClick={() => answerQuestion(question.field, null)}
                          className="w-full border-2 border-slate-400"
                        >
                          {t('option.notSure')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {submitted && (
        <div>
          <Link
            to="/results"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-primary-700 px-5 text-base font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
          >
            {t('home.seeResults')}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
