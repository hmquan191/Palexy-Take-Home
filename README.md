# Staff Scheduling System

A web app for a store manager to plan a weekly roster from historical demand: upload the transaction report, add staff
and shifts, click **Auto-schedule**, then adjust the draft while a summary table shows how well staffing matches demand.

Client-side only (React, Vite, TypeScript, Tailwind, Ant Design, Zustand). Data is kept in the browser's localStorage.
No backend, database or account.

## Run

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
```

Quickest demo: on the schedules page click **Load sample week**, open it, click **Auto-schedule**.

## What it does

- **Staff:** add, edit, remove; *Add sample staff* adds 5 Vietnamese names at 40h each per click; *Remove all*.
- **Shifts:** the two defaults (07:00-15:00, 15:00-23:00); add, edit, remove. Shifts start and end on the hour.
- **Demand data:** upload the transaction CSV; any cell can then be edited (whole numbers from 0 up). Bad files are
  rejected whole with the line and column to fix.
- **N:** one staff member per N transactions an hour, default 15, editable per schedule.
- **Auto-schedule:** a draft roster. **Remove all** empties it.
- **Roster:** drag people between cells, from the staff list onto a shift, or back to the list to remove them; or use
  *Add* in a cell. While dragging, the cell headcount and the person's hours after the drop are previewed. Over-limit
  hours, an overloaded day, overlapping shifts and understaffed hours are flagged, never blocked.
- **Summary:** day x hour grid with transactions, staff hours and transactions per staff hour ("-" when nobody is
  scheduled), day totals, and week totals including both the overall ratio (total / total) and the average of the
  per-hour ratios.
- **How the logic works:** an info panel in the workspace explaining the model, with an example from the current data.

## Samples and scenarios

`samples/` holds three transaction reports:

| File | Purpose |
|---|---|
| `sample_transaction_interview.csv` | The provided week (Fri to Thu). |
| `transactions_cafe_mon-sun_24h.csv` | Importer variation: other title, Mon to Sun, `07:00` labels, rows out of order, a closed hour, Windows line endings. |
| `transactions_mall_weekdays_busy.csv` | A busy 5-day week, to show shortfalls. |

To use one: open a schedule, **Demand data**, **Replace CSV**.

I added **Scenario 1, 2, 3** buttons in the workspace to make the trade-offs easy to follow and demo. Each one sets up
the team, shifts and N on the provided week, runs Auto-schedule, and explains pros, cons and the trade-off with live
numbers:

1. **Baseline:** 10 staff, two 8h shifts. Fully covered.
2. **Short-staffed:** 5 staff. Some shifts stay short; nobody goes over their hours.
3. **Shorter shifts:** four 4h blocks. Less idle time, more placements to manage.

A scenario replaces the open schedule's staff, shifts, N, demand and roster (it asks first if you have your own data).

## How the auto-scheduler works

1. **Demand per hour:** `max(1, ceil(transactions / N))` for every hour that has data.
2. **Demand per shift:** a shift is a fixed block, so it needs as many people as its busiest hour (**MAX**). Averaging
   would leave the peak short. On the provided week this asks for 352 staff-hours against 257 by the hour, the price of
   fixed shifts.
3. **Assignment:** day by day, shift by shift, each open slot goes to the eligible person with the lowest utilization
   (hours assigned / weekly maximum); ties go to more hours remaining, then name. Eligible = enough weekly hours left,
   no overlapping shift, at most 8 hours that day. Same input, same roster.
4. **Shortfalls:** if nobody eligible is left the slot stays open and the draft lists which shift is short and by how
   many. Nobody is scheduled past their weekly maximum. Placements you add or move are kept on a re-run.

## Assumptions

- N = 15 is a modelling choice, not measured productivity; transactions are only a proxy for how busy the store is.
- Any hour present in the report is open and needs at least one person.
- At most 8 hours per person per day when auto-scheduling (two back-to-back 8h shifts would be 16h). Manual edits may
  exceed it and are flagged.
- "Fair" means balanced utilization, not equal hours; there is no minimum-hours floor.
- Shifts are whole blocks: a person with 20 hours left and 8h shifts gets two shifts.
- CSV day columns keep the file's order and labels (the provided week runs Fri to Thu).
- Auto-schedule fills each shift on its own, so overlapping custom shifts can be overstaffed.
- Greedy, not optimal; when people run out, earlier days are filled first.
- Not modelled: availability, days off, roles, breaks. No auth or multi-user.

## AI-usage note

Step by step in [docs/ai-process.md](docs/ai-process.md). In short:

- **Understanding the brief:** I had Claude Opus explain it, then used ChatGPT to challenge the reading. The key question
  was MAX vs average for a fixed 8h shift: the average costs less but leaves the busiest hour short, which customers feel;
  MAX never does, at the price of idle time. I chose MAX.
- **Setup:** I wrote `.claude/` (the ponytail skill, agents) and `CLAUDE.md` myself so the assistant followed one set of rules.
- **Delegated:** scaffolding, code, unit tests, drafts of docs and this README.
- **Decided and checked by me:** client-side storage, N editable, CSV order, the 8h cap, fairness by utilization; I tried
  staff entry and CSV import in the browser and checked the Friday example by hand.
- **Overridden:** it first proposed a NestJS + Supabase backend and a fairness rule that starved part-timers; it missed
  that two back-to-back 8h shifts make a 16h day; it guessed a wrong skill name.
