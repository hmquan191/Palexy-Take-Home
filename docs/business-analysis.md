# Business Analysis — Staff Scheduling System

Purpose: translate the PDF spec into concrete product decisions. The PDF is deliberately open-ended
in places ("make a reasonable decision, state your assumption"). This doc lists every open gap found,
a recommendation, and marks which ones need YOUR call before coding starts (marked **DECISION NEEDED**).
Evaluators explicitly score "problem reasoning" — this file is also our evidence for that.

---

## 1. Auto-schedule algorithm (the heart of the exercise — Section 4)

This is the single highest-weighted ambiguity. Get this wrong and "Correctness" + "Problem reasoning"
both take a hit. Four sub-decisions, in order:

### 1.1 Demand model: transactions → required staff per hour
Spec: "one staff member per N transactions per hour, with a sensible minimum (such as one) whenever
store is open. You choose N and justify it."

- **required_staff(hour) = ceil(max(transactions, 1 if store open) / N)**, floor 1 during open hours.
- N is a tunable constant (not hardcoded magic number — expose as config/env so it's defensible live
  in the interview: "if N=15, change it, re-run, watch roster react").
- **DECISION NEEDED**: pick N. Sample data range ~2–64 txn/hr. N=15 → busiest hour (64) needs ~5 staff,
  quiet hour (2) needs 1. Recommend **N=15** as default, user-adjustable in UI (nice defensible stretch,
  near-zero cost).

### 1.2 Mapping hourly demand onto shifts (shifts are atomic blocks, not hours)
Spec: "decide how many people each shift needs on each day so that the busiest hours within that
shift are adequately covered."

Three candidate rules:
| Rule | Staff count for shift | Risk |
|---|---|---|
| **Max-hour** (recommended) | max(required_staff) over all hours in the shift | Overstaffs quiet hours in the shift, but guarantees peak is never understaffed |
| Average-hour | avg(required_staff) over the shift, rounded | Peak hour inside shift likely understaffed |
| Sum/weighted | sum of required staff-hours / shift length | Same understaffing risk as average, harder to explain |

- **Recommendation: max-hour rule.** It's the only one that can't silently understaff a peak hour,
  and it's the simplest to defend out loud. Document the overstaffing trade-off explicitly in the
  coverage view (stretch goal 8) rather than hiding it.
- This directly causes an over/under-coverage pattern worth highlighting in the UI (e.g. 07:00 shift
  covers 7am quiet ramp-up + 9am-ish peak — early hours get "free" extra coverage).

### 1.3 Assignment: filling shifts with specific staff under max-hours constraint
- Greedy, deterministic, explainable algorithm (not an ILP solver — out of scope for 4-6h):
  1. Compute required headcount per (day, shift) via 1.2.
  2. Sort staff by **remaining available hours descending** (most slack first) each time a shift slot
     needs filling — this naturally spreads hours instead of exhausting one person first.
  3. For each (day, shift) needing N people, assign the N staff with most remaining hours who (a)
     have ≥ shift-length hours remaining, (b) aren't already assigned an overlapping/same shift that day.
  4. If fewer eligible staff than required headcount, assign what's available and flag the slot
     **understaffed** in the result (don't fail, don't silently drop — Section 4 explicitly asks for this).
- Shift length not evenly dividing weekly max hours (e.g. 8h shifts, someone has 20h max) is expected
  — that person simply can't take a 3rd shift; stops at 2 shifts (16h), 4h unused. This is fine per
  spec ("fair, useful amount of work," not "exactly maxed out").

### 1.4 Fairness definition
Spec: "nobody scheduled for zero or near-zero hours while others are maxed out... Define what
'enough hours' means and apply it consistently."

- **Recommendation**: fairness = **utilization ratio** (assigned_hours / max_hours) should be
  roughly balanced across staff, not absolute hours. The greedy "most remaining hours first" rule in
  1.3 already approximates this as a side effect, which keeps the algorithm simple and explainable.
