# Claude.md

## Project Goals:

**Current milestone:** Finish all the related requirements start from the SWE_Take_Home_Staff-Scheduling_System.pdf. Do not touch out of scope work

## Design Style Guide

**Tech stack:** React, Tailwind CSS, Ant Design, Lucide-react
**Visual style**:

- Clean, minimal interface
- Use Ant design, Tailwind CSS (no animation-ping), Lucide-react logo (not applied everywhere). Font Inter, font size 13
- No dark mode

## Product & UX Guidelines

**Core UX principles:**

- Helpful error message that suggest next steps for users.
- Applicable, visible for users to make actions
  **For any requirements to fix and avoid AI slop UI:** use taste-skill skill to evaluate and do next steps.

## Architecture (fully client-side, no backend)

**Decision:** no backend, no database. Demo version runs with `npm install && npm run dev` only.

- **State:** one global Zustand store (`frontend/src/store/`) with the `persist` middleware writing to **localStorage**. Never sessionStorage (data is lost when the tab closes). Screens read/write only through the store, never touch `localStorage` directly.
- **Business logic:** pure TypeScript functions in `frontend/src/lib/` (CSV parser, demand model, auto-schedule, summary aggregation). No React or store imports inside them, so they are unit-testable and explainable live.
- **Validation:** validate at the boundaries only: CSV import and form inputs. Reject bad CSV with a row/column-level message. Sanitize user text before rendering (React escapes by default; never use `dangerouslySetInnerHTML`).
- **Errors:** one error boundary and one notification helper (AntD `message`/`notification`), no scattered try/catch. Messages say what happened and the next step.
- **Persistence safety:** store has a `version` and a `migrate`; if stored data fails to parse, reset to seed data and tell the user.

**For any requirements to start implementing:** use ponytail skill to start

## Constraints & Policies

**Security - Must follow:**

- Always use environment variables for secrets
- Never commit `.env.local` or any file with API keys
- Validate and sanitize all user input

**Code Quality**

- Typescript strict
- Run `npm run lint` before committing
- No use of `any` types without justification

**Branching**

- Always create a feature branch before starting major changes
- Never commit directly to `main` branch - Except for first commit
- Branch naming: `feature/description` or `fix/description`

**Git workflow for major changes:**

1. Create a new branch: `git checkout -b feature/feature-name`
2. Develop and commit on the feature branch
3. Test locally, do not push wait for my instructions
4. Use the `/update-docs-and-commit` slash command for commits - ensure docs are updated alongside code changes

**Commits**

- Write clear commit messages describing the change
- Keep commits focused on single changes

## Documentation

-[Project Spec] (specs/) -[Architecture] (docs/architecture.md) -[Project Status] (docs/project_status.md) - Current Progress

- Update files in the docs folder after major milestones and major additions to the project.
