import Link from 'next/link'

import { TemplateCreateForm } from '@/components/admin/template-create-form'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'

export default function TemplateCreatePage() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-8">
      <PageHeader
        eyebrow="Template library"
        title="Create screening template"
        description="Add a new active template for screening batches in your organization."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/recruiter/templates" />}
          >
            Back to templates
          </Button>
        }
      />
      <TemplateCreateForm />
    </div>
  )
}
