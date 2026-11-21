# Claim What's Yours: Brief

## One line
A person describes their situation in plain words and learns which government schemes they are *likely* eligible for, why, which documents to carry, how to apply, and gets a tracker so no deadline lapses.

## User (one group, one state)
Small and marginal farmers and their families in Andhra Pradesh.
Persona for the demo: Ramesh, 2 acres, family of five. He hears about schemes from neighbours, does not know which apply, and relies on a middleman to fill forms.

## Must have (from the problem statement)
1. Plain-language typed input (not a long form). Voice only as a stretch.
2. Eligibility matching that shows reasoning: every match lists each rule, the value used, and the source.
3. Personalised document checklist + step-by-step apply guide per scheme.
4. Deadline reminders + application tracker (status per scheme).
5. Every scheme links to its official source and shows a "last verified" date.

## Guardrails (never break)
- Say "likely eligible", never "guaranteed". Show a disclaimer on every results screen.
- Never ask for or store Aadhaar, phone, address or any ID number.
- Scheme rules live in editable JSON (src/data/schemes.json), not in code.
- Public scheme information only. Demo with sample profiles only.

## Judging map (this is how we win)
| Criterion | Weight | What we show |
|---|---|---|
| Working product | 30% | Deployed link, one-click sample profiles, no crashes, works on a phone |
| Business viability | 25% | Partners page: who pays, pricing assumptions, impact metrics, rollout plan |
| Problem and user clarity | 20% | One persona, one state, one story told from the first screen |
| Build quality + Codebenders use | 15% | Tests, clean README, CODEBENDERS_LOG.md with prompts and iterations |
| Presentation | 10% | 4 to 5 min demo that follows the script below |

## Differentiators (cheap but memorable)
- "I understood" chips: shows what the app extracted from the text, user can fix it. Builds trust.
- Asks only the follow-up questions that change a result.
- Admin page to edit scheme rules + "needs re-verification" badge when last_verified is over 90 days old. This answers "how does it stay accurate when rules change?".
- Add-to-calendar (.ics) for deadlines.

## Demo script (about 4.5 min)
1. Problem (45s): scattered info, hard rules, middlemen.
2. Type Ramesh's story, show understood chips, answer 1 or 2 follow-ups (60s).
3. Results: open one scheme, show rule-by-rule reasoning, documents, apply steps, official link and verified date (75s).
4. Add to tracker, show reminder and calendar export (30s).
5. Admin: change a rule, watch results change (30s).
6. Partners page: who pays and impact (30s).
7. How it was built in Codebenders (20s).
