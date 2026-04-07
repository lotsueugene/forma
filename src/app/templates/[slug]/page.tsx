import { Metadata } from 'next';
import Link from 'next/link';
import { Stack } from '@phosphor-icons/react/dist/ssr';
import { FORM_TEMPLATES } from '@/lib/form-templates';
import TemplateUseButton from './TemplateUseButton';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const template = FORM_TEMPLATES.find(t => t.slug === slug);
  if (!template) return { title: 'Template Not Found' };
  return {
    title: template.seoTitle,
    description: template.seoDescription,
  };
}

export async function generateStaticParams() {
  return FORM_TEMPLATES.map(t => ({ slug: t.slug }));
}

export default async function TemplatePage({ params }: Props) {
  const { slug } = await params;
  const template = FORM_TEMPLATES.find(t => t.slug === slug);

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Template not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Stack size={24} weight="fill" className="text-safety-orange" />
            <span className="font-sans text-xl font-medium tracking-tight text-gray-900">Forma</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/templates" className="text-sm text-gray-600 hover:text-gray-900">All Templates</Link>
            <Link href="/login" className="btn btn-secondary text-sm">Sign In</Link>
          </div>
        </div>
      </header>

      <main className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-4">
            <span className="text-xs font-medium text-safety-orange uppercase tracking-wider">{template.category}</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{template.title}</h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl">{template.description}</p>

          <div className="flex gap-3 mb-12">
            <TemplateUseButton template={template} />
            <Link href="/templates" className="btn btn-secondary">
              Browse All Templates
            </Link>
          </div>

          {/* Preview */}
          <div className="card p-8 max-w-xl">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-6">Form Preview</h2>
            <div className="space-y-5">
              {template.fields.map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <div className="h-24 bg-gray-50 border border-gray-200 rounded-lg" />
                  ) : field.type === 'select' ? (
                    <div className="h-10 bg-gray-50 border border-gray-200 rounded-lg px-3 flex items-center text-sm text-gray-400">
                      {field.options?.[0] || 'Select...'}
                    </div>
                  ) : field.type === 'radio' ? (
                    <div className="space-y-2">
                      {field.options?.slice(0, 3).map((opt) => (
                        <div key={opt} className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                          {opt}
                        </div>
                      ))}
                      {(field.options?.length || 0) > 3 && (
                        <p className="text-xs text-gray-400">+{(field.options?.length || 0) - 3} more options</p>
                      )}
                    </div>
                  ) : field.type === 'rating' ? (
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(s => (
                        <div key={s} className="w-8 h-8 text-gray-300 text-xl">★</div>
                      ))}
                    </div>
                  ) : field.type === 'file' ? (
                    <div className="h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-400">
                      Click to upload
                    </div>
                  ) : field.type === 'payment' ? (
                    <div className="h-16 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center text-sm text-gray-400">
                      Payment via Stripe
                    </div>
                  ) : (
                    <div className="h-10 bg-gray-50 border border-gray-200 rounded-lg px-3 flex items-center text-sm text-gray-400">
                      {field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    </div>
                  )}
                </div>
              ))}
              <div className="h-10 bg-safety-orange rounded-lg flex items-center justify-center text-sm font-medium text-white">
                Submit
              </div>
            </div>
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
