# Lifer Architecture

## Current Layers

```text
Pages / Components
        |
        v
Contexts (application state)
        |
        v
Application functions / repositories
        |
        v
Data types / external adapters
        |
        v
Browser APIs / Supabase / third-party APIs
```

- `src/pages` and `src/components`: rendering and user interaction.
- `src/contexts`: profile, life-list, and trip state plus state operations.
- `src/application`: orchestration for CSV imports, destination search, and eBird hotspot loading.
- `src/repositories`: persistence and database access.
- `src/data`: domain types and seed data; external provider modules remain adapters.
- `src/lib`: shared infrastructure clients such as Supabase.

## Dependency Rules

- Pages and components should not access `localStorage`, Supabase, or raw HTTP APIs.
- Contexts should coordinate state, not implement external API or storage mechanics.
- Repositories own persistence and database access.
- Application modules coordinate provider operations and domain behavior.
- Pure domain types should not depend on React or browser APIs.


## Other Remaining Work

- Add tests for profile validation, persistence migration, CSV parsing, route lookup, and provider state.
- Use authentication or server-controlled profile access before relying on Supabase as private user data storage. The current anonymous RLS policies deliberately allow shared demo access.
- Keep profile IDs and profile records synchronized rather than maintaining separate profile definitions.

## Refactor Changes

- Profile database access now goes through `src/repositories/profileRepository.ts`.
- Profile loading and local profile selection are coordinated by `CurrentUserContext`.
- Life-list and trip browser storage is isolated in `src/repositories/localStorageRepository.ts`.
- CSV, destination search, and eBird hotspot work is separated into `src/application`.
- Pages no longer contain direct database, `localStorage`, or provider HTTP calls.
- Destination routes now use the stable destination numeric ID instead of a name-derived slug.
