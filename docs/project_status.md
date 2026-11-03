# Project status

## Delivered

The full flow from the brief is implemented and specified in `../specs/requirements.md`:

- Schedules, staff, shifts and demand data, with the provided CSV (and variations) importable and demand cells editable
- Demand model (people per hour, MAX per shift) and the greedy, deterministic auto-schedule with shortfall reporting
- Roster view and editing, including drag and drop with a live preview, and non-blocking warnings
- Aggregated summary with the per-cell values, day totals and both week-level ratios
- Client-side persistence in localStorage
- Demonstration aids: three scenarios with an explanation panel, a "How the logic works" panel, sample staff and three sample reports
- Documentation: `README.md`, `architecture.md`, `business-analysis.md` (and `.vi.md`), `ai-process.md`, the functional specification

## Verification

| Check | Result |
|---|---|
| Strict typecheck and production build (`npm run build`) | Passes |
| Lint (`npm run lint`) | Clean |
| Unit tests (`npm test`) | 72 tests in 7 files, all passing |
| Fresh clone from GitHub, `npm ci`, tests and build | Passes |

## Out of scope

Authentication, multi-user support and deployment (per the brief), and: availability and days off, roles, CSV export of the
roster, a separate coverage view.
