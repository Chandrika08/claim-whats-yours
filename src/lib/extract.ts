import type { Profile } from '../types';

export type Lang = 'en' | 'te' | 'hi';

export type Extraction = {
  profile: Partial<Profile>;
  evidence: Record<string, string>;   // profile field -> the original-language snippet that produced it
  warnings?: string[];                // contradictions or ambiguities; the affected field is left unset
};

// ---------------------------------------------------------------------------
// Normalisation. Every replacement is one code unit for one code unit, so match
// indexes in the normalised text map straight back onto the original text.
// ---------------------------------------------------------------------------

/** Script-based language guess: Telugu, Devanagari (Hindi), otherwise English. */
export function detectLang(text: string): Lang {
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}

function normalise(text: string): string {
  return text
    .replace(/[\u0C66-\u0C6F]/g, (c) => String(c.charCodeAt(0) - 0x0c66))   // Telugu digits
    .replace(/[\u0966-\u096F]/g, (c) => String(c.charCodeAt(0) - 0x0966))   // Devanagari digits
    .replace(/[\u2018\u2019]/g, "'");                                       // curly apostrophes
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
/** Alternation, longest first so that a short word never shadows a longer one. */
const alt = (words: string[]) => [...words].sort((a, b) => b.length - a.length).map(esc).join('|');

const LETTER = '\\p{L}\\p{M}';
const NOT_LETTER_AFTER = `(?![${LETTER}])`;
const NOT_NUMBER_BEFORE = `(?<![${LETTER}\\d.,])`;

// ---------------------------------------------------------------------------
// Lexicons
// ---------------------------------------------------------------------------

// Number words. Latin-script words (English and romanised Telugu/Hindi) are always active;
// Telugu- and Devanagari-script words are used when the text is not English.
const LATIN_NUMBER_WORDS: [string, number][] = [
  ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5],
  ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9], ['ten', 10],
  ['okati', 1], ['oka', 1], ['rendu', 2], ['renda', 2], ['moodu', 3], ['mudu', 3],
  ['naalugu', 4], ['nalugu', 4], ['aidu', 5], ['aaru', 6], ['edu', 7], ['enimidi', 8],
  ['tommidi', 9], ['padi', 10],
  ['ek', 1], ['do', 2], ['teen', 3], ['char', 4], ['paanch', 5], ['panch', 5],
  ['chhe', 6], ['chhah', 6], ['saat', 7], ['aath', 8], ['nau', 9], ['das', 10],
];
const INDIC_NUMBER_WORDS: [string, number][] = [
  ['ఒకటి', 1], ['ఒక', 1], ['రెండు', 2], ['మూడు', 3], ['నాలుగు', 4], ['ఐదు', 5],
  ['ఆరు', 6], ['ఏడు', 7], ['ఎనిమిది', 8], ['తొమ్మిది', 9], ['పది', 10],
  ['एक', 1], ['दो', 2], ['तीन', 3], ['चार', 4], ['पांच', 5], ['पाँच', 5], ['छह', 6],
  ['सात', 7], ['आठ', 8], ['नौ', 9], ['दस', 10],
];
const NUMBER_VALUE = new Map<string, number>([...LATIN_NUMBER_WORDS, ...INDIC_NUMBER_WORDS]);

// Area units and their factor to acres.
const ACRE_UNITS = ['acres', 'acre', 'ekaralu', 'ekaram', 'ekarlu', 'ekar', 'ekad', 'ekara',
  'ఎకరాలు', 'ఎకరాల', 'ఎకరం', 'ఎకరము', 'एकड़', 'एकड\u093C', 'एकड', 'एकर'];
const CENT_UNITS = ['cents', 'cent', 'centu', 'centus', 'sentu', 'sentlu', 'sent',
  'సెంట్లు', 'సెంటు', 'సెంట్ల', 'సెంట్', 'सेंट'];
