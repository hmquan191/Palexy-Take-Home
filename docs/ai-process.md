# How I used Claude, step by step

A fuller account behind the short note in the README. Commit history shows the same order of work.

1. **Explain the brief.** I asked Claude Opus to explain the assignment and the analysis problem behind it.
2. **Set up the workspace.** I prepared the `.claude/` folder (the ponytail skill and agents) and `CLAUDE.md` myself: stack,
   design rules, branching, commit and code-quality rules. This is how the assistant kept the same conventions across
   sessions.
3. **Analyse and challenge.** Claude listed the places the brief leaves open (demand per hour, how hourly demand becomes a
   shift headcount, fairness, CSV day order, storage) with a recommendation for each (`docs/business-analysis.md`). I then
   had ChatGPT critique it, which produced a second analysis (`docs/staff-scheduling-problem-analysis.md`) comparing AVG,
   MAX and flexible shifts. The two were merged into `docs/business-analysis.md`.
   - AVG is cheaper for the manager, who pays for fewer idle hours, but leaves the busiest hour short-staffed, which
     customers feel immediately.
   - MAX guarantees the peak is covered and costs idle hours in quiet periods (on the sample week 95 of the 352 scheduled hours, 37% above the hourly requirement).
   - Flexible shifts could cut that surplus but add real complexity; they stay a manager-driven extension.
   - Decision: MAX.
4. **Decisions I made.** Client-side storage with Zustand + localStorage instead of a backend; N editable per schedule,
   default 15; CSV day columns kept in file order; an 8-hour daily cap; fairness by lowest utilization.
5. **Build.** Claude implemented the tickets in `specs/requirements.md` in order: store and schedules, staff, CSV import,
   shifts, summary, roster, auto-schedule, sample data, then drag and drop with a live preview. Each piece got unit tests
   (61 in total). Work went through feature branches and pull requests.
6. **Check.** I tested the screens in the browser, starting with staff entry and CSV import, and checked the Friday example
   by hand against the sample file. The logic is covered by unit tests.

7. **README.** Claude drafted it against what the brief asks for (run steps, approach, assumptions, AI note); I review and
   edit it before submitting.
