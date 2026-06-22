'use client'

import React, { useEffect } from 'react'
import {
  IconMicrophone,
  IconClipboardCheck,
  IconMessageHeart,
  IconClockPlay,
} from '@tabler/icons-react'
import { MarketingCtaRow } from '@/components/marketing/marketing-cta-row'
import { ProductPreview } from '@/components/marketing/product-preview'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
} from '@/components/motion/client-motion'
import { TextEffect } from '@/components/ui/text-effect'
import { MOUSE_PARALLAX_SPRING } from '@/lib/motion/constants'

const transitionVariants: { container: Variants; item: Variants } = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.3,
      },
    },
  },
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(8px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.23, 1, 0.32, 1],
      },
    },
  },
}

function HeroImageMockup() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window
      const x = (e.clientX / innerWidth) * 2 - 1
      const y = (e.clientY / innerHeight) * 2 - 1
      mouseX.set(x)
      mouseY.set(y)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  const springX = useSpring(mouseX, MOUSE_PARALLAX_SPRING)
  const springY = useSpring(mouseY, MOUSE_PARALLAX_SPRING)

  const rotateX = useTransform(springY, [-1, 1], [3, -3])
  const rotateY = useTransform(springX, [-1, 1], [-3, 3])

  return (
    <div
      style={{ perspective: 2000 }}
      className="relative mx-auto mt-16 max-w-6xl px-2 sm:mt-20 lg:mt-24"
    >
      {/* Ambient glow + stacked panel for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -top-10 bottom-0 -z-10"
      >
        <div className="absolute inset-0 rounded-[3rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(232,255,71,0.10),transparent_70%)]" />
        <div className="absolute inset-x-10 top-6 bottom-0 rounded-[2rem] border border-border/30 bg-muted/[0.06] shadow-[var(--shadow-lg)]" />
      </div>

      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        initial={{
          opacity: 0,
          scale: 0.95,
          filter: 'blur(8px)',
          clipPath: 'inset(0 0 100% 0)',
        }}
        animate={{
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          clipPath: 'inset(0 0 0 0)',
        }}
        transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1], delay: 0.4 }}
        className="relative overflow-hidden rounded-[2rem] border border-border/40 bg-muted/10 p-1.5 shadow-[var(--shadow-xl)] ring-1 ring-border/40 backdrop-blur-xl"
      >
        {/* Top edge highlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent"
        />
        <ProductPreview />
      </motion.div>
    </div>
  )
}

export function MarketingHero() {
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(232,255,71,0.08),transparent_45%)]"
      />

      <div className="mx-auto max-w-7xl px-6">
        <div className="relative z-10 text-center sm:mx-auto lg:mt-0 lg:mr-auto">
          <motion.div
            initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="group mx-auto flex w-fit cursor-default items-center gap-4 rounded-full border border-border/50 bg-muted/20 p-1 pl-4 shadow-sm backdrop-blur-md transition-colors duration-[200ms] ease-out hover:bg-muted/40">
              <span className="text-sm font-medium tracking-wide text-foreground uppercase">
                Live tutor screening for education teams
              </span>
              <span className="block h-4 w-px bg-border"></span>

              <div className="flex size-6 items-center justify-center rounded-full bg-background transition-colors duration-[200ms] group-hover:bg-muted">
                <motion.div
                  className="size-5 text-foreground"
                  whileHover={{ scale: 0.8, filter: 'blur(1px)' }}
                  transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                >
                  <IconMicrophone />
                </motion.div>
              </div>
            </div>
          </motion.div>

          <TextEffect
            preset="fade-in-blur"
            speedSegment={0.3}
            delay={0.1}
            as="h1"
            className="mx-auto mt-8 max-w-4xl text-[3.5rem] leading-[0.95] font-semibold tracking-tighter text-balance antialiased md:text-[5rem] lg:mt-12 xl:text-[5.75rem]"
          >
            Screen tutors on real teaching, not resumes
          </TextEffect>
          <TextEffect
            per="line"
            preset="fade-in-blur"
            speedSegment={0.3}
            delay={0.2}
            as="p"
            className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-pretty text-muted-foreground"
          >
            Kyma runs a live, AI-led tutor interview and returns a structured,
            evidence-backed review packet—so recruiting teams judge clarity,
            patience, and teaching ability consistently, and decide faster.
          </TextEffect>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={transitionVariants.container}
            className="mt-12"
          >
            <motion.div variants={transitionVariants.item}>
              <MarketingCtaRow variant="hero" />
            </motion.div>
          </motion.div>
        </div>

        <HeroImageMockup />
      </div>

      <div className="mx-auto mt-24 max-w-7xl px-6 pb-24 md:mt-32 md:pb-32">
        <p className="mb-12 text-center text-sm font-semibold tracking-wider text-muted-foreground uppercase">
          What every screening captures
        </p>
        <div className="grid grid-cols-2 items-center justify-items-center gap-8 opacity-70 transition-[opacity] duration-200 ease-out hover:opacity-100 md:grid-cols-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <IconMicrophone className="h-8 w-8 text-foreground" stroke={1.5} />
            <span className="text-sm font-medium text-balance">
              Live teaching simulation
            </span>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <IconClipboardCheck
              className="h-8 w-8 text-foreground"
              stroke={1.5}
            />
            <span className="text-sm font-medium text-balance">
              Tutor-specific rubric
            </span>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <IconMessageHeart
              className="h-8 w-8 text-foreground"
              stroke={1.5}
            />
            <span className="text-sm font-medium text-balance">
              Transcript-cited evidence
            </span>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <IconClockPlay className="h-8 w-8 text-foreground" stroke={1.5} />
            <span className="text-sm font-medium text-balance">
              Faster, defensible decisions
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
