# Kyma Workspace Design System

## Domain

Screening batches, invite tokens, session lifecycle, evidence-backed rubrics, release gates, recruiter decisions.

## Palette

- Background: parchment `#e9e4d8` (light), charcoal `#0a0a0a` (dark interview shell)
- Ink: `#1e1e1e` / `#e8e3da`
- Attention: amber (pending, manual review)
- Released / success: emerald
- Primary CTA: charcoal (light) / electric lime `#e8ff47` (dark)

## Signature

- Recruiter: evidence-backed review console with sticky decision bar
- Candidate: vertical timeline rail (Active → Pending release → Released)

## Depth

Ring-1 + tinted shadow from CSS tokens (`--shadow-sm`, `--shadow-md`). No hardcoded rgba shadow strings in workspace pages.

## Typography

- Sans: Outfit (`--font-sans`)
- Metrics / timestamps: IBM Plex Mono (`--font-mono`), `tabular-nums`

## Spacing

- Base unit: 8px
- Section gaps: `gap-8` / `gap-12`
- Workspace canvas: `max-w-7xl p-8` on muted background

## Components

Use `components/workspace/` primitives:

- `WorkspacePageHeader` — eyebrow + title + description
- `WorkspaceSurface` — elevated cards
- `StatusBadge` — shared session/report states
- `WorkspaceEmptyState` — empty and error panels

## Shells

- Recruiter: sidebar + sticky org header (`app/(admin)/layout.tsx`)
- Candidate: sidebar + sticky portal header (`app/(app)/candidate/layout.tsx`)
