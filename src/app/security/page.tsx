import { Metadata } from 'next';
import Link from 'next/link';
import { Stack, Shield, Lock, Key, HardDrives, CheckCircle } from '@phosphor-icons/react/dist/ssr';

export const metadata: Metadata = {
  title: 'Security | Forma',
  description: 'Learn about Forma\'s security practices and how we protect your data.',
};

const securityFeatures = [
  {
    title: 'Encryption',
    description: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256).',
    icon: Lock,
  },
  {
    title: 'Authentication',
    description: 'Secure password hashing with bcrypt. Support for OAuth providers.',
    icon: Key,
  },
  {
    title: 'Infrastructure',
    description: 'Hosted on enterprise-grade infrastructure with regular security audits.',
    icon: HardDrives,
  },
  {
    title: 'Access Control',
    description: 'Role-based permissions and workspace isolation.',
    icon: Shield,
  },
];

const compliance = [
  'GDPR compliant',
  'CCPA compliant',
  'SOC 2 Type II (in progress)',
  'Regular penetration testing',
  'Vulnerability disclosure program',
];

export default function SecurityPage() {
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
            Security
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your data security is our top priority. Learn about how we protect your information.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          {/* Security Features */}
          <section className="mb-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8">Security Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {securityFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="border border-gray-200 rounded-xl p-6"
                >
                  <div className="w-10 h-10 rounded-lg bg-safety-orange/10 flex items-center justify-center mb-4">
                    <feature.icon size={20} className="text-safety-orange" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Compliance */}
          <section className="mb-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8">Compliance</h2>
            <div className="border border-gray-200 rounded-xl p-6">
              <ul className="space-y-3">
                {compliance.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle size={20} weight="fill" className="text-safety-orange" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Report Vulnerability */}
          <section className="p-8 bg-gray-50 rounded-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Report a Security Issue
            </h2>
            <p className="text-gray-600 mb-4">
              If you've discovered a security vulnerability, please report it responsibly
              through our contact form. We appreciate your help in keeping Forma secure.
            </p>
            <Link href="/contact" className="btn btn-primary">
              Report Vulnerability
            </Link>
          </section>
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
