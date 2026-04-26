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
    question: 'What does a typical screening session look like?',
    answer:
      'Most sessions run around 15 to 20 minutes. Candidates complete a prejoin device check, join the live interviewer, and are evaluated against a structured rubric aligned to tutoring outcomes.',
  },
  {
    question: 'How do invite links and retries work?',
    answer:
      'Recruiters control this through screening batch policy. You can set expiry windows and attempt limits, and optionally allow resume behavior for disconnects before final submission.',
  },
  {
    question: 'How do recruiters trust the recommendation?',
    answer:
      'Recommendations are grounded in transcript evidence and rubric dimensions. Reviewers can inspect session details, notes, and citations before taking the final decision.',
  },
  {
    question: 'Can we standardize different role types or cohorts?',
    answer:
      'Yes. Screening Templates define repeatable interview structures, while Screening Batches let you apply policy and candidate lists per hiring cohort.',
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
            Practical answers for teams moving from manual calls to structured
            screening.
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <Accordion className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
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
