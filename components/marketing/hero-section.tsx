import {
  IconBolt,
  IconBrandFigma,
  IconBrandVercel,
  IconChartBar,
  IconCpu,
  IconDatabase,
  IconMessage2,
  IconRocket,
  IconSettings,
  IconShieldCheck,
  IconSparkles,
} from "@tabler/icons-react";
import { HeroHeader } from "@/components/marketing/header";
import { MarketingPageComposer } from "@/components/marketing/page-composer";
import { MarketingHeroMain } from "@/components/marketing/sections/hero-main";
import { MarketingSocialProof } from "@/components/marketing/sections/social-proof";

const trustIcons = [
  IconBolt,
  IconBrandVercel,
  IconDatabase,
  IconSparkles,
  IconShieldCheck,
  IconSettings,
  IconCpu,
  IconChartBar,
  IconMessage2,
  IconRocket,
  IconBrandFigma,
];

export default function HeroSection() {
  const sections = [
    {
      id: "hero-main",
      node: (
        <MarketingHeroMain
          eyebrow="Introducing Support for AI Models"
          title="Modern Solutions for Customer Engagement"
          subtitle="Highly customizable components for building modern websites and applications that look and feel the way you mean it."
          primaryCta={{ label: "Start Building", href: "/interviews/demo-invite" }}
          secondaryCta={{ label: "Request a demo", href: "/video-demo" }}
          showcaseDarkSrc="/mail2.png"
          showcaseLightSrc="/mail2-light.png"
        />
      ),
    },
    {
      id: "social-proof",
      node: (
        <MarketingSocialProof title="Meet Our Customers" href="/" icons={trustIcons} />
      ),
    },
  ];

  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 isolate hidden opacity-65 contain-strict lg:block"
        >
          <div className="absolute top-0 left-0 h-320 w-140 -translate-y-87.5 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="absolute top-0 left-0 h-320 w-60 [translate:5%_-50%] -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
          <div className="absolute top-0 left-0 h-320 w-60 -translate-y-87.5 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        <MarketingPageComposer sections={sections} />
      </main>
    </>
  );
}
