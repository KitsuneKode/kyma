import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'

export default async function TemplatesPage() {
  const token = await getServerConvexAuthToken()
  const templates =
    clientEnv.NEXT_PUBLIC_CONVEX_URL && token
      ? await fetchQuery(
          api.admin.listActiveTemplates,
          {},
          { token: token ?? undefined }
        ).catch(() => [])
      : []
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Screening Templates
      </h1>
      {templates.map((template) => (
        <Link
          key={`${template.id}`}
          className="block rounded-2xl bg-card p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)] transition-colors hover:bg-muted/20"
          href={`/recruiter/templates/${template.id}/edit`}
        >
          <p className="font-medium">{template.name}</p>
          <p className="text-sm text-muted-foreground">
            {template.rubricVersion}
          </p>
        </Link>
      ))}
    </section>
  )
}
