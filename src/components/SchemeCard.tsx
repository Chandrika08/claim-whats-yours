import { useState } from 'react';
import type { MatchResult, RuleResult, Scheme } from '../types';

const REVERIFY_AFTER_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const RESULT_BADGE: Record<RuleResult['result'], { label: string; className: string }> = {
  pass: { label: 'Pass', className: 'bg-green-100 text-green-800' },
  fail: { label: 'Fail', className: 'bg-red-100 text-red-800' },
  unknown: { label: 'Unknown', className: 'bg-gray-200 text-gray-800' },
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

function DocumentItem({ doc }: { doc: Scheme['documents'][number] }) {
  const [checked, setChecked] = useState(false);
  return (
    <li>
      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 py-1">
        <input
          type="checkbox"
          className="mt-2 h-5 w-5 shrink-0"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span className="flex-1">
          <span className="block font-medium text-gray-900">{doc.name}</span>
          <span className="block text-sm text-gray-600">Why: {doc.why}</span>
          <span className="block text-sm text-gray-600">Where to get it: {doc.where_to_get}</span>
        </span>
      </label>
    </li>
  );
}

export default function SchemeCard({ scheme, result }: { scheme: Scheme; result: MatchResult }) {
  const [tracked, setTracked] = useState(false);
  const documents = scheme.documents ?? [];
  const applySteps = scheme.apply_steps ?? [];
  const stale = needsReverification(scheme.last_verified);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <header className="flex flex-col gap-1">
        <h3 className="text-lg font-bold text-gray-900">{scheme.name}</h3>
        <p className="text-sm text-gray-700">{scheme.benefit_summary}</p>
      </header>

      {result.ruleResults.length > 0 && (
        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-gray-900">Rules checked</h4>
          <ul className="flex flex-col gap-2">
            {result.ruleResults.map((r) => (
              <li key={r.ruleId} className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RESULT_BADGE[r.result].className}`}
                  >
                    {RESULT_BADGE[r.result].label}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{r.field}</span>
                </div>
                <p className="mt-1 text-sm text-gray-800">Your value: {formatValue(r.profileValue)}</p>
                <p className="text-sm text-gray-600">{r.explain}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {documents.length > 0 && (
        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-gray-900">Documents to keep ready</h4>
          <ul className="flex flex-col gap-1">
            {documents.map((doc) => (
              <DocumentItem key={doc.name} doc={doc} />
            ))}
          </ul>
        </section>
      )}

      {applySteps.length > 0 && (
        <section className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold text-gray-900">How to apply</h4>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-800">
            {applySteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      {scheme.official_url ? (
        <a
          href={scheme.official_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-blue-600 px-4 text-sm font-semibold text-blue-700"
        >
          Official website
        </a>
      ) : null}

      <footer className="flex flex-col gap-3 border-t border-gray-100 pt-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span>Last verified: {scheme.last_verified}</span>
          {stale && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              Needs re-verification
            </span>
          )}
        </div>
        <button
          type="button"
          aria-pressed={tracked}
          onClick={() => setTracked((prev) => !prev)}
          className={`min-h-[44px] rounded-xl px-4 text-sm font-semibold ${
            tracked ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {tracked ? 'Added to tracker' : 'Add to tracker'}
        </button>
      </footer>
    </article>
  );
}
