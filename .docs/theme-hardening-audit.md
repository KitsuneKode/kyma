# Theme Hardening Audit

This audit tracks hardcoded color usage that blocks dark/light parity and maps each pattern to semantic token classes.

## Hardcoded Pattern -> Token Mapping

- `bg-[#0a0a0a]`, `bg-[#000]` -> `bg-background` (page sections) or `bg-card` (elevated panels)
- `text-white` -> `text-foreground`
- `text-white/60`, `text-white/40` -> `text-muted-foreground` / `text-foreground/70`
- `bg-white/5`, `bg-white/10` -> `bg-foreground/5`, `bg-foreground/10` (or `bg-muted/*` by intent)
- `border-white/10`, `ring-white/10` -> `border-border/50`, `ring-border/50`
- `bg-black/40`, `bg-black/50` overlays -> `bg-background/70` or `bg-foreground/20`
- `zinc-*` fallbacks in UI primitives -> `foreground`, `muted-foreground`, `border`, `ring`

## Priority Files

- `app/(marketing)/page.tsx`
- `app/layout.tsx`
- `app/(auth)/layout.tsx`
- `app/not-found.tsx`
- `app/globals.css`
- `components/marketing/hero-premium.tsx`
- `components/marketing/sections/how-it-works.tsx`
- `components/marketing/sections/role-pathways.tsx`
- `components/marketing/sections/system-credibility.tsx`
- `components/ui/dialog.tsx`
- `components/ui/sheet.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/slider.tsx`
- `components/recruiter/recruiter-chat.tsx`
- `components/recruiter/premium-dashboard.tsx`
- `components/admin/app-sidebar.tsx`
- `components/admin/billboard-metric.tsx`

## Intentional Exception

- Interview/live-call immersive surfaces remain dark-locked for phase 1:
  - `app/interviews/[inviteId]/page.tsx`
  - `components/interview/meeting-shell.tsx`
