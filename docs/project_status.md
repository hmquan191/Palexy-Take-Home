# Project Status

## Done
- Requirements analysis: `docs/business-analysis.md` (+ `.vi.md`), merged decisions in `docs/final-decisions.vi.md`, tickets in `specs/requirements.md`
- Decisions: N=15 (adjustable), multiple schedules, CSV columns kept in file order, utilization-based fairness,
  MAX per shift, 8h daily cap per person, client-side only (Zustand + localStorage)
- Frontend scaffold: Vite + React + TS (strict), Tailwind v4, Ant Design (Inter 13px), Zustand, Vitest
- Backend scaffold removed (client-side decision), on branch `feature/client-side-storage`
- Ticket 1: types, persisted Zustand store (create/delete schedule, corrupt-storage fallback), schedules list/create
  page (creating stays on the list), schedule workspace
- N (transactions per staff per hour) is editable per schedule in the workspace header, default 15, whole number 1-1000
- Ticket 2: staff add/edit/remove (modal form, removal also removes that person's assignments)
- Ticket 3: tolerant CSV importer (`lib/parseTransactionCsv.ts`: week label optional, hours in any order, am/pm or
  24h labels, BOM/CRLF/quotes/trailing commas, rejects whole file with line + column on bad input), demand tab with
  preview table and totals; verified against `sample_transaction_interview.csv`
- 27 unit tests (store + parser)

## Next
Ticket 4 (shift CRUD), then 6, 7, 5, 8, 9 (see specs/requirements.md).

## Not verified
UI was never opened in a browser by the assistant. Checked: typecheck, lint, build, 27 unit tests, and a server-side render of the staff and demand tabs with the real sample file.
