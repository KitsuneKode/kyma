'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'motion/react'

import { Button } from '@/components/ui/button'
import { useMotionPreset } from '@/lib/motion/use-motion'

export type MarketingHeroMainProps = {
  eyebrow: string
  title: string
  subtitle: string
  primaryCta: { label: string; href: string }
  secondaryCta: { label: string; href: string }
  showcaseVideoSrc?: string
  showcasePosterSrc?: string
  showcaseDarkSrc: string
  showcaseLightSrc: string
}

export function MarketingHeroMain({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  showcaseVideoSrc,
  showcasePosterSrc,
  showcaseDarkSrc,
  showcaseLightSrc,
}: MarketingHeroMainProps) {
  const enterMotion = useMotionPreset('enter')

  return (
    <section className="relative pt-32 pb-16 md:pt-40 md:pb-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <motion.div {...enterMotion}>
            <span className="inline-flex rounded-full border bg-muted/60 px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {eyebrow}
            </span>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
              {title}
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
              {subtitle}
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-[calc(var(--radius-xl)+0.125rem)] border bg-foreground/10 p-0.5">
                <Button
                  size="lg"
                  className="rounded-xl px-5 text-base"
                  render={<Link href={primaryCta.href} />}
                  nativeButton={false}
                >
                  {primaryCta.label}
                </Button>
              </div>
              <Button
                size="lg"
                variant="ghost"
                className="h-10.5 rounded-xl px-5"
                render={<Link href={secondaryCta.href} />}
                nativeButton={false}
              >
                {secondaryCta.label}
              </Button>
            </div>
          </motion.div>

          <motion.div
            {...enterMotion}
            transition={{ ...enterMotion.transition, delay: 0.1 }}
          >
            <div className="relative overflow-hidden rounded-2xl bg-card shadow-lg ring-1 ring-border/20">
              {showcaseVideoSrc ? (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster={showcasePosterSrc}
                  className="aspect-video w-full rounded-2xl object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                >
                  <source src={showcaseVideoSrc} type="video/mp4" />
                </video>
              ) : (
                <>
                  <Image
                    className="relative hidden aspect-video w-full rounded-2xl object-cover outline outline-1 -outline-offset-1 outline-white/10 dark:block"
                    src={showcaseDarkSrc}
                    alt="Kyma interview interface"
                    width={1440}
                    height={810}
                    priority
                  />
                  <Image
                    className="relative aspect-video w-full rounded-2xl object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:hidden"
                    src={showcaseLightSrc}
                    alt="Kyma interview interface"
                    width={1440}
                    height={810}
                    priority
                  />
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
