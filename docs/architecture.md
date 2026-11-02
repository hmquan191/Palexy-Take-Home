# Architecture

High-level architecture of the Staff Scheduling System. Fully client-side: no backend, no database.

## System Overview

Single-page React app. All state lives in one Zustand store persisted to localStorage. Business rules
are pure TypeScript functions, so the UI is a thin layer over testable logic.

## Data flow

```
CSV file ──► parseTransactionCsv ──► store.transactions
store (staff, shifts, transactions, N) ──► autoSchedule ──► store.assignments (source: 'auto')
manual edits ──► store actions ──► store.assignments (source: 'manual')
store ──► buildSummary / getWarnings (derived by selectors, never stored) ──► summary grid + warnings
store ──persist middleware──► localStorage["staff-scheduling-v1"]
```

## Component Architecture

### Frontend Component

- `src/pages/` : schedule list, schedule workspace (roster, staff, shifts, summary tabs or sections)
- `src/components/` : roster grid, staff panel, shift manager, summary grid, CSV uploader
- Components read state via store selectors and call store actions; they never touch localStorage.

### State layer

- `src/store/useScheduleStore.ts` : Zustand + `persist` (localStorage), versioned with `migrate`.
  Corrupt storage resets to seed data and notifies the user.

### Library Modules (types, utils,...)

- `src/types.ts` : Schedule, Staff, Shift, Assignment
- `src/lib/parseTransactionCsv.ts`, `src/lib/demand.ts`, `src/lib/autoSchedule.ts`,
  `src/lib/summary.ts`, `src/lib/warnings.ts` : pure functions, no React or store imports, unit tested.

## Key decisions

See `docs/business-analysis.md` (demand model, MAX-per-shift rule, greedy balancing, one shift per staff
per day, warnings not blocking, localStorage not sessionStorage).
