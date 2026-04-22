import Link from 'next/link'
import type { Icon } from '@tabler/icons-react'
import { IconChevronRight } from '@tabler/icons-react'

import { LogoIcon } from '@/components/marketing/logo'

export type MarketingSocialProofProps = {
  title: string
  href: string
  icons: Icon[]
}

export function MarketingSocialProof({
  title,
  href,
  icons,
}: MarketingSocialProofProps) {
  return (
    <section className="bg-background pt-16 pb-16 md:pb-32">
      <div className="group relative m-auto max-w-5xl px-6">
        <div className="absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:scale-100 group-hover:opacity-100">
          <Link
            href={href}
            className="block text-sm duration-150 hover:opacity-75"
          >
            <span>{title}</span>
            <IconChevronRight className="ml-1 inline-block size-3" />
          </Link>
        </div>
        <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-x-12 gap-y-8 transition-[opacity,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] **:fill-foreground group-hover:opacity-50 group-hover:blur-xs sm:gap-x-16 sm:gap-y-14 md:grid-cols-4">
          {icons.map((IconComponent, index) => (
            <div key={index} className="flex items-center">
              <IconComponent
                className="mx-auto size-5 w-full text-foreground"
                stroke={1.8}
              />
            </div>
          ))}
          <div className="flex items-center">
            <LogoIcon className="mx-auto size-5 text-foreground" uniColor />
          </div>
        </div>
      </div>
    </section>
  )
}
