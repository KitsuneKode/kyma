# Candidate Portal Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken and misleading UX across the candidate portal and fix two minor recruiter-side issues (radar domain, `window.close()`), so the app is demonstrable end-to-end.

**Architecture:** Issues are spread across one Convex query, two candidate page components, one shared component, one layout, and two small recruiter-side fixes. Tasks are ordered by dependency — the Convex query update must land before the card component fix.

**Tech Stack:** Next.js 15 App Router, Convex, TypeScript, shadcn/ui, `next/navigation`. Typecheck: `bun run typecheck`. Format + lint: `bun run fmt && bun run lint`.

---

## File Map

| Action | File                                           | Purpose                                                |
| ------ | ---------------------------------------------- | ------------------------------------------------------ |
| Modify | `convex/interviews.ts`                         | Add `templateName` to `listCandidateInterviews` return |
| Modify | `components/candidate/interview-card.tsx`      | Fix title, button logic, status badge colours          |
| Modify | `app/(app)/candidate/interviews/[id]/page.tsx` | Replace dev scaffold with real candidate result view   |
| Modify | `app/(app)/candidate/layout.tsx`               | Add active state to nav links                          |
| Modify | `components/interview/interview-workspace.tsx` | Replace `window.close()` with `router.push('/')`       |
| Modify | `components/recruiter/rubric-radar.tsx`        | Add `domain={[0, 5]}` to Radar                         |
| Modify | `app/(app)/onboarding/page.tsx`                | Replace raw `<button>` with design system `<Button>`   |
| Modify | `app/(app)/write-up/page.tsx`                  | Add try/catch for missing `WRITE_UP.md`                |

---

## Task 1: Add `templateName` to `listCandidateInterviews`

**Files:**

- Modify: `convex/interviews.ts` — `listCandidateInterviews` query (around line 994)

The query currently returns `candidateName` (the candidate's own name from the invite) but no `templateName`. Read `convex/schema.ts` to find the field on the invite document that references the template (likely `templateId` or `screeningTemplateId`). Then look up the template and include its name.

- [ ] **Step 1: Read the schema to find template reference on invite**

```bash
grep -n "templateId\|screeningTemplate\|template" /home/kitsunekode/Projects/assignments/kyma/convex/schema.ts | head -30
```

Identify the field name on the invite table that references the template.

- [ ] **Step 2: Update `listCandidateInterviews` to include `templateName`**

Inside the `sessions.map(async (session) => { ... })` callback, after fetching `invite`, also fetch the template. The return object should add `templateName`. Exact field names depend on what Step 1 reveals, but the pattern is:

```ts
const template = invite?.templateId ? await ctx.db.get(invite.templateId) : null
return {
  sessionId: session._id,
  inviteToken: invite?.inviteToken,
  candidateName: invite?.candidateName,
  templateName: template?.name ?? 'Interview', // ← add this
  status: session.state,
  inviteStatus: invite?.status,
  startedAt: session.startedAt,
  endedAt: session.endedAt,
  reportStatus: report?.status,
  recommendation: report?.overallRecommendation,
  released: report?.released ?? false,
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /home/kitsunekode/Projects/assignments/kyma && bun run typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add convex/interviews.ts
git commit -m "feat(convex): add templateName to listCandidateInterviews"
```

---

## Task 2: Fix `CandidateInterviewCard` — title, buttons, badge

**Files:**

- Modify: `components/candidate/interview-card.tsx`

Three problems to fix at once:

1. **Title**: use `templateName` instead of `title` (which was `candidateName`)
2. **Buttons**: "View result" must not show for active/live sessions; "Join" must be the primary CTA when active
3. **Status badge**: recommendation values (`strong_yes`, `yes`, `mixed`, `no`) must map to correct colours — currently "no" shows green

- [ ] **Step 1: Update the props type and fix the component**

Replace the entire file content with:

```tsx
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Surface } from '@/components/ui/surface'
import {
  formatRecommendationLabel,
  formatStatusLabel,
} from '@/lib/recruiter/format'

type CandidateInterviewCardProps = {
  sessionId: string
  templateName: string
  status: string
  startedAt?: string
  inviteToken?: string
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase()
  if (
    s === 'no' ||
    s.includes('fail') ||
    s.includes('expired') ||
    s.includes('reject')
  ) {
    return 'bg-red-500/15 text-red-400'
  }
  if (
    s === 'mixed' ||
    s.includes('pending') ||
    s.includes('processing') ||
    s.includes('manual_review') ||
    s.includes('interrupted')
  ) {
    return 'bg-amber-500/15 text-amber-400'
  }
  return 'bg-emerald-500/15 text-emerald-400'
}

function displayLabel(status: string) {
  // Recommendation values need their own formatter
  if (['strong_yes', 'yes', 'mixed', 'no'].includes(status)) {
    return formatRecommendationLabel(status)
  }
  return formatStatusLabel(status)
}

const ACTIVE_STATES = [
  'ready',
  'connecting',
  'live',
  'reconnecting',
  'interrupted',
]

export function CandidateInterviewCard(props: CandidateInterviewCardProps) {
  const normalizedStatus = props.status.toLowerCase()
  const isActive = ACTIVE_STATES.some((state) =>
    normalizedStatus.includes(state)
  )
  const isProcessing = normalizedStatus.includes('processing')

  return (
    <Surface
      elevation="raised"
      interactive
      padding="lg"
      className="transition-transform duration-150 ease-out hover:-translate-y-px"
    >
      <h3 className="text-base font-semibold">{props.templateName}</h3>
      <div className="mt-3">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${statusBadgeClass(props.status)}`}
        >
          {displayLabel(props.status)}
        </span>
      </div>
      {props.startedAt ? (
        <p className="mt-3 text-sm text-muted-foreground tabular-nums">
          Started: {new Date(props.startedAt).toLocaleString()}
        </p>
      ) : null}
      <div className="mt-4 flex gap-3">
        {isActive && props.inviteToken ? (
          <Button
            nativeButton={false}
            size="sm"
            className="active:scale-[0.96]"
            render={<Link href={`/interviews/${props.inviteToken}`} />}
          >
            Join interview
          </Button>
        ) : isProcessing ? (
          <Button size="sm" disabled className="active:scale-[0.96]">
            Processing…
          </Button>
        ) : (
          <Button
            nativeButton={false}
            size="sm"
            className="active:scale-[0.96]"
            render={<Link href={`/candidate/interviews/${props.sessionId}`} />}
          >
            View result
          </Button>
        )}
      </div>
    </Surface>
  )
}
```

- [ ] **Step 2: Update callers — `app/(app)/candidate/page.tsx`**

Find every `<CandidateInterviewCard` usage in this file and replace `title={item.candidateName ?? 'Interview'}` with `templateName={item.templateName ?? 'Interview'}`. Also remove the `inviteToken` and `status` forwarding that now goes through the simplified component.

The three card call sites look like:

```tsx
<CandidateInterviewCard
  sessionId={`${item.sessionId}`}
  templateName={item.templateName ?? 'Interview'}
  status={item.status}
  startedAt={item.startedAt}
  inviteToken={item.inviteToken}
