import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ShieldCheck } from 'lucide-react';
import SchemeCard from '../components/SchemeCard';
import { Collapsible, EmptyState, SectionHeader } from '../components/ui';
import { useProfile } from '../context/ProfileContext';
import { matchAll } from '../lib/eligibility';
import { loadSchemes } from '../lib/schemes';
import type { MatchResult, Profile, Scheme } from '../types';

type Paired = { scheme: Scheme; result: MatchResult };

export default function Results() {
  const { profile, submitted } = useProfile();
  const schemes = useMemo(() => loadSchemes(), []);

  const groups = useMemo(() => {
    const byId = new Map<string, Scheme>(schemes.map((s) => [s.id, s]));
    const pairs: Paired[] = [];
    if (submitted) {
      // Partial<Profile> is intentional: missing fields are null/undefined and evaluate to "unknown".
      for (const result of matchAll(profile as Profile, schemes)) {
        const scheme = byId.get(result.schemeId);
        if (scheme) pairs.push({ scheme, result });
      }
    }
    return {
      likely: pairs.filter((p) => p.result.status === 'likely_eligible'),
      possibly: pairs.filter((p) => p.result.status === 'possibly_eligible'),
      not: pairs.filter((p) => p.result.status === 'not_eligible'),
    };
  }, [profile, submitted, schemes]);

  if (!submitted) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
        <SectionHeader title="Results" />
        <EmptyState
          icon={<ClipboardList className="h-7 w-7" aria-hidden="true" />}
          title="No profile yet"
          description="Describe your situation on the Home page first, then your likely schemes will appear here."
          action={
            <Link
              to="/"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-primary-700 px-5 py-2.5 font-semibold text-white shadow-soft hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-300 focus-visible:ring-offset-2"
            >
              Go to Home
            </Link>
          }
        />
      </div>
    );
  }

  const likelyCount = groups.likely.length;
  const possibleCount = groups.possibly.length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 pb-10">
      <SectionHeader title="Your results" subtitle="Based on what you shared on the Home page." />

      <div className="flex flex-col gap-2 rounded-2xl bg-primary-700 p-5 text-white shadow-soft">
        <p className="text-lg font-bold leading-snug">
          You are likely eligible for {likelyCount} {likelyCount === 1 ? 'scheme' : 'schemes'}, and {possibleCount}{' '}
          more may fit.
        </p>
        <p className="flex items-start gap-2 text-sm text-primary-50">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            This is a likely match, not a guarantee. Check the official website and documents before you apply.
          </span>
        </p>
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="likely-heading">
        <h2 id="likely-heading" className="text-xl font-bold text-slate-900">
          Likely eligible ({likelyCount})
        </h2>
        {likelyCount === 0 ? (
          <p className="text-base text-slate-600">No schemes are likely eligible based on what you shared yet.</p>
        ) : (
          groups.likely.map(({ scheme, result }) => (
            <SchemeCard key={scheme.id} scheme={scheme} result={result} />
          ))
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="possibly-heading">
        <h2 id="possibly-heading" className="text-xl font-bold text-slate-900">
          Possibly eligible ({possibleCount})
        </h2>
        {possibleCount === 0 ? (
          <p className="text-base text-slate-600">No schemes are possibly eligible right now.</p>
        ) : (
          groups.possibly.map(({ scheme, result }) => (
            <div key={scheme.id} className="flex flex-col gap-2">
              <SchemeCard scheme={scheme} result={result} />
              {result.missingFields.length > 0 && (
                <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
                  Still missing: {result.missingFields.join(', ')}
                </p>
              )}
            </div>
          ))
        )}
      </section>

      <Collapsible title={`Not eligible (${groups.not.length})`}>
        <div className="flex flex-col gap-4">
          {groups.not.length === 0 ? (
            <p className="text-base text-slate-600">No schemes were ruled out.</p>
          ) : (
            groups.not.map(({ scheme, result }) => (
              <SchemeCard
                key={scheme.id}
                scheme={scheme}
                result={{ ...result, ruleResults: result.ruleResults.filter((r) => r.result === 'fail') }}
              />
            ))
          )}
        </div>
      </Collapsible>
    </div>
  );
}
