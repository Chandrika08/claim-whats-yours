# Prompts for Nexen (Claude Haiku 5.5)

## How to use with a small model
- Start a NEW chat for each prompt. Paste the RULES block first, then the prompt.
- One task per prompt. If it does too much, say "undo extra work, only do the task".
- After each prompt: run `npm run dev` or `npm test`. If anything breaks, paste the exact error and say "fix only this".
- Commit after each working step (see GIT_GUIDE.md). Add the prompt and result to CODEBENDERS_LOG.md.

## RULES (paste at the start of every chat)
You are helping build "Claim What's Yours", a web app for small farmers in Andhra Pradesh to find government schemes they are likely eligible for.
- Read docs/BRIEF.md and docs/ARCHITECTURE.md before changing anything.
- Do only the task in this message. Do not add features, pages or libraries I did not ask for.
- Stack: Vite + React + TypeScript + Tailwind + Vitest. No backend, no database, no runtime API calls.
- Never ask for or store Aadhaar, phone, address or any ID number.
- Use "likely eligible", never "guaranteed".
- Scheme rules stay in src/data/schemes.json, never hard-coded in logic.
- Before editing, list the files you will create or change. After editing, run build and tests and fix errors until they pass. Then tell me how to check it in the browser.
- Keep code simple: small functions, clear names, comments only where non-obvious.

## P0 Orientation (no code)
Read docs/BRIEF.md, docs/ARCHITECTURE.md and docs/PLAN.md. Reply with a 10-line summary of what we are building and a checklist of the pages and lib files. Do not write code.

## P1 Scaffold
Scaffold the app in the current folder with Vite React TypeScript, Tailwind, Vitest and react-router HashRouter. Do not delete docs/ or seed/. Create pages Home, Results, Tracker, Admin, Partners with placeholder content, a Nav component, and a Disclaimer footer saying "Likely eligibility only, not a guarantee. Confirm with the official office before applying." Add a .gitignore (node_modules, dist, .env). `npm run build` and `npm test` must pass.

## P2 Types and loader
Create src/types.ts exactly as defined in docs/ARCHITECTURE.md. Copy seed/sample-profiles.json to src/data/. Create an empty-but-valid src/data/schemes.json ([]). Create src/lib/schemes.ts with loadSchemes() that reads src/data/schemes.json, merges any override from localStorage key "cwy.schemes.override.v1", and validates each scheme has the required fields (throw a clear error naming the scheme id and the missing field). Add unit tests for validation.

## P3 Scheme data
Copy seed/schemes.json to src/data/schemes.json. Do not change any values. Update the loader and tests so all 8 schemes validate, and add a test that every rule field exists in the Profile type and every official_url starts with https://www.myscheme.gov.in/schemes/. Run the tests.

## P4 Eligibility engine
Create src/lib/eligibility.ts with evaluateRule, evaluateScheme and matchAll following "Eligibility engine" in docs/ARCHITECTURE.md. Write Vitest tests covering every op, null -> unknown, hard fail, hard unknown, soft rule behaviour, and the 4 profiles in src/data/sample-profiles.json against src/data/schemes.json. Pure functions only, no React.

## P5 Extractor
Create src/lib/extract.ts with extractProfile(text) following "Extractor" in docs/ARCHITECTURE.md. It returns profile and evidence. Write tests using each profile's story and expected_extraction in src/data/sample-profiles.json. Handle "lakh", per-month to per-year, "1.5 acres". Never guess: unknown stays null.

## P6 Home screen and follow-ups
Create src/lib/questions.ts (nextQuestions(profile, schemes, results) per docs/ARCHITECTURE.md, using the follow-up question table there) with tests. Build the Home page: a large textarea ("Tell us about your family and land in your own words"), four sample-profile buttons that fill the textarea, and a Find schemes button. After submit, show "I understood" chips with the evidence, let the user edit or remove a chip, and show up to 3 follow-up questions as tappable chips. Re-run matching after each answer. Navigate to Results with the profile in state. Mobile-first layout.

## P7 Results
Build the Results page and a SchemeCard component. Group by Likely eligible, Possibly eligible (show what is missing), Not eligible (collapsed, with the failing rule). Each card shows: benefit summary, rule list (pass/fail/unknown with the profile value and the explain text), personalised documents checklist (checkboxes), numbered apply steps, official link, "Last verified: date", and an "Add to tracker" button. Always show the disclaimer.

## P8 Tracker and reminders
Create src/lib/tracker.ts (localStorage "cwy.tracker.v1") with tests, and the Tracker page: list of schemes with status dropdown, deadline date input, notes. Show a banner for deadlines within 7 days and for overdue ones. Add src/lib/ics.ts and an "Add to calendar" button that downloads an .ics file for the deadline.

## P9 Admin editor
Build the Admin page: list schemes, show last_verified, show a "Needs re-verification" badge if older than 90 days, a textarea to edit one scheme's JSON with validation errors shown, Save (writes override to localStorage "cwy.schemes.override.v1"), Reset to default, Export JSON. After saving, Results must use the edited rules.

## P10 Partners page and landing copy
Build the Partners page from docs/BUSINESS.md: the problem in numbers we can defend, who pays (NGOs/CSR, banks, service centres, state), pricing assumptions marked as assumptions, and a small impact calculator (families reached x average schemes matched) where every assumption is an editable input. Improve the Home hero copy around the persona in docs/BRIEF.md.

## P11 Polish
Review the whole app: mobile layout, loading/empty/error states, keyboard focus, readable contrast, no Aadhaar/phone/address fields anywhere, "likely eligible" wording everywhere. Write README.md with what it does, how to run, how to test, architecture summary, guardrails, how to update scheme data. Fix issues without adding features.

## P12 Deploy check
Make sure `npm run build` outputs dist/ and the app works with HashRouter on a static host. Add a short DEPLOY section to README with the steps for Vercel or Netlify. List anything that would break in production.

## Stretch (only if everything above is green)
S1 Voice input: add a microphone button on Home using the browser Web Speech API (SpeechRecognition, lang "te-IN" or "en-IN" selectable). Hide the button if unsupported.
S2 Telugu labels: add a language toggle with Telugu labels for navigation, buttons and chips, in a simple dictionary file.

## When something breaks
"Here is the exact error: [paste]. Fix only this error. Do not change other files unless required. Run the tests again."
