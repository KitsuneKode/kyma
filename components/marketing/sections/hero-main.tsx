import Link from "next/link";
import Image from "next/image";
import { IconArrowRight } from "@tabler/icons-react";

import { AnimatedGroup } from "@/components/ui/animated-group";
import { TextEffect } from "@/components/ui/text-effect";
import { Button } from "@/components/ui/button";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring" as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export type MarketingHeroMainProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  showcaseDarkSrc: string;
  showcaseLightSrc: string;
};

export function MarketingHeroMain({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  showcaseDarkSrc,
  showcaseLightSrc,
}: MarketingHeroMainProps) {
  return (
    <section>
      <div className="relative pt-24 md:pt-36">
        <AnimatedGroup
          variants={{
            container: {
              visible: {
                transition: {
                  delayChildren: 1,
                },
              },
            },
            item: {
              hidden: {
                opacity: 0,
                y: 20,
              },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  type: "spring" as const,
                  bounce: 0.3,
                  duration: 2,
                },
              },
            },
          }}
          className="absolute inset-0 top-56 -z-20 mask-b-from-35% mask-b-to-90% lg:top-32"
        >
          <Image
            src="https://ik.imagekit.io/lrigu76hy/tailark/night-background.jpg?updatedAt=1745733451120"
            alt="background"
            className="hidden size-full dark:block"
            width="3276"
            height="4095"
          />
        </AnimatedGroup>

        <div
          aria-hidden
          className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]"
        />

        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center sm:mx-auto lg:mt-0 lg:mr-auto">
            <AnimatedGroup variants={transitionVariants}>
              <Link
                href={primaryCta.href}
                className="group mx-auto flex w-fit items-center gap-4 rounded-full border bg-muted p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 hover:bg-background dark:border-t-white/5 dark:shadow-zinc-950 dark:hover:border-t-border"
              >
                <span className="text-sm text-foreground">{eyebrow}</span>
                <span className="block h-4 w-0.5 border-l bg-white dark:border-background dark:bg-zinc-700"></span>

                <div className="size-6 overflow-hidden rounded-full bg-background duration-500 group-hover:bg-muted">
                  <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                    <span className="flex size-6">
                      <IconArrowRight className="m-auto size-3" />
                    </span>
                    <span className="flex size-6">
                      <IconArrowRight className="m-auto size-3" />
                    </span>
                  </div>
                </div>
              </Link>
            </AnimatedGroup>

            <TextEffect
              preset="fade-in-blur"
              speedSegment={0.3}
              as="h1"
              className="mx-auto mt-8 max-w-4xl text-5xl text-balance max-md:font-semibold md:text-7xl lg:mt-16 xl:text-[5.25rem]"
            >
              {title}
            </TextEffect>
            <TextEffect
              per="line"
              preset="fade-in-blur"
              speedSegment={0.3}
              delay={0.5}
              as="p"
              className="mx-auto mt-8 max-w-2xl text-lg text-balance"
            >
              {subtitle}
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
              className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row"
            >
              <div
                key={1}
                className="rounded-[calc(var(--radius-xl)+0.125rem)] border bg-foreground/10 p-0.5"
              >
                <Button
                  size="lg"
                  className="rounded-xl px-5 text-base"
                  render={<Link href={primaryCta.href} />}
                  nativeButton={false}
                >
                  <span className="text-nowrap">{primaryCta.label}</span>
                </Button>
              </div>
              <Button
                key={2}
                size="lg"
                variant="ghost"
                className="h-10.5 rounded-xl px-5"
                render={<Link href={secondaryCta.href} />}
                nativeButton={false}
              >
                <span className="text-nowrap">{secondaryCta.label}</span>
              </Button>
            </AnimatedGroup>
          </div>
        </div>

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
        >
          <div className="relative mt-8 -mr-56 overflow-hidden mask-b-from-55% px-2 sm:mt-12 sm:mr-0 md:mt-20">
            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border bg-background p-4 shadow-lg ring-1 inset-shadow-2xs shadow-zinc-950/15 ring-background dark:inset-shadow-white/20">
              <Image
                className="relative hidden aspect-15/8 rounded-2xl bg-background dark:block"
                src={showcaseDarkSrc}
                alt="app screen"
                width="2700"
                height="1440"
              />
              <Image
                className="relative z-2 aspect-15/8 rounded-2xl border border-border/25 dark:hidden"
                src={showcaseLightSrc}
                alt="app screen"
                width="2700"
                height="1440"
              />
            </div>
          </div>
        </AnimatedGroup>
      </div>
    </section>
  );
}
