# Requirements — Staff Scheduling System

Source: `SWE_Take_Home_Staff_Scheduling_System.pdf` v1.1. Open points resolved in
`docs/business-analysis.md`. This file is the ticket breakdown: each ticket is self-contained
enough to implement without re-reading the PDF.

Stack: React + Vite + TypeScript (strict) + Tailwind + Ant Design + Lucide-react + Zustand.
**Fully client-side**: state lives in one Zustand store persisted to localStorage. No backend, no auth.
Business logic = pure functions in `frontend/src/lib/`; UI never touches localStorage directly.

---

## Data model (`frontend/src/types.ts`)

```ts
type Schedule = {
  id: string
  name: string
  createdAt: string
  nPerStaff: number            // demand constant N, default 15
  dayLabels: string[]          // from CSV header, e.g. ["Fri, 07 Aug", ...]; default Mon..Sun
  staff: Staff[]
  shifts: Shift[]              // seeded: 07:00-15:00, 15:00-23:00
  transactions: Record<string, number>  // key `${dayIndex}-${hour}` -> count
  assignments: Assignment[]
}
type Staff = { id: string; name: string; maxWeeklyHours: number }
type Shift = { id: string; start: string; end: string }          // "HH:mm"
type Assignment = { id: string; staffId: string; shiftId: string; dayIndex: number; source: 'auto' | 'manual' }
```

- `dayIndex` is positional (0 = first CSV column), not fixed Mon=0.
- An hour's staffed count = number of Assignments whose shift covers that hour on that day.
- Store: `frontend/src/store/useScheduleStore.ts` (Zustand `persist`, key `staff-scheduling-v1`, with
  `version` + `migrate`; unparsable data resets to seed and notifies the user).
- Deleting staff or shift also deletes the Assignments that reference it (no orphans).

---

## Ticket 1 — Store + Schedule CRUD
**Goal**: create/list/select/delete schedules (top-level container).
**Steps**:
1. Create the store and types above; actions: `createSchedule`, `deleteSchedule`, `selectSchedule`.
2. `createSchedule` seeds the two default shifts.
3. UI: schedule list/create page; selecting one opens its workspace (react-router).
4. Corrupt/missing localStorage → seed state, show a notification with next step.

## Ticket 2 — Staff CRUD
**Goal**: add/edit/remove staff within the selected schedule.
**Validation**: name non-empty (trimmed), `maxWeeklyHours` > 0 and <= 168.
**Steps**: store actions `addStaff/updateStaff/removeStaff` (remove cascades assignments); AntD table with
modal or inline edit, no full-page forms.

## Ticket 3 — Transaction CSV import
**Goal**: upload CSV, fill `transactions` and `dayLabels`.
**Input**: layout of `sample_transaction_interview.csv` (title row, day-header row, hour rows "7am".."10pm").
**Pure function**: `parseTransactionCsv(text): { dayLabels, transactions } | { error: { row, col, message } }`.
**Rules**:
1. Skip title row; header row gives day columns in order (day index 0..n-1, not remapped to Mon-start).
2. Hour label ("7am" → 7, "1pm" → 13, "12pm" → 12, "12am" → 0); also accept "07:00".
3. Counts must be non-negative integers; every row must have the same column count; reject duplicate hours.
4. Any failure rejects the whole file with the row/column that failed. Re-import replaces prior data.
5. Tolerate BOM (sample starts with one), CRLF, blank lines, quoted fields.
**Tests**: valid sample, BOM, bad hour label, non-numeric cell, ragged row, empty file.

## Ticket 4 — Shift CRUD
**Validation**: `HH:mm`, end > start. Overlapping shifts are allowed to exist.
**Steps**: store actions; list UI with add/edit/remove (same pattern as Ticket 2). Removing a shift that has
assignments needs a confirmation that says how many assignments will be removed.

