# Agent Context

This repository contains a single frontend app in `realestate-app`.

If you are a new agent entering this codebase, start there. The repo root may also contain workflow or repo-level files, but the product code lives in `realestate-app/`.

## Project Summary

- App type: Angular 21 standalone application
- Domain: real estate CRM / backoffice
- Core areas: dashboard, clients, leads, property catalogue, units
- Data backend: Supabase
- Local persistence: `localStorage` for activity feed, `sessionStorage` for password gate session
- Localization: built-in English/Russian translation service

## Working Directory

Use `realestate-app` as the main app working directory for installs, builds, tests, and most code changes.

## Dev Commands

Run these from `realestate-app`:

```bash
npm install
npm run start
npm run build
npm run test
```

## App Architecture

### Shell

- Root component: `src/app/app.ts`
- Root template: `src/app/app.html`
- Tabs: `dashboard`, `clients`, `leads`, `properties`
- The app uses Angular signals heavily for local UI state.

### Main Components

- `src/app/components/dashboard/`: KPIs and recent activity
- `src/app/components/clients-table/`: client list and editing entry point
- `src/app/components/leads-table/`: lead list and conversion/editing entry point
- `src/app/components/property-catalogue/`: grouped building/unit view
- `src/app/components/create-modal/`: create/edit client or lead, including lead-to-client conversion
- `src/app/components/add-unit-modal/`: create/edit units
- `src/app/components/password-gate/`: simple password gate backed by `environment.appPassword`

### Services

- `ClientService`: loads and mutates `clients`
- `LeadService`: loads and mutates `leads`
- `UnitService`: loads and mutates `units`
- `BuildingService`: manages building names
- `AgencyService`: manages agency names
- `ActivityService`: writes recent activity to `localStorage`
- `TranslationService`: app copy and EN/RU toggle
- `SupabaseService`: safely initializes the Supabase client from environment values

### Models

- `Client`: contact + purchase/deal data
- `Lead`: prospect + follow-up data
- `Unit`: property inventory row, aligned closely with client property fields

## Data And Environment

Environment values are merged from `window.__env`:

- `supabaseUrl`
- `supabaseAnonKey`
- `appPassword`

Reference files:

- `src/environments/environment.ts`
- `public/env.local.example.js`

Important behavior:

- If Supabase credentials are placeholders or missing, `SupabaseService` returns `null`.
- In that state, data services surface `"Supabase not configured."` instead of loading records.
- The password gate compares the entered password against `environment.appPassword`.

## Backend Expectations

Supabase tables currently implied by the app:

- `clients`
- `leads`
- `units`
- `buildings`
- `agencies`

There are SQL files in `supabase/` for some schema pieces:

- `supabase/buildings.sql`
- `supabase/units.sql`

The services expect snake_case rows from Supabase and convert them to camelCase in the app using `case.utils.ts`.

## Product Behavior Notes

- Clients and leads are searchable from the app shell.
- Leads can be converted into clients through `CreateModal`.
- Dashboard metrics are derived client-side from loaded clients, leads, and activity entries.
- Property catalogue combines building names, client records, and standalone units into grouped property rows.
- XLSX export is available from the shell for clients and leads.
- Translation strings live in `TranslationService`; new user-facing copy should usually be added in both EN and RU.

## Editing Guidance For Agents

- Prefer minimal, surgical changes that preserve the current standalone Angular style.
- Follow existing signal-based patterns instead of introducing RxJS-heavy state unless there is a strong reason.
- Keep snake_case/camelCase conversions consistent with `case.utils.ts`.
- When changing forms, check both create and edit flows.
- When changing lead or client fields, also review:
  - models
  - create modal
  - table components
  - dashboard-derived stats
  - XLSX/search helpers if relevant
- When changing copy, update both EN and RU translations.

## Validation Checklist

Before finishing, when relevant:

1. Run `npm run build`.
2. Run `npm run test`.
3. Confirm any new env assumptions are documented.
4. Confirm changed UI text has translation coverage.

## Repo Notes

- Current repository root is lightweight; most meaningful changes should happen under `realestate-app/`.
- There may be unrelated repo-level files outside the app, so avoid broad assumptions from the root alone.
