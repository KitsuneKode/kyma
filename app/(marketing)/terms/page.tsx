import {
  LegalSection,
  MarketingLegalPage,
} from '@/components/marketing/legal-page'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Terms of Service',
  description:
    'Terms governing use of Kyma by Kitsune Labs, including accounts, interviews, recordings, and acceptable use.',
  path: '/terms',
})

export default function TermsPage() {
  return (
    <MarketingLegalPage title="Terms of Service" effectiveDate="July 9, 2026">
      <LegalSection title="Agreement">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern access to and use of
          Kyma, the AI voice screening platform operated by Kitsune Labs
          (&quot;Kitsune Labs,&quot; &quot;we,&quot; &quot;us&quot;). By
          creating an account, joining an organization workspace, or starting an
          interview, you agree to these Terms.
        </p>
        <p>
          This page is a product-facing placeholder pending final legal review.
          If a signed order form or enterprise agreement conflicts with these
          Terms, the signed agreement controls for that customer.
        </p>
      </LegalSection>

      <LegalSection title="The service">
        <p>
          Kyma helps organizations run structured voice interviews, capture
          transcripts and optional recordings, and review evidence-backed
          assessment reports. Features available to a workspace may depend on
          the organization&apos;s plan and configuration. Billing and paid plan
          entitlements may be introduced over time; until then, access may be
          limited or provided for evaluation.
        </p>
      </LegalSection>

      <LegalSection title="Accounts and organizations">
        <p>
          You must provide accurate account information and keep credentials
          secure. Recruiter workspaces are organization-scoped: admins and
          members are responsible for inviting only authorized users and for
          decisions made with Kyma reports.
        </p>
        <p>
          Candidates may access interviews through invite links and
          authenticated candidate flows. You may not share invite links publicly
          or use the service to impersonate another person.
        </p>
      </LegalSection>

      <LegalSection title="Interview content and recordings">
        <p>
          Organizations using Kyma are responsible for providing any notices and
          obtaining any consents required to interview candidates, record
          sessions where enabled, and process assessment outputs for hiring.
        </p>
        <p>
          Candidates acknowledge that interview audio/video, transcripts, and
          derived assessment materials may be stored and reviewed by the hiring
          organization and by Kitsune Labs as needed to operate the service.
        </p>
        <p>
          Assessment outputs are decision-support tools. Kitsune Labs does not
          make hiring decisions and does not guarantee any particular employment
          outcome.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Probe, abuse, or disrupt the service or its infrastructure.</li>
          <li>
            Attempt to extract model weights, bypass entitlement checks, or
            access another organization&apos;s data.
          </li>
          <li>
            Upload unlawful content or use Kyma to discriminate unlawfully in
            hiring.
          </li>
          <li>
            Reverse engineer the product except where applicable law allows.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Intellectual property">
        <p>
          Kyma, including its software, branding, and documentation, is owned by
          Kitsune Labs or its licensors. Customers retain rights to their
          candidate and hiring content, subject to the license needed for us to
          host and process that content to provide the service.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimers and liability">
        <p>
          The service is provided on an &quot;as is&quot; and &quot;as
          available&quot; basis during the MVP period. To the fullest extent
          permitted by law, Kitsune Labs disclaims warranties of
          merchantability, fitness for a particular purpose, and
          non-infringement, and limits liability for indirect or consequential
          damages arising from use of Kyma.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these Terms:{' '}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:legal@kitsunelabs.com"
          >
            legal@kitsunelabs.com
          </a>
          . Privacy requests:{' '}
          <a
            className="text-foreground underline underline-offset-4"
            href="mailto:privacy@kitsunelabs.com"
          >
            privacy@kitsunelabs.com
          </a>
          .
        </p>
      </LegalSection>
    </MarketingLegalPage>
  )
}
