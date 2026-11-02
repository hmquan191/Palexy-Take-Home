# Staff Scheduling System

Weekly staff scheduling tool: upload transaction demand, define staff and shifts, auto-generate a
draft roster, then view/edit it with a live aggregated summary.

See `SWE_Take_Home_Staff_Scheduling_System.pdf` for the original brief, `docs/business-analysis.md`
for the open-ended decisions and assumptions made, and `specs/requirements.md` for the ticket
breakdown.

## Stack

Fully client-side: React + Vite + TypeScript + Tailwind CSS + Ant Design + Lucide-react, with state in a
Zustand store persisted to localStorage. No backend, no database, no accounts.

## Setup

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

Data is stored in your browser's localStorage (per browser, cleared if you clear site data).

## Status

Scaffolding only — see `docs/project_status.md` for current progress once implementation starts.