/>
```

Note: the `pendingRelease` section previously passed `status={item.reportStatus ?? item.status}` and the `released` section also used `reportStatus`. Keep this logic: pass `status={item.reportStatus ?? item.status}` for pendingRelease and released items, `status={item.status}` for active items.

- [ ] **Step 3: Update caller — `app/(app)/candidate/interviews/page.tsx`**

Same replacement: `title` → `templateName`, use `item.templateName ?? 'Interview'`.

- [ ] **Step 4: Typecheck**

```bash
cd /home/kitsunekode/Projects/assignments/kyma && bun run typecheck
```

Expected: clean. The new `templateName` field from Task 1 should now resolve.

- [ ] **Step 5: Format and lint**

```bash
cd /home/kitsunekode/Projects/assignments/kyma && bun run fmt && bun run lint
```

- [ ] **Step 6: Commit**

```bash
git add components/candidate/interview-card.tsx app/(app)/candidate/page.tsx app/(app)/candidate/interviews/page.tsx
git commit -m "fix(candidate): fix interview card title, button logic, and status badge colours"
```

---

## Task 3: Replace candidate result page dev scaffold

**Files:**

- Modify: `app/(app)/candidate/interviews/[id]/page.tsx`

Currently shows raw `result.state`, raw `result.resultState`, raw `"Recommendation: strong_yes"`, and a full transcript dump unconditionally. Replace with a real state-gated view.

- [ ] **Step 1: Rewrite the page**

```tsx
import { fetchQuery } from 'convex/nextjs'
import type { Id } from '@/convex/_generated/dataModel'
import Link from 'next/link'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'
import {
  formatDateTime,
  formatRecommendationLabel,
  formatStatusLabel,
} from '@/lib/recruiter/format'

type InterviewResultPageProps = {
  params: Promise<{ id: string }>
}

