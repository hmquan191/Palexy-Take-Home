# How I used Claude, step by step

A fuller account behind the short note in the README. Commit history shows the same order of work.

1. **Explain the brief.** I asked Claude Opus to explain the assignment and the analysis problem behind it.
2. **Set up the workspace.** I wrote the `.claude/` folder (the ponytail skill and agents) and `CLAUDE.md` myself: stack,
   design rules, branching, commit and code-quality rules. This is how the assistant kept the same conventions across
   sessions.
3. **Analyse and challenge.** Claude listed the places the brief leaves open (demand per hour, how hourly demand becomes a
   shift headcount, fairness, CSV day order, storage) with a recommendation for each (`docs/business-analysis.md`). I then
   had ChatGPT critique it, which produced a second analysis (`docs/staff-scheduling-problem-analysis.md`) comparing AVG,
   MAX and flexible shifts. We merged both into `docs/final-decisions.vi.md`.
   - AVG is cheaper for the manager, who pays for fewer idle hours, but leaves the busiest hour short-staffed, which
     customers feel immediately.
   - MAX guarantees the peak is covered and costs idle hours in quiet periods (about 27% on the sample week).
   - Flexible shifts could cut that surplus but add real complexity; they stay a manager-driven extension.
   - Decision: MAX.
4. **Decisions I made.** Client-side storage with Zustand + localStorage instead of a backend; N editable per schedule,
   default 15; CSV day columns kept in file order; an 8-hour daily cap; fairness by lowest utilization.
5. **Build.** Claude implemented the tickets in `specs/requirements.md` in order: store and schedules, staff, CSV import,
   shifts, summary, roster, auto-schedule, sample data, then drag and drop with a live preview. Each piece got unit tests
   (61 in total). Work went through feature branches and pull requests.
6. **Check.** I tried staff entry and CSV import in the browser and checked the Friday example by hand against the sample
   file. The assistant could not open a browser, so drag and drop and the roster screens are covered by unit tests and
   server-side rendering, plus the manual checklist in `docs/project_status.md`.
7. **Corrections along the way.** Backend replaced by localStorage; the first fairness rule replaced; a missed 16-hour-day
   case fixed; a wrong skill name corrected; docs resynced with the code at the end.
8. **README.** Claude drafted it against what the brief asks for (run steps, approach, assumptions, AI note); I review and
   edit it before submitting.
