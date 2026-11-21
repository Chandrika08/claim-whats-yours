import type { Lang } from './types';
import { pmKisan } from './schemeData/pm-kisan';
import { pmfby } from './schemeData/pmfby';
import { kcc } from './schemeData/kcc';
import { pmKmy } from './schemeData/pm-kmy';
import { soilHealthCard } from './schemeData/soil-health-card';
import { pmksyPdmc } from './schemeData/pmksy-pdmc';

// Translated scheme content. Only display text is translated here; ids,
// official URLs, dates, thresholds, amounts and rule conditions stay in
// the English scheme records and are never changed by this module.

export interface SchemeDocumentTranslation {
  name?: string;
  why?: string;
  where_to_get?: string;
}

export interface SchemeTranslation {
  category?: string;
  benefit_summary?: string;
  rules?: Record<string, string>;
  documents?: readonly SchemeDocumentTranslation[];
  apply_steps?: readonly string[];
  deadline_note?: string;
}

type Rec = Record<string, unknown>;

const TRANSLATIONS: Record<string, { te: SchemeTranslation; hi: SchemeTranslation }> = {
  'pm-kisan': pmKisan,
  pmfby,
  kcc,
  'pm-kmy': pmKmy,
  'soil-health-card': soilHealthCard,
  'pmksy-pdmc': pmksyPdmc,
};

export const SCHEME_TRANSLATION_IDS: readonly string[] = Object.keys(TRANSLATIONS);

const asRecs = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]) : []);
const asStrs = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

export function localizeScheme<T extends { id: string }>(scheme: T, lang: Lang): T {
  if (lang === 'en') return scheme;
  const tr = TRANSLATIONS[scheme.id]?.[lang];
  if (!tr) return scheme;

  const src = scheme as unknown as Rec;
  const out: Rec = { ...src };
  if (tr.category) out.category = tr.category;
  if (tr.benefit_summary) out.benefit_summary = tr.benefit_summary;

  const rules = asRecs(src.rules);
  if (rules.length > 0) {
    out.rules = rules.map((r) => {
      const t = tr.rules?.[String(r.id)];
      return t ? { ...r, explain: t } : r;
    });
  }

  const docs = asRecs(src.documents);
  if (docs.length > 0) {
    out.documents = docs.map((d, i) => {
      const t = tr.documents?.[i];
      if (!t) return d;
      const merged: Rec = { ...d };
      if (t.name) merged.name = t.name;
      if (t.why) merged.why = t.why;
      if (t.where_to_get) merged.where_to_get = t.where_to_get;
      return merged;
    });
  }

  const steps = asStrs(src.apply_steps);
  if (steps.length > 0 && tr.apply_steps) {
    out.apply_steps = steps.map((s, i) => tr.apply_steps?.[i] || s);
  }

  const dl = src.deadline as Rec | null | undefined;
  if (dl && typeof dl === 'object' && tr.deadline_note) {
    out.deadline = { ...dl, note: tr.deadline_note };
  }

  return out as T;
}

export function schemeTranslationGaps(
  schemes: ReadonlyArray<Rec & { id: string }>,
  lang: Lang,
): string[] {
  if (lang === 'en') return [];
  const gaps: string[] = [];

  for (const s of schemes) {
    const tr = TRANSLATIONS[s.id]?.[lang];
    if (!tr) {
      gaps.push(`${s.id}: no translation`);
      continue;
    }

    for (const r of asRecs(s.rules)) {
      if (!tr.rules?.[String(r.id)]) {
        gaps.push(`${s.id}: rule ${String(r.id)} has no explain translation`);
      }
    }

    const enDocs = asRecs(s.documents);
    const trDocs = tr.documents ?? [];
    if (trDocs.length !== enDocs.length) {
      gaps.push(`${s.id}: documents count ${trDocs.length} vs English ${enDocs.length}`);
    }
    enDocs.forEach((_, i) => {
      const d = trDocs[i];
      const missing = (['name', 'why', 'where_to_get'] as const).filter((k) => !d?.[k]);
      if (missing.length > 0) {
        gaps.push(`${s.id}: document ${i} missing ${missing.join(', ')}`);
      }
    });

    const enSteps = asStrs(s.apply_steps);
    const trSteps = tr.apply_steps ?? [];
    if (trSteps.length !== enSteps.length) {
      gaps.push(`${s.id}: apply_steps count ${trSteps.length} vs English ${enSteps.length}`);
    }

    const dl = s.deadline as Rec | null | undefined;
    if (dl && typeof dl.note === 'string' && !tr.deadline_note) {
      gaps.push(`${s.id}: deadline note not translated`);
    }
  }

  return gaps;
}
