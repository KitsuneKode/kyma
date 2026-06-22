import InterviewPage from '@/app/interviews/[inviteId]/page'

type ShortInvitePageProps = {
  params: Promise<{
    token: string
  }>
}

export default async function ShortInvitePage({
  params,
}: ShortInvitePageProps) {
  const { token } = await params
  return InterviewPage({ params: Promise.resolve({ inviteId: token }) })
}