export default async function CandidateInterviewResultPage({
  params,
}: InterviewResultPageProps) {
  const { id } = await params
  const token = await getServerConvexAuthToken()
  const result =
    clientEnv.NEXT_PUBLIC_CONVEX_URL && token
      ? await fetchQuery(
          api.interviews.getCandidateInterviewResult,
          { sessionId: id as Id<'interviewSessions'> },
          { token: token ?? undefined }
        ).catch(() => null)
      : null

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Interview result</h1>
        <Button
          nativeButton={false}
          variant="outline"
          size="sm"
          render={<Link href="/candidate/interviews" />}
        >
          Back to interviews
        </Button>
      </header>

      {!result ? (
        <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.2)]">
          This result could not be loaded. Please try again or contact support.
        </p>
      ) : result.resultState === 'processing' ? (
        <div className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.2)]">
          <p className="text-sm font-medium text-amber-400">Processing</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your interview is being reviewed. This usually takes a few minutes.
            Check back shortly.
          </p>
        </div>
      ) : result.resultState === 'under_review' ? (
        <div className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.2)]">
          <p className="text-sm font-medium text-muted-foreground">
            Under review
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your report is being reviewed by the recruiting team. You will be
            notified when a decision is ready.
          </p>
        </div>
      ) : result.resultState === 'released' && result.report ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.2)]">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Outcome
            </p>
            <p className="mt-2 text-lg font-semibold">
              {formatRecommendationLabel(result.report.recommendation)}
            </p>
            {result.report.summary ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {result.report.summary}
              </p>
            ) : null}
            {result.report.generatedAt ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Report generated {formatDateTime(result.report.generatedAt)}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.2)]">
          <p className="text-sm text-muted-foreground">
            No result is available for this interview yet.
          </p>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/kitsunekode/Projects/assignments/kyma && bun run typecheck
```

Expected: clean.

- [ ] **Step 3: Format and lint**

```bash
cd /home/kitsunekode/Projects/assignments/kyma && bun run fmt && bun run lint
```

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/candidate/interviews/[id]/page.tsx"
git commit -m "fix(candidate): replace dev scaffold result page with real candidate view"
```

---

## Task 4: Add active state to candidate nav

**Files:**

- Modify: `app/(app)/candidate/layout.tsx`

The current nav is bare `<Link>` tags with no highlight on the current route. Add active state using `usePathname`.

- [ ] **Step 1: Convert layout to accept `children` as before but use a client nav component**

Create a small client nav component inline in the layout file (or split to `components/candidate/candidate-nav.tsx` — your choice). The layout itself must stay a server component, so extract only the nav part as `'use client'`.

Add a new file `components/candidate/candidate-nav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/candidate', label: 'Overview', exact: true },
  { href: '/candidate/interviews', label: 'Interviews', exact: false },
  { href: '/candidate/readiness', label: 'Readiness', exact: false },
  { href: '/candidate/profile', label: 'Profile', exact: false },
]

export function CandidateNav() {
  const pathname = usePathname()

  return (
    <nav className="mb-6 flex flex-wrap gap-4 text-sm">
      {NAV_LINKS.map(({ href, label, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'transition-colors',
              isActive
                ? 'font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Update `app/(app)/candidate/layout.tsx` to use `CandidateNav`**

```tsx
import type { ReactNode } from 'react'
import { connection } from 'next/server'

import { requireCandidatePageAccess } from '@/lib/auth/access'
import { CandidateNav } from '@/components/candidate/candidate-nav'

export default async function CandidateLayout({
  children,
}: {
  children: ReactNode
}) {
  await connection()
  await requireCandidatePageAccess()

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <CandidateNav />
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /home/kitsunekode/Projects/assignments/kyma && bun run typecheck
```

- [ ] **Step 4: Format and lint**

```bash
cd /home/kitsunekode/Projects/assignments/kyma && bun run fmt && bun run lint
```

- [ ] **Step 5: Commit**

```bash
git add components/candidate/candidate-nav.tsx "app/(app)/candidate/layout.tsx"
git commit -m "fix(candidate): add active state to candidate nav"
```

---

## Task 5: Fix `window.close()` on processing screen

**Files:**

- Modify: `components/interview/interview-workspace.tsx`

The "Return Home" button calls `window.close()` which silently no-ops when the user navigated directly. Replace with `router.push('/')`.

- [ ] **Step 1: Add `useRouter` import and replace `window.close()`**

At the top of `components/interview/interview-workspace.tsx`, the file already imports from React. Add `useRouter` from `next/navigation`:

```tsx
import { useRouter } from 'next/navigation'
```

Inside `InterviewWorkspace`, add at the top of the component body:

```tsx
const router = useRouter()
```

Find the button in the processing view:

```tsx
<Button
  className="rounded-full bg-primary px-8 py-6 font-medium text-primary-foreground shadow-[0_0_0_1px_rgba(232,255,71,0.45),0_10px_30px_rgba(0,0,0,0.35)] transition-colors hover:bg-primary/90"
  onClick={() => window.close()}
>
  Return Home
</Button>
```

Replace the `onClick`:

```tsx
onClick={() => router.push('/')}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/kitsunekode/Projects/assignments/kyma && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add components/interview/interview-workspace.tsx
git commit -m "fix(interview): replace window.close() with router.push on processing screen"
```

---

## Task 6: Set radar chart domain to [0, 5]

**Files:**

- Modify: `components/recruiter/rubric-radar.tsx`

Without a fixed domain, recharts auto-scales. A candidate scoring 2–3 everywhere fills the radar the same way as a 4–5 candidate. Fix: add `domain={[0, 5]}` to the `Radar` component.

- [ ] **Step 1: Add domain prop**

In `components/recruiter/rubric-radar.tsx`, find the `<Radar` element and add `domain`:

```tsx
<Radar
  name="Score"
  dataKey="score"
  domain={[0, 5]}
  stroke="hsl(var(--primary))"
  fill="hsl(var(--primary))"
  fillOpacity={0.15}
  strokeWidth={1.5}
  dot={false}
/>
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/kitsunekode/Projects/assignments/kyma && bun run typecheck
```

If recharts types don't accept `domain` on `<Radar>` (it lives on the axis, not the series in some versions), add it to `PolarAngleAxis` instead:

```tsx
<PolarAngleAxis
  dataKey="label"
  domain={[0, 5]}
  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 }}
