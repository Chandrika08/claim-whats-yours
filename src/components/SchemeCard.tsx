import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, CircleAlert, Clock, ExternalLink, HelpCircle, X } from 'lucide-react';
import { Badge, Button, Card, Collapsible, ProgressBar } from './ui';
import type { BadgeTone } from './ui';
import type { MatchResult, Profile, RuleResult, Scheme } from '../types';
import { loadTracker, upsertEntry } from '../lib/tracker';
import { useLanguage } from '../i18n/useLanguage';
import type { TranslateFn } from '../i18n/LanguageContext';
import type { MessageKey } from '../i18n/messages';
import { localizeScheme } from '../i18n/schemeContent';

const REVERIFY_AFTER_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const STATUS_BADGE: Record<
  MatchResult['status'],
  { labelKey: MessageKey; tone: BadgeTone; icon: ReactNode }
> = {
  likely_eligible: {
    labelKey: 'eligibility.likely',
    tone: 'eligible',
    icon: <Check className="h-4 w-4" aria-hidden="true" />,
  },
  possibly_eligible: {
    labelKey: 'eligibility.possible',
    tone: 'possible',
    icon: <Clock className="h-4 w-4" aria-hidden="true" />,
  },
  not_eligible: {
    labelKey: 'eligibility.not',
    tone: 'notEligible',
    icon: <X className="h-4 w-4" aria-hidden="true" />,
  },
};

const RULE_ICON: Record<RuleResult['result'], { icon: ReactNode; className: string }> = {
  pass: { icon: <Check className="h-5 w-5" aria-hidden="true" />, className: 'text-eligible bg-primary-100' },
  fail: { icon: <X className="h-5 w-5" aria-hidden="true" />, className: 'text-notEligible bg-slate-200' },
  unknown: { icon: <HelpCircle className="h-5 w-5" aria-hidden="true" />, className: 'text-slate-600 bg-slate-200' },
};

const FIELD_KEYS: Record<keyof Profile, MessageKey> = {
  state: 'reason.field.state',
  age: 'reason.field.age',
  gender: 'reason.field.gender',
  occupation: 'reason.field.occupation',
  land_acres: 'reason.field.land_acres',
  land_ownership: 'reason.field.land_ownership',
  annual_household_income: 'reason.field.annual_household_income',
  social_category: 'reason.field.social_category',
  has_bank_account: 'reason.field.has_bank_account',
  household_has_senior: 'reason.field.household_has_senior',
  household_has_student: 'reason.field.household_has_student',
  is_income_taxpayer: 'reason.field.is_income_taxpayer',
  is_govt_employee: 'reason.field.is_govt_employee',
  family_excluded_category: 'reason.field.family_excluded_category',
  in_land_records_aug_2019: 'reason.field.in_land_records_aug_2019',
  covered_by_other_pension: 'reason.field.covered_by_other_pension',
  is_widow: 'reason.field.is_widow',
  is_bpl: 'reason.field.is_bpl',
  lives_in_rural_area: 'reason.field.lives_in_rural_area',
  is_destitute: 'reason.field.is_destitute',
};

/** Localised label for a profile field name. Unknown fields fall back to the raw name. */
export function fieldLabel(t: TranslateFn, field: string): string {
  const key = (FIELD_KEYS as Record<string, MessageKey | undefined>)[field];
  return key ? t(key) : field;
}

