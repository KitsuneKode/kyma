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
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Templates</h1>
      {templates.map((template) => (
        <Link
          key={`${template.id}`}
          className="block rounded-xl border p-4 hover:bg-muted/30"
          href={`/admin/templates/${template.id}/edit`}
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
