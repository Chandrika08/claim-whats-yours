import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  ClipboardList,
  ExternalLink,
  Info,
  ListChecks,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Card, Collapsible, EmptyState, SectionHeader } from '../components/ui';
import type { BadgeTone } from '../components/ui';
import { buildIcs, downloadIcs } from '../lib/ics';
import { loadSchemesOrBundled } from '../lib/schemes';
import { deadlineStatus, loadTracker, removeEntry, upsertEntry, type DeadlineStatus, type TrackerEntry, type TrackerStatus } from '../lib/tracker';
import type { Scheme } from '../types';
import { useLanguage } from '../i18n/useLanguage';
import { localizeScheme } from '../i18n/schemeContent';
import type { MessageKey } from '../i18n/messages';
import type { Lang } from '../i18n/types';

const STATUS_VALUES: TrackerStatus[] = ['not_started', 'documents_ready', 'applied', 'approved', 'rejected'];

/** The forward lifecycle, in order. "rejected" is shown separately as an end state. */
const LIFECYCLE: TrackerStatus[] = ['not_started', 'documents_ready', 'applied', 'approved'];

const STATUS_KEYS: Record<TrackerStatus, MessageKey> = {
  not_started: 'status.not_started',
  documents_ready: 'status.documents_ready',
  applied: 'status.applied',
  approved: 'status.approved',
  rejected: 'status.rejected',
};

const STATUS_TONE: Record<TrackerStatus, BadgeTone> = {
  not_started: 'info',
  documents_ready: 'accent',
  applied: 'possible',
  approved: 'eligible',
  rejected: 'notEligible',
};

const DEADLINE_BADGE: Record<Exclude<DeadlineStatus, 'none'>, { labelKey: MessageKey; tone: BadgeTone; icon: ReactNode }> = {
  overdue: { labelKey: 'tracker.badge.overdue', tone: 'possible', icon: <AlertTriangle className="h-4 w-4" aria-hidden="true" /> },
  due_soon: { labelKey: 'tracker.badge.dueSoon', tone: 'possible', icon: <Clock className="h-4 w-4" aria-hidden="true" /> },
  ok: { labelKey: 'tracker.badge.onTrack', tone: 'info', icon: <CalendarDays className="h-4 w-4" aria-hidden="true" /> },
};

const RANK: Record<DeadlineStatus, number> = { overdue: 0, due_soon: 1, ok: 2, none: 3 };

const LOCALE: Record<Lang, string> = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' };

type Reminder = { entry: TrackerEntry; status: Exclude<DeadlineStatus, 'none'> };

type TrackerState = { entries: TrackerEntry[]; error: MessageKey | null };

function readState(): TrackerState {
  try {
    return { entries: loadTracker(), error: null };
  } catch {
    return { entries: [], error: 'tracker.error.storage' };
  }
}

function formatDate(iso: string, lang: Lang): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short', year: 'numeric' });
}

const fieldClass =
  'min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-accent-300';

