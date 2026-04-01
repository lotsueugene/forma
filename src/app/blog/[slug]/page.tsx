import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Stack, ArrowLeft, Calendar, User } from '@phosphor-icons/react/dist/ssr';
import { prisma } from '@/lib/prisma';

interface Props {
  params: Promise<{ slug: string }>;
}

async function getBlogPost(slug: string) {
  const post = await prisma.blogPost.findUnique({
    where: { slug, published: true },
  });
  return post;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return { title: 'Post Not Found | Forma' };
  }

  return {
    title: post.metaTitle || `${post.title} | Forma Blog`,
    description: post.metaDesc || post.excerpt || `Read ${post.title} on the Forma blog.`,
  };
}

export const dynamic = 'force-dynamic';

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
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
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-safety-orange mb-8 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Blog
          </Link>

          {/* Cover image */}
          {post.coverImage && (
            <div className="aspect-[2/1] rounded-xl overflow-hidden bg-gray-100 mb-8">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Tags */}
          {post.tags && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.split(',').map((tag) => (
                <span
                  key={tag}
                  className="text-sm px-3 py-1 bg-safety-orange/10 text-safety-orange rounded-full"
                >
                  {tag.trim()}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl lg:text-4xl font-semibold text-gray-900 mb-4">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-200">
            {post.author && (
              <span className="flex items-center gap-2">
                <User size={16} />
                {post.author}
              </span>
            )}
            {post.publishedAt && (
              <span className="flex items-center gap-2">
                <Calendar size={16} />
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>

          {/* Content */}
          <article className="prose prose-gray prose-lg max-w-none prose-headings:font-semibold prose-a:text-safety-orange prose-a:no-underline hover:prose-a:underline">
            <div dangerouslySetInnerHTML={{ __html: formatContent(post.content) }} />
          </article>
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
    // Code blocks
    .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Wrap in paragraph
    .replace(/^(.+)$/gim, (match) => {
      if (match.startsWith('<')) return match;
      return `<p>${match}</p>`;
    });
}
