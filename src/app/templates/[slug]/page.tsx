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

  const accent = template.settings?.branding?.accentColor || '#ef6f2e';
  const bg = template.settings?.branding?.backgroundColor || '#ffffff';
  const textColor = template.settings?.branding?.textColor || '#111827';
  const isLightBg = parseInt(bg.slice(1, 3), 16) * 0.299 + parseInt(bg.slice(3, 5), 16) * 0.587 + parseInt(bg.slice(5, 7), 16) * 0.114 > 150;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Stack size={24} weight="fill" className="text-gray-900" />
            <span className="font-sans text-xl font-medium tracking-tight text-gray-900">Forma</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/templates" className="text-sm text-gray-600 hover:text-gray-900 font-mono uppercase tracking-[-0.015rem]">All Templates</Link>
            <Link href="/login" className="btn btn-secondary text-sm">Sign In</Link>
          </div>
        </div>
      </header>

      <main className="py-12 lg:py-20">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">

            {/* Left — Info */}
            <div className="lg:sticky lg:top-24">
              <div className="flex items-center gap-3 mb-6">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: accent }}
                />
                <span className="font-mono text-[13px] uppercase tracking-[-0.015rem] text-gray-500">{template.category}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-gray-900 mb-4">
                {template.title}
              </h1>

              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-lg">
                {template.description}
              </p>

              {/* Use cases */}
              {template.useCases && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {template.useCases.map(uc => (
                    <span key={uc} className="text-xs font-mono uppercase tracking-wider text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                      {uc}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 mb-10 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{template.fields.length}</span> fields
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{Math.max(1, Math.ceil(template.fields.length * 0.3))}</span> min to complete
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{template.settings?.displayMode === 'classic' ? 'Classic' : 'Conversational'}</span> mode
                </div>
              </div>

              {/* CTA */}
              <div className="flex gap-3 mb-8">
                <TemplateUseButton template={template} />
                <Link href="/templates" className="btn btn-secondary">
                  Browse All
                </Link>
              </div>

              {/* Field list */}
              <div className="border-t border-gray-200 pt-8">
                <h3 className="font-mono text-[13px] uppercase tracking-wider text-gray-500 mb-4">Included fields</h3>
                <div className="space-y-2">
                  {template.fields.map((field, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-xs font-mono text-gray-500">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-900">{field.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400 uppercase">{field.type}</span>
                        {field.required && (
                          <span className="text-[10px] font-mono uppercase tracking-wider text-safety-orange bg-safety-orange/10 px-1.5 py-0.5 rounded">req</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Live preview */}
            <div>
              <div
                className="rounded-2xl overflow-hidden shadow-2xl border"
                style={{
                  borderColor: isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
                }}
              >
                {/* Browser chrome */}
                <div
                  className="flex items-center gap-2 px-4 py-3 border-b"
                  style={{
                    backgroundColor: isLightBg ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                    borderColor: isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                    <div className="w-3 h-3 rounded-full bg-green-400/60" />
                  </div>
                  <div
                    className="flex-1 mx-4 h-6 rounded-md text-center text-[11px] font-mono leading-6"
                    style={{
                      backgroundColor: isLightBg ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                      color: isLightBg ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    withforma.io/f/...
                  </div>
                </div>

                {/* Form preview */}
                <div
                  className="p-8 sm:p-10 min-h-[500px] flex flex-col justify-center"
                  style={{ backgroundColor: bg }}
                >
                  {/* Welcome screen mockup */}
                  {template.settings?.displayMode !== 'classic' ? (
                    <div className="max-w-md mx-auto text-center">
                      <h2
                        className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
                        style={{ color: textColor }}
                      >
                        {template.title}
                      </h2>
                      {template.tagline && (
                        <p
                          className="text-base mb-8 leading-relaxed"
                          style={{ color: `${textColor}77` }}
                        >
                          {template.tagline}
                        </p>
                      )}
                      <div
                        className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white"
                        style={{ backgroundColor: accent, boxShadow: `0 4px 14px ${accent}40` }}
                      >
                        Start →
                      </div>
                      <p
                        className="mt-4 text-sm"
                        style={{ color: `${textColor}33` }}
                      >
                        Takes about {Math.max(1, Math.ceil(template.fields.length * 0.3))} min
                      </p>
                    </div>
                  ) : (
                    // Classic mode preview
                    <div className="max-w-md mx-auto w-full">
                      <h2
                        className="text-2xl font-bold tracking-tight mb-2 text-center"
                        style={{ color: textColor }}
                      >
                        {template.title}
                      </h2>
                      <p
                        className="text-sm mb-6 text-center"
                        style={{ color: `${textColor}66` }}
                      >
                        {template.tagline}
                      </p>
                      <div
                        className="rounded-xl p-6 space-y-4"
                        style={{
                          backgroundColor: isLightBg ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${isLightBg ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)'}`,
                        }}
                      >
                        {template.fields.slice(0, 4).map((field, i) => (
                          <div key={i} className="space-y-1.5">
                            <div
                              className="text-xs font-semibold uppercase tracking-wider"
                              style={{ color: `${textColor}88` }}
                            >
                              {field.label} {field.required && <span style={{ color: accent }}>*</span>}
                            </div>
                            <div
                              className="h-10 rounded-lg"
                              style={{
                                backgroundColor: isLightBg ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.06)',
                                border: `1.5px solid ${isLightBg ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
                              }}
                            />
                          </div>
                        ))}
                        {template.fields.length > 4 && (
                          <p className="text-xs text-center" style={{ color: `${textColor}44` }}>
                            +{template.fields.length - 4} more fields
                          </p>
                        )}
                        <div
                          className="h-10 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: accent }}
                        >
                          Submit
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Powered by */}
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
                <Stack size={14} weight="fill" />
                <span>Built with Forma</span>
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
