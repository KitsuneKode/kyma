export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-2xl items-center px-6 py-10">
      <section className="w-full animate-in rounded-3xl bg-card p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)] duration-300 fade-in-0 zoom-in-95">
        <h1 className="text-2xl font-semibold tracking-tight">Onboarding</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is pending role assignment. Contact an administrator.
        </p>
      </section>
    </main>
  )
}
