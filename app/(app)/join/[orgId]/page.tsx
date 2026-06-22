import { JoinOrganizationClient } from '@/components/auth/join-organization-client'

type JoinOrganizationPageProps = {
  params: Promise<{
    orgId: string
  }>
}

export default async function JoinOrganizationPage({
  params,
}: JoinOrganizationPageProps) {
  const { orgId } = await params

  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-4xl items-center px-6 py-10">
      <JoinOrganizationClient orgId={orgId} />
    </main>
  )
}
