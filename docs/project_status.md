# Project Status

## Done
- Requirements analysis: `docs/business-analysis.md` (+ `.vi.md`), merged decisions in `docs/final-decisions.vi.md`, tickets in `specs/requirements.md`
- Decisions: N=15 (adjustable), multiple schedules, CSV columns kept in file order, utilization-based fairness,
  MAX per shift, 8h daily cap per person, client-side only (Zustand + localStorage)
- Frontend scaffold: Vite + React + TS (strict), Tailwind v4, Ant Design (Inter 13px), Zustand, Vitest
- Backend scaffold removed (client-side decision), on branch `feature/client-side-storage`
- Ticket 1: types, persisted Zustand store (create/delete schedule, corrupt-storage fallback), schedules list/create
  page, schedule workspace placeholder, 6 store tests

## Next
Ticket 2 (staff CRUD), then 4, 3, 6, 7, 5, 8, 9 (see specs/requirements.md).

## Not verified
Ticket 1 UI was smoke-tested only (dev server serves, typecheck, lint, build and tests pass); not yet looked at in a browser.
