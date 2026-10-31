# Requirements — Staff Scheduling System

Source: `SWE_Take_Home_Staff_Scheduling_System.pdf` v1.1. Open points resolved in
`docs/business-analysis.md`. This file is the ticket breakdown — each ticket is self-contained
enough for a coder to implement without re-reading the PDF.

Stack: NestJS + Supabase (Postgres) backend, React + Tailwind + Ant Design + Lucide-react frontend.
Monolith repo, `frontend/` + `backend/` + `shared/types/`. No auth.

---

## Data model (shared baseline for all tickets)

```
Schedule      { id, name, created_at }
Staff         { id, schedule_id, name, max_weekly_hours }
Shift         { id, schedule_id, start_time, end_time }   -- seeded: 07:00-15:00, 15:00-23:00
Transaction   { id, schedule_id, day_index(0-6), hour(7-22), count }
Assignment    { id, schedule_id, staff_id, shift_id, day_index(0-6), source: 'auto'|'manual' }
```
- `day_index` is positional (0 = first CSV column / first day added), not a fixed Mon=0. Each
  schedule stores its own day labels as uploaded.
- An hour's "staffed count" = number of Assignments whose shift covers that hour, that day.

---

## Ticket 1 — Schedule CRUD
**Goal**: create/list/select/delete a schedule (top-level container).
**Input**: schedule name.
**Output**: Schedule entity; selecting one loads its staff/shifts/transactions/assignments.
**Steps**:
1. Backend: `SchedulesModule` — POST/GET/GET:id/DELETE `/schedules`.
2. On create, auto-seed two default Shifts (07:00–15:00, 15:00–23:00) for that schedule.
3. Frontend: schedule list/create page, selecting one routes into the schedule workspace.

