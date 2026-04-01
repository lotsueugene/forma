import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Stack, ArrowLeft, MapPin, Clock, Briefcase, EnvelopeSimple, ArrowSquareOut } from '@phosphor-icons/react/dist/ssr';
import { prisma } from '@/lib/prisma';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getJob(slug: string) {
  const job = await prisma.jobPosting.findUnique({
    where: { slug, published: true },
  });
  return job;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJob(slug);

  if (!job) {
    return { title: 'Job Not Found | Forma' };
  }

  return {
    title: `${job.title} | Careers | Forma`,
    description: `Join Forma as ${job.title}. ${job.location} - ${job.type}`,
  };
}

export const dynamic = 'force-dynamic';

export default async function JobPostingPage({ params }: Props) {
  const { slug } = await params;
  const job = await getJob(slug);

  if (!job) {
    notFound();
  }

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

      {/* Content */}
      <main className="py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4">
          {/* Back link */}
          <Link
            href="/careers"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-safety-orange mb-8 transition-colors"
          >
            <ArrowLeft size={16} />
            All Positions
          </Link>

          {/* Job header */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <span className="text-sm font-medium text-safety-orange mb-2 block">
              {job.department}
            </span>
            <h1 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-4">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <MapPin size={16} />
                {job.location}
              </span>
              <span className="flex items-center gap-2">
                <Clock size={16} />
                {job.type}
              </span>
              <span className="flex items-center gap-2">
                <Briefcase size={16} />
                {job.department}
              </span>
              {job.salary && (
                <span className="text-safety-orange font-semibold">
                  {job.salary}
                </span>
              )}
            </div>
          </div>

          {/* Apply CTA - Mobile */}
          <div className="mb-8 lg:hidden">
            <ApplyButton job={job} title={job.title} />
          </div>

          <div className="lg:flex lg:gap-12">
            {/* Main content */}
            <div className="flex-1">
              {/* Description */}
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Role</h2>
                <div className="prose prose-gray max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: formatContent(job.description) }} />
                </div>
              </section>

              {/* Requirements */}
              {job.requirements && (
                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Requirements</h2>
                  <div className="prose prose-gray max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: formatContent(job.requirements) }} />
                  </div>
                </section>
              )}

              {/* Benefits */}
              {job.benefits && (
                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Benefits</h2>
                  <div className="prose prose-gray max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: formatContent(job.benefits) }} />
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar - Desktop */}
            <div className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-8">
                <div className="border border-gray-200 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Apply for this role</h3>
                  <ApplyButton job={job} title={job.title} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-16">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-9 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Forma. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function ApplyButton({ job, title }: { job: { applyFormId: string | null; applyUrl: string | null; applyEmail: string | null }; title: string }) {
  // Priority: Form > URL > Email
  if (job.applyFormId) {
    return (
      <a
        href={`/f/${job.applyFormId}`}
        className="btn btn-primary w-full justify-center"
      >
        Apply Now
        <ArrowSquareOut size={18} />
      </a>
    );
  }

  if (job.applyUrl) {
    return (
      <a
        href={job.applyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary w-full justify-center"
      >
        Apply Now
        <ArrowSquareOut size={18} />
      </a>
    );
  }

  if (job.applyEmail) {
    return (
      <a
        href={`mailto:${job.applyEmail}?subject=Application: ${title}`}
        className="btn btn-primary w-full justify-center"
      >
        Apply via Email
        <EnvelopeSimple size={18} />
      </a>
    );
  }

  return null;
}

// Simple markdown-to-HTML conversion
function formatContent(content: string): string {
  return content
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Line breaks
    .replace(/\n/g, '<br>')
    // Wrap in paragraph
    .replace(/^(.+)$/gim, (match) => {
      if (match.startsWith('<')) return match;
      return `<p>${match}</p>`;
    });
}
