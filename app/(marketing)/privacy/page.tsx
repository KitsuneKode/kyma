import {
  LegalSection,
  MarketingLegalPage,
} from '@/components/marketing/legal-page'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Privacy Policy',
  description:
    'How Kyma by Kitsune Labs collects, uses, and retains candidate interview data, recordings, and account information.',
  path: '/privacy',
})

export default function PrivacyPage() {
  return (
    <MarketingLegalPage title="Privacy Policy" effectiveDate="July 9, 2026">
      <LegalSection title="Who we are">
        <p>
          Kyma is an AI voice screening product operated by Kitsune Labs
          (&quot;Kitsune Labs,&quot; &quot;we,&quot; &quot;us&quot;). This
          policy describes how we handle personal data when organizations use
          Kyma to run tutor and related screening interviews, and when
          individuals create candidate or recruiter accounts.
        </p>
        <p>
          This page is a product-facing placeholder pending final legal review.
          It reflects our intended practices for the current MVP architecture.
        </p>
      </LegalSection>

      <LegalSection title="Data we collect">
        <p>Depending on how you use Kyma, we may process:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Account identifiers such as name, email address, and authentication
            identifiers from our identity provider (Clerk).
          </li>
          <li>
            Organization membership and role information for recruiter
            workspaces.
          </li>
          <li>
            Candidate invite details (for example email, invite status, and
            screening assignment metadata).
          </li>
          <li>
            Interview session metadata (timestamps, session state, reconnect
            counts, and related operational events).
          </li>
          <li>
            Interview transcripts, assessment reports, rubric evidence, and
            recruiter notes or report-chat messages tied to a session.
          </li>
          <li>
            Optional interview recordings or recording artifact metadata when
            recording is enabled for a workspace.
          </li>
          <li>
            Limited technical data needed to operate the service (for example
            readiness checks, device permission outcomes, and security logs).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Interview recordings and transcripts">
        <p>
          When a screening interview runs, Kyma may capture a live audio (and,
          if enabled, video) session through our realtime provider, generate a
          transcript, and produce a structured assessment report for the hiring
          organization.
        </p>
        <p>
          Recordings and transcripts are processed to deliver the screening
          product the organization requested. They are visible to authorized
          members of that organization and to Kitsune Labs operators only as
          needed to provide support, security, or reliability.
        </p>
      </LegalSection>

      <LegalSection title="How we use data">
        <p>We use personal data to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Authenticate users and enforce organization access controls.</li>
          <li>
            Run interviews, generate transcripts, and produce evidence-backed
            reports.
          </li>
          <li>Enable recruiter review, notes, and grounded report chat.</li>
          <li>Operate, secure, debug, and improve the platform.</li>
          <li>Respond to support and data-subject requests.</li>
        </ul>
        <p>
          We do not sell personal data. We do not use candidate interview
          content to train public foundation models unless a separate written
          agreement says otherwise.
        </p>
      </LegalSection>

      <LegalSection title="Retention">
        <p>
          Retention follows the hiring organization&apos;s workspace needs and
          our operational backups. As a working baseline for the MVP:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Account and membership records are kept while the account or
            organization remains active.
          </li>
          <li>
            Interview transcripts, reports, and recordings are retained for the
            life of the customer workspace unless the customer requests earlier
            deletion or a shorter retention policy is configured.
          </li>
          <li>
            Security and audit logs may be retained longer where needed for
            fraud prevention, abuse investigation, or legal obligations.
          </li>
        </ul>
        <p>
          Automated retention purge jobs are on the roadmap; until then,
          deletion requests are handled through our data-subject request
          process.
        </p>
      </LegalSection>

      <LegalSection title="Sharing and processors">
        <p>
          We use subprocessors to host and operate Kyma (for example identity,
          database, realtime media, object storage, and model providers). Those
          providers process data only to deliver the service under our
          instructions.
        </p>
      </LegalSection>

      <LegalSection title="Your rights and contact">
        <p>
          Depending on your location, you may have rights to access, correct,
          export, or delete personal data we hold about you. Organization
          customers may also request assistance for candidate data they control.
        </p>
        <p>
          To submit a request, email{' '}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:privacy@kitsunelabs.com"
          >
            privacy@kitsunelabs.com
          </a>{' '}
          with enough detail for us to verify your identity and locate relevant
          records. Our internal ops runbook for fulfilling requests is
          maintained for Kitsune Labs staff in the product repository.
        </p>
      </LegalSection>
    </MarketingLegalPage>
  )
}
