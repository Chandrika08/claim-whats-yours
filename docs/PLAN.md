# Plan (IST). Commit and push at least every hour.
Rule: always keep a working version deployed. No new features after Sun 15:00.

## Before 12:00 Sat (no code generation yet)
- Repo created and cloned. Unzip docs/ and seed/ into it only at 12:00.
- Collect scheme text from official portals (see DATA_GUIDE.md).

## Saturday
12:00-12:45  P0 orientation, P1 scaffold, first push
12:45-14:00  P2 types + loader, seed data copied
14:00-15:30  P3 schemes.json from collected data (I convert it), validate
15:30-18:00  P4 eligibility engine + tests   <- most important piece, finish it fully
18:00-20:30  P5 extractor + tests
20:30-23:00  P6 Home UI + follow-up chips

## Sunday
08:00-10:30  P7 Results UI (reasons, documents, steps, source, verified date)
10:30-12:30  P8 Tracker + reminders + .ics
12:30-14:00  P9 Admin editor + stale badge
14:00-15:00  P10 Partners page + landing copy
15:00-17:00  P11 polish, mobile, empty/error states, README
17:00-18:00  P12 deploy, test the live link in a private window
18:00-20:00  Stretch only if all green: voice input (Web Speech API), Telugu labels
20:00-21:30  Demo video, LinkedIn post, CODEBENDERS_LOG.md finished
21:30-22:30  Submit. Buffer to 23:59 is for emergencies only.

## Done means
Live URL opens in a private window, 4 sample profiles work end to end, tests pass, repo public, README has setup + guardrails.
