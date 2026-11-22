import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Download, Pencil, Plus, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { Badge, Button, Card, EmptyState, SectionHeader } from '../components/ui';
import type { BadgeTone } from '../components/ui';
import { OVERRIDE_KEY, loadSchemes, validateSchemes } from '../lib/schemes';
import schemesData from '../data/schemes.json';
import type { Scheme } from '../types';
import { dateStatus, DATE_PATTERN, REVERIFY_AFTER_DAYS } from '../lib/verification';
import type { DateStatus } from '../lib/verification';

const EXPORT_FILENAME = 'claim-whats-yours-schemes.json';
const ALL = '__all__';
const UNCATEGORISED = 'Uncategorised';
const SEARCH_ID = 'admin-scheme-search';
const CATEGORY_ID = 'admin-scheme-category';
const STATUS_ID = 'admin-scheme-status';
const SELECT_ID = 'admin-scheme-select';
const JSON_ID = 'admin-scheme-json';
const ERROR_ID = 'admin-scheme-json-error';
const TOOL_CLASS = 'min-h-11 gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';
const FIELD_CLASS =
  'min-h-11 rounded-xl border border-primary-200 bg-white px-3 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

type Loaded = { schemes: Scheme[]; error: string | null };
type Message = { tone: 'ok' | 'error'; text: string };
type Check = { error: string | null; scheme: Scheme | null };
type StatusFilter = typeof ALL | DateStatus;

const FRESHNESS_BADGE: Record<DateStatus, { label: string; tone: BadgeTone; icon: ReactNode }> = {
  current: {
    label: 'Current',
    tone: 'eligible',
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
  },
  stale: {
    label: 'Needs re-verification',
    tone: 'possible',
    icon: <CircleAlert className="h-4 w-4" aria-hidden="true" />,
  },
  invalid: {
    label: 'Date invalid',
    tone: 'notEligible',
    icon: <XCircle className="h-4 w-4" aria-hidden="true" />,
  },
};

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: ALL, label: 'All statuses' },
  { value: 'current', label: 'Current' },
  { value: 'stale', label: 'Needs re-verification' },
  { value: 'invalid', label: 'Date invalid' },
];

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function bundledSchemes(): Scheme[] {
  return validateSchemes(schemesData);
}

