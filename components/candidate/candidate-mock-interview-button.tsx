'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'

export function CandidateMockInterviewButton() {
  return (
    <Button
      type="button"
      variant="ghost"
      nativeButton={false}
      render={<Link href="/candidate/practice" />}
    >
      Try a practice interview
    </Button>
  )
}
