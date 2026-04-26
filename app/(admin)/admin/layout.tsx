import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

export default function LegacyAdminLayout({
  children,
}: {
  children: ReactNode
}) {
  void children
  notFound()
}
