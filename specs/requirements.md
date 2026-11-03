# Functional specification

What the system does. It is organised by feature; each section lists the behaviour and the rules that apply. The last
section maps the original brief to where it is delivered. Design reasoning is in `../docs/business-analysis.md` and the
structure of the code in `../docs/architecture.md`.

## 1. Schedules

- A schedule is the top-level container for staff, shifts, demand data and the roster. It represents one typical week.
- Users can create, list, open and delete schedules. Creating a schedule keeps the user on the list.
- A new schedule has the two default shifts (07:00-15:00, 15:00-23:00) and N = 15.
- *Load sample week* creates a schedule with 10 staff and the provided transaction report.
- Deleting asks for confirmation and removes everything inside the schedule.

## 2. Staff

- Each person has a name and a maximum number of hours per week (whole number, 1 to 40).
- Add, edit and remove. Removing a person also removes their placements, and the confirmation says how many.
- *Add sample staff* adds the next five names from a list of 20 Vietnamese names (An, Bình, Công, Đức, Thọ first) at 40
  hours each, skipping names already present. *Remove all* clears the team and the roster.
- The table has a running number column.

## 3. Shifts

- A shift is a start and an end time, on the hour, within one day, shared by every day of the week.
- Add, edit and remove. Removing a shift removes its placements, and the confirmation says how many. Changes flow
  immediately into the roster, warnings and summary.
- Overlapping shifts are allowed; a notice explains that each shift is sized on its own.

## 4. Demand data

- Upload a weekly transaction report as CSV: optional title row, a header row of day labels, then one row per hour.
- Accepted variation: any or no title, hour rows in any order, labels like `7am`, `1pm`, `13:00`, BOM, CRLF, quoted fields,
  trailing commas, hours missing from the file (treated as closed). Up to 7 day columns with unique labels.
- A malformed file is rejected whole, with the line and column and a next step; nothing is changed. Files over 1 MB are
  refused.
- Day columns keep the file's order and labels. Uploading again replaces the data and drops placements on days that no
  longer exist.
- Any cell can be edited in place (Enter or click away to save). Only whole numbers from 0 to 100,000 are accepted: minus,
  decimal point and letters are blocked when typing and pasting, and an invalid value reverts with a message. An hour set to
  0 stays open and still needs one person.
- A preview table shows counts with row, column and week totals.

## 5. Demand model

- People needed in an hour = `max(1, ceil(transactions / N))` for hours that have data; 0 otherwise.
- N is a whole number from 1 to 1000, default 15, editable per schedule at the top of the workspace.
- A shift needs as many people as its busiest hour (MAX rule).
- Changing N or the demand does not move anyone on the roster; Auto-schedule must be run again to apply it. Staffing
  figures and warnings update immediately.

## 6. Auto-schedule

- A button produces a draft roster, filling each (day, shift) up to its headcount. It goes day by day in file order and
  shift by shift in start-time order.
- Each open slot goes to the eligible person with the lowest utilization (hours assigned / weekly maximum); ties go to more
  hours remaining, then name. The result is deterministic.
- Eligible: not already on the shift, enough weekly hours left for the whole shift, no overlapping shift, at most 8 hours
  that day (a shift longer than 8 hours only as that person's sole shift of the day).
- If nobody eligible is left, the slot stays open. The result states which shift on which day is short and by how many,
  and how many contract hours are unused. Nobody is scheduled past their weekly maximum.
- With no staff or no demand data it does not fail: it says what is missing.
- Re-running replaces only the placements Auto-schedule made (after a confirmation); placements added or moved by hand are
  kept and counted. *Remove all* empties the roster.

## 7. Roster

- A grid of shifts by days showing who works each shift. Each cell shows how many are needed and how many are placed.
  Cells with fewer people than needed are highlighted; extra people are shown neutrally.
- Chips are blue when added or moved by the user, grey when placed by Auto-schedule.
- Edit by drag and drop: move a chip to another cell, drag a person from the staff list onto a shift, drop a chip on the
  staff list to remove it. The *Add* menu in each cell and the × on a chip give the same edits without dragging. Add lists
  people with the lowest utilization first.
- While dragging, the cell under the pointer previews its headcount after the drop and the person's hours after the drop,
  and flags a limit that would be exceeded. The preview is computed by the same function as the drop.
- Warnings never block: over the weekly limit, over 8 hours in a day, overlapping shifts, hours below demand. They appear
  on chips, cells, in a list above the roster, and in the stats strip.
- A *Hours this week* list shows each person's hours against their maximum.

## 8. Summary

- Day by hour grid. Each cell shows transactions, staff on shift (staff-hours) and transactions per staff-hour ("-" when
  nobody is scheduled). Cells below the required staffing are highlighted; extra staff is shown as `+n`.
- Day totals, and week totals: total staff-hours, total transactions, transactions per staff-hour overall (total / total),
  and the average of the per-cell ratios (cells with staff only). Both ratios are shown.
- The staff-hours the demand model asks for are shown next to those scheduled.
- A stats strip above the tabs shows the same headline numbers and updates after every edit.

## 9. Demonstration aids

- **Scenarios 1 to 3** in the workspace set up the team, shifts and N on the provided week, run Auto-schedule and show a
  panel with the idea, setup, live numbers, pros, cons and trade-off:
  1. Baseline: 10 staff, two 8-hour shifts.
  2. Short-staffed: 5 staff.
  3. Shorter shifts: four 4-hour blocks.

  Applying one replaces the open schedule's data (with a confirmation if it holds the user's own data).
- **How the logic works** is an info panel in the workspace covering the demand model, the MAX rule with a worked example
  from the current data, the pick order, what is kept on a re-run, how to read the numbers, and the known limits.
- `samples/` holds three transaction reports: the provided week, a café week (Mon to Sun, 24-hour labels, rows out of order,
  a closed hour) and a busy 5-day week.

## 10. Non-functional

- Runs with `npm install && npm run dev`; no backend, database or account.
- Data persists in the browser's localStorage and survives reloads. Unreadable saved data starts the app empty and says so.
- Strict TypeScript; the build, lint and unit tests run clean.

## Coverage of the brief

| Brief | Delivered in |
|---|---|
| 2.1 Create a schedule (one typical week) | Section 1 |
| 2.2 Staff with name and maximum weekly hours, add / edit / remove | Section 2 |
| 2.3 Upload transaction data, importer for the provided format, tolerant and graceful | Section 4 |
| 2.4 Shifts defined by start and end, two defaults, add / edit / remove | Section 3 |
| 2.5 Auto-schedule: demand-aware, respects maximum hours, fair, shown as an editable draft | Sections 5 to 7 |
| 2.6 Aggregated summary with the three per-cell values and the four week values | Section 8 |
| 2.7 Readable roster, direct editing, shift management, live feedback and warnings | Sections 3, 7, 8 |
| 3 Provided data | Sections 4 and 9 (`samples/`) |
| 4 Auto-schedule expectations: demand per hour, per shift, assignment, balance, trade-offs | Sections 5 and 6; reasoning in `business-analysis.md` |
| 5 Technical: UI, runnable locally, scoped sensibly | Sections 9 and 10 |
| 6 Deliverables: repository, README, AI-usage note | `README.md`, `docs/ai-process.md` |
| 8 Stretch: drag-and-drop adjustment | Section 7 |
