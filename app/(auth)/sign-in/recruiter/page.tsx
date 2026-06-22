import { renderIntentAuthPage } from '@/lib/auth/intent-auth-page'

type PageProps = {
  searchParams: Promise<{ redirect_url?: string | string[] }>
}

export default async function SignInRecruiterPage({ searchParams }: PageProps) {
  const params = await searchParams
  return renderIntentAuthPage('sign-in', 'recruiter', params)
}
