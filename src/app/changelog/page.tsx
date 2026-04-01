import { Metadata } from 'next';
import Link from 'next/link';
import { Stack, Sparkle, Bug, Wrench, Plus } from '@phosphor-icons/react/dist/ssr';

export const metadata: Metadata = {
  title: 'Changelog | Forma',
  description: 'See what\'s new in Forma. Latest updates, features, and improvements.',
};

const changelogEntries = [
  {
    version: '1.0.0',
    date: 'April 2026',
    title: 'Initial Release',
    changes: [
      { type: 'feature', text: 'Form builder with drag-and-drop interface' },
      { type: 'feature', text: 'REST API for form submissions' },
      { type: 'feature', text: 'Webhook integrations' },
      { type: 'feature', text: 'Slack notifications' },
      { type: 'feature', text: 'Google Sheets integration' },
      { type: 'feature', text: 'Team workspaces with role-based access' },
      { type: 'feature', text: 'Custom domains' },
      { type: 'feature', text: 'API key management' },
    ],
  },
];

function ChangeTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'feature':
      return <Sparkle size={14} weight="fill" className="text-safety-orange" />;
    case 'fix':
      return <Bug size={14} weight="fill" className="text-green-500" />;
    case 'improvement':
      return <Wrench size={14} weight="fill" className="text-blue-500" />;
    default:
      return <Plus size={14} weight="fill" className="text-gray-400" />;
  }
}

export default function ChangelogPage() {
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
            Changelog
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See what's new in Forma. We ship updates frequently.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="space-y-12">
            {changelogEntries.map((entry) => (
              <article key={entry.version} className="relative">
                {/* Version header */}
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-2xl font-semibold text-gray-900">
                    v{entry.version}
                  </span>
                  <span className="text-sm text-gray-500">
                    {entry.date}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-xl font-medium text-gray-900 mb-4">
                  {entry.title}
                </h2>

                {/* Changes list */}
                <ul className="space-y-3">
                  {entry.changes.map((change, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="mt-0.5">
                        <ChangeTypeIcon type={change.type} />
                      </span>
                      <span className="text-gray-600">{change.text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          {/* Subscribe */}
          <div className="mt-16 p-8 bg-gray-50 rounded-xl text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Stay Updated
            </h2>
            <p className="text-gray-600 mb-4">
              Get notified about new features and updates.
            </p>
            <Link href="/signup" className="btn btn-primary">
              Create an Account
            </Link>
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
