import Link from 'next/link'
import type { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <nav className="mb-6 flex gap-4 text-sm">
        <Link href="/dashboard">Overview</Link>
        <Link href="/dashboard/interviews">Interviews</Link>
        <Link href="/dashboard/profile">Profile</Link>
      </nav>
      {children}
    </div>
  )
}
