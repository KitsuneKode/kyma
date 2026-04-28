# Theme Role Matrix

This matrix defines semantic color-role intent across light and dark themes for non-immersive routes.

## Role Mapping

- `background`: page canvas and base app surface
- `card`: elevated containers, major panels, side sheets
- `popover`: floating overlays and contextual surfaces
- `foreground`: primary text and iconography
- `muted-foreground`: secondary/supporting text
- `border`: separators, strokes, card lines, input boundaries
- `ring`: focus and emphasis outlines
- `primary`: main call-to-action emphasis
- `primary-foreground`: text/icon on primary-filled controls
- `muted`: low-emphasis fills and neutral surfaces
- `accent`: optional neutral contrast surface
- `destructive`: error/critical status states

## Usage Rules

- Page wrappers use `bg-background`, not hardcoded black/white.
- Elevated containers use `bg-card` + `border-border/50` or `ring-border/50`.
- Primary copy uses `text-foreground`; supporting copy uses `text-muted-foreground`.
- Interactive overlays use tokenized translucency (`bg-background/70`, `bg-foreground/5`) instead of `black/xx` and `white/xx`.
- Primary CTAs use `bg-primary text-primary-foreground`; focus uses `ring-ring`.
- Inputs and textareas use `border-border` + tokenized background and readable placeholder contrast.

## Acceptance Criteria (Per Theme)

- `Contrast`: primary text and critical controls remain clearly legible.
- `Prominence`: primary CTA stands out from adjacent cards and metadata.
- `Parity`: hover, focus, active, disabled/loading all remain distinct.
- `Consistency`: same semantic role means same intent in both themes.
- `Isolation`: dark-locked immersive routes are explicitly excluded and documented.

## Dark-Locked Exceptions

- `app/interviews/[inviteId]/page.tsx`
- `components/interview/meeting-shell.tsx`
- `components/interview/interview-workspace.tsx`
- `components/interview/invite-lobby.tsx`