export default function Tracker() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [state, setState] = useState<TrackerState>(readState);

  const schemesById = useMemo(() => {
    try {
      return new Map(loadSchemesOrBundled().map((s) => [s.id, s] as const));
    } catch {
      return new Map<string, Scheme>();
    }
  }, []);
  const titleFor = (schemeId: string) => schemesById.get(schemeId)?.name ?? schemeId;

  const counts = useMemo(() => {
    const result: Record<TrackerStatus, number> = {
      not_started: 0,
      documents_ready: 0,
      applied: 0,
      approved: 0,
      rejected: 0,
    };
    for (const entry of state.entries) result[entry.status] += 1;
    return result;
  }, [state.entries]);

  const today = new Date();

  // Reminders: every stored entry that has a deadline, overdue first, then soonest.
  const reminders: Reminder[] = [];
  for (const entry of state.entries) {
    const status = deadlineStatus(entry, today);
    if (status !== 'none') reminders.push({ entry, status });
  }
  reminders.sort((a, b) => RANK[a.status] - RANK[b.status] || (a.entry.deadline ?? '').localeCompare(b.entry.deadline ?? ''));
  const hasUrgentReminder = reminders.some((r) => r.status !== 'ok');

  // Pending actions: entries the farmer still has to act on.
  const pending = state.entries.filter((e) => e.status === 'not_started' || e.status === 'documents_ready');

  function update(schemeId: string, patch: Partial<Pick<TrackerEntry, 'status' | 'deadline' | 'notes'>>) {
    try {
      const next = upsertEntry(schemeId, patch);
      setState({ entries: next, error: null });
    } catch {
      setState((prev) => ({ ...prev, error: 'tracker.error.storage' }));
    }
  }

  function remove(schemeId: string) {
    try {
      setState({ entries: removeEntry(schemeId), error: null });
    } catch {
      setState((prev) => ({ ...prev, error: 'tracker.error.storage' }));
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
      setState((prev) => ({ ...prev, error: 'calendar.error' }));
    }
  }

  function renderLifecycle(status: TrackerStatus) {
    const isRejected = status === 'rejected';
    const current = LIFECYCLE.indexOf(status); // -1 when rejected
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-slate-700">{t('tracker.lifecycle.label')}</p>
        <ol className="grid grid-cols-4 gap-2" aria-label={t('tracker.lifecycle.label')}>
          {LIFECYCLE.map((step, index) => {
            const done = !isRejected && index < current;
            const active = !isRejected && index === current;
            return (
              <li key={step} aria-current={active ? 'step' : undefined} className="flex min-w-0 flex-col gap-1.5">
                <span
                  aria-hidden="true"
                  className={['h-1.5 rounded-full', done || active ? 'bg-primary-600' : 'bg-slate-200'].join(' ')}
                />
                <span
                  className={[
                    'flex items-start gap-1 text-xs leading-tight sm:text-sm',
                    done ? 'text-slate-800' : active ? 'font-bold text-primary-800' : 'text-slate-500',
                  ].join(' ')}
                >
                  {done && <Check className="mt-px h-3.5 w-3.5 shrink-0 text-primary-700" aria-hidden="true" />}
                  <span className="min-w-0 break-words">{t(STATUS_KEYS[step])}</span>
                </span>
              </li>
            );
          })}
        </ol>
        {isRejected && (
          <p className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-notEligible">
            <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('tracker.lifecycle.rejected')}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">{t('tracker.eyebrow')}</p>
        <h1 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">{t('tracker.title')}</h1>
        <p className="max-w-3xl text-base leading-relaxed text-slate-600">{t('tracker.intro')}</p>
      </header>

      <div role="note" className="flex items-start gap-3 rounded-2xl border border-primary-200 bg-primary-50 p-4 text-base text-primary-900">
        <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>{t('tracker.notice')}</p>
      </div>

      {state.error && (
        <div role="alert" className="rounded-2xl border border-accent-500 bg-accent-50 p-4 text-base text-accent-900">
          {t(state.error)}
        </div>
      )}

      {state.entries.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-7 w-7" aria-hidden="true" />}
          title={t('tracker.empty.title')}
          description={t('tracker.empty.description')}
          action={
            <Button onClick={() => navigate('/results')}>
              {t('tracker.empty.action')}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          }
        />
      ) : (
        <>
          <section aria-label={t('tracker.summary.title')} className="flex flex-col gap-3">
            <SectionHeader
              icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}
              title={t('tracker.summary.title')}
            />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <li className="flex flex-col gap-1 rounded-2xl bg-primary-700 p-4 text-white">
                <span className="text-3xl font-extrabold tabular-nums">{state.entries.length}</span>
                <span className="text-sm font-semibold">{t('tracker.summary.total')}</span>
              </li>
              {STATUS_VALUES.map((value) => (
                <li key={value} className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="text-3xl font-extrabold tabular-nums text-slate-900">{counts[value]}</span>
                  <span className="text-sm font-semibold text-slate-700">{t(STATUS_KEYS[value])}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {reminders.length > 0 && (
              <section
                aria-labelledby="tracker-reminders"
                className={[
                  'rounded-2xl border p-4',
                  hasUrgentReminder ? 'border-accent-300 bg-accent-50' : 'border-slate-200 bg-white',
                ].join(' ')}
              >
                <h2 id="tracker-reminders" className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <CalendarDays className="h-5 w-5 text-primary-700" aria-hidden="true" />
                  {t('tracker.reminders.title')}
                </h2>
                <ul className="mt-3 flex flex-col gap-3">
                  {reminders.map(({ entry, status }) => (
                    <li key={entry.schemeId} className="flex items-start gap-2 text-base text-slate-900">
                      <span className={status === 'ok' ? 'mt-0.5 text-primary-700' : 'mt-0.5 text-accent-900'}>
                        {DEADLINE_BADGE[status].icon}
                      </span>
                      <span>
                        <span className="font-semibold">{titleFor(entry.schemeId)}</span>{' '}
                        <span className="text-slate-700">
                          {t(status === 'overdue' ? 'tracker.alert.overdue' : 'tracker.alert.dueSoon', { date: entry.deadline ?? '' })}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="tracker-pending" className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 id="tracker-pending" className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <ClipboardList className="h-5 w-5 text-primary-700" aria-hidden="true" />
                {t('tracker.next.title')}
              </h2>
              {pending.length === 0 ? (
                <p className="mt-3 text-base text-slate-600">{t('tracker.next.empty')}</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {pending.map((entry) => (
                    <li key={entry.schemeId} className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-900">{titleFor(entry.schemeId)}</span>
                      <span className="text-base text-slate-700">
                        {t(entry.status === 'documents_ready' ? 'tracker.next.documentsReady' : 'tracker.next.notStarted')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <ul className="grid gap-4 md:grid-cols-2">
            {state.entries.map((entry) => {
              const status = deadlineStatus(entry, today);
              const badge = status === 'none' ? null : DEADLINE_BADGE[status];
              const id = entry.schemeId;
              const scheme = schemesById.get(id);
              const deadlineNote = scheme ? localizeScheme(scheme, lang).deadline.note : undefined;
              return (
                <li key={id} className="flex">
                  <Card className="flex w-full flex-col gap-5">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="min-w-0 break-words text-lg font-bold leading-snug text-slate-900">{titleFor(id)}</h2>
                        <Badge tone={STATUS_TONE[entry.status]}>{t(STATUS_KEYS[entry.status])}</Badge>
                      </div>

                      {renderLifecycle(entry.status)}

                      <div className="flex flex-wrap items-center gap-2 text-base text-slate-700">
                        <CalendarDays className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
                        <span>
                          {entry.deadline
                            ? t('tracker.deadline.label', { date: entry.deadline })
                            : t('tracker.deadline.none')}
                        </span>
                        {badge && (
                          <Badge tone={badge.tone} icon={badge.icon}>
                            {t(badge.labelKey)}
                          </Badge>
                        )}
                      </div>

                      {scheme?.official_url && (
                        <a
                          href={scheme.official_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[44px] w-fit items-center gap-1.5 rounded-lg font-semibold text-primary-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          {t('tracker.officialWebsite')}
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </a>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`status-${id}`} className="text-sm font-semibold text-slate-700">
                        {t('tracker.update.status')}
                      </label>
                      <select
                        id={`status-${id}`}
                        value={entry.status}
                        onChange={(e) => update(id, { status: e.target.value as TrackerStatus })}
                        className={fieldClass}
                      >
                        {STATUS_VALUES.map((value) => (
                          <option key={value} value={value}>
                            {t(STATUS_KEYS[value])}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Collapsible id={`details-${id}`} title={t('tracker.details.title')}>
                      <div className="flex flex-col gap-4">
                        <p className="text-sm text-slate-600">
                          {t('tracker.details.updated', { date: formatDate(entry.updatedAt, lang) })}
                        </p>

                        <div className="flex flex-col gap-1.5">
                          <label htmlFor={`deadline-${id}`} className="text-sm font-semibold text-slate-700">
                            {t('tracker.field.deadline')}
                          </label>
                          <input
                            id={`deadline-${id}`}
                            type="date"
                            value={entry.deadline ?? ''}
                            onChange={(e) => update(id, { deadline: e.target.value === '' ? null : e.target.value })}
                            aria-describedby={deadlineNote ? `deadline-note-${id}` : undefined}
                            className={fieldClass}
                          />
                          {deadlineNote && (
                            <p id={`deadline-note-${id}`} className="text-sm text-slate-600">
                              {deadlineNote}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label htmlFor={`notes-${id}`} className="text-sm font-semibold text-slate-700">
                            {t('tracker.field.notes')}
                          </label>
                          <textarea
                            id={`notes-${id}`}
                            rows={3}
                            value={entry.notes}
                            onChange={(e) => update(id, { notes: e.target.value })}
                            placeholder={t('tracker.notes.placeholder')}
                            className="w-full rounded-xl border-2 border-slate-300 bg-white p-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-primary-600 focus:outline-none focus:ring-4 focus:ring-accent-300"
                          />
                        </div>
                      </div>
                    </Collapsible>

                    <div className="mt-auto flex flex-wrap items-center gap-3">
                      {entry.deadline && (
                        <Button
                          variant="ghost"
                          onClick={() => addToCalendar(entry)}
                          className="w-full border-2 border-primary-700 sm:w-auto"
                        >
                          <CalendarPlus className="h-5 w-5" aria-hidden="true" />
                          {t('calendar.add')}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => remove(id)}
                        className="w-full border-2 border-slate-300 text-slate-700 hover:bg-slate-50 sm:w-auto"
                      >
                        <Trash2 className="h-5 w-5" aria-hidden="true" />
                        {t('tracker.action.remove')}
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
