# Claim What's Yours

Live demo: [https://claim-whats-yours.netlify.app](https://claim-whats-yours.netlify.app)

## What the app does

A person describes their situation in plain words, and the app shows which government schemes they are *likely* eligible for. For each match it lists every rule, the value used, and the source, along with the documents to carry, step-by-step apply guidance, the official link and a "last verified" date. A tracker keeps the status of each scheme and reminds the user of deadlines.

Pages:

- **Home**: answer a few plain-language questions to find likely-eligible schemes.
- **Results**: rule-by-rule reasoning, documents, apply steps and official sources for each match.
- **Tracker**: application status per scheme, deadline reminders and calendar (.ics) export.
- **Partners**: impact calculator with example assumptions, clearly labelled.
- **Admin**: edit scheme data, export JSON.

## The problem and the user

Small and marginal farmers and their families in Andhra Pradesh want to know which government schemes they may qualify for. Information is scattered, the rules are hard to read, the document list is unclear, and many families pay middlemen to fill in forms. The demo persona is Ramesh: 2 acres, a family of five.

## How to run

Requires Node.js and npm.

```bash
npm install
npm run dev
```

## How to test

```bash
npm test
```

Tests use Vitest.

## How to build

```bash
npm run build
```

This runs `tsc` and then `vite build`, producing a static site in `dist/`.

## Architecture

- Static single-page app: Vite, React, TypeScript, Tailwind CSS, react-router (HashRouter), Vitest.
- No backend, no database, no runtime API calls. State is stored in localStorage.
- Scheme rules are data in `src/data/schemes.json`, loaded and validated by `src/lib/schemes.ts`.
- Logic lives in `src/lib`:
  - `eligibility.ts`: rule engine (pure functions).
  - `schemes.ts`: loads schemes and merges any Admin override.
  - `extract.ts`: turns plain text into a profile, with "I understood" evidence.
  - `questions.ts`: chooses the few follow-up questions that change a result.
  - `tracker.ts`: tracker state and reminders.
  - `ics.ts`: calendar export.
- Pages are in `src/pages`; shared UI components are in `src/components/ui`.

## How to update scheme data

Either:

1. Edit `src/data/schemes.json` directly, then rebuild, or
2. Use the Admin page to edit a scheme, validate it and save. The override is stored in localStorage. Use "Reset to default" to go back to the bundled data, or "Export JSON" to save your changes.

Each scheme records its official source and a `last_verified` date. Schemes verified more than 90 days ago show a "Needs re-verification" badge.

## Guardrails

- Results are *likely* eligibility only, never a guarantee of benefits. Every results screen carries a disclaimer.
- The app never asks for or stores Aadhaar, phone, address or any ID number.
- Only public scheme information is used. The demo uses sample profiles only.
- Always confirm with the official office before applying.

## Built with

Built in the Codebenders IDE using Nexen.
