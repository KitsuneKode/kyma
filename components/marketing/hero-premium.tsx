'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  IconMicrophone,
  IconShieldCheck,
  IconBrain,
  IconClockPlay,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { TextEffect } from '@/components/ui/text-effect'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { type Variants } from 'motion/react'

const transitionVariants: { item: Variants } = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
}

export function PremiumHero() {
  return (
    <section className="relative overflow-hidden bg-background pt-24 md:pt-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 isolate hidden opacity-65 lg:block"
      >
        <div className="absolute top-0 left-0 h-[80rem] w-[35rem] -translate-y-[21.875rem] -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)] dark:bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,15%,.08)_0,hsla(0,0%,45%,.02)_50%,hsla(0,0%,55%,0)_80%)]" />
        <div className="absolute top-0 left-0 h-[80rem] w-[15rem] [translate:5%_-50%] -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] dark:bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,15%,.06)_0,hsla(0,0%,55%,.02)_80%,transparent_100%)]" />
        <div className="absolute top-0 left-0 h-[80rem] w-[15rem] -translate-y-[21.875rem] -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] dark:bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,15%,.04)_0,hsla(0,0%,55%,.02)_80%,transparent_100%)]" />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--background)_75%)]"
      />

      <div className="mx-auto max-w-7xl px-6">
        <div className="relative z-10 text-center sm:mx-auto lg:mt-0 lg:mr-auto">
          <AnimatedGroup variants={transitionVariants}>
            <div className="group mx-auto flex w-fit cursor-default items-center gap-4 rounded-full border border-border/50 bg-muted/20 p-1 pl-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-muted/40">
              <span className="text-sm font-medium tracking-wide text-foreground uppercase">
                The AI Tutor Screener
              </span>
              <span className="block h-4 w-px bg-border"></span>

              <div className="flex size-6 items-center justify-center rounded-full bg-background transition-colors duration-500 group-hover:bg-muted">
                <IconMicrophone className="size-3 text-foreground" />
              </div>
            </div>
          </AnimatedGroup>

          <TextEffect
            preset="fade-in-blur"
            speedSegment={0.3}
            as="h1"
            className="mx-auto mt-8 max-w-5xl font-serif text-5xl font-medium tracking-tight text-balance md:text-7xl lg:mt-12 xl:text-[5rem]"
          >
            Screen tutors with evidence, not guesswork
          </TextEffect>
          <TextEffect
            per="line"
            preset="fade-in-blur"
            speedSegment={0.3}
            delay={0.5}
            as="p"
            className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-balance text-muted-foreground"
          >
            Kyma runs structured live interviews assessing clarity, patience,
            and student-safe judgment. We deliver rubric-scored reports with
            exact citations, so your hiring managers make confident decisions in
            minutes.
          </TextEffect>

          <AnimatedGroup
            variants={{
              container: {
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                    delayChildren: 0.75,
                  },
                },
              },
              ...transitionVariants,
            }}
            className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <div
              key={1}
              className="rounded-[calc(var(--radius-xl)+0.125rem)] border border-border/60 bg-muted/20 p-[3px] shadow-sm backdrop-blur-sm"
            >
              <Button
                size="lg"
                className="rounded-xl px-8 text-base shadow-inner transition-transform active:scale-[0.96]"
                render={<Link href="#demo" />}
                nativeButton={false}
              >
                <span className="text-nowrap">Watch product demo</span>
              </Button>
            </div>
            <Button
              key={2}
              size="lg"
              variant="ghost"
              className="h-12 rounded-xl px-8 text-base ring-1 ring-border/40 transition-transform hover:bg-muted/30 active:scale-[0.96]"
              render={<Link href="/interviews/demo-invite" />}
              nativeButton={false}
            >
              <span className="text-nowrap">Try the candidate flow</span>
            </Button>
          </AnimatedGroup>
        </div>

        <AnimatedGroup
          variants={{
            container: {
              visible: {
                transition: {
                  staggerChildren: 0.05,
                  delayChildren: 0.9,
                },
              },
            },
            ...transitionVariants,
          }}
        >
          <div className="relative mx-auto mt-16 max-w-6xl px-2 sm:mt-20 lg:mt-24">
            <div className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-muted/10 p-2 shadow-2xl ring-1 ring-white/10 backdrop-blur-3xl">
              <div className="relative overflow-hidden rounded-2xl ring-1 ring-border/20">
                <Image
                  className="relative hidden w-full rounded-xl border border-white/5 object-cover dark:block"
                  src="/mockups/hero.png"
                  alt="Kyma recruiter dashboard showing candidate analysis"
                  width={2400}
                  height={1350}
                  priority
                />
                <Image
                  className="relative w-full rounded-xl border border-black/5 object-cover dark:hidden"
                  src="/mockups/hero.png"
                  alt="Kyma recruiter dashboard showing candidate analysis"
                  width={2400}
                  height={1350}
                  priority
                />
              </div>
            </div>
          </div>
        </AnimatedGroup>
      </div>

      <div className="mx-auto mt-24 max-w-7xl px-6 pb-24 md:mt-32 md:pb-32">
        <p className="mb-12 text-center text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          Evaluate for what matters in tutoring
        </p>
        <div className="grid grid-cols-2 items-center justify-items-center gap-8 opacity-70 transition-all duration-500 hover:opacity-100 md:grid-cols-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <IconShieldCheck className="h-8 w-8 text-foreground" stroke={1.5} />
            <span className="text-sm font-medium">Student-Safe Judgment</span>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <IconBrain className="h-8 w-8 text-foreground" stroke={1.5} />
            <span className="text-sm font-medium">Concept Simplification</span>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <IconClockPlay className="h-8 w-8 text-foreground" stroke={1.5} />
            <span className="text-sm font-medium">Adaptive Patience</span>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <IconMicrophone className="h-8 w-8 text-foreground" stroke={1.5} />
            <span className="text-sm font-medium">Communication Clarity</span>
          </div>
        </div>
      </div>
    </section>
  )
}
