# Kyma UI/UX Redesign Plan v3: Premium Aesthetic & Flow

## Aesthetic Direction

We will adopt a **Refined Minimalism** aesthetic (inspired by Linear and Vercel), leveraging principles from `make-interfaces-feel-better` and `emil-design-eng`.

- **Surfaces:** Concentric border radii, optical alignment, and shadows over hard borders.
- **Motion:** Custom easing curves (`cubic-bezier(0.23, 1, 0.32, 1)`), 0.96 scale on press, stagger enter animations.
- **Typography:** `text-balance` for headings, antialiased font smoothing, tabular-nums for metrics.
- **Layouts:** Use spatial composition that feels intentional—either perfectly centered single-focus cards or distinct sidebar/main content splits.

---

## 1. Candidate Flow: Pre-Join (Invite Lobby)

**Current Problem:** Cluttered, reads like a form, split attention.
**Solution:** A highly polished **Refined Split Layout**.

```text
┌──────────────────────────────────────┬────────────────────┐
│                                      │                    │
│                                      │   [Kyma Logo]      │
│                                      │                    │
│                                      │   Acme Corp        │
│                                      │   Frontend Eng     │
│        [ Video Preview Area ]        │   Duration: ~18m   │
│                                      │                    │
│   (Mic) (Cam) (Device Settings)      │   [ JOIN CALL ]    │
│                                      │                    │
│                                      │   (Help tooltip)   │
│                                      │                    │
└──────────────────────────────────────┴────────────────────┘
```

_Design Notes:_

- Video on the left, sleek typography and core details on the right.
- Minimal visual noise; use typography and spacing to create hierarchy.
- Background: pure white/dark with very subtle grain or radial gradient behind the video element.
- Remove timeline and transcript entirely from this view.

---

## 2. Candidate Flow: Live Meeting

**Current Problem:** Confined within a card with lots of explanatory text above it. Feels like a widget instead of an immersive call.
**Solution:** A true **100dvh Fullscreen** edge-to-edge experience.

```text
┌───────────────────────────────────────────────────────────┐
│ [Acme Corp]                                  [00:15:20]   │
│                                                           │
│                                                           │
│                 [ INTERVIEWER VIDEO / AI AVATAR ]         │
│                                                           │
│                                                           │
│                                                           │
│                                                           │
│           ┌───────────────────────────────────┐           │
│           │ (Mic)  (Cam)  (Share)  [SUBMIT & LEAVE]       │           │
│           └───────────────────────────────────┘           │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

_Design Notes:_

- The text explaining "Submit the interview when..." is removed. The "Submit & Leave" button is prominent and explicit.
- Full use of browser viewport (`100dvh`).
- Bottom controls float over the video.

---

## 3. Recruiter Flow: Dashboard & Layout

**Current Problem:** Missing sidebar, navigation is clunky, doesn't feel like a professional workspace.
**Solution:** Introduce a **Permanent Sidebar** (Linear-style) with structured navigation.

```text
┌──────────────┬────────────────────────────────────────────┐
│ [Kyma]       │  Overview                                  │
│              │                                            │
│ Candidates   │  [Metric: 12 Pending]  [Metric: 5 Reviewed]│
│ Screenings   │                                            │
│ Templates    │  Recent Candidates                         │
│              │  ┌──────────────────────────────────────┐  │
│ Settings     │  │ Alice Smith   | Frontend | 95% Match │  │
│              │  │ Bob Jones     | Backend  | 80% Match │  │
│              │  └──────────────────────────────────────┘  │
│              │                                            │
│ [User Info]  │                                            │
└──────────────┴────────────────────────────────────────────┘
```

_Design Notes:_

- Sidebar uses a darker or extremely subtle gray (`bg-muted/30`) to visually separate from the main workspace.
- The main table uses Shadcn `DataTable` with tabular numbers and clean, borderless rows separated by subtle 1px inner shadows.

---

## 4. Post-Meeting / Success Screen

**Current Problem:** Generic loading skeleton, lack of premium feedback.
**Solution:** A celebratory, polished transition.

```text
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                      [ Check Icon ]                       │
│                                                           │
│               Interview Submitted Successfully            │
│                                                           │
│        The team will review the conversation and          │
│        follow up with you shortly. You can now close      │
│        this window.                                       │
│                                                           │
│                   [ Return to Dashboard ]                 │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

_Design Notes:_

- Staggered enter animation for the icon, title, and paragraph.
- Use `clip-path` reveals or subtle `scale(0.95)` to `scale(1)` fade-in for the success container.

---

## 5. Candidate Dashboard Architecture

**Current Problem:** No unified place for candidates to see past/upcoming sessions.
**Solution:** Introduce an authenticated Candidate Dashboard (planned for a separate pass).

_Design Notes:_

- We will support a full login/auth flow for candidates so they can track their application status, view upcoming interview dates, and access magic links.
- Magic link flow will remain seamless (bypassing mandatory auth for one-off joins if needed), but logging in connects the session to their unified profile.
