# TODO

## Right Now

- [ ] set `CLERK_FRONTEND_API_URL` and rerun `npx convex dev --once`
- [ ] create `LiveKit` server token creation path
- [ ] create candidate invite creation flow
- [ ] build bare candidate interview join page
- [ ] connect live session events to persisted session lifecycle
- [ ] persist transcript chunks and final transcript snapshots

## Next

- [ ] implement post-call assessment generation with `Inngest`
- [ ] add rubric report persistence
- [ ] build admin review list and session detail pages
- [ ] add transcript quality flags and manual-review states

## Future Scope

- [ ] weak-student mode within the interviewer
- [ ] separate student agent joining the room
- [ ] recruiter live observer mode
- [ ] telephony entry path
- [ ] richer analytics and charting
- [ ] replay tools and report regeneration

## Hard Constraints

- performance first
- reliability first
- correctness over convenience
- no browser Web Speech as the primary production architecture
- no UI polish detours before the realtime loop is stable

## Safe Parallel Work

- recruiter dashboard shell on mock data
- report schema and rubric JSON contract
- candidate invite creation UI
- session timeline and transcript viewer components
- Inngest job design and report pipeline docs
