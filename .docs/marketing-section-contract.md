# Marketing Section Contract

Use this contract for every section in `components/marketing/`.

## Objectives

- Keep marketing redesign changes composable.
- Avoid page-level monoliths that block iteration.
- Separate content updates from layout implementation.

## Required structure

- Place each section in `components/marketing/sections/*`.
- Export a typed props contract for each section.
- Keep sections stateless unless interaction requires local UI state.
- Keep copy and route targets configurable via props.

## Composition pattern

- Build page-level section arrays and render through `MarketingPageComposer`.
- Prefer adding/removing/reordering section configs over rewriting page files.
- Keep section IDs stable for analytics/test selectors.

## CTA conventions

- Primary CTA: high-intent route (`/interviews/demo-invite`, booking link, or equivalent).
- Secondary CTA: lower-commitment route (`/video-demo`, docs, etc).
- Use meaningful hrefs (avoid placeholder anchors in committed code).

## Ownership

- Product/design owns copy direction.
- Frontend owns section contracts and behavior.
- Any CTA or route contract change must update `.docs/route-and-api-architecture.md`.
