import { Metadata } from 'next';
import Link from 'next/link';
import { Stack } from '@phosphor-icons/react/dist/ssr';

export const metadata: Metadata = {
  title: 'Cookie Policy | Forma',
  description: 'Learn about how Forma uses cookies and similar technologies.',
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Stack size={24} weight="fill" className="text-safety-orange" />
            <span className="font-sans text-xl font-medium tracking-tight text-gray-900">
              Forma
            </span>
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Sign In
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Cookie Policy</h1>
            <p className="text-gray-500 text-sm">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">What Are Cookies</h2>
              <p className="text-gray-600 mb-4">
                Cookies are small text files that are stored on your device when you visit a website.
                They help the website remember your preferences and improve your experience.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">How We Use Cookies</h2>
              <p className="text-gray-600 mb-4">Forma uses cookies for the following purposes:</p>

              <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">Essential Cookies</h3>
              <p className="text-gray-600 mb-4">
                Required for the website to function properly. These include authentication cookies
                that keep you logged in and session cookies for maintaining your preferences.
              </p>

              <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">Analytics Cookies</h3>
              <p className="text-gray-600 mb-4">
                Help us understand how visitors interact with our website. This information is used
                to improve our service. These cookies are optional and can be disabled.
              </p>

              <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">Preference Cookies</h3>
              <p className="text-gray-600 mb-4">
                Remember your settings and preferences, such as language and theme choices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Managing Cookies</h2>
              <p className="text-gray-600 mb-4">
                You can control cookies through your browser settings. Most browsers allow you to:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>View what cookies are stored on your device</li>
                <li>Delete individual cookies or all cookies</li>
                <li>Block third-party cookies</li>
                <li>Block cookies from specific websites</li>
                <li>Block all cookies</li>
              </ul>
              <p className="text-gray-600 mb-4">
                Note: Blocking essential cookies may affect your ability to use our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Third-Party Cookies</h2>
              <p className="text-gray-600 mb-4">
                We may use third-party services that set their own cookies, including:
              </p>
              <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
                <li>Payment processors (Stripe)</li>
                <li>Analytics services</li>
                <li>Authentication providers (Google, GitHub)</li>
              </ul>
              <p className="text-gray-600 mb-4">
                These third parties have their own privacy policies governing their use of cookies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-600 mb-4">
                If you have questions about our use of cookies, please contact us at{' '}
                <a href="mailto:privacy@withforma.io" className="text-safety-orange hover:underline">
                  privacy@withforma.io
                </a>.
              </p>
            </section>
          </div>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-wrap gap-6 text-sm text-gray-500">
              <Link href="/privacy" className="hover:text-gray-900 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-gray-900 transition-colors">
                Terms of Service
              </Link>
              <Link href="/" className="hover:text-gray-900 transition-colors">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
