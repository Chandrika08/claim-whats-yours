import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import SchemeCard from '../components/SchemeCard';
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
        <h1 className="text-2xl font-bold text-gray-900">Results</h1>
        <p className="text-gray-700">
          Describe your situation on the Home page first, then your results will appear here.
        </p>
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-blue-600 px-4 font-semibold text-white"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-4">
      <h1 className="text-2xl font-bold text-gray-900">Results</h1>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-900">Likely eligible ({groups.likely.length})</h2>
        {groups.likely.length === 0 ? (
          <p className="text-sm text-gray-600">No schemes are likely eligible based on what you shared yet.</p>
        ) : (
          groups.likely.map(({ scheme, result }) => (
            <SchemeCard key={scheme.id} scheme={scheme} result={result} />
          ))
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-900">Possibly eligible ({groups.possibly.length})</h2>
        {groups.possibly.length === 0 ? (
          <p className="text-sm text-gray-600">No schemes are possibly eligible right now.</p>
        ) : (
          groups.possibly.map(({ scheme, result }) => (
            <div key={scheme.id} className="flex flex-col gap-2">
              <SchemeCard scheme={scheme} result={result} />
              {result.missingFields.length > 0 && (
                <p className="text-sm font-medium text-amber-800">
                  Still missing: {result.missingFields.join(', ')}
                </p>
              )}
            </div>
          ))
        )}
      </section>

      <details className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <summary className="flex min-h-[44px] cursor-pointer items-center text-xl font-bold text-gray-900">
          <h2 className="inline">Not eligible ({groups.not.length})</h2>
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          {groups.not.length === 0 ? (
            <p className="text-sm text-gray-600">No schemes were ruled out.</p>
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
      </details>
    </div>
  );
}
