# Codebenders usage log: Hakku (Claim What's Yours)
ACE Builders Hackathon 2026, solo entry. Built in the Codebenders IDE with Nexen (Claude Haiku 5.5).
Planning, architecture, prompt design and scheme data collection were done outside the IDE, as the rules allow. All implementation was done in the IDE.

## How the prompts were designed
Small model, so each prompt does one task. A shared RULES block is pasted at the start of every chat. Each step is run, tested in the browser or with tests, committed, then the next prompt follows.

## Log

### 1. Orientation (P0)
- Goal: make Nexen read the project docs and confirm its understanding before any code.
- Prompt: RULES block + "Read docs/BRIEF.md, docs/ARCHITECTURE.md and docs/PLAN.md. Reply with a 10-line summary and a checklist of pages and lib files. Do not write code."
- Result: Nexen read all three docs and returned a 10-line summary plus a checklist of 5 pages, lib files and components. It matched the plan. No code written.
- Problems: Nexen found the docs one level too deep (claim-whats-yours-docs/docs/) because the unzipped folder was copied whole into the project.
- Fix: moved docs/ and seed/ to the project root with Move-Item and removed the empty wrapper folder.

### 2. Foundation (Prompt A: scaffold, types, data, eligibility engine, tests)
- Goal: scaffold Vite + React + TS + Tailwind + Vitest app, add types, copy scheme data, build the eligibility engine with unit tests, nav and placeholder pages.
- Prompt: RULES + TASK A (8 numbered items) as given in the build plan.
- Result: done. Nexen scaffolded Vite + React + TS + Tailwind + Vitest, wrote types, schemes loader, eligibility engine, 5 placeholder pages, nav and disclaimer. npm run build passes, 29 of 29 tests pass.
- Problems: (1) two tests failed because a shared scheme fixture was mutated between tests; (2) npm install reported 8 dependency vulnerabilities; (3) a stray schemes.json sits at the repo root; (4) the app was not yet run in a browser.
- Fix: (1) each test now starts from a fresh copy of the fixture; (2) pending review, npm audit fix not run yet; (3) pending removal; (4) pending browser check.

### 3. Core product (Prompt B: extractor, follow-up questions, Home and Results)
- Goal: turn plain text into a profile with evidence, ask only the follow-up questions that matter, and show matched schemes with rule-by-rule reasons.
- Prompt: RULES + TASK B (6 numbered items) as given in the build plan.
- Result: done. Added extract.ts, questions.ts, ProfileContext, Home page (textarea, 4 sample buttons, editable "I understood" chips, follow-up chips), Results page and SchemeCard (grouped results, rules with values, documents checklist, apply steps, official link, last verified, add to tracker). tsc, 59 tests and build all pass.
- Problems: one TypeScript strict-mode error (possibly-null age check); Nexen flagged PM-KISAN last_verified as suspicious (it is correct: checked 2026-11-21); "Add to tracker" is only a local flag until Prompt C; UI not yet checked in a browser.
- Fix: strict-mode error fixed by Nexen; last_verified left unchanged; tracker storage and browser check come next.

### 4. Design system and restyle (Prompt D)
- Goal: make the app look polished and trustworthy for rural Indian families, mobile first, without touching logic or tests.
- Prompt: RULES + TASK D (design tokens, UI components, layout for Home and Results, motion, reduced-motion support).
- Result: done. Added colour tokens (deep green, saffron, cream, status colours), Noto Sans/Telugu font stack, 18px base text, 48px tap targets, shared UI components (Button, Card, Badge, Chip, ProgressBar, SectionHeader, EmptyState, Shimmer, Collapsible), sticky nav with mobile menu, 3-step indicator, sample story cards, restyled results cards with expandable sections. lucide-react added. Build passes, 59 of 59 tests still pass, no logic or tests changed.
- Problems: Home shows follow-up questions before any story is entered; loading shimmer unused (matching is instant); a few old inline styles remain in the Home editor.
- Fix: follow-up visibility fix folded into Prompt C; shimmer and old styles to clean up in the final polish pass.

### 5. Tracker, admin, partners, home gating (Prompt C)
- Goal: build the tracker with reminders and calendar export, the admin rule editor with stale-data badge, the partners page with impact calculator, hide follow-ups on Home until a story is submitted, then polish and write the README.
- Prompt: RULES + TASK C (6 numbered items) plus the design-system line and the Home gating fix.
- Result: mostly done. Home now shows chips and questions only after Find schemes or a sample pick, with the 3-step indicator following the flow. Tracker (localStorage, status, deadline, notes, 7-day and overdue banner, .ics export) with tests. Admin (JSON editor with validation, override, reset, export, 90-day re-verification badge). Partners page with editable impact calculator. 89 of 89 tests pass.
- Problems: npm run build failed on one unused import (SectionHeader in Tracker.tsx, TS6133); the agent ran out of delegation slots before finishing the polish pass and README; calculator inputs start empty; admin override stores the full scheme set, so later edits to schemes.json do not reach a browser that already saved an override.
- Fix: follow-up run (Prompt E) to fix the import, run build and tests, fill calculator example values, polish and write the README.

