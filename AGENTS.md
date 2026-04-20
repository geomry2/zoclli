# AGENTS.md

Use this file as the primary onboarding context for coding agents working in this repository.

## Quick Start

- Main product code lives in `realestate-app/`.
- Treat `realestate-app/` as the default working directory for installs, builds, tests, and code changes.
- This is an Angular 21 standalone app for a real estate CRM / backoffice.
- Main domains: dashboard, clients, leads, properties, tasks.
- Backend: Supabase.
- UI state: mostly Angular signals, with limited RxJS where routing or interop needs it.
- Localization: English and Russian via `TranslationService`.

If you are new to the repo, start by reading:

1. `realestate-app/src/app/app.ts`
2. `realestate-app/src/app/app.html`
3. `realestate-app/src/app/app.routes.ts`
4. The service or component closest to the requested feature

## Repo Layout

- `realestate-app/`: application code
- `realestate-app/src/app/components/`: UI components
- `realestate-app/src/app/services/`: data access and app services
- `realestate-app/src/app/models/`: core entities
- `realestate-app/src/app/utils/`: exports, PDF/XLSX, filters, table helpers, notes helpers
- `realestate-app/src/environments/`: environment defaults merged with runtime config
- `realestate-app/public/env.local.example.js`: runtime env example
- `realestate-app/supabase/`: SQL files for expected backend tables

The repo root may contain lightweight repo-level files, but most meaningful product work should happen under `realestate-app/`.

## App Overview

### Shell And Navigation

- Root component: `realestate-app/src/app/app.ts`
- Root template: `realestate-app/src/app/app.html`
- Routes: `realestate-app/src/app/app.routes.ts`
- Top-level tabs: `dashboard`, `clients`, `leads`, `properties`, `tasks`
- Lead subviews: `board`, `table`, `followups`, `insights`

The app shell owns:

- active tab and route-derived state
- global search
- create / edit modals for clients, leads, units, and tasks
- XLSX export for clients and leads
- password gate rendering

### Main Components

- `dashboard/`: KPI cards, recent activity, top realtors, overview stats
- `clients-table/`: client list, filters, sorting, column visibility, mobile cards
- `leads-table/`: lead table view and edit / convert entry points
- `leads-board/`: kanban pipeline by lead status
- `lead-follow-ups/`: due-date-focused lead queue
- `leads-insights/`: lead analytics / summary view
- `property-catalogue/`: grouped building and unit catalogue
- `task-board/`: task kanban area
- `task-modal/`: task create / edit modal
- `related-tasks/`: contextual task list for entities
- `create-modal/`: create / edit client or lead, including lead-to-client conversion
- `add-unit-modal/`: create / edit unit
- `contact-notes/`: chronological notes timeline reused across clients and leads
- `row-detail/`: detail presentation for records
- `search-bar/`: app-wide search UI
- `password-gate/`: gate backed by `environment.appPassword`

## Core Data Model

Primary models live in `realestate-app/src/app/models/`.

- `Client`: contact, deal, commission, property linkage, serialized notes
- `Lead`: prospect, funnel status, follow-up data, serialized notes
- `Unit`: property inventory row
- `Task`: internal work item with status and related entity context
- `ContactNote`: timeline note entry used by notes helpers / UI

## Services

- `ClientService`: load, map, create, update, delete `clients`
- `LeadService`: load, map, create, update, delete `leads`
- `UnitService`: manage `units`
- `TaskService`: manage `tasks`
- `BuildingService`: manage building names
- `AgencyService`: manage agency names
- `ActivityService`: recent activity feed persisted in `localStorage`
- `TranslationService`: EN/RU dictionary and language switching
- `SupabaseService`: creates the Supabase client when runtime env is valid
- `TaskParserService`: optional AI/freeform task parsing with fallback behavior

## Runtime And Environment

Environment defaults are defined in:

- `realestate-app/src/environments/environment.ts`

Runtime overrides come from:

- `window.__env`
- example file: `realestate-app/public/env.local.example.js`

Relevant env keys:

- `supabaseUrl`
- `supabaseAnonKey`
- `appPassword`
- `taskParserUrl`

Important behavior:

- If Supabase credentials are missing or still placeholders, `SupabaseService` returns `null`.
- In that case, data services surface `"Supabase not configured."` instead of loading records.
- The password gate compares entered password with `environment.appPassword`.
- If `taskParserUrl` is unavailable, the app falls back to local heuristic task parsing.

## Backend Expectations

The frontend expects these Supabase tables:

- `clients`
- `leads`
- `units`
- `buildings`
- `agencies`
- `tasks`

Known schema files in `realestate-app/supabase/`:

- `buildings.sql`
- `clients-commission.sql`
- `units.sql`
- `tasks.sql`

Supabase rows are expected in `snake_case` and converted to app-friendly `camelCase` via `realestate-app/src/app/services/case.utils.ts`.

## Product Behavior Notes

- Clients and leads are searchable from the app shell.
- Client and lead tables support sorting, structured filters, per-table column visibility, and responsive mobile card layouts.
- Leads are accessible in board, table, follow-up, and insights modes.
- Leads can be converted into clients through `create-modal`.
- Contact notes are stored as a chronological timeline, serialized into the legacy `notes` field for persistence compatibility.
- Dashboard metrics are computed client-side from loaded entities and activity entries.
- `Top Realtors` reflects commission volume, not only deal count.
- Property catalogue combines building names, client-linked properties, and standalone units.
- XLSX export exists for clients and leads.
- Print-friendly PDF export exists for client summaries and property sheets.
- Tasks can be created manually and from app context, and may use an AI parser endpoint when configured.

## Editing Guidance

- Prefer minimal, surgical changes that fit the current standalone Angular style.
- Follow the existing signal-based patterns before introducing heavier reactive abstractions.
- Keep `snake_case` / `camelCase` conversions aligned with `case.utils.ts`.
- Reuse current helpers in `utils/` when possible instead of re-implementing export, filtering, or notes logic.
- Preserve mobile behavior when changing table or board UIs.

When changing forms, review both create and edit flows.

When changing client or lead fields, also review:

- models
- `create-modal`
- table / board / follow-up views as relevant
- dashboard-derived stats
- search / export helpers if applicable

When changing tasks, also review:

- `task-board`
- `task-modal`
- `related-tasks`
- `TaskService`
- `TaskParserService`
- `task.utils.ts`

When changing notes behavior, also review:

- `contact-notes`
- `row-detail`
- `contact-notes.utils.ts`

When changing copy, update both EN and RU strings in `TranslationService`.

## Preferred Workflow For Agents

1. Read the closest feature component and its backing service.
2. Check model shape and shared helpers before editing fields.
3. Preserve existing UX patterns unless the task explicitly asks for redesign.
4. Validate translations when adding user-facing copy.
5. Run relevant verification before finishing.

## Validation Checklist

Run from `realestate-app/` when relevant:

```bash
npm install
npm run build
npm run test
```

Before finishing, confirm:

1. The change works in both desktop and mobile flows if UI was touched.
2. New user-facing text exists in both English and Russian.
3. New env assumptions are documented.
4. Related create/edit/conversion flows still behave correctly.

## Notes For Future Agents

- Start in `realestate-app/`, not repo root.
- Do not assume README is fully up to date; prefer source files when in doubt.
- If `AGENTS.md` and source disagree, trust the source and update this file if the mismatch matters.
