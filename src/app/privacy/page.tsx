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
          <p className="text-gray-500 text-sm">Last updated: March 31, 2026</p>
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
            <p className="text-gray-600 mb-4">When you create an account, we collect:</p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Name and email address</li>
              <li>Password (stored securely using bcrypt hashing)</li>
              <li>Workspace and organization information</li>
              <li>Billing information (processed by Stripe; we do not store full card numbers)</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">2.2 Form Submission Data</h3>
            <p className="text-gray-600 mb-4">
              When end users submit forms you create, we collect and store the submission data on your
              behalf. This may include any information the form collects (names, emails, messages, etc.).
              You are the data controller for this information; we act as a data processor.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">2.3 Usage Data</h3>
            <p className="text-gray-600 mb-4">We automatically collect:</p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>IP addresses and approximate location</li>
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>Pages visited and features used</li>
              <li>Time spent on pages and click patterns</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">2.4 Cookies and Tracking</h3>
            <p className="text-gray-600 mb-4">
              We use essential cookies for authentication and session management. We may use analytics
              cookies to understand how the Service is used. You can control cookie preferences through
              your browser settings.
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
            <p className="text-gray-600 mb-4">We may share your information with:</p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li><strong>Service Providers:</strong> Third parties that help us operate the Service (hosting, payment processing, email delivery)</li>
              <li><strong>Integrations:</strong> Third-party services you choose to connect (Slack, Google Sheets, etc.)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
            <p className="text-gray-600 mb-4">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-600 mb-4">
              We implement appropriate technical and organizational measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Encryption in transit (TLS/HTTPS) and at rest</li>
              <li>Secure password hashing (bcrypt)</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication</li>
              <li>Database backups and disaster recovery</li>
            </ul>
            <p className="text-gray-600 mb-4">
              However, no method of transmission over the Internet is 100% secure. We cannot guarantee
              absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-600 mb-4">
              We retain your account information for as long as your account is active or as needed to
              provide the Service. Form submission data is retained according to your workspace settings
              or until you delete it.
            </p>
            <p className="text-gray-600 mb-4">
              After account deletion, we may retain certain information for up to 30 days for backup
              purposes, and may retain anonymized or aggregated data indefinitely.
            </p>
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
