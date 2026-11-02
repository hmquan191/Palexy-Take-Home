# Staff Scheduling System

A small web app that helps a store manager plan a weekly roster from historical demand. Upload the weekly
transaction report, add staff and shifts, click **Auto-schedule** for a draft, then adjust it by hand while a
summary table shows how well staffing matches demand.

Fully client-side: React + Vite + TypeScript, Tailwind CSS, Ant Design, Zustand (persisted to localStorage). No
backend, database or account is needed.

## Run it

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (61)
npm run build      # typecheck + production build
```

Quick demo: on the schedules page click **Load sample week** (10 staff plus the provided transaction report), open it,
and click **Auto-schedule**. Or create an empty schedule and use the **Staff**, **Shifts** and **Demand data** tabs;
the provided file is also at `sample_transaction_interview.csv`.

### Sample reports in `samples/`

Open a schedule (the sample week already has 10 staff), go to **Demand data**, click **Replace CSV**, then **Auto-schedule**.

| File | What it shows |
|---|---|
| `sample_transaction_interview.csv` (repo root) | The provided week, Fri to Thu. Fully covered by the 10-person team. |
| `samples/transactions_cafe_mon-sun_24h.csv` | Importer tolerance: a different title, Mon to Sun, `07:00` style hours in shuffled order, a trailing comma, Windows line endings, and no 15:00 row (treated as closed). Two peaks (lunch, dinner) and a busier weekend. At N = 15 a few weekend shifts come up short; set N to 30 and the week is covered with spare hours. |
| `samples/transactions_mall_weekdays_busy.csv` | A 5-day week with a much busier store. With 10 staff, N = 15 leaves most shifts short (the shortfall list and amber cells appear, nobody goes over their hours); N = 30 is still short on a few shifts; N = 40 covers it. Shows how N and team size trade off. |

Importing a 5-day file into a schedule that had 7 days drops any placements on the days that no longer exist.

Data is saved in your browser's localStorage (per browser; cleared if you clear site data). If saved data is ever
unreadable, the app starts empty and says so.

## How it works

1. **Demand per hour.** `required = max(1, ceil(transactions / N))` for every hour that has data. **N = 15** by default
   and editable per schedule at the top of the workspace. Hours with no data are treated as closed.
2. **Demand per shift.** A shift is a fixed block, so it needs as many people as its **busiest hour** (MAX rule).
   Average would leave peak hours short; MAX never does, at the cost of some extra people in quiet hours.
3. **Assignment** (greedy, deterministic). Go day by day, shift by shift. For each open slot pick the eligible person
   with the **lowest utilization** (hours assigned / weekly maximum); ties go to more remaining hours, then name.
   Eligible means: weekly hours left, no overlapping shift, and the day stays within 8 hours.
4. **Shortfalls are shown, not hidden.** If nobody eligible is left, the slot stays open and the draft lists exactly
   which shift on which day is short and by how many. Nobody is ever scheduled past their weekly maximum by the
   auto-scheduler.
5. **Editing.** Drag a person between cells, drag a name from the staff list onto a shift, drag a chip onto the staff
   list to take it off, or use Add in a cell (the keyboard-friendly route). While you hold someone over a cell it shows
   the cell's headcount and the person's hours after the drop, flagged amber if it breaks a limit; the preview and the
   drop use the same function (`lib/roster.ts`), so they cannot disagree. Moved or added people are never overwritten by
   a re-run of Auto-schedule (blue chips). Over-limit hours, an overloaded day, overlapping shifts and understaffed hours are
   flagged inline and in the always-visible strip at the top; nothing is blocked.
6. **Summary.** Day x hour grid with transactions, staff hours and transactions per staff hour, day totals, and
   week totals: total staff hours, total transactions, overall ratio (total / total) and the average of the per-cell
   ratios (both are shown; they differ). A cell with nobody scheduled shows "–".

On the provided week with N = 15 the model asks for 257 staff-hours but the MAX rule schedules 352 (44 shift
places), because shifts are whole blocks. That ~27% surplus is the price of never being short at the peak.

## Assumptions

- N = 15 transactions per staff member per hour is a modelling choice, not measured productivity. Transactions are
  only a proxy for how busy the store is; prep, cleaning and stock work are not modelled.
- Any hour present in the report counts as open and needs at least one person.
- A person works at most 8 hours a day when auto-scheduled (two default 8h shifts in one day would be 16h). Manual
  edits may exceed it; the app warns.
- Shifts start and end on the hour, within one day. Shifts are whole blocks, so someone with 20 hours left and 8h
  shifts gets two shifts and 4 hours stay unused.
- "Fair" means balanced utilization, not equal hours, so part-timers are not starved while full-timers are maxed
  out. There is no hard minimum-hours floor.
- CSV day columns are taken in file order and shown with the file's own labels (the sample runs Fri to Thu). The
  hour rows may be in any order and use `7am`, `1pm` or `13:00` style labels; a malformed file is rejected whole
  with the line and column to fix.
- Auto-schedule fills each shift independently. If shifts overlap it can staff more people than the busiest hour
  needs (the Shifts tab says so).
- Multiple schedules are supported. No auth, multi-user or deployment.

## Known limits and what I would do next

- Greedy is not globally optimal, and days are filled in order, so in a shortage the earlier days are covered first.
- No availability or days off, roles (e.g. a supervisor per shift), or CSV export.
- Drag and drop is pointer and touch only (dnd-kit); keyboard users add people with the Add menu in each cell.
- Overlapping shifts could use "remaining demand" accounting instead of treating each shift on its own.
- The UI was checked with unit tests and server-side rendering, and by hand for staff entry and CSV import. The
  drag-and-drop interaction itself has not been exercised in a browser by the assistant; a full manual pass (drag,
  keyboard use, small screens) is still to do.

## AI-usage note

I used Claude in three roles; the step-by-step account is in [docs/ai-process.md](docs/ai-process.md).

- **Understanding the brief.** I had Claude Opus explain the assignment and its open questions, then asked ChatGPT to
  challenge that reading. The main question was how many people a fixed 8-hour shift needs. Averaging the hourly demand
  costs less, because the manager pays for fewer idle hours, but it leaves the busiest hour short-staffed and that hits
  customers directly. Taking the busiest hour (MAX) never leaves a peak short, at the price of idle time in quiet hours.
  I chose MAX and show that surplus openly in the summary. Letting the manager build shorter shifts can reduce it later.
- **Setting the rules for the assistant.** I wrote the `.claude/` folder (the ponytail skill and agents) and `CLAUDE.md`
  myself, so the assistant kept to the same stack, branching and code-quality rules throughout.
- **Building.** I delegated scaffolding, code, unit tests and drafts of the docs and this README. I made the product calls
  (client-side storage instead of a backend, N editable and defaulting to 15, CSV days kept in file order, the 8-hour daily
  cap, fairness by utilization), tried staff entry and CSV import in the browser, and checked the Friday example by hand
  against the sample file.
- **Where I overrode or corrected it.** It first proposed a NestJS + Supabase backend and I moved to localStorage so a
  reviewer can run the app with two commands. Its first fairness rule (most hours remaining) starved part-timers, so we
  switched to lowest utilization after I compared two analyses. It missed that two 8-hour shifts back to back make a
  16-hour day. It guessed the wrong name for a skill until I gave it the right repository.
- **Not verified by the assistant.** It never opened the UI in a browser, so drag and drop and the roster screens were
  checked by unit tests and server-side rendering only.
