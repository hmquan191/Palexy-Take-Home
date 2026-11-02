# Architecture

High-level architecture of the Staff Scheduling System. Fully client-side: no backend, no database.

## System Overview

Single-page React app. All state lives in one Zustand store persisted to localStorage. Business rules
are pure TypeScript functions, so the UI is a thin layer over testable logic.

## Data flow

```
CSV file ──► parseTransactionCsv ──► store.transactions
store (staff, shifts, transactions, N) ──► autoSchedule ──► store.assignments (source: 'auto')
manual edits / Add menu ──► store actions ──► store.assignments (source: 'manual')
drag and drop ──► applyDrop (lib/roster.ts) ──► store.dropOnSlot ──► store.assignments (source: 'manual')
hover while dragging ──► previewDrop (same applyDrop) ──► cell headcount + person hours after the drop
store ──► buildSummary / getWarnings (derived by selectors, never stored) ──► summary grid + warnings
store ──persist middleware──► localStorage["staff-scheduling-v1"]
```

## Component Architecture

### Frontend Component

- `src/pages/` : schedule list, schedule workspace (header with N, live stats strip, tabs)
- `src/components/` : RosterTab, SummaryTab, StaffTab, ShiftsTab, DemandTab (CSV upload + preview), StatsStrip
- `src/components/roster/` : RosterCell (droppable cell, draggable chips, Add menu), StaffPanel (hours bars, drag source,
  drop-to-remove zone), dragTypes, text (warning wording). Drag and drop uses `@dnd-kit/core` (pointer sensor, 6px
  activation so clicks on x still work; drag starts from the grip only)
- Components read state via store selectors and call store actions; they never touch localStorage.

### State layer

- `src/store/useScheduleStore.ts` : Zustand + `persist` (localStorage), versioned with `migrate`.
  Corrupt storage resets to seed data and notifies the user.

### Library Modules (types, utils,...)

- `src/types.ts` : Schedule, Staff, Shift, Assignment
- `src/lib/parseTransactionCsv.ts`, `demand.ts`, `shifts.ts`, `autoSchedule.ts`, `summary.ts`, `warnings.ts`,
  `roster.ts` (applyDrop, previewDrop), `time.ts`, `format.ts`, `sampleData.ts` : pure functions, no React or store imports, unit tested.

## Key decisions

See `docs/business-analysis.md` (demand model, MAX-per-shift rule, utilization-based greedy balancing, 8h daily
cap per person, warnings not blocking, localStorage not sessionStorage).
