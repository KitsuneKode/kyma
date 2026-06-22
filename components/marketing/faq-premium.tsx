'use client'

import React from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    id: 'replace-recruiters',
    question: 'Does Kyma replace recruiters?',
    answer:
      'No. Kyma runs a consistent first-round screening and surfaces evidence, but the hire/no-hire decision always stays with your team. Borderline tutors are flagged for manual review, and recruiters can override any recommendation.',
  },
  {
    id: 'what-signals',
    question: 'What does Kyma evaluate in a tutor?',
    answer:
      'Each session scores tutor-specific teaching signals—clarity, simplification, patience, warmth, listening, fluency, adaptability, engagement, and accuracy—using a live conversation and a short teaching simulation rather than a resume.',
  },
  {
    id: 'trust-recommendation',
    question: 'How do recruiters trust the recommendation?',
    answer:
      'Every rubric score is grounded in transcript quotes with timestamps. Reviewers can read the evidence, the rationale, and the full session before confirming or overriding the recommendation.',
  },
  {
    id: 'candidate-experience',
    question: 'What does the candidate experience feel like?',
    answer:
      'Tutors join from any device via a single invite link, pass a quick device check, and complete a calm, guided live interview in about 15 to 20 minutes—no scheduling back-and-forth.',
  },
  {
    id: 'invite-retries',
    question: 'How do invites and access control work?',
    answer:
      'Recruiters control this through screening policy: invite-only access, expiry windows, and attempt limits, with optional resume on disconnect before final submission. Access is scoped to your organization.',
  },
]

export function PremiumFaq() {
  return (
    <section className="bg-muted/10 py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Practical answers for teams moving from inconsistent first-round
            calls to structured tutor screening.
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <Accordion className="w-full">
            {faqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="rounded-2xl border border-border/40 bg-card/80 px-5 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
              >
                <AccordionTrigger className="text-left text-lg font-medium transition-colors hover:text-primary hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-6 text-base leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
