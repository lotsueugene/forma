import { Metadata } from 'next';
import Link from 'next/link';
import { Stack, FileText, EnvelopeSimple, ChatCircle, UserCircle, Calendar, Star } from '@phosphor-icons/react/dist/ssr';

export const metadata: Metadata = {
  title: 'Templates | Forma',
  description: 'Start with pre-built form templates. Contact forms, feedback surveys, registration forms, and more.',
};

const templates = [
  {
    title: 'Contact Form',
    description: 'Simple contact form with name, email, and message fields.',
    icon: EnvelopeSimple,
    category: 'Contact',
  },
  {
    title: 'Feedback Survey',
    description: 'Collect customer feedback with ratings and comments.',
    icon: ChatCircle,
    category: 'Feedback',
  },
  {
    title: 'User Registration',
    description: 'Registration form with email verification.',
    icon: UserCircle,
    category: 'Auth',
  },
  {
    title: 'Event Registration',
    description: 'Event signup with attendee details and preferences.',
    icon: Calendar,
    category: 'Events',
  },
  {
    title: 'Newsletter Signup',
    description: 'Simple email capture for newsletter subscriptions.',
    icon: EnvelopeSimple,
    category: 'Marketing',
  },
  {
    title: 'NPS Survey',
    description: 'Net Promoter Score survey with follow-up questions.',
    icon: Star,
    category: 'Feedback',
  },
];

export default function TemplatesPage() {
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
            Form Templates
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start with a template and customize it to your needs. Save time with pre-built forms.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div
                key={template.title}
                className="border border-gray-200 rounded-xl p-6 hover:border-safety-orange/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-safety-orange/10 flex items-center justify-center mb-4">
                  <template.icon size={24} className="text-safety-orange" />
                </div>
                <span className="text-xs font-medium text-safety-orange uppercase tracking-wider">
                  {template.category}
                </span>
                <h3 className="text-lg font-semibold text-gray-900 mt-2 mb-2">
                  {template.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {template.description}
                </p>
                <Link href="/signup" className="text-sm text-safety-orange hover:underline">
                  Use template
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 pt-12 border-t border-gray-200">
            <p className="text-gray-600 mb-4">
              Want to create a custom form from scratch?
            </p>
            <Link href="/signup" className="btn btn-primary">
              Get Started Free
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
