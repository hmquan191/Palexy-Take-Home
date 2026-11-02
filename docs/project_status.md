# Project Status

## Done
- Requirements analysis: `docs/business-analysis.md` (+ `.vi.md`), merged decisions in `docs/final-decisions.vi.md`, tickets in `specs/requirements.md`
- Decisions: N=15 (adjustable), multiple schedules, CSV columns kept in file order, utilization-based fairness,
  MAX per shift, 8h daily cap per person, client-side only (Zustand + localStorage)
- Frontend scaffold: Vite + React + TS (strict), Tailwind v4, Ant Design (Inter 13px), Zustand, Vitest
- Backend scaffold removed (client-side decision); merged to `main` via PR #1
- Ticket 1: types, persisted Zustand store (create/delete schedule, corrupt-storage fallback), schedules list/create
  page (creating stays on the list), schedule workspace
- N (transactions per staff per hour) is editable per schedule in the workspace header, default 15, whole number 1-1000
- Ticket 2: staff add/edit/remove (modal form, removal also removes that person's assignments)
- Ticket 3: tolerant CSV importer (`lib/parseTransactionCsv.ts`: week label optional, hours in any order, am/pm or
  24h labels, BOM/CRLF/quotes/trailing commas, rejects whole file with line + column on bad input), demand tab with
  preview table and totals; verified against `sample_transaction_interview.csv`
- Ticket 4/8: shifts add/edit/remove on the Shifts tab (hour-aligned, cascade-removes assignments); edits flow into
  roster, warnings and summary live
- Ticket 6: Summary tab (day x hour grid, day totals, week totals incl. overall and average ratio, required vs scheduled)
- Ticket 7: Roster tab (day x shift grid, add via dropdown sorted by utilization, remove chips, inline warnings,
  hours-this-week bars, always-visible stats strip)
- Ticket 5: auto-schedule (`lib/autoSchedule.ts`, MAX per shift, lowest utilization first, 8h daily cap, keeps manual)
- Ticket 9: Load sample week button, README with approach, assumptions and AI-usage note
- Roster drag and drop (dnd-kit, merged to `main`): move chips between cells, drag names from the
  staff list, drop a chip on the list to remove it. `lib/roster.ts` (`applyDrop`, `previewDrop`) is the single source of
  truth for the committed result and the live preview (headcount and hours after the drop)
- 61 unit tests (store, parser, demand model, auto-schedule, summary, warnings, drag math)

## Next
Full flow is built. Remaining: a manual browser pass (especially drag and drop), polish, and stretch goals (coverage view, CSV export).

## Not verified
The assistant never opened the UI in a browser, and drag and drop in particular is untested in a real browser (pointer events); the math behind it is unit tested. Checked: typecheck, lint, build, 61 unit tests, and server-side renders of every tab with the real sample data (roster before/after auto-schedule, an edit producing a warning). You tested staff entry and CSV import by hand; the roster, summary, shifts and auto-schedule screens still need your eyes.

## Manual test checklist (do in a browser, `cd frontend && npm run dev`)
1. Schedules page: create a schedule (stays on the list), Load sample week, open it, delete one (confirmation).
2. Staff: add, edit, delete one that has shifts (the confirmation names how many shifts go with it).
3. Demand data: upload `sample_transaction_interview.csv` (expect 7 days x 16 hours, Friday 452). Then try a broken
   file (a letter in a cell, a bad hour label): expect line and column in the error and no change to the data.
4. Auto-schedule on the sample week: expect all shifts filled, no amber cells; summary total 352 staff hours.
   Delete five staff and re-run: expect shortfall list and amber cells, nobody over their hours.
5. Roster: Add menu, remove with the x, drag a chip to another cell, drag a name from the list onto a shift, drop a
   chip on the list. While dragging check the preview text and the hours bar. Re-run Auto-schedule: blue chips stay.
6. Change N in the header: stats strip "asked for" changes; roster does not until Auto-schedule runs again.
7. Shifts: edit a shift's times and remove one with placements; roster and summary follow.
8. Reload the page: data persists. In devtools set `staff-scheduling-v1` to `{bad`: notice appears, app starts empty.
9. Narrow the window: roster scrolls sideways instead of breaking.

## Known gaps
- Drag and drop has no keyboard path (the Add menu is the alternative).
- AI-usage note in the README is a draft written by the assistant; rewrite it in your own words before submitting.
- Not built: availability/days off, roles, CSV export, coverage view (stretch goals).
