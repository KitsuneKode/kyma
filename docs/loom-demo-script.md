# Loom demo script (2–5 minutes)

**Goal:** Show evaluators a clear path: **candidate experience → processing → recruiter review**, plus **one** architecture decision in plain language.

**Recording tips:** 1080p, system audio on if you show room audio; speak slowly; if login fails, say “I’m showing the unauthenticated path” and still show public invite flow.

---

## 0:00 – 0:20 — Hook

> “This is **Kyma** — an AI tutor screener. I’ll show a candidate completing a **voice** screening from a link, then how a **recruiter** reviews structured evidence and a recommendation — hosted at **kyma.kitsunelabs.xyz**.”

**Screen:** Landing or the public URL in the address bar (show domain clearly).

---

## 0:20 – 0:50 — The problem in one line

> “Hiring teams need to screen many tutor candidates for **soft skills** — clarity, patience, warmth — not just a quiz. Kyma automates a **short voice interview** and produces a **rubric with evidence** so humans can decide faster and more consistently.”

---

## 0:50 – 2:10 — Candidate flow (the core demo)

1. Open **`/interviews/demo-invite`** (or a real invite if you have one).
   > “Candidates don’t need an account — they get a **link**.”
2. Enter name (if required) → **PreJoin** (mic/camera).
   > “We use a real **WebRTC** stack for the room, not a fake chat box.”
3. **Join** the room.
   > “In production I’d have the **agent worker** running; here you can see the **session** and **transcript** updating when audio flows.”
4. **End / submit** the interview (or show the “processing” state if that’s the stable path in your env).
   > “Afterward the pipeline moves to **processing** and produces a **structured report** in the backend.”

_If the agent is not live:_

> “The platform is built for the **AI interviewer** to join the same **LiveKit** room; for this recording I’m focusing on the **room + data path** you can see without my full key setup.”

---

## 2:10 – 3:20 — Recruiter / reviewer flow

1. Open **`/admin/candidates`** (Clerk or your hosted auth as configured).
   > “Recruiters get a **queue** of sessions.”
2. Open **one session**.
   > “We store **transcript segments**, **session events**, and a **report** with **dimension scores** and **evidence quotes** — not a single vibe score.”
3. Show **notes** or **recruiter chat** (one question).
   > “Chat is **grounded** in what we already stored — the model can’t just invent a hire decision without context.”

---

## 3:20 – 4:00 — One smart technical choice

> “A tradeoff I made: **evidence-first scoring** with a **deterministic** first pass, so the output stays **reviewable** under hiring pressure. I can layer richer models later, but the **contract** is structured dimensions + snippets.”

Optional one-liner:

> “**Convex** is the app source of truth; **LiveKit** owns the meeting layer.”

---

## 4:00 – 4:30 — What’s next (credibility, not a wishlist)

> “With more time I’d add **deeper** conversational follow-ups, **org-wide** templates, and **operational** dashboards for webhooks and processing failures. The foundation here is the **durable** session and review loop.”

---

## 4:30 – 5:00 — Close

> “**Repo** is public; the **write-up** is in `WRITE_UP.md`. Thanks for watching.”

**Show:** `README` or `WRITE_UP.md` in the tab for 2 seconds, or the GitHub URL.

---

## Optional B-roll (if you have time)

- **`/admin/screenings/new`** — create a batch, show **policy** fields (template, duration, resume).
- **Expired / consumed** invite (if you can trigger safely) to show access control is intentional.

---

## If something breaks during recording

- Say: “I’m not going to debug live — the **intended** path is documented in the repo; here is what **does** work in this environment.”
- Show **static** pages: home, a candidate page, admin shell.
