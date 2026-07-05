import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalDocumentShell } from '@/components/legal/LegalDocumentShell'

export const metadata: Metadata = {
  title: 'Terms of Service · Reelysis',
  description: 'Terms governing your use of Reelysis.',
}

export default function TermsPage() {
  return (
    <LegalDocumentShell title="Terms of Service" updated="July 4, 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to Reelysis. By creating an
        account or using the service, you agree to these Terms.
      </p>

      <h2>The service</h2>
      <p>
        Reelysis provides Instagram Reels analytics, AI-assisted content analysis, competitor
        tracking, and strategy reports for creators and businesses. Features may change as we
        improve the product.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must provide accurate registration information and keep your credentials secure.</li>
        <li>You are responsible for activity under your account.</li>
        <li>You must be at least 18 years old, or the age of majority in your jurisdiction.</li>
      </ul>

      <h2>Instagram connection</h2>
      <p>
        Connecting Instagram requires a Business or Creator account and authorization through Meta.
        You must comply with{' '}
        <a href="https://www.instagram.com/about/legal/terms/api/" target="_blank" rel="noopener noreferrer">
          Meta&apos;s Platform Terms
        </a>{' '}
        and Instagram&apos;s terms. We may lose access to data if Meta revokes permissions or your
        token expires.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use Reelysis for unlawful purposes or to violate others&apos; rights</li>
        <li>Attempt to reverse engineer, scrape, or overload our systems</li>
        <li>Share account access or resell the service without permission</li>
        <li>Submit competitor handles you do not have a legitimate reason to track</li>
      </ul>

      <h2>AI-generated insights</h2>
      <p>
        Analysis scores, recommendations, and reports are generated automatically and may be
        incomplete or inaccurate. They are informational only, not professional, legal, or
        financial advice. You are responsible for decisions you make based on Reelysis output.
      </p>

      <h2>Intellectual property</h2>
      <p>
        Reelysis owns the platform, branding, and software. You retain ownership of your Instagram
        content. You grant us a limited license to process your synced data solely to provide the
        service.
      </p>

      <h2>Disclaimer</h2>
      <p>
        Reelysis is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee
        uninterrupted sync, specific growth outcomes, or that third-party APIs will remain available.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Reelysis and its operators are not liable for
        indirect, incidental, or consequential damages arising from your use of the service. Our
        total liability is limited to the amount you paid us in the twelve months before the claim,
        or USD $100 if you use a free plan.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using Reelysis at any time. We may suspend or terminate access if you breach
        these Terms or if required for legal or operational reasons. Disconnecting Instagram or
        deleting your account removes associated synced data as described in the app.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Terms. Material changes will be reflected by the &ldquo;Last
        updated&rdquo; date. Continued use after changes constitutes acceptance.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Email hello@reelysis.app.
      </p>

      <p className="text-sm text-text-tertiary">
        See also our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalDocumentShell>
  )
}
