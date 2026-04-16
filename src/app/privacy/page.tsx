import Link from 'next/link';
import { Stack } from '@phosphor-icons/react/dist/ssr';

export const metadata = {
  title: 'Privacy Policy | Forma',
  description: 'Privacy Policy for Forma - the developer-first form builder.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Stack size={24} weight="fill" className="text-gray-900" />
              <span className="font-sans text-xl font-medium tracking-[-0.04em] text-gray-900">
                Forma
              </span>
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-safety-orange text-white rounded-sm font-mono text-[12px] uppercase hover:bg-[#ee6018] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: April 16, 2026</p>
        </div>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              Forma ("Company", "we", "us", or "our") respects your privacy and is committed to protecting
              your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard
              your information when you use our form builder and submission management service ("Service").
            </p>
            <p className="text-gray-600 mb-4">
              Please read this policy carefully. By using the Service, you consent to the practices
              described in this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">2.1 Account Information</h3>
            <p className="text-gray-600 mb-4">When you create an account, we store the following in our database:</p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Name and email address</li>
              <li>Password (stored as a one-way bcrypt hash — we cannot read your password)</li>
              <li>Workspace names and membership roles</li>
              <li>Notification preferences</li>
            </ul>
            <p className="text-gray-600 mb-4">
              If you sign in with Google or GitHub, we receive your name, email, and profile image from
              the provider. We do not receive or store your social account password.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">2.2 Form Submission Data</h3>
            <p className="text-gray-600 mb-4">
              When end users submit forms you create, we store the submission data in our database on your
              behalf. This may include any information the form collects, such as:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Names, email addresses, phone numbers, and free-text responses</li>
              <li>File uploads (stored on Amazon S3)</li>
              <li>Booking date and time selections</li>
              <li>IP address and approximate geolocation (country, city) of the person who submitted the form</li>
            </ul>
            <p className="text-gray-600 mb-4">
              You, as the form creator, are the data controller for submission data. We act as a data
              processor and store this data so you can access it through your dashboard.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">2.3 Payment Information</h3>
            <p className="text-gray-600 mb-4">
              All payment processing is handled by <strong>Stripe</strong>. We do not store, process, or
              have access to credit card numbers, CVVs, or full payment credentials. What we store:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Stripe customer ID and subscription ID (opaque identifiers, not card data)</li>
              <li>Subscription plan type and billing period</li>
              <li>Whether a payment was completed (status only — not card details)</li>
            </ul>
            <p className="text-gray-600 mb-4">
              Stripe is PCI DSS Level 1 certified. For details on how Stripe handles payment data,
              see <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-safety-orange hover:underline">Stripe&apos;s Privacy Policy</a>.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">2.4 Usage and Analytics Data</h3>
            <p className="text-gray-600 mb-4">We automatically collect:</p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>IP addresses and approximate geolocation (for form submission analytics)</li>
              <li>Form view counts and submission counts</li>
              <li>Field interaction and drop-off tracking (which form fields users interact with)</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">2.5 Cookies and Sessions</h3>
            <p className="text-gray-600 mb-4">
              We use essential cookies for authentication and session management only. We use a secure,
              HTTP-only session token (JWT) that expires after 30 days. We do not use third-party
              advertising or tracking cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use collected information to:</p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Provide, maintain, and improve the Service</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent fraudulent or unauthorized activity</li>
              <li>Personalize and improve your experience</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Information Sharing</h2>
            <p className="text-gray-600 mb-4">We share data only with the services needed to operate Forma:</p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li><strong>Stripe</strong> — payment processing. Receives your email and billing details when you subscribe or accept form payments.</li>
              <li><strong>Resend</strong> — transactional email delivery. Receives recipient email addresses for automation emails, broadcasts, and notifications.</li>
              <li><strong>Amazon Web Services (S3)</strong> — file storage. Stores files uploaded through forms.</li>
              <li><strong>Amazon Bedrock</strong> — AI form generation. Receives form descriptions you provide (no submission data is sent).</li>
              <li><strong>User-configured integrations:</strong> If you connect Slack, Google Sheets, webhooks, or other services, submission data is sent to those services as you configure.</li>
            </ul>
            <p className="text-gray-600 mb-4">
              We do not sell, rent, or trade your personal information to third parties. We do not use
              your submission data for advertising or profiling.
            </p>
            <p className="text-gray-600 mb-4">
              We may disclose information when required by law, court order, or to protect the safety
              of our users or the public.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-600 mb-4">
              We implement the following measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>All data in transit is encrypted via TLS/HTTPS (HTTP/2 with HSTS preload)</li>
              <li>Passwords are hashed using bcrypt (one-way — we cannot read them)</li>
              <li>API keys are hashed before storage (only a masked prefix is visible)</li>
              <li>Role-based access control limits who can view or modify data within workspaces</li>
              <li>Rate limiting on all API endpoints to prevent abuse</li>
              <li>Input validation and SSRF protection on webhook and integration URLs</li>
              <li>The application runs as a non-root system user with limited privileges</li>
              <li>Database is not accessible from the public internet (localhost only)</li>
              <li>Automated daily database backups with 14-day retention</li>
              <li>Firewall restricts access to only necessary ports (HTTPS, SSH)</li>
            </ul>
            <p className="text-gray-600 mb-4">
              Credit card information is never transmitted to or stored on our servers — all payment
              processing occurs on Stripe&apos;s PCI-compliant infrastructure.
            </p>
            <p className="text-gray-600 mb-4">
              No system is 100% secure. If you discover a security vulnerability, please report it
              to us at{' '}
              <Link href="/contact" className="text-safety-orange hover:underline">our contact page</Link>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-600 mb-4">
              We retain your data as follows:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li><strong>Account data:</strong> Retained for as long as your account is active. You can delete your account from Settings, which removes your profile and personal data.</li>
              <li><strong>Form submission data:</strong> Retained until you delete it or delete the form. You control this data and can delete individual submissions or entire forms at any time.</li>
              <li><strong>Uploaded files:</strong> Retained on Amazon S3 until the associated form or submission is deleted.</li>
              <li><strong>Database backups:</strong> Retained for 14 days and then automatically deleted.</li>
              <li><strong>Workspace data:</strong> When a workspace is deleted, all associated forms, submissions, integrations, and files are permanently removed.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Your Rights (GDPR)</h2>
            <p className="text-gray-600 mb-4">
              If you are in the European Economic Area (EEA), you have certain data protection rights:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data</li>
              <li><strong>Restriction:</strong> Request limitation of processing</li>
              <li><strong>Portability:</strong> Request transfer of your data</li>
              <li><strong>Objection:</strong> Object to processing of your data</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>
            <p className="text-gray-600 mb-4">
              To exercise these rights,{' '}
              <Link href="/contact" className="text-safety-orange hover:underline">
                contact us
              </Link>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. California Privacy Rights (CCPA)</h2>
            <p className="text-gray-600 mb-4">
              California residents have additional rights under the California Consumer Privacy Act:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Right to know what personal information is collected</li>
              <li>Right to know whether personal information is sold or disclosed</li>
              <li>Right to say no to the sale of personal information</li>
              <li>Right to access your personal information</li>
              <li>Right to equal service and price (non-discrimination)</li>
            </ul>
            <p className="text-gray-600 mb-4">
              We do not sell personal information. To exercise your rights, contact us at the address below.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
            <p className="text-gray-600 mb-4">
              Your information may be transferred to and processed in countries other than your own.
              We ensure appropriate safeguards are in place, such as Standard Contractual Clauses,
              to protect your data during international transfers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p className="text-gray-600 mb-4">
              The Service is not intended for children under 16. We do not knowingly collect personal
              information from children under 16. If you become aware that a child has provided us with
              personal information, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Third-Party Links</h2>
            <p className="text-gray-600 mb-4">
              The Service may contain links to third-party websites or services. We are not responsible
              for the privacy practices of these third parties. We encourage you to read their privacy
              policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Changes to This Policy</h2>
            <p className="text-gray-600 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any significant
              changes by posting the new policy on this page and updating the "Last updated" date.
              We encourage you to review this policy periodically.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have questions about this Privacy Policy or our data practices, please{' '}
              <Link href="/contact" className="text-safety-orange hover:underline">contact us</Link>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Data Processing Agreement</h2>
            <p className="text-gray-600 mb-4">
              For customers who require a Data Processing Agreement (DPA) for GDPR compliance, please{' '}
              <Link href="/contact" className="text-safety-orange hover:underline">contact us</Link>.
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-wrap gap-6 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms of Service
            </Link>
            <Link href="/docs" className="hover:text-gray-900 transition-colors">
              Documentation
            </Link>
            <Link href="/" className="hover:text-gray-900 transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
