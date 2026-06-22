'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from '@/components/motion/client-motion'
import { ProductPreview } from '@/components/marketing/product-preview'
import {
  HERO_PREVIEW_HEIGHT,
  HERO_PREVIEW_WIDTH,
} from '@/components/marketing/hero-preview-dimensions'

const HERO_SCENERY_IMAGE =
  'https://images.unsplash.com/photo-1662285064441-bedb11ca7e47?q=80&w=2400&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'

export function HeroProductShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateScale = () => {
      const available = node.clientWidth
      setScale(Math.min(1, available / HERO_PREVIEW_WIDTH))
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const scaledHeight = HERO_PREVIEW_HEIGHT * scale

  return (
    <div className="relative mt-14 w-full sm:mt-16 lg:mt-20">
      <div
        ref={containerRef}
        className="relative mx-auto w-[min(calc(100vw-1.5rem),1440px)] px-2 sm:px-4"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-3 top-0 h-36 overflow-hidden rounded-t-[1.75rem] sm:inset-x-6 sm:h-44 sm:rounded-t-[2rem] lg:h-52"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${HERO_SCENERY_IMAGE})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/35 to-background" />
        </div>

        <div
          className="relative flex justify-center pt-16 sm:pt-20 lg:pt-24"
          style={{ height: scaledHeight + 16 }}
        >
          <div
            style={{
              width: HERO_PREVIEW_WIDTH * scale,
              height: scaledHeight,
            }}
          >
            <motion.div
              style={{
                width: HERO_PREVIEW_WIDTH,
                height: HERO_PREVIEW_HEIGHT,
                scale,
                transformOrigin: 'top left',
              }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.75,
                ease: [0.77, 0, 0.175, 1],
                delay: 0.25,
              }}
              className="rounded-[1.15rem] border border-white/[0.08] bg-background shadow-[0_48px_120px_-32px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.06)] ring-1 ring-white/[0.04]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />
              <ProductPreview />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
