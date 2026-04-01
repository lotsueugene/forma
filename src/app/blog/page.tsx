import { Metadata } from 'next';
import Link from 'next/link';
import { Stack, ArrowRight, Calendar, User } from '@phosphor-icons/react/dist/ssr';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Blog | Forma',
  description: 'Latest news, updates, and insights from the Forma team.',
};

export const dynamic = 'force-dynamic';

async function getBlogPosts() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      author: true,
      tags: true,
      publishedAt: true,
      featured: true,
    },
  });
  return posts;
}

export default async function BlogPage() {
  const posts = await getBlogPosts();
  const featuredPosts = posts.filter((p) => p.featured);
  const regularPosts = posts.filter((p) => !p.featured);

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
            Blog
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Latest news, product updates, and insights from the Forma team.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <>
              {/* Featured Posts */}
              {featuredPosts.length > 0 && (
                <div className="mb-16">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-8">Featured</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {featuredPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/blog/${post.slug}`}
                        className="group block"
                      >
                        <article className="border border-gray-200 rounded-xl overflow-hidden hover:border-safety-orange/50 transition-colors">
                          {post.coverImage && (
                            <div className="aspect-[2/1] overflow-hidden bg-gray-100">
                              <img
                                src={post.coverImage}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          <div className="p-6">
                            {post.tags && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {post.tags.split(',').slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs px-2 py-1 bg-safety-orange/10 text-safety-orange rounded"
                                  >
                                    {tag.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                            <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-safety-orange transition-colors">
                              {post.title}
                            </h3>
                            {post.excerpt && (
                              <p className="text-gray-600 mb-4 line-clamp-2">
                                {post.excerpt}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              {post.author && (
                                <span className="flex items-center gap-1">
                                  <User size={14} />
                                  {post.author}
                                </span>
                              )}
                              {post.publishedAt && (
                                <span className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        </article>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* All Posts */}
              {regularPosts.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-8">
                    {featuredPosts.length > 0 ? 'All Posts' : 'Latest Posts'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {regularPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/blog/${post.slug}`}
                        className="group block"
                      >
                        <article className="border border-gray-200 rounded-xl overflow-hidden hover:border-safety-orange/50 transition-colors h-full flex flex-col">
                          {post.coverImage && (
                            <div className="aspect-[16/9] overflow-hidden bg-gray-100">
                              <img
                                src={post.coverImage}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          <div className="p-5 flex-1 flex flex-col">
                            {post.tags && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {post.tags.split(',').slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                                  >
                                    {tag.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-safety-orange transition-colors">
                              {post.title}
                            </h3>
                            {post.excerpt && (
                              <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-1">
                                {post.excerpt}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-auto">
                              {post.publishedAt && (
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} />
                                  {new Date(post.publishedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        </article>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
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
