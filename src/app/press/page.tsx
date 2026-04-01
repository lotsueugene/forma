import { Metadata } from 'next';
import Link from 'next/link';
import { Stack, ChatsCircle } from '@phosphor-icons/react/dist/ssr';

export const metadata: Metadata = {
  title: 'Press | Forma',
  description: 'Press resources, brand assets, and media contact information for Forma.',
};

export default function PressPage() {
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
            Press
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Resources for journalists and media professionals.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          {/* About */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">About Forma</h2>
            <p className="text-gray-600 mb-4">
              Forma is a modern form builder designed for teams of all sizes. We provide powerful
              tools, automation, and integrations that make it easy to collect and manage form
              submissions at any scale.
            </p>
            <p className="text-gray-600">
              Founded to solve the frustrations teams face with existing form solutions,
              Forma offers a streamlined approach with intuitive design, powerful features,
              and enterprise-grade security.
            </p>
          </section>

          {/* Brand Assets */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Brand Assets</h2>
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-16 h-16 rounded-xl bg-safety-orange flex items-center justify-center">
                  <Stack size={32} weight="fill" className="text-white" />
                </div>
                <div className="w-16 h-16 rounded-xl bg-gray-900 flex items-center justify-center">
                  <Stack size={32} weight="fill" className="text-white" />
                </div>
                <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center">
                  <Stack size={32} weight="fill" className="text-gray-900" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Our primary brand color is Safety Orange (#ef6f2e). The logo can be used on
                light or dark backgrounds.
              </p>
              <p className="text-sm text-gray-500">
                For brand assets and usage guidelines, please contact our press team.
              </p>
            </div>
          </section>

          {/* Media Contact */}
          <section className="p-8 bg-gray-50 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-safety-orange/10 flex items-center justify-center flex-shrink-0">
                <ChatsCircle size={24} className="text-safety-orange" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Media Contact
                </h2>
                <p className="text-gray-600 mb-4">
                  For press inquiries, interview requests, or media resources, please reach out through our contact form.
                </p>
                <Link
                  href="/contact"
                  className="btn btn-primary inline-flex"
                >
                  Contact Us
                </Link>
              </div>
            </div>
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
