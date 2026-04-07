import { Metadata } from 'next';
import Link from 'next/link';
import { Stack } from '@phosphor-icons/react/dist/ssr';
import { FORM_TEMPLATES } from '@/lib/form-templates';

export const metadata: Metadata = {
  title: 'Free Form Templates | Forma',
  description: 'Start with free, pre-built form templates. Contact forms, feedback surveys, job applications, payment forms, and more. One-click setup, no coding required.',
};

export default function TemplatesPage() {
  const categories = [...new Set(FORM_TEMPLATES.map(t => t.category))];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Stack size={24} weight="fill" className="text-safety-orange" />
            <span className="font-sans text-xl font-medium tracking-tight text-gray-900">Forma</span>
          </Link>
          <Link href="/login" className="btn btn-secondary">Sign In</Link>
        </div>
      </header>

      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Form Templates
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-2">
            {FORM_TEMPLATES.length} free templates. One click to use. No coding required.
          </p>
        </div>
      </section>

      <main className="pb-16">
        <div className="mx-auto max-w-6xl px-4">
          {categories.map(category => {
            const categoryTemplates = FORM_TEMPLATES.filter(t => t.category === category);
            return (
              <div key={category} className="mb-12">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryTemplates.map(template => (
                    <Link
                      key={template.slug}
                      href={`/templates/${template.slug}`}
                      className="card p-5 hover:border-safety-orange/30 transition-all group"
                    >
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-safety-orange transition-colors">
                        {template.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">{template.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{template.fields.length} fields</span>
                        <span className="text-xs text-safety-orange font-medium">Use free &rarr;</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="text-center mt-12 pt-12 border-t border-gray-200">
            <p className="text-gray-600 mb-4">Want to build from scratch?</p>
            <Link href="/signup" className="btn btn-primary">Get Started Free</Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Forma. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
