import { Button } from '@/components/ui/button'
import {
  IconCheck,
  IconClock,
  IconBrain,
  IconMicrophone,
  IconShieldCheck,
  IconPlayerPlay,
} from '@tabler/icons-react'

export default function CandidateDashboard() {
  return (
    <>
      <div className="mb-10">
        <h1 className="font-serif text-4xl font-medium tracking-tight text-foreground md:text-5xl">
          Welcome back, Aarav
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Review your completed interviews and upcoming screening requests.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Completed Interview Report */}
          <section className="overflow-hidden rounded-[2rem] bg-card p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] ring-1 ring-border/50">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-emerald-600 uppercase">
                  <IconCheck className="size-3.5" />
                  Completed
                </span>
                <h2 className="mt-4 text-2xl font-bold tracking-tight">
                  Senior Math Tutor Screening
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Conducted on April 22, 2026
                </p>
              </div>
              <div className="flex size-16 flex-col items-center justify-center rounded-2xl bg-muted/30 ring-1 ring-border/50">
                <span className="text-2xl font-bold text-foreground">92</span>
                <span className="text-[10px] tracking-widest text-muted-foreground uppercase">
                  Score
                </span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl bg-muted/20 p-6 ring-1 ring-border/50">
                <h3 className="font-semibold text-foreground">
                  AI Feedback Summary
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground">
                  Aarav demonstrated exceptional clarity when explaining complex
                  calculus concepts. The candidate showed immense patience
                  during the simulated student misunderstanding and quickly
                  adapted their teaching method. The overall tone was warm and
                  highly encouraging.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-4 rounded-2xl bg-muted/10 p-5 ring-1 ring-border/30">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <IconBrain className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">
                      Concept Simplification
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Excellent. Broke down derivatives using relatable
                      analogies.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 rounded-2xl bg-muted/10 p-5 ring-1 ring-border/30">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <IconShieldCheck className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">
                      Student-Safe Judgment
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Strong. Navigated frustration with empathy and positive
                      reinforcement.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end border-t border-border/40 pt-6">
              <Button
                variant="outline"
                className="rounded-full px-6 transition-transform"
              >
                Download Full Report
              </Button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Upcoming Interviews */}
          <section className="rounded-3xl bg-card p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.05)] ring-1 ring-border/50">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                <IconClock className="size-5" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">
                Pending Invites
              </h3>
            </div>

            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-5 text-center transition-colors hover:bg-muted/20">
              <p className="text-sm font-medium text-foreground">
                Advanced Physics Tutor
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Expires in 3 days
              </p>
              <Button className="mt-4 w-full rounded-xl shadow-sm transition-transform">
                <IconPlayerPlay className="mr-2 size-4" />
                Start Interview
              </Button>
            </div>
          </section>

          {/* System Check */}
          <section className="rounded-3xl bg-card p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.05)] ring-1 ring-border/50">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <IconMicrophone className="size-5" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">
                Setup Check
              </h3>
            </div>
            <p className="text-sm text-pretty text-muted-foreground">
              Test your camera, microphone, and internet connection before
              starting any live AI screenings.
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full rounded-xl transition-transform"
            >
              Run Diagnostics
            </Button>
          </section>
        </div>
      </div>
    </>
  )
}
