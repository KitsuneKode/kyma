import { Fragment, type ReactNode } from 'react'

export type MarketingSection = {
  id: string
  node: ReactNode
}

export function MarketingPageComposer({
  sections,
}: {
  sections: MarketingSection[]
}) {
  return (
    <>
      {sections.map((section) => (
        <Fragment key={section.id}>{section.node}</Fragment>
      ))}
    </>
  )
}
