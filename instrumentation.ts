export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }

  const { assertNextStartupEnv } = await import('@/lib/env/validate-startup')
  assertNextStartupEnv()
}
