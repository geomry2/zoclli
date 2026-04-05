# Architecture Review

## Overview

The app is a single Angular SPA that uses standalone components and Angular signals for state.
The root `App` component orchestrates tab selection, search, modal state, editing/conversion flows,
and CSV export.

Data access is handled by service singletons (`ClientService`, `LeadService`, `BuildingService`,
`AgencyService`) backed by a shared Supabase client (`SupabaseService`).

## Strengths

- Clear separation between UI components and persistence services.
- Modern Angular patterns (standalone components + signals + computed state).
- Lightweight implementation with straightforward CRUD flows.

## Downsides

1. **Root-component orchestration bottleneck**
   - `App` owns many cross-cutting responsibilities, increasing coupling and reducing maintainability.

2. **Business logic in UI component**
   - `CreateModal` includes normalization, duplicate detection, validation, and persistence orchestration,
     making domain rules harder to reuse and test independently.

3. **Scalability/performance concerns for larger datasets**
   - Repeated array scans and full-object text search in computed values can become expensive as data grows.

4. **Weak transactional consistency across related writes**
   - Multi-entity save paths (e.g., ensure building/agency + client save) are not transactional.

5. **Inconsistent mutation error handling**
   - Some write flows do not check or surface all backend errors consistently.

6. **Client-side-only password gating**
   - Current password gate is UI/session-storage based and not robust security.

7. **No route-level feature boundaries**
   - Tab-based view switching in a single shell limits deep-linking and feature isolation as the app scales.

## Recommendations

- Extract validation/normalization into domain services.
- Introduce route-level feature separation.
- Standardize error handling and observability for all writes.
- Adopt real authentication/authorization.
- Add server-side filtering/aggregation where data volume is expected to grow.
