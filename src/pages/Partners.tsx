import { useId, useState } from 'react';
import { Calculator, Coins, Rocket, Users } from 'lucide-react';
import { Badge, Card, SectionHeader } from '../components/ui';

// Source: docs/BUSINESS.md. The document gives no numeric figures for prices,
// benefit value or middleman fees (all are marked ASSUMPTION), so every
// assumption input starts empty and is shown as "—" until a partner value is entered.

type AssumptionId =
  | 'families'
  | 'schemesPerFamily'
  | 'benefitPerScheme'
  | 'middlemanFee'
  | 'ngoPrice'
  | 'operatorPrice'
  | 'districtLicence';

type AssumptionInput = {
  id: AssumptionId;
  label: string;
  unit: string;
  hint: string;
};

const REACH_INPUTS: AssumptionInput[] = [
  {
    id: 'families',
    label: 'Families reached',
    unit: 'families',
    hint: 'Impact metric: families reached (BUSINESS.md, Impact metrics).',
  },
  {
    id: 'schemesPerFamily',
    label: 'Average schemes matched per family',
    unit: 'schemes',
    hint: 'Impact metric: average schemes matched per family (BUSINESS.md, Impact metrics).',
  },
];

const ASSUMPTION_INPUTS: AssumptionInput[] = [
  {
    id: 'benefitPerScheme',
    label: 'Estimated benefit per scheme per year (Rs)',
    unit: 'Rs a year',
    hint: "Enter a value from the scheme's official page. No average is given in the document (BUSINESS.md, Impact metrics).",
  },
  {
    id: 'middlemanFee',
    label: 'Middleman fee avoided per family',
    unit: 'Rs',
    hint: 'ASSUMPTION (BUSINESS.md, Impact metrics). No figure given.',
  },
  {
    id: 'ngoPrice',
    label: 'NGO / CSR price per family',
    unit: 'Rs per family per year',
    hint: 'ASSUMPTION (BUSINESS.md, Pricing, line 13). No figure given.',
  },
  {
    id: 'operatorPrice',
    label: 'Service centre operator price',
    unit: 'Rs per month',
    hint: 'ASSUMPTION (BUSINESS.md, Pricing, line 14). No figure given. Not used in totals yet.',
  },
  {
    id: 'districtLicence',
    label: 'District licence price',
    unit: 'Rs per year',
    hint: 'ASSUMPTION (BUSINESS.md, Pricing, line 15). No figure given. Not used in totals yet.',
  },
];

const ALL_INPUTS = [...REACH_INPUTS, ...ASSUMPTION_INPUTS];

type Parsed = number | 'empty' | 'invalid';

function parseDraft(draft: string): Parsed {
  const trimmed = draft.trim();
  if (trimmed === '') return 'empty';
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : 'invalid';
}

function product(a: Parsed, b: Parsed): number | null {
  return typeof a === 'number' && typeof b === 'number' ? a * b : null;
}

function formatNumber(n: number | null, prefix = ''): string {
  if (n === null) return '—';
  return `${prefix}${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })}`;
}

const PRICING_LINES = [
  {
    payer: 'NGO / CSR',
    text: 'Rupees per family per year',
    note: 'ASSUMPTION, test with partners.',
  },
  {
    payer: 'Service centre operator',
    text: 'Rupees per month',
    note: 'ASSUMPTION, test with partners.',
  },
  {
    payer: 'District licence',
    text: 'Rupees per year',
    note: 'ASSUMPTION, test with partners.',
  },
];

const WHO_PAYS = [
  {
    title: 'NGOs and CSR programmes',
    text: 'Pay per active family or per district per year, because they need proof of benefits unlocked. The impact dashboard is the product they buy.',
  },
  {
    title: 'Common service centres and village-level operators',
    text: 'Pay a small monthly fee for an assisted mode that serves many families faster than paper.',
  },
  {
    title: 'Banks (rural branches)',
    text: 'Sponsor financial inclusion goals such as accounts, credit cards and insurance-linked schemes.',
  },
  {
    title: 'State government',
    text: 'Pay for a district-level licence to publish verified scheme data and track uptake.',
  },
];