const GUNTHA_UNITS = ['guntas', 'gunta', 'guntalu', 'guntha', 'gunthas', 'guntaa',
  'గుంటలు', 'గుంటల', 'గుంట', 'గుంఠ', 'గుంటా', 'गुंठा', 'गुंठे', 'गुंठ', 'गुंटा'];
const UNIT_FACTOR = new Map<string, number>([
  ...ACRE_UNITS.map((u): [string, number] => [u.toLowerCase(), 1]),
  ...CENT_UNITS.map((u): [string, number] => [u.toLowerCase(), 1 / 100]),
  ...GUNTHA_UNITS.map((u): [string, number] => [u.toLowerCase(), 1 / 40]),
]);
const ALL_UNITS = [...ACRE_UNITS, ...CENT_UNITS, ...GUNTHA_UNITS];

// Area regexes: digits or number word, then unit. Two variants: Latin number words only, or all.
const areaRe = (words: [string, number][]) =>
  new RegExp(
    `${NOT_NUMBER_BEFORE}(?:(\\d[\\d,]*(?:\\.\\d+)?)\\s*|(${alt(words.map(([w]) => w))})\\s+)(${alt(ALL_UNITS)})${NOT_LETTER_AFTER}`,
    'giu',
  );
const AREA_RE_LATIN = areaRe(LATIN_NUMBER_WORDS);
const AREA_RE_ALL = areaRe([...LATIN_NUMBER_WORDS, ...INDIC_NUMBER_WORDS]);


// Income: amount with optional lakh/thousand, currency and period, in either order.
const LAKH_WORDS = ['lakhs', 'lakh', 'lakshalu', 'lakshal', 'లక్షలు', 'లక్షల', 'లక్ష', 'लाख'];
const THOUSAND_WORDS = ['thousand', 'velu', 'vela', 'veyyi', 'వేల', 'వెయ్యి', 'hazaar', 'hazar', 'हज़ार', 'हजार'];
const MULTIPLIER_WORDS = [...LAKH_WORDS, ...THOUSAND_WORDS];
const CURRENCY_WORDS = ['rupees', 'rupee', 'rs.', 'rs', '₹', 'రూపాయలు', 'రూపాయల', 'రూపాయి', 'రూ.', 'రూ',
  'रुपये', 'रुपए', 'रुपया', 'रु.', 'रु'];
const MONTHLY_WORDS = ['per month', 'a month', 'every month', 'each month', 'monthly', 'nelaku', 'nelavari',
  'nela', 'mahinaa', 'mahinaaku', 'mahina', 'maasik', 'maasika', 'har mahine', 'har maah', 'prati maah',
  'प्रति माह', 'हर महीने', 'महीने', 'महीना', 'నెలకు', 'నెలవారీ', 'నెల'];
const ANNUAL_WORDS = ['a year', 'per year', 'yearly', 'annually', 'per annum', 'సంవత్సరానికి', 'సంవత్సరం',
  'ఏడాదికి', 'ఏటా', 'సాలానా', 'सालाना', 'प्रति वर्ष', 'वार्षिक'];
const PERIOD_WORDS = [...MONTHLY_WORDS, ...ANNUAL_WORDS];
const LAKH_RE = new RegExp(`^(?:${alt(LAKH_WORDS)})$`, 'iu');
const MONTHLY_RE = new RegExp(`^(?:${alt(MONTHLY_WORDS)})$`, 'iu');
const CUR = alt(CURRENCY_WORDS);
const MULT = alt(MULTIPLIER_WORDS);
const PERIOD = alt(PERIOD_WORDS);
const AMOUNT = '\\d[\\d,]*(?:\\.\\d+)?';
// amount ... period   (e.g. "15000 per month", "2 lakh a year", "15000 रुपये प्रति माह")
const INCOME_BEFORE_RE = new RegExp(
  `${NOT_NUMBER_BEFORE}(${AMOUNT})\\s*(?:(${MULT})\\s*)?(?:(?:${CUR})\\s*)?(${PERIOD})${NOT_LETTER_AFTER}`,
  'giu',
);
// period ... amount   (e.g. "nelaku 10000 vastundi", "నెలకు ౧౫౦౦౦ రూపాయలు")
const INCOME_AFTER_RE = new RegExp(
  `(${PERIOD})${NOT_LETTER_AFTER}\\s*(?:(?:${CUR})\\s*)?(${AMOUNT})\\s*(${MULT})?`,
  'giu',
);

