# Plan 003: Forms unification (recruiter)

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `.plans/implementation-wave/README.md`.
>
> **Drift check (run first)**: `git diff --stat e1fa1d1..HEAD -- components/admin/template-create-form.tsx components/admin/workspace-settings-forms.tsx components/admin/screening-creation-form.tsx app/(admin)/recruiter/templates/page.tsx`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: .plans/implementation-wave/001-recruiter-correctness.md
- **Category**: tech-debt
- **Planned at**: commit `e1fa1d1`, 2026-06-25

## Why this matters

Template and settings forms used raw HTML inputs while screening create was polished. Inconsistent forms and missing destructive confirmations feel unfinished.

## Current state

- `components/admin/template-create-form.tsx` — migrate to `Input`, `Label`, `Select`.
- `components/admin/workspace-settings-forms.tsx` — provider `Select`, `AlertDialog` for key removal.
- `components/admin/screening-creation-form.tsx` — remove artificial navigation delay.
- `app/(admin)/recruiter/templates/page.tsx` — parallel bootstrap + list; token shadows.

## Commands you will need

| Purpose   | Command             | Expected on success |
| --------- | ------------------- | ------------------- |
| Typecheck | `bun run typecheck` | exit 0              |
| Build     | `bun run build`     | exit 0              |

## Scope

**In scope**: template create, workspace settings provider fields, screening create delay, templates list styling, `components/ui/alert-dialog.tsx`, `components/ui/textarea.tsx`

**Out of scope**: Full template edit wizard rewrite, batch archive flows (not implemented yet).

## Steps

### Step 1: Template create form

Use shadcn `Label`/`Input`/`Select`; bounded role options.

### Step 2: Settings forms

Provider `Select` with known providers; `AlertDialog` before `removeProviderKey`.

### Step 3: Creation polish

Remove `setTimeout` delay in screening creation; parallel `Promise.all` bootstrap on templates page.

**Verify**: `bun run build` → exit 0

## Done criteria

- [x] No raw `<input className="border…">` on template create or provider row
- [x] Provider key removal requires confirmation
- [x] Screening create navigates immediately on success
- [x] `.plans/implementation-wave/README.md` row 003 = DONE

## STOP conditions

- `AlertDialog` primitives incompatible with `@base-ui/react` version
- Template mutation API shape differs from form fields

## Maintenance notes

- Add `AlertDialog` for batch/template archive when those mutations ship.
