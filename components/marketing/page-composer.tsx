import type { ReactNode } from "react";

export type MarketingSection = {
  id: string;
  node: ReactNode;
};

export function MarketingPageComposer({ sections }: { sections: MarketingSection[] }) {
  return <>{sections.map((section) => section.node)}</>;
}