const AGE_RES: RegExp[] = [
  /\b(?:i am|i'm|aged?)\s+(\d{1,3})\b/giu,
  /\b(\d{1,3})\s+years?\s+old\b/giu,
  /\b(?:vayasu|vayassu|umar|umra)\s+(?:is\s+)?(\d{1,3})\b/giu,
  /వయసు\s*(\d{1,3})/giu,
  /(\d{1,3})\s*(?:ఏళ్ళ|ఏళ్ల|సంవత్సరాల)/giu,
  /उम्र\s*(\d{1,3})/giu,
  /(\d{1,3})\s*साल/giu,
];
const COUPLE_AGE_RE = /\b(?:are|were)\s+(\d{1,3})\s+and\s+(\d{1,3})\b/iu;
const SENIOR_RE = /\b(?:senior citizens?|elderly)\b|వృద్ధ|बुजुर्ग/iu;
const STUDENT_RE = /\b(?:student|studying|college|vidyarthi|chhatra)\b|విద్యార్థి|छात्र|विद्यार्थी/iu;
const LABOUR_RE = /\bfarm\s+labou?rers?\b|\bagricultural\s+labou?rers?\b|\bkhet\s+mazdoor\b|వ్యవసాయ\s*కూలి|खेत(?:िहर)?\s*मज\u093C?दूर/iu;
const FARMER_RE = /\b(?:i am|i'm)\b[^.]*?\bfarmers?\b|\b(?:kisan|kishan|raithu|raitu|rythu|rytu)\b|రైతు|किसान/iu;
const NO_LAND_RE = /\bno\s+land\b|\blandless\b|భూమి\s*లేదు|ज\u093C?मीन\s*नहीं|भूमि\s*नहीं|\bbhoomi\s+ledu\b/iu;
// Leasing words only. "rent" alone is not a lease ("house rent").
const LEASE_RE = /\b(?:leased?|leasing|lease|tenants?|tenancy|sharecrop\w*|rented\s+land|kaul\w*|patte\s+par)\b|కౌలు|पट्टे\s*पर|लीज\u093C?/iu;
// Owner phrases: "I own", "in my own name", name-on-record, and Telugu/Hindi equivalents.
const OWN_RE = new RegExp([
  String.raw`\b(?:i|we)\s+own\b`,
  String.raw`\bowned\b`,
  String.raw`\bmy\s+(?:own\s+)?(?:land|name|field)\b`,
  String.raw`\bour\s+(?:own\s+)?land\b`,
  String.raw`\bown\s+land\b`,
  String.raw`\bname\s+on\s+(?:the\s+)?record\b`,
  String.raw`సొంత|స్వంత|నా\s*పేరు\s*మీద|నా\s*పేరున`,
  String.raw`मेरी\s*ज\u093C?मीन|मेरी\s*अपनी|अपनी\s*ज\u093C?मीन|मेरे\s*नाम`,
  String.raw`\bmeri\s+(?:zameen|jameen|zamin)\b|\bmere\s+naam\b|\bnaa?\s+peru\s+mee?da\b`,
].join('|'), 'iu');
const WOMAN_RE = /\bwoman\b|మహిళ|స్త్రీ|महिला|औरत|\b(?:mahila|aurat|stree)\b/iu;
const MAN_RE = /\bman\b|పురుషుడు|మగ|पुरुष|आदमी|\b(?:purush|aadmi)\b/iu;
const BANK_POSITIVE: RegExp[] = [
  /\b(?:bank|savings)\s+account\b/iu,
  /బ్యాంకు\s*ఖాతా/u,
  /बैंक\s*(?:खाता|अकाउंट)/u,
  /\bbank\s+(?:khata|kaata)\b/iu,
];
const BANK_NEGATIVE: RegExp[] = [
  /\b(?:no|without|don'?t have|do not have|doesn'?t have|does not have|not have)\s+(?:a\s+|an\s+)?(?:bank|savings)\s+account\b/iu,
  /\bbank\s+(?:account|khata|kaata)\s+(?:ledu|lev|ledhu)\b/iu,
  /బ్యాంకు\s*(?:ఖాతా|అకౌంట్|ఎకౌంట్)\s*(?:లేదు|లేదండి|లేవు)/u,
  /बैंक\s*(?:खाता|अकाउंट)\s*(?:नहीं|नही)/u,
  /\bbank\s+(?:khata|account)\s+(?:nahi|nahin)\b/iu,
];
const CCRC_RE = /\bccrc\b|సీసీఆర్సీ|सीसीआरसी/iu;
const EPANTA_RE = /\be[-\s]?panta\b|ఈ[-\s]?పంట|ई[-\s]?पंट/iu;
const NEGATION_RE = /\b(?:no|not|don'?t|doesn'?t|haven'?t|hasn'?t|never|without)\b|లేదు|లేదండి|లేవు|కాలేదు|नहीं|nahi|ledu/iu;
const AP_RE = /\bandhra\s+pradesh\b|ఆంధ్ర\s*ప్రదేశ్/iu;

// ---------------------------------------------------------------------------
// Clause helpers. Sentence punctuation that is not part of a decimal number.
// ---------------------------------------------------------------------------

const isSentenceBreak = (t: string, k: number) => /[.!?;।\n]/.test(t[k]) && !/\d/.test(t[k + 1] ?? '');

/** Start and end indexes of the sentence containing index i. */
function clauseBounds(t: string, i: number): [number, number] {
  let start = 0;
  for (let k = i - 1; k >= 0; k--) {
    if (isSentenceBreak(t, k)) { start = k + 1; break; }
  }
  let end = t.length;
  for (let k = i; k < t.length; k++) {
    if (isSentenceBreak(t, k)) { end = k; break; }
  }
  return [start, end];
}

// ---------------------------------------------------------------------------

type AreaHit = { acres: number; kind: 'owned' | 'leased' | 'unknown'; snippet: string };

const uniq = <T,>(xs: T[]) => [...new Set(xs)];

/**
 * Reads a plain-language story in English, Telugu or Hindi (Latin or native script)
 * and returns the profile fields it states. A field that is not stated, or that is
 * contradicted within the text, stays absent (null in the form) and is listed in warnings.
 * Evidence snippets are copied from the original text.
 */
export function extractProfile(text: string, lang?: Lang): Extraction {
  const t = normalise(text);
  const words = (lang ?? detectLang(text)) === 'en' ? AREA_RE_LATIN : AREA_RE_ALL;
  const profile: Partial<Profile> = {};
  const evidence: Record<string, string> = {};
  const warnings: string[] = [];

  const snip = (at: number, len: number) => text.slice(at, at + len).trim();
  const set = <K extends keyof Profile>(field: K, value: Profile[K], snippet: string) => {
    profile[field] = value;
    evidence[field] = snippet;
  };
  const hit = (re: RegExp) => {
    const m = re.exec(t);
    return m ? { value: m[0], snippet: snip(m.index, m[0].length) } : null;
  };

  const ap = hit(AP_RE);
  if (ap) set('state', 'Andhra Pradesh', ap.snippet);

  // ----- land -----
  const areas: AreaHit[] = [];
  const areaMatches = [...t.matchAll(words)];
  const areaBounds = areaMatches.map((m) => {
    const start = m.index ?? 0;
    return { start, end: start + m[0].length };
  });
  areaMatches.forEach((m, k) => {
    const { start, end } = areaBounds[k];
    const [clauseStart, clauseEnd] = clauseBounds(t, start);
    const from = Math.max(clauseStart, k > 0 ? areaBounds[k - 1].end : 0);
    const preceding = t.slice(from, start);
    const nextStart = k + 1 < areaBounds.length ? areaBounds[k + 1].start : t.length;
    const following = t.slice(end, Math.min(clauseEnd, nextStart));
    const classify = (seg: string): AreaHit['kind'] | null => {
      const own = OWN_RE.test(seg);
      const lease = LEASE_RE.test(seg);
      if (own === lease) return null;
      return own ? 'owned' : 'leased';
    };
    const kind = classify(preceding) ?? classify(following) ?? 'unknown';
    const numeric = m[1] !== undefined;
    const value = numeric ? Number(m[1].replace(/,/g, '')) : (NUMBER_VALUE.get(m[2].toLowerCase()) ?? NaN);
    const factor = UNIT_FACTOR.get(m[3].toLowerCase()) ?? NaN;
    const acres = Math.round(value * factor * 1e6) / 1e6;
    if (Number.isFinite(acres) && acres > 0) {
      areas.push({ acres, kind, snippet: snip(start, end - start) });
    }
  });

  const owned = areas.filter((a) => a.kind === 'owned');
  const leased = areas.filter((a) => a.kind === 'leased');
  const unknown = areas.filter((a) => a.kind === 'unknown');

  // Owned area takes priority, then leased, then unstated. Conflicting values leave the field unset.
  const landGroup = owned.length ? owned : leased.length ? leased : unknown;
  const landValues = uniq(landGroup.map((a) => a.acres));
  if (landValues.length > 1) {
    warnings.push(`Land area is stated as ${landValues.join(' and ')} acres; left blank.`);
  } else if (landGroup.length) {
    set('land_acres', landGroup[0].acres, landGroup[0].snippet);
  }

  const leasedValues = uniq(leased.map((a) => a.acres));
  if (leasedValues.length > 1) {
    warnings.push(`Leased area is stated as ${leasedValues.join(' and ')} acres; left blank.`);
  } else if (leased.length) {
    set('leased_cultivated_land_acres', leased[0].acres, leased[0].snippet);
  }

  const ownerish = owned.length > 0 || OWN_RE.test(t);
  const tenantish = leased.length > 0 || LEASE_RE.test(t);
  const landless = NO_LAND_RE.test(t);
  if ((tenantish && (ownerish || landless)) || (landless && owned.length > 0)) {
    warnings.push('Land ownership is contradictory (owned, leased or no land); left blank.');
  } else if (tenantish) {
    const phrase = hit(LEASE_RE);
    set('land_ownership', 'tenant', phrase?.snippet ?? leased[0]?.snippet ?? '');
  } else if (landless) {
    set('land_ownership', 'none', hit(NO_LAND_RE)?.snippet ?? '');
  } else if (ownerish) {
    const phrase = hit(OWN_RE);
    set('land_ownership', 'owner', phrase?.snippet ?? owned[0]?.snippet ?? '');
  }

  // ----- income -----
  const incomes: { value: number; snippet: string }[] = [];
  const addIncome = (at: number, len: number, amount: string, mult: string | undefined, period: string) => {
    const end = at + len;
    if (new RegExp(`^\\s*(?:${alt(ALL_UNITS)})`, 'iu').test(t.slice(end))) return;   // acres, not money
    const multiplier = mult ? (LAKH_RE.test(mult) ? 100000 : 1000) : 1;
    const monthly = MONTHLY_RE.test(period);
    const value = Number(amount.replace(/,/g, '')) * multiplier * (monthly ? 12 : 1);
    if (Number.isFinite(value) && value > 0) incomes.push({ value, snippet: snip(at, len) });
  };
  for (const m of t.matchAll(INCOME_BEFORE_RE)) addIncome(m.index ?? 0, m[0].length, m[1], m[2], m[3]);
  for (const m of t.matchAll(INCOME_AFTER_RE)) addIncome(m.index ?? 0, m[0].length, m[2], m[3], m[1]);
  const incomeValues = uniq(incomes.map((i) => i.value));
  if (incomeValues.length > 1) {
    warnings.push(`Income is stated as ${incomeValues.join(' and ')} a year; left blank.`);
  } else if (incomes.length) {
    set('annual_household_income', incomes[0].value, incomes[0].snippet);
  }

  // ----- age -----
  const ages: { value: number; snippet: string }[] = [];
  for (const re of AGE_RES) {
    for (const m of t.matchAll(re)) {
      const years = Number(m[1]);
      if (years >= 1 && years <= 120) ages.push({ value: years, snippet: snip(m.index ?? 0, m[0].length) });
    }
  }
  const ageValues = uniq(ages.map((a) => a.value));
  if (ageValues.length > 1) {
    warnings.push(`Age is stated as ${ageValues.join(' and ')}; left blank.`);
  } else if (ages.length) {
    set('age', ages[0].value, ages[0].snippet);
  }

  // ----- household -----
  const couple = COUPLE_AGE_RE.exec(t);
  if (couple && Math.max(Number(couple[1]), Number(couple[2])) >= 60) {
    set('household_has_senior', true, snip(couple.index, couple[0].length));
  }
  const senior = hit(SENIOR_RE);
  if (senior) set('household_has_senior', true, senior.snippet);
  if (profile.age !== undefined && profile.age !== null && profile.age >= 60 && ages.length) {
    set('household_has_senior', true, ages[0].snippet);
  }

  // ----- occupation -----
  const student = hit(STUDENT_RE);
  if (student) {
    set('occupation', 'student', student.snippet);
    set('household_has_student', true, student.snippet);
  } else {
    const labour = hit(LABOUR_RE);
    const farmer = labour ? null : hit(FARMER_RE);
    if (labour) set('occupation', 'agricultural_labourer', labour.snippet);
    else if (farmer) set('occupation', 'farmer', farmer.snippet);
  }

  // ----- gender -----
  const woman = hit(WOMAN_RE);
  const man = woman ? null : hit(MAN_RE);
  if (woman) set('gender', 'female', woman.snippet);
  else if (man) set('gender', 'male', man.snippet);

  // ----- bank account: a negation wins over a positive mention -----
  const negBank = BANK_NEGATIVE.map((re) => hit(re)).find((h) => h);
  const posBank = BANK_POSITIVE.map((re) => hit(re)).find((h) => h);
  if (negBank) set('has_bank_account', false, negBank.snippet);
  else if (posBank) set('has_bank_account', true, posBank.snippet);

  // ----- CCRC and e-Panta: set only when the story mentions them -----
  const mentionStatus = (re: RegExp): { value: boolean; snippet: string }[] => {
    const out: { value: boolean; snippet: string }[] = [];
    for (const m of t.matchAll(new RegExp(re.source, 'giu'))) {
      const [cs, ce] = clauseBounds(t, m.index ?? 0);
      const negated = NEGATION_RE.test(t.slice(cs, ce));
      out.push({ value: !negated, snippet: snip(m.index ?? 0, m[0].length) });
    }
    return out;
  };
  const resolveYesNo = (field: 'has_ccrc' | 'epanta_booked', mentions: { value: boolean; snippet: string }[], label: string) => {
    if (!mentions.length) return;
    const values = uniq(mentions.map((m) => m.value));
    if (values.length > 1) {
      warnings.push(`${label} is stated both as held and not held; left blank.`);
    } else {
      set(field, mentions[0].value, mentions[0].snippet);
    }
  };
  resolveYesNo('has_ccrc', mentionStatus(CCRC_RE), 'CCRC card');
  resolveYesNo('epanta_booked', mentionStatus(EPANTA_RE), 'e-Panta booking');

  // ----- rules -----
  const result: Extraction = { profile, evidence };
  if (warnings.length) result.warnings = warnings;
  return result;
}
