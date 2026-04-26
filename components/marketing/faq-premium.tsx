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
    question: 'How long does an interview session take?',
    answer:
      'A typical AI screening interview runs for about 15 to 20 minutes. It simulates a natural conversation, dynamically adapting to the candidate’s responses and keeping the interaction concise yet highly informative.',
  },
  {
    question: 'Can candidates retry the interview if they drop off?',
    answer:
      'Yes, the platform handles disconnects gracefully. If allowed by your screening batch policy, candidates can resume their active session from where they left off before final submission.',
  },
  {
    question: 'How is the final score calculated?',
    answer:
      'The AI evaluates the candidate against a predefined rubric across multiple dimensions (e.g., communication, subject knowledge, empathy). The transcript is analyzed post-call, and a weighted score with cited evidence is provided.',
  },
  {
    question: 'Can we customize the interview rubric?',
    answer:
      'Absolutely. Assessment templates are fully customizable. You can define specific technical requirements, behavioral markers, and role-playing scenarios tailored exactly to your hiring needs.',
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
            Everything you need to know about scaling your screening process.
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
