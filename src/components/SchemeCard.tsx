import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, CircleAlert, Clock, ExternalLink, HelpCircle, X } from 'lucide-react';
import { Badge, Button, Card, Collapsible, ProgressBar } from './ui';
import type { BadgeTone } from './ui';
import type { MatchResult, RuleResult, Scheme } from '../types';
import { loadTracker, upsertEntry } from '../lib/tracker';

const REVERIFY_AFTER_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const STATUS_BADGE: Record<MatchResult['status'], { label: string; tone: BadgeTone; icon: ReactNode }> = {
  likely_eligible: {
    label: 'Likely eligible',
    tone: 'eligible',
    icon: <Check className="h-4 w-4" aria-hidden="true" />,
  },
  possibly_eligible: {
    label: 'Possibly eligible',
    tone: 'possible',
    icon: <Clock className="h-4 w-4" aria-hidden="true" />,
  },
  not_eligible: {
    label: 'Not eligible',
    tone: 'notEligible',
    icon: <X className="h-4 w-4" aria-hidden="true" />,
  },
};

const RULE_ICON: Record<RuleResult['result'], { icon: ReactNode; className: string }> = {
  pass: { icon: <Check className="h-5 w-5" aria-hidden="true" />, className: 'text-eligible bg-primary-100' },
  fail: { icon: <X className="h-5 w-5" aria-hidden="true" />, className: 'text-notEligible bg-slate-200' },
  unknown: { icon: <HelpCircle className="h-5 w-5" aria-hidden="true" />, className: 'text-slate-600 bg-slate-200' },
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'not known';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
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
          <span className="block text-sm text-slate-600">Why: {doc.why}</span>
          <span className="block text-sm text-slate-600">Where to get it: {doc.where_to_get}</span>
        </span>
      </label>
    </li>
  );
}

export default function SchemeCard({ scheme, result }: { scheme: Scheme; result: MatchResult }) {
  const [tracked, setTracked] = useState(() => loadTracker().some((e) => e.schemeId === scheme.id));
  const documents = scheme.documents ?? [];
  const applySteps = scheme.apply_steps ?? [];
  const stale = needsReverification(scheme.last_verified);
  const [checkedDocs, setCheckedDocs] = useState<boolean[]>(() => documents.map(() => false));
  const readyCount = checkedDocs.filter(Boolean).length;
  const status = STATUS_BADGE[result.status];

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
          <Badge tone="info">{scheme.level === 'central' ? 'Central' : 'Andhra Pradesh'}</Badge>
          <Badge tone={status.tone} icon={status.icon}>
            {status.label}
          </Badge>
        </div>
        <h3 className="text-lg font-bold leading-snug text-slate-900">{scheme.name}</h3>
        <p className="rounded-xl bg-primary-50 px-4 py-3 text-base font-medium text-primary-900">
          {scheme.benefit_summary}
        </p>
      </header>

      {result.ruleResults.length > 0 && (
        <Collapsible title="Why you match">
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
                  <span className="block text-sm font-semibold text-slate-900">{r.field}</span>
                  <span className="block text-sm text-slate-800">Your value: {formatValue(r.profileValue)}</span>
                  <span className="block text-sm text-slate-600">{r.explain}</span>
                </span>
              </li>
            ))}
          </ul>
        </Collapsible>
      )}

      {documents.length > 0 && (
        <Collapsible title="Documents to carry">
          <div className="flex flex-col gap-3">
            <ProgressBar
              value={readyCount}
              max={documents.length}
              label={`${readyCount} of ${documents.length} ready`}
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
        <Collapsible title="How to apply">
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
              Official website
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : null}
          <span>Last verified: {scheme.last_verified}</span>
          {stale && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-semibold text-possible">
              <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
              Needs re-verification
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
                Tracked
              </>
            ) : (
              'Add to tracker'
            )}
          </Button>
          {tracked && (
            <Link
              to="/tracker"
              className="inline-flex min-h-[48px] items-center rounded-lg font-semibold text-primary-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              View in tracker
            </Link>
          )}
        </div>
      </footer>
    </Card>
  );
}
