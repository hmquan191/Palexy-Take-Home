# Architecture

System architecture of the Staff Scheduling System: what it is built from, how the pieces fit, and where each rule lives.
Design reasoning is in `business-analysis.md`; delivered behaviour is in `../specs/requirements.md`.

## Overview

A single-page application that runs entirely in the browser. There is no backend, database or account. All state lives
in one Zustand store that is persisted to localStorage, and all business rules are pure TypeScript functions, so the UI
is a thin layer over testable logic.

| Concern | Choice |
|---|---|
| UI | React 19, TypeScript (strict), Ant Design, Tailwind CSS v4, Lucide icons |
| Routing | React Router (schedule list, schedule workspace) |
| State and persistence | Zustand with the `persist` middleware, localStorage key `staff-scheduling-v1` |
| Drag and drop | `@dnd-kit/core` |
| Build and test | Vite, Vitest, oxlint |

## Repository layout

```
frontend/
  src/
    pages/        SchedulesPage (list, create, load sample), SchedulePage (workspace)
    components/   RosterTab, SummaryTab, StaffTab, ShiftsTab, DemandTab, StatsStrip, ScenarioBar, LogicInfo
      roster/     RosterCell, StaffPanel, dragTypes, text
    store/        useScheduleStore (the only place state is read and written)
    lib/          pure business logic (no React, no store)
    data/         bundled sample transaction report
    types.ts      shared types
samples/          three transaction reports for import
docs/             architecture, business analysis, process notes
specs/            functional specification
```

## Data model (`src/types.ts`)

```ts
Schedule   { id, name, createdAt, nPerStaff, dayLabels[], staff[], shifts[],
             transactions: Record<"day-hour", number>, assignments[], scenario? }
Staff      { id, name, maxWeeklyHours }
Shift      { id, start "HH:mm", end "HH:mm" }
Assignment { id, staffId, shiftId, dayIndex, source: 'auto' | 'manual' }
```

- `dayIndex` is the position of the day in the imported file, and `dayLabels` holds the labels shown to the user.
- A cell's staff-hours is the number of assignments whose shift covers that hour on that day.
- Derived values (summary, warnings, hours per person) are computed from these fields on render and never stored.

## State and persistence

`useScheduleStore` holds the list of schedules and every action that changes them (create and delete schedules, staff,
shifts, demand cells and import, assignments, auto-schedule, drag and drop, scenarios). Components read through
selectors and call store actions; nothing else touches localStorage.

- The store is versioned (`version`, `migrate`). Data that cannot be parsed, or has the wrong shape, resets to an empty
  state and the schedules page tells the user.
- Actions that remove staff or a shift also remove the assignments that reference them, so there are no orphans.
- Actions guard their own input (for example `setTransaction` accepts only whole numbers from 0 to 100,000 for an
  existing cell, `setNPerStaff` only whole numbers from 1).

## Business logic (`src/lib`)

| Module | Responsibility |
|---|---|
| `parseTransactionCsv` | CSV text to demand data, or the line and column of the first problem |
| `demand` | People per hour (`max(1, ceil(txn / N))`), headcount of a shift (MAX of its hours), required staff-hours, worked example for the logic panel |
| `shifts` | Shift length, covered hours, overlap, ordering, the daily-hours cap |
| `autoSchedule` | Greedy, deterministic draft roster; reports shortfalls and unused hours |
| `roster` | `applyDrop` (what a drop does) and `previewDrop` (hours and headcount after it) |
| `summary` | Day by hour cells, day totals, week totals (overall and average ratio) |
| `warnings` | Over weekly limit, over daily cap, overlapping shifts, understaffed hours |
| `scenarios` | The three demo scenarios (team, shifts, N, and their descriptions) |
| `sampleData`, `time`, `format` | Sample staff and names, hour label parsing and formatting, number formatting |

The two halves of the scheduling logic are separate on purpose: **sizing** a shift (MAX rule in `demand`) decides how many
people it needs, and **assignment** (greedy in `autoSchedule`) decides which people fill those places.

## Key flows

**Import.** File picked in `DemandTab` is checked for size, parsed by `parseTransactionCsv`, and on success replaces the
schedule's demand data and day labels (`importTransactions`). On failure nothing changes and the line and column are shown.

**Auto-schedule.** `runAutoSchedule` calls `autoSchedule` on the current schedule and replaces only the placements marked
`auto`. Manual placements are kept and counted against hours and the daily cap. The result (shortfalls, unused hours) is
shown above the roster.

**Manual edit and drag and drop.** The Add menu and drag and drop both go through `applyDrop` (store action
`dropOnSlot`). While dragging, `previewDrop` computes the headcount of the cell and the person's hours after the drop with
the same function, so the preview and the result cannot disagree. Moved and added placements become `manual`.

**Live feedback.** Any change to the schedule re-renders the stats strip, roster warnings, summary and hours bars, all
derived from the same data.

**Scenarios.** `applyScenario` configures the open schedule (team, shifts, N, demand) and runs Auto-schedule; the panel
shows live numbers computed from the resulting schedule.

## Validation and errors

- Validation happens at the boundaries: the CSV import, form inputs (name, hours, shift times, N) and the demand cells
  (digits only, no minus or decimal point, whole numbers 0 to 100,000, also enforced in the store).
- Warnings about the roster never block an edit; they are shown inline and in the stats strip.
- User text is rendered through React, never as raw HTML.

## Testing

Vitest covers the pure logic and the store: CSV parsing (including the provided file), demand model, auto-schedule
(coverage, limits, shortfalls, determinism, manual placements), summary maths (including the brief's worked example),
warnings, drag and drop maths (preview equals result for every drop target), sample data and scenarios.

```bash
cd frontend
npm test            # unit tests
npm run lint
npm run build       # strict typecheck and production build
```