## Ticket 2 — Staff CRUD
**Goal**: add/edit/remove staff within a schedule.
**Input**: name (required), max_weekly_hours (required, positive number).
**Output**: Staff list scoped to schedule.
**Steps**:
1. Backend: DTO-validated CRUD under `/schedules/:id/staff`. Reject name empty, max_weekly_hours <= 0.
2. Deleting staff cascades: remove their Assignments too (don't leave orphans).
3. Frontend: staff table with inline add/edit/remove (Ant Table + modal or inline edit — no full-page forms).

## Ticket 3 — Transaction (demand) CSV import
**Goal**: upload CSV, populate Transaction rows for the schedule.
**Input**: CSV file matching sample layout (title row, day-header row, hour rows "7am".."10pm").
**Output**: Transaction rows (day_index 0-6 by column order, hour 7-22), or a clear validation error.
**Steps**:
1. Backend endpoint `POST /schedules/:id/transactions/import` (multipart).
2. Parser: skip title row; header row → day columns in order (becomes day_index 0..n-1); each
   subsequent row → hour label ("7am"→7, "1pm"→13) + per-column integer count.
3. Validation: hour label must parse, count must be non-negative integer, row/column count
   consistent across all rows. On any failure, reject whole file, return which row/column failed.
4. Re-importing replaces prior Transaction rows for that schedule (overwrite, not append).
5. Frontend: upload control + success/error feedback with the specific row/column on failure.

## Ticket 4 — Shift CRUD
**Goal**: manage the set of shifts staff can be assigned to.
**Input**: start_time, end_time (HH:mm).
**Output**: Shift list scoped to schedule.
**Steps**:
1. Backend DTO-validated CRUD under `/schedules/:id/shifts`. Validate end > start.
2. Deleting a shift cascades: remove Assignments referencing it.
3. Frontend: shift list with add/edit/remove, same inline-interaction pattern as Ticket 2.

## Ticket 5 — Auto-schedule algorithm (core ticket — see business-analysis.md §1 for full reasoning)
**Goal**: `POST /schedules/:id/auto-schedule` generates Assignments (`source: 'auto'`) and returns them.
**Input**: none (uses schedule's existing staff, shifts, transactions). Optional query param `n`
(demand constant, default 15).
**Output**: list of created Assignments + a list of understaffed (day, shift) slots if any.
**Algorithm** (implement exactly, in this order):
1. `required_staff(day, hour) = ceil(max(txn_count, 1) / n)` if txn_count data exists for that
   hour, else 0 (store closed that hour — no shift should cover hours with no data).
2. For each (day, shift): `shift_headcount = max(required_staff(day, hour) for hour in shift range)`.
3. Clear any existing `source: 'auto'` Assignments for this schedule before regenerating (manual
   assignments are untouched).
4. For each day in order, each shift in order, each of the `shift_headcount` open slots: pick the
   staff member with the most `remaining_hours` (max_weekly_hours − already-assigned hours this
   run) who (a) has `remaining_hours >= shift_length`, (b) has no overlapping Assignment that day.
   Assign them. If no eligible staff remain, leave the slot unfilled and record it as understaffed.
5. Return created Assignments + understaffed slot list to the frontend.
**Edge cases**: zero staff → everything understaffed, return cleanly, no 500. Zero transactions →
all required_staff = 0, no auto assignments, say so explicitly in the response.

## Ticket 6 — Aggregated summary view
**Goal**: table by day/hour showing transactions, staff-hours, txn/staff-hour, plus week totals.
**Input**: schedule id.
**Output**: `GET /schedules/:id/summary` → per-cell {day, hour, transactions, staff_hours, ratio},
plus `{total_staff_hours, total_transactions, overall_ratio, average_cell_ratio}`.
**Steps**:
1. Backend: derive staff_hours(day,hour) by counting Assignments whose shift covers that hour.
2. ratio = transactions / staff_hours, `null` (render "–") when staff_hours = 0.
3. `average_cell_ratio` = mean of ratio over cells where staff_hours > 0 (exclude null cells).
4. `overall_ratio` = total_transactions / total_staff_hours.
5. Frontend: grid (day × hour), 3 stacked values per cell, color scale on ratio (use
   design-taste-frontend skill at build time for exact treatment); totals row/footer.
6. Must re-fetch/recompute live after any Assignment edit (Ticket 7).

## Ticket 7 — Schedule view & direct editing (UX-critical ticket, heavily weighted in grading)
**Goal**: readable weekly roster (day × shift × assigned staff), editable inline.
**Input**: none (reads current Assignments).
**Output**: assign/reassign/remove staff from a (day, shift) slot; summary (Ticket 6) updates live.
**Steps**:
1. `PATCH /schedules/:id/assignments` — add/remove a single Assignment (staff_id, shift_id,
   day_index). Backend computes and returns: (a) whether this pushes staff over max_weekly_hours,
   (b) resulting understaffed/overstaffed flags for affected hours. Non-blocking — always succeeds,
   warnings are informational.
2. Frontend: grid or list view, day × shift cells show assigned staff as chips; click/select to
   add, click chip to remove/reassign. No full-page forms for a single edit.
3. Warnings surface inline (badge on staff chip if over max hours; badge on cell if understaffed)
   — do not use blocking modals/alerts for these.
4. Any edit triggers an immediate summary refresh (Ticket 6) — same page, no manual refresh step.

## Ticket 8 — Shift management UI parity
**Goal**: shift add/edit/remove (Ticket 4 backend) reflected cleanly in the schedule view.
**Steps**:
1. Editing a shift's time range updates `shift_headcount`/coverage display live (re-run summary,
   do not require re-running auto-schedule).
2. Removing a shift that has existing Assignments — confirm before cascading delete (user-visible
   destructive action, needs explicit confirmation per data-safety norms).

---

## Build order
1 → 2 → 4 → 3 (CRUD scaffolding first; sample CSV only needed once schedule/shifts exist) → 6
(summary can render zeros) → 7 (manual edit UI) → 5 (auto-schedule, writes into the same
Assignment/summary machinery) → 8 (polish). Verify end-to-end with `sample_transaction_interview.csv`
before calling any ticket done.
