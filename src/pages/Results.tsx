import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Check, CircleAlert, ClipboardList, ShieldCheck, X } from 'lucide-react';
import SchemeCard, { fieldLabel } from '../components/SchemeCard';
import { Card, Collapsible, EmptyState, SectionHeader } from '../components/ui';
import { useProfile } from '../context/ProfileContext';
import { useLanguage } from '../i18n/useLanguage';
import { matchAll } from '../lib/eligibility';
import { loadSchemesOrBundled } from '../lib/schemes';
import type { MatchResult, Profile, Scheme } from '../types';

type Paired = { scheme: Scheme; result: MatchResult };

export default function Results() {
  const { profile, submitted } = useProfile();
  const { t } = useLanguage();
  const schemes = useMemo(() => loadSchemesOrBundled(), []);

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
        <SectionHeader title={t('results.title')} />
        <EmptyState
          icon={<ClipboardList className="h-7 w-7" aria-hidden="true" />}
          title={t('results.empty.title')}
          description={t('results.empty.description')}
          action={
            <Link
              to="/"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-primary-700 px-5 py-2.5 font-semibold text-white shadow-soft hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t('results.empty.action')}
            </Link>
          }
        />
      </div>
    );
  }

  const likelyCount = groups.likely.length;
  const possibleCount = groups.possibly.length;
  const notCount = groups.not.length;

  // Counts come straight from the computed result groups, so they always match the cards below.
  const summaryCards = [
    {
      key: 'likely',
      label: t('eligibility.likely'),
      help: t('results.summary.likelyHelp'),
      count: likelyCount,
      icon: <Check className="h-6 w-6" aria-hidden="true" />,
      text: 'text-eligible',
      box: 'border-primary-300 bg-primary-50',
    },
    {
      key: 'possibly',
      label: t('eligibility.possible'),
      help: t('results.summary.possibleHelp'),
      count: possibleCount,
      icon: <CircleAlert className="h-6 w-6" aria-hidden="true" />,
      text: 'text-possible',
      box: 'border-accent-300 bg-accent-50',
    },
    {
      key: 'not',
      label: t('eligibility.not'),
      help: t('results.summary.notHelp'),
      count: notCount,
      icon: <X className="h-6 w-6" aria-hidden="true" />,
      text: 'text-notEligible',
      box: 'border-slate-300 bg-slate-50',
    },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 pb-10">
      <SectionHeader title={t('results.title')} subtitle={t('results.subtitle')} />

      <div className="flex flex-col gap-2 rounded-2xl bg-primary-700 p-5 text-white shadow-soft">
        <p className="text-lg font-bold leading-snug">
          {t('results.banner.summary', {
            count: likelyCount,
            schemes: t(likelyCount === 1 ? 'results.unit.scheme' : 'results.unit.schemes'),
            possible: possibleCount,
          })}
        </p>
        <p className="flex items-start gap-2 text-base text-primary-50">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{t('results.banner.disclaimer')}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.key} className={['flex flex-col gap-2 border-2 p-4', card.box].join(' ')}>
            <h2 className={['flex items-center gap-2 text-base font-bold', card.text].join(' ')}>
              {card.icon}
              {card.label}
            </h2>
            <p className="text-4xl font-extrabold text-slate-900">{card.count}</p>
            <p className="text-base leading-snug text-slate-800">{card.help}</p>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-4" aria-labelledby="likely-heading">
        <h2 id="likely-heading" className="text-xl font-bold text-slate-900">
          {t('results.groupHeading', { label: t('eligibility.likely'), count: likelyCount })}
        </h2>
        {likelyCount === 0 ? (
          <p className="text-base text-slate-600">{t('results.none.likely')}</p>
        ) : (
          groups.likely.map(({ scheme, result }) => (
            <SchemeCard key={scheme.id} scheme={scheme} result={result} />
          ))
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="possibly-heading">
        <h2 id="possibly-heading" className="text-xl font-bold text-slate-900">
          {t('results.groupHeading', { label: t('eligibility.possible'), count: possibleCount })}
        </h2>
        {possibleCount === 0 ? (
          <p className="text-base text-slate-600">{t('results.none.possibly')}</p>
        ) : (
          groups.possibly.map(({ scheme, result }) => (
            <div key={scheme.id} className="flex flex-col gap-2">
              <SchemeCard scheme={scheme} result={result} />
              {result.missingFields.length > 0 && (
                <p className="rounded-xl bg-accent-50 px-4 py-2 text-base font-medium text-possible">
                  {t('results.missing', {
                    fields: result.missingFields.map((field) => fieldLabel(t, field)).join(', '),
                  })}
                </p>
              )}
            </div>
          ))
        )}
      </section>

      <Collapsible title={t('results.groupHeading', { label: t('eligibility.not'), count: notCount })}>
        <div className="flex flex-col gap-4">
          {groups.not.length === 0 ? (
            <p className="text-base text-slate-600">{t('results.none.not')}</p>
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
