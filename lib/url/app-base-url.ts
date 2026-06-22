import { headers } from 'next/headers'

import { clientEnv } from '@/lib/env/client'
import { serverEnv } from '@/lib/env/server'

/**
 * Best-effort absolute origin for invite links and Clerk redirect URLs.
 */
export async function getAppBaseUrl(): Promise<string> {
  const configured = clientEnv.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) {
    return configured.replace(/\/$/, '')
  }

  const vercel = serverEnv.VERCEL_URL?.trim()
  if (vercel) {
    return `https://${vercel}`
  }

  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host')
  const protocol = headerList.get('x-forwarded-proto') ?? 'http'
  if (host) {
    return `${protocol}://${host}`
  }

  return 'http://localhost:3000'
}
