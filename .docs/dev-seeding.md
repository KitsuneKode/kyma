# Dev Seeding and Reset

Programmatic dev data setup is implemented with Convex actions + Faker.

## Commands

- Reset dev data only:
  - `bun run db:reset:dev`
- Reset + reseed dev data:
  - `bun run db:seed:dev`
- Seed with custom volume:
  - `bunx convex run devSeed:seedDevData '{"confirm":"SEED_DEV_ONLY","candidates":40,"recruiters":5}'`

## Safety guarantees

- Seed/reset actions are blocked when `NODE_ENV=production`.
- Reset requires explicit confirmation token.
- Seed requires explicit confirmation token and always performs a reset first.
- `clearTableChunk` and `seedData` are **internal mutations** only — not callable from clients. They also re-check `NODE_ENV !== production` inside the handler.

## Implemented Convex functions

- `devSeed.resetDevData` (action)
- `devSeed.seedDevData` (action)
- `devSeed.seedDevDataForActiveOrg` (action)
- `devSeedMutations.clearTableChunk` (internalMutation)
- `devSeedMutations.seedData` (internalMutation)

## What reset clears

All dev seed tables, including `users`, `organizations`, `orgMemberships`, `candidatePreferences`, and `candidateReadinessRuns`.

## What gets seeded

- Users: admin, recruiters, candidates
- Template + template version snapshot
- Screening batch, invites, eligibility
- Sessions, transcript segments, events
- Assessment reports, evidence, review decisions, notes, recruiter chat
- Workspace default model settings
- Audit seed marker event
