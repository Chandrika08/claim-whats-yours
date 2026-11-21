# Architecture

## Stack (kept simple so it always builds and deploys)
Vite + React + TypeScript + Tailwind CSS + Vitest + react-router (HashRouter).
Static single-page app. No backend, no database, no runtime API calls. State in localStorage.
All logic is rule-based and runs in the browser.

## Folders
src/
  types.ts
  data/schemes.json            editable scheme rules (source of truth)
  data/sample-profiles.json    copied from seed/
  lib/schemes.ts               load + validate schemes (merges admin override from localStorage)
  lib/eligibility.ts           rule engine
  lib/extract.ts               plain text -> Profile
  lib/questions.ts             which follow-up questions to ask
  lib/tracker.ts               localStorage tracker + reminders
  lib/ics.ts                   calendar export
  pages/ Home.tsx Results.tsx Tracker.tsx Admin.tsx Partners.tsx
  components/ (Chips, SchemeCard, RuleList, Disclaimer, Nav)
docs/  seed/  README.md

## Types (src/types.ts)
type Profile = {
  state: string | null;                 // "Andhra Pradesh"
  age: number | null;
  gender: "male" | "female" | "other" | null;
  occupation: "farmer" | "agricultural_labourer" | "student" | "other" | null;
  land_acres: number | null;
  land_ownership: "owner" | "tenant" | "none" | null;
  annual_household_income: number | null;   // rupees per year
  social_category: "general" | "obc" | "sc" | "st" | null;  // optional, not used by current schemes, do not ask
  has_bank_account: boolean | null;
  household_has_senior: boolean | null;     // anyone aged 60+
  household_has_student: boolean | null;
  is_income_taxpayer: boolean | null;
  is_govt_employee: boolean | null;
  family_excluded_category: boolean | null; // minister/MP/MLA/mayor, registered professional, or pension of Rs 10,000+
  in_land_records_aug_2019: boolean | null;
  covered_by_other_pension: boolean | null;
  is_widow: boolean | null;
  is_bpl: boolean | null;
  lives_in_rural_area: boolean | null;
  is_destitute: boolean | null;             // little or no means of living and no family to depend on
};

type Rule = {
  id: string;
  field: keyof Profile;
  op: "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "in" | "not_in" | "is_true" | "is_false";
  value?: unknown;
  hard: boolean;          // hard = must pass to be eligible; soft = note only
  explain: string;        // plain-language reason shown to the user
};

type Scheme = {
  id: string; name: string; level: "central" | "state"; state: string;   // "ALL" or "Andhra Pradesh"
  category: string; benefit_summary: string;
  official_url: string; last_verified: string;                            // YYYY-MM-DD
  rules: Rule[];
  documents: { name: string; why: string; where_to_get: string }[];
  apply_steps: string[];
  deadline: { type: "rolling" | "fixed" | "seasonal"; date: string | null; note: string };
};

type RuleResult = { ruleId: string; field: string; result: "pass" | "fail" | "unknown"; explain: string; profileValue: unknown };
type MatchResult = {
  schemeId: string;
  status: "likely_eligible" | "possibly_eligible" | "not_eligible";
  ruleResults: RuleResult[];
  missingFields: string[];
};

## Eligibility engine (lib/eligibility.ts)
- For each rule: profile value null -> "unknown". Otherwise apply op -> "pass" or "fail".
- Any HARD rule fails -> not_eligible.
- No hard fail but any HARD rule unknown -> possibly_eligible, missingFields = fields of those rules.
- All hard rules pass -> likely_eligible. Soft rules never change status, they only add notes.
- Pure functions, fully unit tested with seed/sample-profiles.json.

## Extractor (lib/extract.ts)
extractProfile(text) -> { profile: Partial<Profile>, evidence: Record<string,string> }
- evidence holds the text snippet that produced each field, shown as "I understood" chips.
- Keyword + regex only: acres ("2 acres", "1.5 acre"), age ("45 years", "I am 45", "aged 45"), income
  (per month x12, per year, "lakh" = 100000), occupation words (farmer, farm labour, student, college),
  ownership ("own", "my land" -> owner; "lease", "tenant", "rent" -> tenant; "no land", "landless" -> none),
  gender words (woman, wife, man, husband), bank account ("bank account", "savings account"), state names.
- Never guess. Unknown stays null and goes to the follow-up engine.

## Follow-up engine (lib/questions.ts)
- Look at schemes not yet ruled out. Count null fields used by their hard rules.
- Ask the top 1 to 3 fields as tappable chips (Yes/No, options). Optional fields (social_category) are skippable.
- Re-run matching after every answer.

## Tracker (lib/tracker.ts)
- localStorage key "cwy.tracker.v1": { schemeId, status, deadline, notes, updatedAt }[]
- status: not_started | documents_ready | applied | approved | rejected
- Reminders: banner for deadlines within 7 days and overdue ones. .ics export per deadline.

## Admin (pages/Admin.tsx)
- Shows schemes, lets the user edit a scheme's JSON, validates, saves override in localStorage "cwy.schemes.override.v1".
- Buttons: Reset to default, Export JSON.
- Badge "Needs re-verification" when last_verified is over 90 days old.

## Deployment
Static build (npm run build -> dist/). Deploy from GitHub to Vercel or Netlify (free), or use the Codebenders deploy option if there is one.

## Follow-up question wording (use exactly these; answers are Yes / No / Not sure)
Rule: ask a field only if a scheme that is not yet ruled out has a hard rule on it. "Not sure" keeps it null.
| Field | Question | Notes |
|---|---|---|
| land_ownership | Is the land in your name, or do you cultivate it on lease? | chips: In my name / Leased / No land |
| land_acres | About how many acres do you cultivate? | number input |
| age | How old are you? | number input |
| annual_household_income | About how much does your family earn in a year? | number input, show lakh helper |
| has_bank_account | Do you have a savings bank account? | Yes/No |
| is_income_taxpayer | Did anyone in your family pay income tax last year? | Yes/No |
| is_govt_employee | Does anyone in your family work, or used to work, for the government? (Not counting peons or Class IV staff) | Yes/No |
| family_excluded_category | Is anyone in your family a current or former minister, MP, MLA or mayor, a registered doctor, engineer, lawyer, CA or architect, or getting a pension of Rs 10,000 or more a month? | Yes/No |
| in_land_records_aug_2019 | Was your name in the land records on 1 August 2019? | Yes/No |
| covered_by_other_pension | Are you already covered by any other pension scheme (such as NPS, ESIC or EPFO)? | Yes/No |
| is_widow | Are you a widow? | Yes/No |
| is_bpl | Does your family have a BPL (Below Poverty Line) card? | Yes/No |
| lives_in_rural_area | Do you live in a village (rural area)? | Yes/No |
| is_destitute | Do you have little or no means of living and no family or relatives to depend on? | Yes/No |
Never ask for Aadhaar, phone, address or any ID number.

## Data note
6 central schemes are in seed/schemes.json (copy to src/data/schemes.json). The old INDIRAMMA pension entries were removed because Andhra Pradesh now runs these pensions as the NTR Bharosa Pension Scheme. It will be added later from the official source. Until then the Profile fields is_widow, is_bpl, lives_in_rural_area and is_destitute are unused by any scheme, so the app will not ask those questions.
