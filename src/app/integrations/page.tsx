import { Metadata } from 'next';
import Link from 'next/link';
import { Stack, WebhooksLogo, GoogleLogo, SlackLogo, NotionLogo, Code, ArrowRight } from '@phosphor-icons/react/dist/ssr';

export const metadata: Metadata = {
  title: 'Integrations | Forma',
  description: 'Connect Forma with your favorite tools. Webhooks, Slack, Google Sheets, Notion, and more.',
};

const integrations = [
  {
    title: 'Webhooks',
    description: 'Send form submissions to any endpoint in real-time.',
    icon: WebhooksLogo,
    available: true,
  },
  {
    title: 'Slack',
    description: 'Get notified in Slack when new submissions arrive.',
    icon: SlackLogo,
    available: true,
  },
  {
    title: 'Google Sheets',
    description: 'Automatically add submissions to a Google Sheet.',
    icon: GoogleLogo,
    available: true,
  },
  {
    title: 'Notion',
    description: 'Sync form data to your Notion databases.',
    icon: NotionLogo,
    available: false,
    comingSoon: true,
  },
  {
    title: 'REST API',
    description: 'Full API access for custom integrations.',
    icon: Code,
    available: true,
  },
];

export default function IntegrationsPage() {
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

      {/* Hero */}
      <section className="py-16 lg:py-24 border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl lg:text-5xl font-semibold text-gray-900 mb-4">
            Integrations
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect Forma with your favorite tools. Automate workflows and keep your data in sync.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="space-y-4">
            {integrations.map((integration) => (
              <div
                key={integration.title}
                className="border border-gray-200 rounded-xl p-6 flex items-center justify-between hover:border-safety-orange/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <integration.icon size={24} className="text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {integration.title}
                      </h3>
                      {integration.comingSoon && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {integration.description}
                    </p>
                  </div>
                </div>
                {integration.available && (
                  <Link href="/docs/integrations" className="btn btn-secondary text-sm">
                    Learn more
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 p-8 bg-gray-50 rounded-xl text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Need a custom integration?
            </h2>
            <p className="text-gray-600 mb-4">
              Our API and webhooks let you connect Forma to any system.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/docs/api" className="btn btn-secondary">
                API Docs
              </Link>
              <Link href="/contact" className="btn btn-primary">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Forma. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
