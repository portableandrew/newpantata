# Paradise PM

A modern project management and reporting system built to replace Kantata.

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or Docker)

### Development Setup

1. **Start PostgreSQL** (via Docker):
   ```bash
   docker run -d \
     --name paradise-db \
     -e POSTGRES_USER=paradise \
     -e POSTGRES_PASSWORD=paradise \
     -e POSTGRES_DB=paradise_pm \
     -p 5432:5432 \
     postgres:15-alpine
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up backend**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env if needed
   npm install
   npx prisma db push
   npx ts-node prisma/seed.ts
   ```

4. **Start development servers**:
   ```bash
   # From root
   npm run dev:backend   # Terminal 1
   npm run dev:frontend  # Terminal 2
   ```

5. Open http://localhost:5173

### Docker Compose (Production)

```bash
docker-compose up -d
```

Open http://localhost:5173

---

## Features

### Dashboard
- Live KPI summary (projects, pipeline, P&L)
- RAG status alerts for projects needing attention
- Pipeline value (total and probability-weighted)

### Projects
- Full CRUD for projects and clients
- Weekly health status updates (RAG: Overall, Schedule, Scope, Budget, Client)
- Financial tracking (Budget, Actual, EAC, Variance, Margin)
- Time entry history via Harvest sync

### Pipeline
- Kanban board across all deal stages
- Drag-free stage transitions
- Probability-weighted forecast

### Team & Utilization
- Utilization tracking by person and role group
- Target vs actual comparison
- Timesheet completion view (Tamsheek)

### Financials
- Monthly P&L entry and auto-calculation
- Quarterly aggregation
- Gross and net margin tracking

### Reports (Core Feature)
- **One-click monthly report generation**
- Readiness checklist before generating
- Report covers: Projects, Client Feedback, Financials, Pipeline, Utilization, Team
- Export as JSON, Markdown, or copy to clipboard
- Historical snapshot storage

### Harvest Integration
- Time entry sync
- Project and user mapping
- Manual and scheduled sync

---

## Data Model

See `backend/prisma/schema.prisma` for the full schema.

Key entities:
- `organizations` — Company-level settings
- `team_members` — Staff with roles, rates, Harvest IDs
- `clients` — Client organisations
- `projects` — All project types (Fixed Price, T&M, SLA, R&I)
- `project_health_updates` — Weekly RAG status
- `time_entries` — From Harvest
- `monthly_financials` — P&L per month
- `monthly_snapshots` — Frozen report data

---

## Harvest Setup

1. Get your Harvest Account ID and Personal Access Token from https://id.getharvest.com/developers
2. Add to `backend/.env`:
   ```
   HARVEST_ACCOUNT_ID=your_account_id
   HARVEST_ACCESS_TOKEN=your_token
   ```
3. In the app, go to Harvest Sync
4. Map your team members' `harvest_user_id` fields
5. Map your projects' `harvest_project_id` fields
6. Run a manual sync

---

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **State**: TanStack Query (React Query)
- **Charts**: Recharts

## Future Integrations

- **HumanForce**: Data model ready for employee health/pulse data
- **Xero**: Invoice import for automatic P&L
- **SSO**: Auth infrastructure in place
