import { useMemo, useState, type ChangeEvent } from 'react';
import { Badge, Button, Card, EmptyState, SectionHeader } from '../components/ui';
import { OVERRIDE_KEY, loadSchemes, validateSchemes } from '../lib/schemes';
import schemesData from '../data/schemes.json';
import type { Scheme } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
const REVERIFY_AFTER_DAYS = 90;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EXPORT_FILENAME = 'claim-whats-yours-schemes.json';
const SELECT_ID = 'admin-scheme-select';
const JSON_ID = 'admin-scheme-json';
const ERROR_ID = 'admin-scheme-json-error';

type Loaded = { schemes: Scheme[]; error: string | null };
type Message = { tone: 'ok' | 'error'; text: string };
type Check = { error: string | null; scheme: Scheme | null };

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function bundledSchemes(): Scheme[] {
  return validateSchemes(schemesData);
}

function toJson(scheme: Scheme | null | undefined): string {
  return scheme ? JSON.stringify(scheme, null, 2) : '';
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
        error: 'Saved changes are not valid JSON, so they are ignored and the default schemes are shown. Reset to default to clear them.',
      };
    }
  }
  try {
    return { schemes: loadSchemes(), error: null };
  } catch (err) {
    return {
      schemes: bundledSchemes(),
      error: `Saved changes are invalid (${errorMessage(err)}), so the default schemes are shown. Reset to default to clear them.`,
    };
  }
}

/** True when last_verified is more than 90 days before today (or cannot be read). */
function needsReverification(lastVerified: string, today: Date): boolean {
  const [year, month, day] = lastVerified.split('-').map(Number);
  const verified = Date.UTC(year, month - 1, day);
  if (Number.isNaN(verified)) return true;
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return (todayUtc - verified) / DAY_MS > REVERIFY_AFTER_DAYS;
}

/**
 * Validates the edited JSON for one scheme using validateSchemes, plus two checks:
 * the id must not change (the override replaces entries by id), and last_verified
 * must be YYYY-MM-DD (the re-verification badge depends on it).
 */
function checkDraft(text: string, originalId: string): Check {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { error: `Not valid JSON: ${errorMessage(err)}`, scheme: null };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: 'The scheme must be a JSON object.', scheme: null };
  }
  try {
    validateSchemes([parsed]);
  } catch (err) {
    return { error: errorMessage(err), scheme: null };
  }
  const scheme = parsed as Scheme;
  if (scheme.id !== originalId) {
    return {
      error: `The id must stay "${originalId}". Changing it would leave the original scheme in place.`,
      scheme: null,
    };
  }
  if (typeof scheme.last_verified !== 'string' || !DATE_PATTERN.test(scheme.last_verified)) {
    return { error: 'last_verified must be a date in YYYY-MM-DD format.', scheme: null };
  }
  return { error: null, scheme };
}

export default function Admin() {
  const [initial] = useState(loadForAdmin);
  const [schemes, setSchemes] = useState<Scheme[]>(initial.schemes);
  const [loadError, setLoadError] = useState<string | null>(initial.error);
  const [selectedId, setSelectedId] = useState<string | null>(initial.schemes[0]?.id ?? null);
  const [draft, setDraft] = useState<string>(() => toJson(initial.schemes[0]));
  const [message, setMessage] = useState<Message | null>(null);

  const selected = schemes.find((s) => s.id === selectedId) ?? null;
  const check = useMemo<Check>(
    () => (selected ? checkDraft(draft, selected.id) : { error: 'Select a scheme to edit.', scheme: null }),
    [draft, selected],
  );

  const today = new Date();
  const reverifyCount = schemes.filter((s) => needsReverification(String(s.last_verified), today)).length;

  function focusScheme(id: string | null, list: Scheme[]) {
    const target = list.find((s) => s.id === id) ?? list[0] ?? null;
    setSelectedId(target ? target.id : null);
    setDraft(toJson(target));
  }

  function handleSelect(event: ChangeEvent<HTMLSelectElement>) {
    setMessage(null);
    focusScheme(event.target.value, schemes);
  }

  function handleSave() {
    const edited = check.scheme;
    if (!selected || !edited) return;
    const next = schemes.map((s) => (s.id === selected.id ? edited : s));
    try {
      // Full edited set, same JSON-array shape loadSchemes reads.
      localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next));
    } catch (err) {
      setMessage({ tone: 'error', text: `Could not save to this browser: ${errorMessage(err)}` });
      return;
    }
    setSchemes(next);
    setLoadError(null);
    setMessage({ tone: 'ok', text: `Saved ${edited.name}. Open Home to see results with the edited rules.` });
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
    focusScheme(selectedId, next);
    setMessage({ tone: 'ok', text: 'Reset to the default schemes from schemes.json.' });
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
      subtitle="Review scheme dates and edit one scheme at a time. Changes are stored only in this browser."
    />
  );

  if (schemes.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          title="No schemes loaded"
          description="The scheme list is empty. Reset to default to restore the bundled schemes."
          action={<Button onClick={handleReset}>Reset to default</Button>}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}

      {loadError && (
        <div role="alert" className="rounded-xl border border-possible bg-accent-50 p-4">
          <p className="font-semibold text-possible">{loadError}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={handleExport}>
          Export JSON
        </Button>
        <Button variant="ghost" onClick={handleReset}>
          Reset to default
        </Button>
        {message && (
          <p
            role="status"
            className={message.tone === 'ok' ? 'font-semibold text-primary-800' : 'font-semibold text-possible'}
          >
            {message.text}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-900">All schemes ({schemes.length})</h3>
            <p className="text-sm text-slate-600">{reverifyCount} need re-verification</p>
          </div>
          <ul className="divide-y divide-primary-100">
            {schemes.map((s) => {
              const stale = needsReverification(String(s.last_verified), today);
              return (
                <li key={s.id} className="flex flex-col gap-1 py-3">
                  <span className="font-semibold text-slate-900">{s.name}</span>
                  <span className="break-all font-mono text-sm text-slate-600">{s.id}</span>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span>Last verified {String(s.last_verified)}</span>
                    {stale && <Badge tone="possible">Needs re-verification</Badge>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={SELECT_ID} className="text-sm font-semibold text-slate-900">
              Scheme to edit
            </label>
            <select
              id={SELECT_ID}
              value={selected?.id ?? ''}
              onChange={handleSelect}
              className="min-h-[48px] rounded-xl border border-primary-200 bg-white px-3 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-300"
            >
              {schemes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={JSON_ID} className="text-sm font-semibold text-slate-900">
              Scheme JSON
            </label>
            <textarea
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
                check.error ? 'border-possible' : 'border-primary-200',
              ].join(' ')}
            />
            {check.error ? (
              <p id={ERROR_ID} role="alert" className="text-sm font-semibold text-possible">
                {check.error}
              </p>
            ) : (
              <p className="text-sm text-slate-600">Valid. Save to store the full scheme set in this browser.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={!check.scheme}>
              Save changes
            </Button>
            <Button variant="ghost" onClick={() => focusScheme(selected?.id ?? null, schemes)}>
              Discard edits
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
