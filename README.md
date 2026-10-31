# Staff Scheduling System

Weekly staff scheduling tool: upload transaction demand, define staff and shifts, auto-generate a
draft roster, then view/edit it with a live aggregated summary.

See `SWE_Take_Home_Staff_Scheduling_System.pdf` for the original brief, `docs/business-analysis.md`
for the open-ended decisions and assumptions made, and `specs/requirements.md` for the ticket
breakdown.

## Stack

- **Backend**: NestJS + Supabase (Postgres)
- **Frontend**: React + Vite + Tailwind CSS + Ant Design + Lucide-react

## Setup

```bash
# backend
cd backend
cp .env.example .env   # fill in SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
npm install
npm run start:dev      # http://localhost:3000/api

# frontend (separate terminal)
cd frontend
npm install
npm run dev             # http://localhost:5173
```

## Status

Scaffolding only — see `docs/project_status.md` for current progress once implementation starts.
