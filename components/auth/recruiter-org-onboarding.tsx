'use client'

import { useOrganizationList } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function RecruiterOrgOnboarding() {
  const router = useRouter()
  const { isLoaded, createOrganization, setActive, userMemberships } =
    useOrganizationList({
      userMemberships: { infinite: true },
    })
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isLoaded) {
    return (
      <p className="text-sm text-muted-foreground">Loading organizations...</p>
    )
  }

  const memberships = userMemberships.data ?? []

  function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Organization name is required.')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        if (!createOrganization) {
          setError('Organization creation is unavailable.')
          return
        }
        const organization = await createOrganization({
          name: trimmed,
          slug: slugify(trimmed) || undefined,
        })
        await setActive?.({ organization: organization.id })
        router.push('/recruiter')
        router.refresh()
      } catch (createError) {
        setError(
          createError instanceof Error
            ? createError.message
            : 'Unable to create organization.'
        )
      }
    })
  }

  function handleSelect(organizationId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await setActive?.({ organization: organizationId })
        router.push('/recruiter')
        router.refresh()
      } catch (selectError) {
        setError(
          selectError instanceof Error
            ? selectError.message
            : 'Unable to switch organization.'
        )
      }
    })
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleCreate}
        className="space-y-4 rounded-2xl border border-border/60 bg-muted/10 p-6"
      >
        <h2 className="text-lg font-medium">Create organization</h2>
        <p className="text-sm text-muted-foreground">
          Set up a workspace for your hiring team. You can invite members from
          Clerk after creation.
        </p>
        <label className="block space-y-2 text-sm">
          <span>Organization name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Acme Tutoring"
            className="w-full rounded-xl border border-border/60 bg-background px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating...' : 'Create organization'}
        </Button>
      </form>

      {memberships.length > 0 ? (
        <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/10 p-6">
          <h2 className="text-lg font-medium">Join an existing organization</h2>
          <ul className="space-y-2">
            {memberships.map((membership) => (
              <li key={membership.id}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  disabled={isPending}
                  onClick={() => handleSelect(membership.organization.id)}
                >
                  {membership.organization.name}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
