import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarPlus, ExternalLink, ListChecks, Trash2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState } from '../components/ui';
import type { BadgeTone } from '../components/ui';
import { buildIcs, downloadIcs } from '../lib/ics';
import { loadSchemes } from '../lib/schemes';
import {
  TRACKER_STATUS_LABELS,
  deadlineStatus,
  loadTracker,
  removeEntry,
  upsertEntry,
  type DeadlineStatus,
  type TrackerEntry,
  type TrackerStatus,
} from '../lib/tracker';
import type { Scheme } from '../types';

const STATUS_OPTIONS = Object.entries(TRACKER_STATUS_LABELS) as [TrackerStatus, string][];

const STORAGE_ERROR =
  'We could not read or save your tracker. Your browser storage may be full or turned off, so changes may not be kept.';

const DEADLINE_BADGE: Record<Exclude<DeadlineStatus, 'none'>, { label: string; tone: BadgeTone }> = {
  overdue: { label: 'Overdue', tone: 'possible' },
  due_soon: { label: 'Due within 7 days', tone: 'possible' },
  ok: { label: 'On track', tone: 'info' },
};

type TrackerState = { entries: TrackerEntry[]; error: string | null };

function readState(): TrackerState {
  try {
    return { entries: loadTracker(), error: null };
  } catch {
    return { entries: [], error: STORAGE_ERROR };
  }
}

const fieldClass =
  'min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-accent-300';

export default function Tracker() {
  const [state, setState] = useState<TrackerState>(readState);

  const schemesById = useMemo(() => {
    try {
      return new Map(loadSchemes().map((s) => [s.id, s] as const));
    } catch {
      return new Map<string, Scheme>();
    }
  }, []);
  const titleFor = (schemeId: string) => schemesById.get(schemeId)?.name ?? schemeId;

  const today = new Date();
  const alerts = state.entries
    .map((entry) => ({ entry, status: deadlineStatus(entry, today) }))
    .filter((a) => a.status === 'overdue' || a.status === 'due_soon')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'overdue' ? -1 : 1;
      return (a.entry.deadline ?? '').localeCompare(b.entry.deadline ?? '');
    });

  function update(schemeId: string, patch: Partial<Pick<TrackerEntry, 'status' | 'deadline' | 'notes'>>) {
    try {
      const next = upsertEntry(schemeId, patch);
      setState({ entries: next, error: null });
    } catch {
      setState((prev) => ({ ...prev, error: STORAGE_ERROR }));
    }
  }

  function remove(schemeId: string) {
    try {
      setState({ entries: removeEntry(schemeId), error: null });
    } catch {
      setState((prev) => ({ ...prev, error: STORAGE_ERROR }));
    }
  }

  function addToCalendar(entry: TrackerEntry) {
    if (!entry.deadline) return;
    try {
      const ics = buildIcs({
        schemeId: entry.schemeId,
        title: titleFor(entry.schemeId),
        deadline: entry.deadline,
        notes: entry.notes,
      });
      downloadIcs(`${entry.schemeId}-deadline.ics`, ics);
    } catch {
      setState((prev) => ({ ...prev, error: 'We could not create the calendar file. Please try again.' }));
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">Claim What's Yours</p>
        <h1 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">Your application tracker</h1>
        <p className="text-base leading-relaxed text-slate-600">
          Keep track of where each scheme stands. This list is saved only in this browser.
        </p>
      </header>

      {state.error && (
        <div role="alert" className="rounded-2xl border border-accent-500 bg-accent-50 p-4 text-base text-accent-900">
          {state.error}
        </div>
      )}

      {alerts.length > 0 && (
        <section aria-labelledby="tracker-alerts" className="rounded-2xl border border-accent-300 bg-accent-50 p-4">
          <h2 id="tracker-alerts" className="flex items-center gap-2 text-lg font-bold text-accent-900">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            Deadlines to check
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {alerts.map(({ entry, status }) => (
              <li key={entry.schemeId} className="text-base text-slate-900">
                <span className="font-semibold">{titleFor(entry.schemeId)}</span>
                {' '}
                <span className="text-slate-700">
                  {status === 'overdue' ? 'was due' : 'is due'} {entry.deadline}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {state.entries.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-7 w-7" aria-hidden="true" />}
          title="Nothing tracked yet"
          description="Check your likely schemes on the Results page first, then add each one here to track its application and deadline."
          action={
            <Link
              to="/results"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary-700 px-5 py-2.5 font-semibold text-white shadow-soft hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              See my results
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {state.entries.map((entry) => {
            const status = deadlineStatus(entry, today);
            const badge = status === 'none' ? null : DEADLINE_BADGE[status];
            const id = entry.schemeId;
            const scheme = schemesById.get(id);
            return (
              <li key={id}>
                <Card className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{titleFor(id)}</h2>
                    {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
                  </div>

                  {scheme?.official_url && (
                    <a
                      href={scheme.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] w-fit items-center gap-1.5 rounded-lg font-semibold text-primary-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      Official website
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`status-${id}`} className="text-sm font-semibold text-slate-700">
                      Status
                    </label>
                    <select
                      id={`status-${id}`}
                      value={entry.status}
                      onChange={(e) => update(id, { status: e.target.value as TrackerStatus })}
                      className={fieldClass}
                    >
                      {STATUS_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`deadline-${id}`} className="text-sm font-semibold text-slate-700">
                      Deadline
                    </label>
                    <input
                      id={`deadline-${id}`}
                      type="date"
                      value={entry.deadline ?? ''}
                      onChange={(e) => update(id, { deadline: e.target.value === '' ? null : e.target.value })}
                      aria-describedby={scheme?.deadline.note ? `deadline-note-${id}` : undefined}
                      className={fieldClass}
                    />
                    {scheme?.deadline.note && (
                      <p id={`deadline-note-${id}`} className="text-sm text-slate-600">
                        {scheme.deadline.note}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`notes-${id}`} className="text-sm font-semibold text-slate-700">
                      Notes
                    </label>
                    <textarea
                      id={`notes-${id}`}
                      rows={3}
                      value={entry.notes}
                      onChange={(e) => update(id, { notes: e.target.value })}
                      placeholder="For example: bring the land record copy to the office."
                      className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-accent-300"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {entry.deadline && (
                      <Button
                        variant="ghost"
                        onClick={() => addToCalendar(entry)}
                        className="w-full border-2 border-primary-700 sm:w-auto"
                      >
                        <CalendarPlus className="h-5 w-5" aria-hidden="true" />
                        Add to calendar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => remove(id)}
                      className="w-full border-2 border-slate-300 text-slate-700 hover:bg-slate-50 sm:w-auto"
                    >
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
