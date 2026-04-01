import { Metadata } from 'next';
import Link from 'next/link';
import { Stack, Buildings, Users, Globe, Lightning } from '@phosphor-icons/react/dist/ssr';

export const metadata: Metadata = {
  title: 'About | Forma',
  description: 'Learn about Forma - the developer-first form builder built for modern teams.',
};

export default function AboutPage() {
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
            About Forma
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We're building the form infrastructure that developers actually want to use.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="prose prose-gray prose-lg max-w-none">
            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600">
                Forma was built out of frustration with existing form solutions. We believe developers
                deserve tools that are powerful, flexible, and actually enjoyable to use. No more
                fighting with clunky interfaces or limited APIs.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">What Sets Us Apart</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose">
                <div className="border border-gray-200 rounded-xl p-6">
                  <Lightning size={24} weight="duotone" className="text-safety-orange mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Developer First</h3>
                  <p className="text-sm text-gray-600">
                    Built with developers in mind. Clean APIs, webhooks, SDKs, and integrations that just work.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <Globe size={24} weight="duotone" className="text-safety-orange mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Modern Stack</h3>
                  <p className="text-sm text-gray-600">
                    Built on modern infrastructure for speed, reliability, and global scale.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <Users size={24} weight="duotone" className="text-safety-orange mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Team Collaboration</h3>
                  <p className="text-sm text-gray-600">
                    Workspaces, roles, and permissions designed for real-world team workflows.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-xl p-6">
                  <Buildings size={24} weight="duotone" className="text-safety-orange mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Enterprise Ready</h3>
                  <p className="text-sm text-gray-600">
                    Security, compliance, and customization options for organizations of all sizes.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
              <p className="text-gray-600 mb-4">
                We'd love to hear from you. Whether you have questions, feedback, or just want to say hi.
              </p>
              <Link href="/contact" className="btn btn-primary inline-flex">
                Contact Us
              </Link>
            </section>
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