function formatValue(value: unknown, t: TranslateFn): string {
  if (value === null || value === undefined) return t('card.value.unknown');
  if (typeof value === 'boolean') return t(value ? 'card.value.yes' : 'card.value.no');
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function needsReverification(lastVerified: string): boolean {
  const verifiedAt = Date.parse(lastVerified);
  if (Number.isNaN(verifiedAt)) return false;
  return Date.now() - verifiedAt > REVERIFY_AFTER_DAYS * MS_PER_DAY;
}

function DocumentItem({
  doc,
  checked,
  onToggle,
}: {
  doc: Scheme['documents'][number];
  checked: boolean;
  onToggle: () => void;
}) {
  const { t } = useLanguage();
  return (
    <li>
      <label
        className={[
          'flex min-h-[48px] cursor-pointer items-start gap-3 rounded-xl border p-3 transition duration-150',
          checked ? 'border-primary-200 bg-primary-50' : 'border-slate-200 bg-white hover:bg-primary-50',
        ].join(' ')}
      >
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 accent-primary-700"
          checked={checked}
          onChange={onToggle}
        />
        <span className="flex-1">
          <span className="block font-semibold text-slate-900">{doc.name}</span>
          <span className="block text-sm text-slate-600">{t('card.docWhy', { why: doc.why })}</span>
          <span className="block text-sm text-slate-600">{t('card.docWhere', { where: doc.where_to_get })}</span>
        </span>
      </label>
    </li>
  );
}

export default function SchemeCard({ scheme, result }: { scheme: Scheme; result: MatchResult }) {
  const { t, lang } = useLanguage();
  const localized = useMemo(() => localizeScheme(scheme, lang), [scheme, lang]);
  const [tracked, setTracked] = useState(() => loadTracker().some((e) => e.schemeId === scheme.id));
  const documents = localized.documents ?? [];
  const applySteps = localized.apply_steps ?? [];
  const stale = needsReverification(scheme.last_verified);
  const [checkedDocs, setCheckedDocs] = useState<boolean[]>(() => documents.map(() => false));
  const readyCount = checkedDocs.filter(Boolean).length;
  const status = STATUS_BADGE[result.status];

  const explainFor = (r: RuleResult): string =>
    localized.rules.find((rule) => rule.id === r.ruleId)?.explain ?? r.explain;

  const toggleDoc = (index: number) =>
    setCheckedDocs((prev) => prev.map((value, i) => (i === index ? !value : value)));

  const addToTracker = () => {
    if (loadTracker().some((e) => e.schemeId === scheme.id)) {
      setTracked(true);
      return;
    }
    upsertEntry(scheme.id, {
      status: 'not_started',
      deadline: scheme.deadline?.date ?? null,
    });
    setTracked(true);
  };

  return (
    <Card animate className="flex flex-col gap-4 border border-slate-200">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">
            {scheme.level === 'central' ? t('card.level.central') : t('card.level.state')}
          </Badge>
          <Badge tone={status.tone} icon={status.icon}>
            {t(status.labelKey)}
          </Badge>
        </div>
        <h3 className="text-lg font-bold leading-snug text-slate-900">{localized.name}</h3>
        <p className="rounded-xl bg-primary-50 px-4 py-3 text-base font-medium text-primary-900">
          {localized.benefit_summary}
        </p>
      </header>

      {result.ruleResults.length > 0 && (
        <Collapsible title={t('card.whyMatch')}>
          <ul className="flex flex-col gap-2">
            {result.ruleResults.map((r) => (
              <li key={r.ruleId} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                <span
                  className={[
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    RULE_ICON[r.result].className,
                  ].join(' ')}
                >
                  {RULE_ICON[r.result].icon}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{fieldLabel(t, r.field)}</span>
                  <span className="block text-sm text-slate-800">
                    {t('card.yourValue', { value: formatValue(r.profileValue, t) })}
                  </span>
                  <span className="block text-sm text-slate-600">{explainFor(r)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Collapsible>
      )}

      {documents.length > 0 && (
        <Collapsible title={t('card.documents')}>
          <div className="flex flex-col gap-3">
            <ProgressBar
              value={readyCount}
              max={documents.length}
              label={t('card.docsReady', { ready: readyCount, total: documents.length })}
              tone="eligible"
            />
            <ul className="flex flex-col gap-2">
              {documents.map((doc, i) => (
                <DocumentItem key={doc.name} doc={doc} checked={checkedDocs[i]} onToggle={() => toggleDoc(i)} />
              ))}
            </ul>
          </div>
        </Collapsible>
      )}

      {applySteps.length > 0 && (
        <Collapsible title={t('card.howToApply')}>
          <ol className="flex flex-col gap-2">
            {applySteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-700 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <span className="flex-1 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </Collapsible>
      )}

      <footer className="flex flex-col gap-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
          {scheme.official_url ? (
            <a
              href={scheme.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg font-semibold text-primary-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t('card.officialWebsite')}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : null}
          <span>{t('freshness.lastVerified', { date: scheme.last_verified })}</span>
          {stale && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-semibold text-possible">
              <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
              {t('freshness.needsReverification')}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={tracked ? 'secondary' : 'primary'}
            aria-pressed={tracked}
            onClick={addToTracker}
            className="w-full sm:w-auto"
          >
            {tracked ? (
              <>
                <Check className="h-5 w-5" aria-hidden="true" />
                {t('card.tracked')}
              </>
            ) : (
              t('card.addTracker')
            )}
          </Button>
          {tracked && (
            <Link
              to="/tracker"
              className="inline-flex min-h-[48px] items-center rounded-lg font-semibold text-primary-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t('card.viewTracker')}
            </Link>
          )}
        </div>
      </footer>
    </Card>
  );
}