### 6. Finish and polish (Prompt E)
- Goal: fix the failing build, prefill the partners calculator, polish mobile and empty states, check guardrails, write the README.
- Prompt: RULES + TASK E (7 numbered items).
- Result: build fixed. tsc, npm run build and npm test all pass (89 of 89). Removed unused import in Tracker.tsx. Partners calculator now prefilled with labelled example assumptions (1000 families, 3 schemes each, benefit per scheme left for the user to fill from the official page). README.md written with run, test, build, data update, guardrails and a live-demo placeholder. Guardrail search: no input asks for Aadhaar, phone, address or ID; "guaranteed" appears only as "not a guarantee". No stray root schemes.json existed.
- Problems: the agent ran out of delegation budget, so the 375px mobile check, empty and error states (Results with no profile, Tracker empty, Admin invalid JSON) and contrast review were not finished; some leftover default green/grey classes remain.
- Fix: a second polish prompt (Prompt F) covers the remaining items, run while the first deployment builds.

### 7. Mobile polish, empty states, consistent styling (Prompt F)
- Goal: make every page work at 375px, add friendly empty and error states, replace stray default colours with design tokens, improve contrast and keyboard focus.
- Prompt: RULES + TASK F (5 numbered items).
- Result: done. Status badges, disclaimer, scheme cards, Home controls, Results notes and Admin error messages moved to design tokens; consistent primary focus ring on buttons, chips, nav and collapsible headers; placeholder contrast improved; money figures wrap at 375px; Tracker empty-state button now leads to Results. Results and Tracker already had empty states; Admin Save already disabled on invalid JSON. tsc, build and 89 of 89 tests pass.
- Problems: the first build attempt was refused by the shell as a long-running command; no table exists so no overflow wrapper was needed; mobile layout not verified visually; a full search for leftover default colour classes was not run.
- Fix: re-ran the build in the background and it passed; visual check to be done in the browser (F12 device view) and on the deployed site.

### 8. Deployment
- Goal: put the working app on a public link for judges.
- Tool: Netlify (not a coding tool), connected to the GitHub repo, build command npm run build, publish directory dist, production branch main.
- Result: deployed at https://claim-whats-yours.netlify.app. Every git push to main redeploys automatically.
- Problems: none so far.
- Fix: not needed. Next: test the live link in a private window, put the link in README, deck and submission form.

### 9. Fix "Add to tracker" (Prompt G)
- Goal: the Add to tracker button only flipped local state, so the Tracker page stayed empty. Connect it to the tracker storage.
- Prompt: RULES + TASK G (5 items): save to tracker on click, Tracked state with link and no duplicates, Tracker page shows items immediately, nav count badge, tests.
- Result: fixed. Button saves to localStorage through src/lib/tracker.ts, shows "Tracked" with a tick and a View in tracker link, survives reload; Tracker page shows scheme name, status, deadline with the scheme's deadline note, notes, remove and official link; nav shows a count badge; README live link filled in. 92 of 92 tests pass (3 new).
- Problems: bug found by testing the deployed app. Nexen reproduced it before fixing. It stored a null deadline (empty string is discarded by the loader) and looked the scheme name up by id since the tracker type has no name field. No testing-library dependency, so the new test uses React's own DOM APIs.
- Fix: done in the same run.

### 10. Rename product to Hakku
- Goal: a memorable product name. "Hakku" is Telugu for right or entitlement, with the tagline "Claim what's yours".
- Prompt: RULES + a 7-item rename task (nav logo and tagline, page title, home eyebrow, README title, other visible mentions) with the repo, package name and URLs left unchanged.
- Result: done. tsc, build and 92 of 92 tests pass. Tracker page eyebrow was also renamed to match.
- Problems: docs/ files still use the old name in prose; the calendar file ID text still says Claim What's Yours (not visible on screen).
- Fix: left as is on purpose.

### 11. Brand visibility
- Goal: make the Hakku name more visible in the app.
- Prompt: (paste the prompt you sent to Nexen here)
- Result: commit 4cbf5d5 "Improve Hakku brand visibility" changed Nav.tsx and Home.tsx.
- Problems: none recorded.
- Fix: not needed.

### 12. Multilingual farmer experience (English, Telugu, Hindi)
- Goal: farmers in Andhra Pradesh should be able to use the app in their own language, not only English.
- Prompt: (paste the prompt or prompts you sent to Nexen here)
- Result: commit a36d4e6 "Complete multilingual farmer experience" (27 files). Added a language selector in the nav, a language context saved in localStorage ("hakku.lang.v1"), message files for Home, Results, Tracker and Nav in English, Telugu and Hindi, translated follow-up questions and answer labels, and translated content for all six schemes (name, summary, rules, documents, apply steps, deadline notes). English stays the fallback for anything missing. New i18n tests check that every English key has a Telugu and Hindi string, every scheme has a translation, and there are no gaps. Total 108 tests pass (8 test files), build passes.
- Known limits (stated honestly): typed or spoken Telugu and Hindi text is not yet understood by the extractor, so the farmer story is entered in English; there is no voice input yet. Translations are AI-assisted and should be reviewed by native speakers.
- Problems: none recorded.
- Fix: not needed.

## Verification
- Responsive layouts were checked at desktop 1440 px and mobile 390 px (screenshots in verification-screenshots/).
- Final state: TypeScript check, 108 of 108 tests and the production build all pass. Deployed at https://claim-whats-yours.netlify.app from the main branch.