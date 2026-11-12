import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalDocumentShell } from '@/components/legal/LegalDocumentShell'

export const metadata: Metadata = {
  title: 'Privacy policy | Reelysis',
  description: 'How Reelysis collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <LegalDocumentShell title="Privacy Policy" updated="July 4, 2026">
      <p>
        Reelysis (&ldquo;we&rdquo;, &ldquo;us&rdquo;) helps creators analyze Instagram Reels
        performance. This policy explains what we collect and why when you use our website and app.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong>: email and password (stored securely) when you register.
        </li>
        <li>
          <strong>Instagram data</strong>: when you connect your account, we receive profile
          details, Reels metadata, captions, metrics, and media URLs authorized through Meta&apos;s
          Instagram API. We do not store your Instagram password.
        </li>
        <li>
          <strong>Analysis data</strong>: AI-generated insights (hook scores, topics, transcripts,
          recommendations) derived from your synced Reels.
        </li>
        <li>
          <strong>Usage data</strong>: basic logs needed to operate the service (e.g. sync jobs,
          errors, request timestamps).
        </li>
      </ul>

      <h2>How we use your information</h2>
      <p>We use your data to:</p>
      <ul>
        <li>Authenticate you and provide the Reelysis dashboard</li>
        <li>Sync and analyze your Reels and competitor accounts you choose to track</li>
        <li>Generate performance insights and strategy reports</li>
        <li>Improve reliability and fix issues</li>
      </ul>
      <p>
        We do not sell your personal information. We do not use your Instagram content to train
        public AI models.
      </p>

      <h2>Third-party services</h2>
      <p>
        Reelysis relies on third parties to operate, including Meta (Instagram), cloud hosting,
        and AI providers for transcript and content analysis. Those providers process data according
        to their own policies and our agreements with them. Connecting Instagram is subject to{' '}
        <a href="https://www.instagram.com/about/legal/terms/api/" target="_blank" rel="noopener noreferrer">
          Meta&apos;s Platform Terms
        </a>
        .
      </p>

      <h2>Data retention</h2>
      <p>
        We keep your data while your account is active. If you disconnect Instagram or delete your
        account, associated Instagram data is removed from our systems as described in the product.
        You may request deletion of your account by contacting us.
      </p>

      <h2>Security</h2>
      <p>
        We use industry-standard measures to protect data in transit and at rest, including encrypted
        connections and access controls. No method of transmission over the internet is 100% secure.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Disconnect Instagram at any time from Settings</li>
        <li>Update your content niche and competitor list in the app</li>
        <li>Contact us to access or delete account data</li>
      </ul>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at the top
        reflects the latest version. Continued use after changes means you accept the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Email hello@reelysis.app.
      </p>

      <p className="text-sm text-text-tertiary">
        See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalDocumentShell>
  )
}
