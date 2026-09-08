# Production Qualification Follow-ups Plan

## PR 1: Correctness and CI

1. Add failing tests for deterministic recruiter time handling and consolidate
   the shared validation helper.
2. Add an authorization-boundary test, convert the action helper to
   `internalQuery`, and update action call sites.
3. Add a dispatcher regression test with more than 100 newer inactive batches;
   implement bounded cursor continuation and verify every active batch is
   eventually scheduled.
4. Refactor the Inngest assessment handler behind dependency injection, export
   its timeout constant, and test the failure-state step.
5. Replace tmux lifecycle management in the Convex integration harness with
   tracked child processes and a cleanup trap; run the real harness.
6. Define explicit scripts for deterministic CI coverage, integration coverage,
   and full local qualification. Update CI to run Knip and the real integration
   job without duplicating expensive gates unnecessarily.
7. Correct stale route and production-operation documentation.
8. Run format, focused tests, full unit tests, Knip, Convex generation,
   integration, typecheck, build, and E2E.
9. Run React Doctor changed-scope regression, commit, push, and open PR 1.

## PR 2: UI and accessibility

1. Add focused tests for the candidate-table action and key keyboard paths.
2. Fix confirmed accessible-name, hover-only, form-size, and motion findings.
3. Audit lobby, meeting, dashboard, chart, transcript, and review surfaces at
   mobile and desktop widths.
4. Add or strengthen Playwright coverage for the confirmed regressions.
5. Run React Doctor design and changed-scope scans, unit tests, E2E, typecheck,
   lint, and build.
6. Push and open PR 2, stacked on PR 1 only while required.

## Track 3: Provider evidence

1. Expand issue #31 into an owner/evidence matrix.
2. Execute the live-path runbook with a real invite and provider dashboards.
3. Record exact pass/fail evidence without secrets.
4. Keep failed or unavailable provider gates open; do not convert them into a
   release claim.