function toJson(scheme: Scheme | null | undefined): string {
  return scheme ? JSON.stringify(scheme, null, 2) : '';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Displays a stored value as-is; empty values show a dash. */
function show(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function todayIso(today: Date): string {
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

/** Starting point for the Add form. The id is left blank so the user must choose a unique one. */
function blankScheme(today: Date): Scheme {
  return {
    id: '',
    name: '',
    level: 'state',
    state: 'ALL',
    category: '',
    benefit_summary: '',
    official_url: '',
    last_verified: todayIso(today),
    rules: [],
    documents: [],
    apply_steps: [],
    deadline: { type: 'rolling', date: null, note: '' },
  };
}

function categoryKey(scheme: Scheme): string {
  return String(scheme.category ?? '').trim();
}

function categoryLabel(key: string): string {
  return key || UNCATEGORISED;
}

/**
 * Reads the effective scheme set the same way Home does (loadSchemes), but turns
 * unreadable or invalid saved changes into a message instead of a crash.
 */
function loadForAdmin(): Loaded {
  let stored: string | null;
  try {
    stored = localStorage.getItem(OVERRIDE_KEY);
  } catch (err) {
    return {
      schemes: bundledSchemes(),
      error: `Could not read saved changes from this browser (${errorMessage(err)}). Showing the default schemes.`,
    };
  }
  if (stored) {
    try {
      JSON.parse(stored);
    } catch {
      return {
        schemes: bundledSchemes(),
        error: 'Saved changes are not valid JSON, so they are ignored and the default schemes are shown. Reset overrides to clear them.',
      };
    }
  }
  try {
    return { schemes: loadSchemes(), error: null };
  } catch (err) {
    return {
      schemes: bundledSchemes(),
      error: `Saved changes are invalid (${errorMessage(err)}), so the default schemes are shown. Reset overrides to clear them.`,
    };
  }
}

/** Parses the draft JSON and runs validateSchemes on it. */
function parseDraft(text: string): Check {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { error: `Not valid JSON: ${errorMessage(err)}`, scheme: null };
  }
  if (asRecord(parsed) === null) {
    return { error: 'The scheme must be a JSON object.', scheme: null };
  }
  try {
    validateSchemes([parsed]);
  } catch (err) {
    return { error: errorMessage(err), scheme: null };
  }
  return { error: null, scheme: parsed as Scheme };
}

function dateProblem(scheme: Scheme): string | null {
  if (typeof scheme.last_verified !== 'string' || !DATE_PATTERN.test(scheme.last_verified)) {
    return 'last_verified must be a date in YYYY-MM-DD format.';
  }
  return null;
}

/**
 * Validates an edited existing scheme: validateSchemes, the id must not change
 * (the override replaces entries by id), and last_verified must be YYYY-MM-DD.
 */
function checkDraft(text: string, originalId: string): Check {
  const base = parseDraft(text);
  const scheme = base.scheme;
  if (!scheme) return base;
  if (scheme.id !== originalId) {
    return {
      error: `The id must stay "${originalId}". Changing it would leave the original scheme in place.`,
      scheme: null,
    };
  }
  const problem = dateProblem(scheme);
  return problem ? { error: problem, scheme: null } : base;
}

/**
 * Validates a new scheme for the Add path: same rules as checkDraft, except the id
 * must be a non-empty string that no existing scheme already uses.
 */
function checkNewDraft(text: string, existingIds: string[]): Check {
  const base = parseDraft(text);
  const scheme = base.scheme;
  if (!scheme) return base;
  if (typeof scheme.id !== 'string' || scheme.id.trim() === '') {
    return { error: 'The id must be a non-empty string.', scheme: null };
  }
  if (existingIds.includes(scheme.id)) {
    return { error: `A scheme with id "${scheme.id}" already exists. Choose a new id.`, scheme: null };
  }
  const problem = dateProblem(scheme);
  return problem ? { error: problem, scheme: null } : base;
}

/** Parses the draft for the read-only sections. Returns null while the JSON is not an object. */
function parsePreview(text: string): Record<string, unknown> | null {
  try {
    return asRecord(JSON.parse(text));
  } catch {
    return null;
  }
}

function saveSet(next: Scheme[]): string | null {
  try {
    // Full edited set, same JSON-array shape loadSchemes reads.
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next));
    return null;
  } catch (err) {
    return errorMessage(err);
  }
}

function FreshnessBadge({ status }: { status: DateStatus }) {
  const info = FRESHNESS_BADGE[status];
  return (
    <Badge tone={info.tone} icon={info.icon}>
      {info.label}
    </Badge>
  );
}

function SummaryCard({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className={`text-3xl font-bold ${alert ? 'text-notEligible' : 'text-slate-900'}`}>{value}</p>
    </Card>
  );
}

function UrlLink({ url }: { url: string }) {
  if (!url) return <span>—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all font-semibold text-primary-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {url}
    </a>
  );
}

function PreviewSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-xl border border-primary-100 bg-white p-4">
      <h4 id={id} className="text-base font-bold text-slate-900">
        {title}
      </h4>
      {children}
    </section>
  );
}

function PreviewField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm font-semibold text-slate-600">{label}</dt>
      <dd className="break-words text-base text-slate-900">{value}</dd>
    </div>
  );
}