- **DECISION NEEDED**: do we need a hard floor (e.g. "everyone must reach ≥50% of their max before
  anyone reaches 100%")? Recommend: no hard floor for v1 — greedy balancing is good enough and a hard
  floor adds real complexity (reshuffling logic) for a four-hour budget. State this trade-off in README.

---

## 2. Data model decisions

### 2.1 Schedule scope — **DECISION NEEDED**
PDF doesn't say whether the app supports multiple schedules (one per store/week) or just one active
schedule at a time. Recommend: support **multiple schedules**, user can create/switch between them
(cheap to build if using proper DB keys from the start, and makes demoing "create a schedule" natural
rather than there being exactly one implicit schedule).

### 2.2 Persistence — **DECISION NEEDED**
Claude.md says Supabase; PDF says "in-memory, local storage, or a database — your call," auth is
explicitly out of scope. Recommend: **Supabase (Postgres) via NestJS**, no auth/RLS — single implicit
tenant. Reasoning: matches the stack already declared in Claude.md, gives real persistence for the
live demo/on-site walkthrough, and the schema (schedules → staff, shifts, transactions, assignments)
is relational and trivial in Postgres. If you'd rather minimize setup friction for the interview,
in-memory + JSON export is the alternative — flag now if you want that instead.

### 2.3 Shift model
- Shift = {start, end} only, scoped to a schedule, not per-day (matches spec: "a shift is defined by
  only a start time and an end time"). Same shift ID used across all 7 days. Seed: 07:00–15:00,
  15:00–23:00.
- Overlapping shifts (if user adds a custom one) are allowed to exist, but a **staff member cannot be
  double-booked** into two overlapping shifts same day — validate on assignment.

### 2.4 Transaction import tolerance (Section 3)
- Sample CSV (`sample_transaction_interview.csv`) has a title row, then header row with day labels
  like "Fri, 07 Aug", then hour rows "7am".."10pm". Importer must:
  - Treat day columns **generically** (map by position/order to Mon–Sun of the schedule, not by the
    literal date label — spec explicitly says "treat columns generically as days of the week").
  - **DECISION NEEDED**: column order in sample is Fri→Thu (week starts Friday). Does "day 1" column
    map to the schedule's Monday, or does the schedule's week start wherever the CSV's first column
    starts? Recommend: **map CSV column order directly onto Day 1..7 of the schedule in order
    uploaded**, and let the schedule display whatever day-of-week labels the columns imply (don't
    force Mon-start). Simpler, avoids a silent remapping bug, and matches "treat generically."
  - Parse hour labels like "7am", "1pm" → 24h; tolerate "07:00" too.
  - Malformed input (bad hour label, non-numeric cell, missing column) → reject the whole file with a
    clear row/column-level error message, not partial import.

---

## 3. Aggregated summary view (Section 2.6) — mostly spec'd, two gaps

- "Transactions per staff hour" per cell: already defined exactly (txn ÷ staff-hours, "–" on /0).
- **Average transactions per staff hour** (mean of per-cell ratios, only over cells with staff) vs
  **overall** (total txn ÷ total staff-hours) — spec explicitly wants both shown, they will differ
  when staffing is uneven. No decision needed, just don't collapse them into one number.
- Layout (grid vs stacked vs separate grids) — spec says "your choice." Recommend: single grid,
  3 stacked mini-values per cell (txn / staff-hrs / ratio), color-coded by ratio (defer exact palette
  to design-taste-frontend skill at build time).

---

## 4. Live-edit warnings (Section 2.7)

Spec wants a warning, not a block, when an edit pushes someone over max hours or leaves an hour
understaffed. Recommend:
- Over max hours → inline warning badge on the staff member + the specific shift, non-blocking.
- Understaffed hour (scheduled staff < required_staff from 1.1 for that hour) → warning badge on the
  cell in both the roster view and aggregated view.
- No hard validation blocking — manager can intentionally accept a trade-off (matches "surface the
  outcome... rather than failing silently").

---

## 5. Explicitly out of scope (per PDF Section 5)
Auth, multi-user, deployment. Roles/skills, availability/days-off, drag-and-drop, CSV export are
**stretch goals only** — build after the core flow is solid, not before.

---

## 6. Decisions — CONFIRMED

1. **N = 15**, user-adjustable in UI/config.
2. **Persistence: Supabase/Postgres**, no auth/RLS.
3. **Multiple schedules** supported (create/switch).
4. **CSV day mapping: direct column order** → Day1..7, no forced Mon-start.
5. **Fairness: greedy balance only**, no hard utilization floor (default, unchallenged).

See `specs/requirements.md` for the resulting ticket breakdown.