## Ticket 5 — Auto-schedule (core; reasoning in `docs/business-analysis.md` §1)
**Pure function**: `autoSchedule({ staff, shifts, transactions, dayCount, n, keep }): { assignments, understaffed, unusedHours, notes }`
where `keep` = existing manual assignments (untouched, counted against weekly hours and the 8h daily cap).
**Algorithm** (implement exactly):
1. `required(day, hour) = ceil(max(count, 1) / n)` when the hour has data, else 0.
2. `headcount(day, shift) = max(required(day, hour))` over the hours the shift covers.
3. Drop previous `source: 'auto'` assignments; keep manual ones.
4. For each day in order, each shift in order, repeat `headcount - alreadyAssigned` times: among staff with
   `remainingHours >= shiftLength`, no overlapping assignment, and day total + shiftLength <= `DAILY_CAP_HOURS` (8; a shift
   longer than 8h is allowed only as that person's sole shift that day), pick the one with the lowest
   utilization (`assignedHours / maxWeeklyHours`). Tie-break: more `remainingHours`, then name A-Z.
   If none, record `{ day, shift, missing }` as understaffed. See `docs/final-decisions.vi.md`.
5. Return assignments, understaffed slots, total unused capacity (hours), and notes.
**Edge cases**: zero staff → everything understaffed, no throw. No transactions → no assignments and an
explicit note. Same input always gives the same output (deterministic).
**UI**: "Auto-schedule" button + N input; result banner: assigned count, understaffed slots (clickable to the
cell), unused hours. Confirm before replacing existing auto assignments.
**Tests**: sample CSV with 10 staff × 40h (all covered, ~48h unused); 5 staff × 40h (understaffed, never
exceeds max hours); staff with max 20h gets at most 2 shifts; nobody has two shifts in one day; determinism.

## Ticket 6 — Aggregated summary
**Pure function**: `buildSummary(schedule): { cells[day][hour] = { transactions, staffHours, ratio | null }, totals }`.
- `ratio = transactions / staffHours`, `null` (shown "–") when `staffHours = 0`.
- `totals`: `totalStaffHours`, `totalTransactions`, `overallRatio` (= total txn / total staff-hours),
  `averageCellRatio` (mean of ratios over cells with staff only). Show both ratios.
- Also `requiredStaffHours` (sum of per-hour `required`, from `lib/demand.ts`) vs `totalStaffHours`, and the surplus
  between them (sample week: 257 required vs 352 scheduled). Shown neutrally in the footer; per-cell surplus in the tooltip.
**UI**: day × hour grid, three values per cell, colour scale on ratio, totals footer. Recomputes on every
store change (derive with a selector, do not store).
**Tests**: the PDF example (33/3, 48/3, 33/2 → day 114/8 = 14.3, mean of cells 14.5), zero-staff cell excluded
from the mean, zero total staff hours.

## Ticket 7 — Roster view and direct editing (UX-critical)
**Goal**: readable day × shift roster, edited in place.
**Steps**:
1. Grid: columns = days, rows = shifts, cell = staff chips + "add" control. Understaffed cells show a badge
   with "needs N, has M".
2. Assign: click add, pick staff from a searchable list showing each person's `used/max` hours. Remove: chip "x".
   Reassign: drag-and-drop chip is a stretch goal; the base flow is remove + add.
3. Non-blocking warnings, shown inline: staff over max hours (chip + staff panel), understaffed hour, a second
   shift pushing a person over the 8h daily cap. Never a blocking modal. Overstaffing is shown neutrally (surplus count),
   not as a warning colour: MAX always produces some surplus.
4. Staff side panel: per-person hours bar (used vs max).
5. Summary (Ticket 6) updates immediately on the same page.
**Pure helper**: `getWarnings(schedule)` returns the warning list consumed by the UI (unit-tested).

## Ticket 8 — Shift edits flow through
Editing a shift's times or removing it updates the roster, `headcount` display, warnings and summary live,
without re-running auto-schedule.

## Ticket 9 — Demo data, README, AI note
Load-sample-data button (seeds staff + imports the sample CSV so the demo needs no file picking), README with
run steps, approach, assumptions, AI-usage note (see Self-Note section 11).

---

## Build order
Store/types (1) → 2 → 4 → 3 → 6 → 7 → 5 → 8 → 9. Verify end-to-end with `sample_transaction_interview.csv`
before calling any ticket done. Stretch (only after core is solid): drag-and-drop, coverage view
(required vs scheduled), CSV export, availability, roles.
