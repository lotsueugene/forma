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
            <Stack size={24} weight="fill" className="text-gray-900" />
            <span className="font-sans text-xl font-medium tracking-tight text-gray-900">Forma</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn btn-secondary text-sm">Sign In</Link>
            <Link href="/signup" className="btn btn-primary text-sm">Get Started Free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-16 pb-12 lg:pt-24 lg:pb-16">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2.5 h-2.5 rounded-full bg-safety-orange shadow-[0_0_8px_rgba(239,111,46,0.6)]" />
              <span className="font-mono text-[13px] uppercase tracking-[-0.015rem] text-gray-700">Templates</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-gray-900 mb-6">
              Start with a template<span className="text-safety-orange">.</span>
            </h1>
            <p className="font-mono text-base sm:text-lg text-gray-700 leading-relaxed max-w-2xl">
              {FORM_TEMPLATES.length} professionally designed form templates. Pick one, customize it,
              and start collecting responses in under a minute.
            </p>
          </div>
        </div>
      </section>

      {/* Category nav */}
      <div className="border-b border-gray-200 sticky top-0 bg-white/80 backdrop-blur-md z-30">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9">
          <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide">
            <a
              href="#all"
              className="px-4 py-2 rounded-lg font-mono text-[13px] uppercase tracking-[-0.015rem] whitespace-nowrap bg-gray-900 text-white"
            >
              All
            </a>
            {categories.map(cat => (
              <a
                key={cat}
                href={`#${cat.toLowerCase()}`}
                className="px-4 py-2 rounded-lg font-mono text-[13px] uppercase tracking-[-0.015rem] whitespace-nowrap text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {cat}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Templates grid */}
      <main className="py-12 lg:py-16">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9">
          {categories.map(category => {
            const categoryTemplates = FORM_TEMPLATES.filter(t => t.category === category);
            return (
              <div key={category} id={category.toLowerCase()} className="mb-16 last:mb-0 scroll-mt-20">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-sm font-mono uppercase tracking-wider text-gray-900 font-medium">{category}</h2>
                  <span className="text-xs text-gray-400 font-mono">{categoryTemplates.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {categoryTemplates.map(template => (
                    <Link
                      key={template.slug}
                      href={`/templates/${template.slug}`}
                      className="group relative rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-lg transition-all duration-300"
                    >
                      {/* Color preview bar */}
                      <div
                        className="h-32 relative flex items-center justify-center"
                        style={{
                          backgroundColor: template.settings?.branding?.backgroundColor || '#f9fafb',
                        }}
                      >
                        {/* Mini form mockup */}
                        <div
                          className="w-3/4 max-w-[200px] rounded-lg p-3 space-y-2 shadow-sm"
                          style={{
                            backgroundColor: template.settings?.branding?.backgroundColor === '#0f172a' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
                            border: `1px solid ${template.settings?.branding?.backgroundColor === '#0f172a' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                          }}
                        >
                          {template.fields.slice(0, 3).map((field, i) => (
                            <div key={i} className="space-y-1">
                              <div
                                className="h-1.5 rounded-full w-1/3"
                                style={{
                                  backgroundColor: template.settings?.branding?.textColor
                                    ? `${template.settings.branding.textColor}30`
                                    : 'rgba(0,0,0,0.15)',
                                }}
                              />
                              <div
                                className="h-5 rounded"
                                style={{
                                  backgroundColor: template.settings?.branding?.textColor
                                    ? `${template.settings.branding.textColor}08`
                                    : 'rgba(0,0,0,0.04)',
                                  border: `1px solid ${template.settings?.branding?.textColor ? `${template.settings.branding.textColor}10` : 'rgba(0,0,0,0.06)'}`,
                                }}
                              />
                            </div>
                          ))}
                          <div
                            className="h-5 rounded mt-1"
                            style={{ backgroundColor: template.settings?.branding?.accentColor || '#ef6f2e' }}
                          />
                        </div>

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
                            Preview →
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 group-hover:text-safety-orange transition-colors">
                            {template.title}
                          </h3>
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: template.settings?.branding?.accentColor || '#ef6f2e' }}
                          />
                        </div>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                          {template.tagline || template.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {template.useCases?.slice(0, 2).map(uc => (
                              <span key={uc} className="text-[11px] font-mono uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                {uc}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-gray-400 font-mono">{template.fields.length} fields</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          {/* CTA */}
          <div className="mt-16 pt-16 border-t border-gray-200 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">
              Don&apos;t see what you need?
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Build any form from scratch with our drag-and-drop builder, or describe what you need and let AI generate it.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/signup" className="btn btn-primary">Start Building</Link>
              <Link href="/" className="btn btn-secondary">Learn More</Link>
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