/>
```

Or if neither accepts it directly, wrap with a `<RadarChart domain={[0,5]}>` — check the recharts v3 API via Context7 if needed.

- [ ] **Step 3: Commit**

```bash
git add components/recruiter/rubric-radar.tsx
git commit -m "fix(rubric): set radar chart domain to 0-5 to prevent misleading auto-scaling"
```

---

## Task 7: Fix onboarding page button styling

**Files:**

- Modify: `app/(app)/onboarding/page.tsx`

The three `choosePersona` forms use raw `<button className="mt-4 inline-flex h-10 ...">` instead of the design system `<Button>`. Replace them.

- [ ] **Step 1: Add Button import and replace raw buttons**

Add import at the top:

```tsx
import { Button } from '@/components/ui/button'
```

Replace each raw button in the three forms with:

```tsx
<Button type="submit" className="mt-4 w-full">
  Continue as candidate
</Button>
```

```tsx
<Button type="submit" className="mt-4 w-full">
  Continue as recruiter
</Button>
```

```tsx
<Button type="submit" className="mt-4 w-full">
  Continue with both
</Button>
```

- [ ] **Step 2: Typecheck + format**

```bash
cd /home/kitsunekode/Projects/assignments/kyma && bun run typecheck && bun run fmt && bun run lint
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/onboarding/page.tsx"
git commit -m "fix(onboarding): replace raw buttons with design system Button component"
```

---

## Task 8: Add error handling to write-up page

**Files:**

- Modify: `app/(app)/write-up/page.tsx`

`fs.readFile` with no try/catch crashes with a 500 if `WRITE_UP.md` is absent.

- [ ] **Step 1: Wrap in try/catch**

```tsx
async function readWriteUp(): Promise<string | null> {
  try {
    const filePath = path.join(process.cwd(), 'WRITE_UP.md')
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}
```

In the component, handle the null case:

```tsx
const content = await readWriteUp()

// ...in the JSX:
{
  content ? (
    <article className="mt-6 rounded-2xl border bg-card p-6 shadow-sm md:p-8">
      <pre className="overflow-x-auto text-sm leading-7 whitespace-pre-wrap">
        {content}
      </pre>
    </article>
  ) : (
    <p className="mt-6 text-sm text-muted-foreground">
      Write-up document is not available in this environment.
    </p>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/kitsunekode/Projects/assignments/kyma && bun run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/write-up/page.tsx"
git commit -m "fix(write-up): handle missing WRITE_UP.md gracefully"
```

---

## Self-Review

- [x] All 8 issues from the audit are covered by a task.
- [x] Task ordering: Convex query (T1) → card component (T2) — `templateName` is available before the card is updated.
- [x] `formatRecommendationLabel` and `formatStatusLabel` are imported from the existing `lib/recruiter/format.ts` (confirmed to export both).
- [x] `domain` prop on radar: marked as conditional in T6 — implementer should verify recharts v3 API location for domain.
- [x] No placeholder steps — every step has the actual code.
- [x] `getCandidateInterviewResult` already returns `resultState` as a discriminated union (`'processing' | 'under_review' | 'released' | 'unavailable'`) — T3's switch on this is correct.
- [x] Transcript not shown in T3's rewrite — removed from the candidate result page intentionally (it was a dev leak, not a product feature).