const ROLLOUT_STEPS = [
  'Pilot in one district with one NGO partner and 5 to 10 service centres.',
  'Measure applications started and completed.',
  'Extend to the next group: students, then senior citizens.',
];

export default function Partners() {
  const idPrefix = useId();
  const [drafts, setDrafts] = useState<Record<AssumptionId, string>>(
    () =>
      ({
        ...Object.fromEntries(ALL_INPUTS.map((input) => [input.id, ''])),
        families: '1000',
        schemesPerFamily: '3',
      }) as Record<AssumptionId, string>,
  );

  const parsed = Object.fromEntries(
    ALL_INPUTS.map((input) => [input.id, parseDraft(drafts[input.id])]),
  ) as Record<AssumptionId, Parsed>;

  const invalidLabels = ALL_INPUTS.filter((input) => parsed[input.id] === 'invalid').map((input) => input.label);
  const reachMissing = parsed.families === 'empty' || parsed.schemesPerFamily === 'empty';

  const totalMatches = product(parsed.families, parsed.schemesPerFamily);
  const annualBenefit = product(
    typeof totalMatches === 'number' ? totalMatches : 'empty',
    parsed.benefitPerScheme,
  );
  const middlemanAvoided = product(parsed.families, parsed.middlemanFee);
  const ngoFee = product(parsed.families, parsed.ngoPrice);

  const setDraft = (id: AssumptionId, value: string) =>
    setDrafts((current) => ({ ...current, [id]: value }));

  const renderInput = (input: AssumptionInput) => {
    const inputId = `${idPrefix}-${input.id}`;
    const isInvalid = parsed[input.id] === 'invalid';
    return (
      <div key={input.id} className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-semibold text-slate-900">
          {input.label} <span className="font-normal text-slate-600">({input.unit})</span>
        </label>
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={drafts[input.id]}
          onChange={(e) => setDraft(input.id, e.target.value)}
          aria-invalid={isInvalid || undefined}
          className={[
            'min-h-12 w-full rounded-xl border-2 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus:ring-4 focus:ring-accent-300',
            isInvalid ? 'border-possible' : 'border-slate-300 focus:border-primary-600',
          ].join(' ')}
        />
        <p className="text-sm text-slate-600">{input.hint}</p>
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">For partners</p>
        <h1 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
          Help families claim what they are owed, at no cost to them.
        </h1>
        <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
          Families never pay. Partners fund the work and get proof of benefits unlocked. Figures below are
          assumptions to test, not guaranteed outcomes.
        </p>
      </header>

      <section aria-labelledby={`${idPrefix}-problem`} className="flex flex-col gap-3">
        <h2 id={`${idPrefix}-problem`} className="text-xl font-bold text-slate-900">
          The problem
        </h2>
        <p className="text-base leading-relaxed text-slate-700">
          Eligible families miss benefits because information is scattered, rules are hard to read, the document list
          is unclear, and they pay middlemen for help that should be free.
        </p>
      </section>

      <section aria-labelledby={`${idPrefix}-who-pays`} className="flex flex-col gap-4">
        <SectionHeader
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          title={<span id={`${idPrefix}-who-pays`}>Who pays</span>}
          subtitle="Families never pay."
        />
        <ol className="flex flex-col gap-3">
          {WHO_PAYS.map((payer, index) => (
            <li key={payer.title}>
              <Card className="flex flex-col gap-1.5 p-4 sm:p-5">
                <p className="text-base font-semibold text-slate-900">
                  <span className="mr-2 text-primary-700">{index + 1}.</span>
                  {payer.title}
                </p>
                <p className="text-base leading-relaxed text-slate-600">{payer.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby={`${idPrefix}-pricing`} className="flex flex-col gap-4">
        <SectionHeader
          icon={<Coins className="h-5 w-5" aria-hidden="true" />}
          title={<span id={`${idPrefix}-pricing`}>Pricing</span>}
        />
        <Card className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-2">
            <Badge tone="possible">Assumptions to test with partners</Badge>
            <p className="text-sm text-slate-600">
              None of these prices is set yet. Enter your own values in the calculator below.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {PRICING_LINES.map((line) => (
              <li
                key={line.payer}
                className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <span className="text-base font-semibold text-slate-900">{line.payer}</span>
                <span className="text-base text-slate-700">{line.text}: ASSUMPTION</span>
                <span className="text-sm text-slate-600">{line.note}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section aria-labelledby={`${idPrefix}-calculator`} className="flex flex-col gap-4">
        <SectionHeader
          icon={<Calculator className="h-5 w-5" aria-hidden="true" />}
          title={<span id={`${idPrefix}-calculator`}>Impact calculator</span>}
          subtitle="Change any number. Every assumption is editable."
        />

        <div>
          <Badge tone="possible">Example assumptions, not real data</Badge>
        </div>

        <Card className="flex flex-col gap-5 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{REACH_INPUTS.map(renderInput)}</div>

          <div className="flex flex-col gap-4 border-t border-slate-200 pt-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Other assumptions</p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{ASSUMPTION_INPUTS.map(renderInput)}</div>
          </div>

          {invalidLabels.length > 0 && (
            <p role="alert" className="rounded-xl bg-accent-50 p-3 text-sm font-semibold text-accent-900">
              Enter a number of 0 or more for: {invalidLabels.join(', ')}.
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent-700">Results</p>
            {reachMissing && invalidLabels.length === 0 && (
              <p className="text-base text-slate-600">
                Enter families reached and average schemes matched per family to see totals.
              </p>
            )}
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-xl bg-primary-50 p-4">
                <dt className="text-sm font-semibold text-slate-700">Total scheme matches</dt>
                <dd className="break-words text-2xl font-bold text-slate-900">{formatNumber(totalMatches)}</dd>
                <dd className="text-sm text-slate-600">Families reached × average schemes matched per family</dd>
              </div>
              <div className="flex flex-col gap-1 rounded-xl bg-primary-50 p-4">
                <dt className="text-sm font-semibold text-slate-700">Estimated annual benefit unlocked</dt>
                <dd className="break-words text-2xl font-bold text-slate-900">{formatNumber(annualBenefit, 'Rs ')}</dd>
                <dd className="text-sm text-slate-600">Total scheme matches × average benefit value per scheme</dd>
              </div>
              <div className="flex flex-col gap-1 rounded-xl bg-primary-50 p-4">
                <dt className="text-sm font-semibold text-slate-700">Middleman fees avoided</dt>
                <dd className="break-words text-2xl font-bold text-slate-900">{formatNumber(middlemanAvoided, 'Rs ')}</dd>
                <dd className="text-sm text-slate-600">Families reached × middleman fee avoided per family</dd>
              </div>
              <div className="flex flex-col gap-1 rounded-xl bg-primary-50 p-4">
                <dt className="text-sm font-semibold text-slate-700">NGO / CSR price at this reach</dt>
                <dd className="break-words text-2xl font-bold text-slate-900">{formatNumber(ngoFee, 'Rs ')}</dd>
                <dd className="text-sm text-slate-600">Families reached × NGO / CSR price per family per year</dd>
              </div>
            </dl>
            <p className="text-sm text-slate-600">
              These are arithmetic on the assumptions you enter. They are not guaranteed outcomes.
            </p>
          </div>
        </Card>
      </section>

      <section aria-labelledby={`${idPrefix}-rollout`} className="flex flex-col gap-4">
        <SectionHeader
          icon={<Rocket className="h-5 w-5" aria-hidden="true" />}
          title={<span id={`${idPrefix}-rollout`}>Rollout</span>}
        />
        <ol className="flex flex-col gap-3">
          {ROLLOUT_STEPS.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-700 text-sm font-bold text-white">
                {index + 1}
              </span>
              <span className="pt-1 text-base leading-relaxed text-slate-700">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