export default function Admin() {
  const [initial] = useState(loadForAdmin);
  const [schemes, setSchemes] = useState<Scheme[]>(initial.schemes);
  const [loadError, setLoadError] = useState<string | null>(initial.error);
  const [selectedId, setSelectedId] = useState<string | null>(initial.schemes[0]?.id ?? null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<string>(() => toJson(initial.schemes[0]));
  const [message, setMessage] = useState<Message | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL);
  const jsonRef = useRef<HTMLTextAreaElement>(null);

  const selected = isAdding ? null : (schemes.find((s) => s.id === selectedId) ?? null);
  const check = useMemo<Check>(() => {
    if (isAdding) return checkNewDraft(draft, schemes.map((s) => String(s.id)));
    return selected ? checkDraft(draft, selected.id) : { error: 'Select a scheme to edit.', scheme: null };
  }, [draft, selected, isAdding, schemes]);
  const preview = useMemo(() => parsePreview(draft), [draft]);

  const today = new Date();
  const rows = schemes.map((scheme) => ({ scheme, status: dateStatus(scheme.last_verified, today) }));
  const summary = {
    total: rows.length,
    valid: rows.filter((r) => r.status !== 'invalid').length,
    stale: rows.filter((r) => r.status === 'stale').length,
    invalid: rows.filter((r) => r.status === 'invalid').length,
  };
  const categoryCounts = new Map<string, number>();
  for (const { scheme } of rows) {
    const key = categoryKey(scheme);
    categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
  }
  const categories = [...categoryCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const needle = query.trim().toLowerCase();
  const filtered = rows.filter(({ scheme, status }) => {
    if (needle && !String(scheme.name).toLowerCase().includes(needle) && !String(scheme.id).toLowerCase().includes(needle)) {
      return false;
    }
    if (categoryFilter !== ALL && categoryKey(scheme) !== categoryFilter) return false;
    if (statusFilter !== ALL && status !== statusFilter) return false;
    return true;
  });
  const filtersActive = needle !== '' || categoryFilter !== ALL || statusFilter !== ALL;

  function focusScheme(id: string | null, list: Scheme[]) {
    const target = list.find((s) => s.id === id) ?? list[0] ?? null;
    setSelectedId(target ? target.id : null);
    setDraft(toJson(target));
  }

  function selectForEdit(id: string | null) {
    setIsAdding(false);
    setMessage(null);
    focusScheme(id, schemes);
  }

  function focusEditor() {
    const el = jsonRef.current;
    if (!el) return;
    el.focus();
    el.scrollIntoView({ block: 'center' });
  }

  function handleSelect(event: ChangeEvent<HTMLSelectElement>) {
    selectForEdit(event.target.value);
  }

  function handleEditToolbar() {
    setMessage(null);
    if (!isAdding && !selected) focusScheme(null, schemes);
    focusEditor();
  }

  function startAdd() {
    setIsAdding(true);
    setMessage(null);
    setDraft(toJson(blankScheme(new Date())));
    focusEditor();
  }

  function clearFilters() {
    setQuery('');
    setCategoryFilter(ALL);
    setStatusFilter(ALL);
  }

  function handleSave() {
    const edited = check.scheme;
    if (!edited) return;

    if (isAdding) {
      const next = [...schemes, edited];
      const failure = saveSet(next);
      if (failure) {
        setMessage({ tone: 'error', text: `Could not save to this browser: ${failure}` });
        return;
      }
      setSchemes(next);
      setLoadError(null);
      setIsAdding(false);
      setSelectedId(edited.id);
      setDraft(toJson(edited));
      setMessage({ tone: 'ok', text: `Added ${edited.name}. It is now at the end of the list. Open Home to see results.` });
      return;
    }

    if (!selected) return;
    const next = schemes.map((s) => (s.id === selected.id ? edited : s));
    const failure = saveSet(next);
    if (failure) {
      setMessage({ tone: 'error', text: `Could not save to this browser: ${failure}` });
      return;
    }
    setSchemes(next);
    setLoadError(null);
    setMessage({ tone: 'ok', text: `Saved ${edited.name}. Open Home to see results with the edited rules.` });
  }

  function handleDiscard() {
    setIsAdding(false);
    setMessage(null);
    focusScheme(selectedId, schemes);
  }

  function handleReset() {
    try {
      localStorage.removeItem(OVERRIDE_KEY);
    } catch (err) {
      setMessage({ tone: 'error', text: `Could not clear saved changes: ${errorMessage(err)}` });
      return;
    }
    const next = bundledSchemes();
    setSchemes(next);
    setLoadError(null);
    setIsAdding(false);
    focusScheme(selectedId, next);
    setMessage({ tone: 'ok', text: 'Reset to the default schemes from schemes.json.' });
  }

  function handleValidate() {
    try {
      validateSchemes(schemes);
    } catch (err) {
      setMessage({ tone: 'error', text: `Validation failed: ${errorMessage(err)}` });
      return;
    }
    const ids = schemes.map((s) => String(s.id));
    const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    if (duplicates.length > 0) {
      setMessage({ tone: 'error', text: `Duplicate scheme ids: ${duplicates.join(', ')}.` });
      return;
    }
    if (summary.invalid > 0) {
      setMessage({
        tone: 'error',
        text: `${summary.invalid} of ${summary.total} schemes have a last_verified date that is not a real YYYY-MM-DD date.`,
      });
      return;
    }
    setMessage({
      tone: 'ok',
      text: `All ${summary.total} schemes pass validation. ${summary.stale} need re-verification.`,
    });
  }

  function handleExport() {
    try {
      const blob = new Blob([JSON.stringify(schemes, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = EXPORT_FILENAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage({ tone: 'ok', text: `Exported ${schemes.length} schemes.` });
    } catch (err) {
      setMessage({ tone: 'error', text: `Export failed: ${errorMessage(err)}` });
    }
  }

  const header = (
    <SectionHeader
      eyebrow="Admin"
      title="Scheme data"
      subtitle="Review scheme dates and edit one scheme at a time."
    />
  );

  if (schemes.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title="No schemes loaded"
          description="The scheme list is empty. Reset overrides to restore the bundled schemes."
          action={<Button onClick={handleReset}>Reset overrides</Button>}
        />
      </div>
    );
  }

  const p = preview;
  const rulesRaw = p?.rules;
  const rules = Array.isArray(rulesRaw) ? (rulesRaw as unknown[]) : null;
  const deadline = asRecord(p?.deadline);
  const docsRaw = p?.documents;
  const documents = Array.isArray(docsRaw) ? (docsRaw as unknown[]) : null;
  const stepsRaw = p?.apply_steps;
  const stepCount = Array.isArray(stepsRaw) ? stepsRaw.length : null;

  return (
    <div className="flex flex-col gap-6">
      {header}

      {loadError && (
        <div role="alert" className="rounded-xl border border-notEligible bg-white p-4">
          <p className="font-semibold text-notEligible">{loadError}</p>
        </div>
      )}

      <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
        <p className="font-semibold text-primary-900">
          Scheme maintenance area. Changes are stored in this browser only.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={startAdd} className={TOOL_CLASS}>
          <Plus className="h-5 w-5" aria-hidden="true" />
          Add scheme
        </Button>
        <Button variant="secondary" onClick={handleEditToolbar} className={TOOL_CLASS}>
          <Pencil className="h-5 w-5" aria-hidden="true" />
          Edit
        </Button>
        <Button variant="secondary" onClick={handleValidate} className={TOOL_CLASS}>
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          Validate
        </Button>
        <Button variant="ghost" onClick={handleReset} className={TOOL_CLASS}>
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
          Reset overrides
        </Button>
        <Button variant="secondary" onClick={handleExport} className={TOOL_CLASS}>
          <Download className="h-5 w-5" aria-hidden="true" />
          Export JSON
        </Button>
      </div>

      {message && (
        <p
          role="status"
          className={message.tone === 'ok' ? 'font-semibold text-primary-800' : 'font-semibold text-notEligible'}
        >
          {message.text}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Total schemes" value={summary.total} />
        <SummaryCard label="Valid verified date" value={summary.valid} />
        <SummaryCard label={`Needs re-verification (over ${REVERIFY_AFTER_DAYS} days)`} value={summary.stale} />
        <SummaryCard label="Date invalid" value={summary.invalid} alert={summary.invalid > 0} />
      </div>

      <Card className="flex flex-col gap-3">
        <h3 className="text-lg font-bold text-slate-900">Schemes by category</h3>
        {categories.length === 0 ? (
          <p className="text-sm text-slate-600">No categories.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {categories.map(([key, count]) => (
              <li key={key}>
                <Badge tone="info">
                  {categoryLabel(key)}: {count}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-slate-900">All schemes</h3>
          <p className="text-sm text-slate-600">
            A scheme needs re-verification when its last_verified date is more than {REVERIFY_AFTER_DAYS} days old.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={SEARCH_ID} className="text-sm font-semibold text-slate-900">
              Search by name or id
            </label>
            <input
              id={SEARCH_ID}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={CATEGORY_ID} className="text-sm font-semibold text-slate-900">
              Category
            </label>
            <select
              id={CATEGORY_ID}
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className={FIELD_CLASS}
            >
              <option value={ALL}>All categories</option>
              {categories.map(([key]) => (
                <option key={key} value={key}>
                  {categoryLabel(key)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={STATUS_ID} className="text-sm font-semibold text-slate-900">
              Verification status
            </label>
            <select
              id={STATUS_ID}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className={FIELD_CLASS}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-sm text-slate-600" aria-live="polite">
          Showing {filtered.length} of {rows.length} schemes.
        </p>

        {filtered.length === 0 ? (
          <EmptyState
            title="No schemes match these filters"
            description="Clear the search or set the filters back to all."
            action={
              filtersActive ? (
                <Button variant="secondary" onClick={clearFilters} className={TOOL_CLASS}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul className="flex flex-col gap-3 md:hidden">
              {filtered.map(({ scheme, status }) => {
                const name = String(scheme.name);
                return (
                  <li key={scheme.id} className="flex flex-col gap-2 rounded-xl border border-primary-100 bg-white p-4">
                    <p className="break-all font-mono text-sm text-slate-600">{String(scheme.id)}</p>
                    <p className="break-words text-base font-semibold text-slate-900">{name}</p>
                    <p className="text-sm text-slate-700">Category: {categoryLabel(categoryKey(scheme))}</p>
                    <p className="text-sm text-slate-700">Last verified: {String(scheme.last_verified)}</p>
                    <p className="text-sm text-slate-700">
                      Official URL: <UrlLink url={String(scheme.official_url ?? '')} />
                    </p>
                    <div>
                      <FreshnessBadge status={status} />
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        selectForEdit(String(scheme.id));
                        focusEditor();
                      }}
                      aria-label={`Edit ${name}`}
                      className={`w-full ${TOOL_CLASS}`}
                    >
                      <Pencil className="h-5 w-5" aria-hidden="true" />
                      Edit
                    </Button>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-primary-100 text-slate-600">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">ID</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Name</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Category</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Last verified</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Official URL</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100">
                  {filtered.map(({ scheme, status }) => {
                    const name = String(scheme.name);
                    return (
                      <tr key={scheme.id} className="align-top">
                        <td className="break-all px-3 py-3 font-mono text-slate-600">{String(scheme.id)}</td>
                        <td className="break-words px-3 py-3 font-semibold text-slate-900">{name}</td>
                        <td className="break-words px-3 py-3 text-slate-700">{categoryLabel(categoryKey(scheme))}</td>
                        <td className="px-3 py-3 text-slate-700">{String(scheme.last_verified)}</td>
                        <td className="px-3 py-3">
                          <UrlLink url={String(scheme.official_url ?? '')} />
                        </td>
                        <td className="px-3 py-3">
                          <FreshnessBadge status={status} />
                        </td>
                        <td className="px-3 py-3">
                          <Button
                            variant="secondary"
                            onClick={() => {
                              selectForEdit(String(scheme.id));
                              focusEditor();
                            }}
                            aria-label={`Edit ${name}`}
                            className={TOOL_CLASS}
                          >
                            <Pencil className="h-5 w-5" aria-hidden="true" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card id="admin-editor" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-slate-900">{isAdding ? 'Add a scheme' : 'Edit a scheme'}</h3>
          <p className="text-sm text-slate-600">
            {isAdding
              ? 'Enter an id that no existing scheme uses. The new scheme is added to the end of the list when you save.'
              : 'Edit the JSON, then save. The sections on the right show the scheme as it currently reads.'}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={SELECT_ID} className="text-sm font-semibold text-slate-900">
            Scheme to edit
          </label>
          <select
            id={SELECT_ID}
            value={isAdding ? '' : (selected?.id ?? '')}
            onChange={handleSelect}
            className={`${FIELD_CLASS} min-h-[48px]`}
          >
            <option value="" disabled>
              {isAdding ? 'New scheme (not saved yet)' : 'Choose a scheme'}
            </option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {String(s.name)} ({String(s.id)})
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={JSON_ID} className="text-sm font-semibold text-slate-900">
              Scheme JSON
            </label>
            <textarea
              ref={jsonRef}
              id={JSON_ID}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setMessage(null);
              }}
              spellCheck={false}
              aria-invalid={check.error ? true : undefined}
              aria-describedby={check.error ? ERROR_ID : undefined}
              className={[
                'min-h-[360px] w-full rounded-xl bg-cream p-3 font-mono text-sm text-slate-900',
                'border focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-300',
                check.error ? 'border-notEligible' : 'border-primary-200',
              ].join(' ')}
            />
            {check.error ? (
              <p id={ERROR_ID} role="alert" className="text-sm font-semibold text-notEligible">
                {check.error}
              </p>
            ) : (
              <p className="text-sm text-slate-600">Valid. Save to store the full scheme set in this browser.</p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <PreviewSection id="admin-section-basic" title="Basic info">
              <dl className="flex flex-col gap-2">
                <PreviewField label="ID" value={show(p?.id)} />
                <PreviewField label="Name" value={show(p?.name)} />
                <PreviewField label="Level" value={show(p?.level)} />
                <PreviewField label="State" value={show(p?.state)} />
                <PreviewField label="Category" value={show(p?.category)} />
                <PreviewField label="Official URL" value={show(p?.official_url)} />
              </dl>
            </PreviewSection>

            <PreviewSection id="admin-section-rules" title="Eligibility rules">
              {rules === null ? (
                <p className="text-sm text-slate-600">—</p>
              ) : rules.length === 0 ? (
                <p className="text-sm text-slate-600">No eligibility rules.</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {rules.map((rule, i) => {
                    const r: Record<string, unknown> = asRecord(rule) ?? {};
                    return (
                      <li key={i} className="flex flex-col gap-0.5 text-sm text-slate-900">
                        <span className="font-semibold">{show(r.id)}</span>
                        <span className="break-words">
                          {show(r.field)} {show(r.op)} · {r.hard === true ? 'Hard: must pass' : 'Soft: note only'}
                        </span>
                        <span className="break-words text-slate-700">{show(r.explain)}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </PreviewSection>

            <PreviewSection id="admin-section-benefits" title="Benefits">
              <dl className="flex flex-col gap-2">
                <PreviewField label="Benefit summary" value={show(p?.benefit_summary)} />
                <PreviewField label="Deadline type" value={show(deadline?.type)} />
                <PreviewField label="Deadline date" value={show(deadline?.date)} />
                <PreviewField label="Deadline note" value={show(deadline?.note)} />
              </dl>
            </PreviewSection>

            <PreviewSection id="admin-section-documents" title="Documents">
              {documents === null ? (
                <p className="text-sm text-slate-600">—</p>
              ) : documents.length === 0 ? (
                <p className="text-sm text-slate-600">No documents listed.</p>
              ) : (
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-slate-900">
                  {documents.map((doc, i) => (
                    <li key={i} className="break-words">
                      {show(asRecord(doc)?.name)}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-slate-600">
                Apply steps: {stepCount === null ? '—' : stepCount}
              </p>
            </PreviewSection>

            <PreviewSection id="admin-section-verification" title="Verification">
              <dl className="flex flex-col gap-2">
                <PreviewField label="Last verified" value={show(p?.last_verified)} />
              </dl>
              {p ? (
                <div>
                  <FreshnessBadge status={dateStatus(p.last_verified, today)} />
                </div>
              ) : (
                <p className="text-sm text-slate-600">Status appears once the JSON is readable.</p>
              )}
            </PreviewSection>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={!check.scheme}>
            {isAdding ? 'Add scheme' : 'Save changes'}
          </Button>
          <Button variant="ghost" onClick={handleDiscard}>
            {isAdding ? 'Cancel' : 'Discard edits'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
