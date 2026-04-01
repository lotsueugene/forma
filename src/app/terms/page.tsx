import Link from 'next/link';
import { Stack } from '@phosphor-icons/react/dist/ssr';

export const metadata = {
  title: 'Terms of Service | Forma',
  description: 'Terms of Service for Forma - the developer-first form builder.',
};

export default function TermsPage() {
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
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-500 text-sm">Last updated: March 31, 2026</p>
        </div>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing or using Forma ("Service"), operated by Forma ("Company", "we", "us", or "our"),
              you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of
              these terms, you may not access the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-4">
              Forma is a form builder and submission management platform that allows users to create forms,
              collect submissions, and integrate with third-party services. The Service includes web-based
              tools, APIs, and related documentation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Account Registration</h2>
            <p className="text-gray-600 mb-4">
              To use certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and accept all risks of unauthorized access</li>
              <li>Notify us immediately if you discover any security breaches related to the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
            <p className="text-gray-600 mb-4">You agree not to use the Service to:</p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Collect or harvest personal information without proper consent</li>
              <li>Transmit spam, phishing attempts, or malicious content</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Collect sensitive personal data (health, financial, etc.) without appropriate safeguards</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Payment Terms</h2>
            <p className="text-gray-600 mb-4">
              Certain features of the Service require payment. By subscribing to a paid plan:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>You authorize us to charge your payment method on a recurring basis</li>
              <li>Subscription fees are non-refundable except as required by law</li>
              <li>We may change pricing with 30 days notice to your registered email</li>
              <li>You may cancel your subscription at any time; access continues until the end of the billing period</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Data and Content</h2>
            <p className="text-gray-600 mb-4">
              You retain all rights to the data and content you submit through the Service ("User Content").
              By using the Service, you grant us a limited license to process, store, and transmit your
              User Content solely to provide the Service to you.
            </p>
            <p className="text-gray-600 mb-4">
              You are responsible for ensuring you have the necessary rights and consents to collect and
              process any personal data submitted through your forms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Intellectual Property</h2>
            <p className="text-gray-600 mb-4">
              The Service and its original content, features, and functionality are owned by Forma and are
              protected by international copyright, trademark, and other intellectual property laws. Our
              trademarks may not be used without prior written consent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Third-Party Integrations</h2>
            <p className="text-gray-600 mb-4">
              The Service may integrate with third-party services (e.g., Slack, Google Sheets, Zapier).
              Your use of these integrations is subject to the respective third party's terms of service.
              We are not responsible for the practices of third-party services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Service Availability</h2>
            <p className="text-gray-600 mb-4">
              We strive for high availability but do not guarantee uninterrupted access to the Service.
              We may suspend or terminate the Service for maintenance, updates, or circumstances beyond
              our control. We will make reasonable efforts to provide advance notice of planned downtime.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, FORMA SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA,
              OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
            </p>
            <p className="text-gray-600 mb-4">
              OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS
              PRECEDING THE CLAIM.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Disclaimer of Warranties</h2>
            <p className="text-gray-600 mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER
              EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Termination</h2>
            <p className="text-gray-600 mb-4">
              We may terminate or suspend your account immediately, without prior notice, for conduct that
              we believe violates these Terms or is harmful to other users, us, or third parties, or for
              any other reason at our sole discretion.
            </p>
            <p className="text-gray-600 mb-4">
              Upon termination, your right to use the Service will immediately cease. You may export your
              data before termination. We may delete your data 30 days after account termination.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to modify these Terms at any time. We will notify you of significant
              changes by posting the new Terms on this page and updating the "Last updated" date. Your
              continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Governing Law</h2>
            <p className="text-gray-600 mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the State of
              Delaware, United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">15. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have any questions about these Terms, please{' '}
              <Link href="/contact" className="text-safety-orange hover:underline">contact us</Link>.
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-wrap gap-6 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy Policy
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
