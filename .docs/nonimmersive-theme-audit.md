# Non-Immersive Theme Audit

Audit goal: find hardcoded/misaligned color-role usage across non-immersive app surfaces.

## Result

- No remaining hardcoded dark/light class issues were found in non-immersive `app/` and `components/` surfaces.
- Remaining hardcoded values are only present in explicitly exempt immersive interview routes/components.

## Remaining Matches (Intentional Exceptions)

- `app/interviews/[inviteId]/page.tsx`
- `components/interview/interview-workspace.tsx`
- `components/interview/meeting-shell.tsx`
- `components/interview/invite-lobby.tsx`

## Classification

- `role mismatch`: none found in non-immersive surfaces.
- `hardcoded value`: none found in non-immersive surfaces.
- `missing state parity`: pending manual interaction sweep (buttons/inputs/sheets/dialogs/toasts).
- `contrast inconsistency`: pending visual pass in both themes.
