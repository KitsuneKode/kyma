# Implementation Log

## 2026-04-21

### Completed

- chose `LiveKit` as the default realtime provider path
- added shared interview domain modules for:
  - session lifecycle
  - preflight steps
  - transcript normalization
  - realtime provider contracts
- added initial `Convex` schema scaffold for templates, invites, sessions, events, transcripts, and reports
- added minimal route shells:
  - `/`
  - `/admin`
  - `/interviews/[inviteId]`
- added `TODO.md` to separate current work from future scope

### Current State

- UI is intentionally minimal
- realtime room creation is not wired yet
- Convex schema exists, but generated backend functions are not created yet
- candidate flow is a functional shell for session-state-first development

### Next Recommended Step

- wire `Convex` development setup and generated functions
- implement `LiveKit` token creation on the server
- persist lifecycle transitions instead of local-only state
