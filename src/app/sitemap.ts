import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { FORM_TEMPLATES } from '@/lib/form-templates';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://withforma.io';

  // Static pages
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${baseUrl}/templates`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${baseUrl}/integrations`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/docs`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/docs/api`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/changelog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.5 },
    { url: `${baseUrl}/security`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/cookies`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.2 },
    { url: `${baseUrl}/press`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${baseUrl}/careers`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: 'yearly' as const, priority: 0.5 },
  ];

  // Dynamic blog posts
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
    blogPages = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    // Blog table might not exist yet
  }

  // Blog index
  blogPages.unshift({
    url: `${baseUrl}/blog`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  });

  // Dynamic career pages
  let careerPages: MetadataRoute.Sitemap = [];
  try {
    const jobs = await prisma.jobPosting.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
    careerPages = jobs.map((job) => ({
      url: `${baseUrl}/careers/${job.slug}`,
      lastModified: job.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));
  } catch {
    // Table might not exist yet
  }

  // Template pages
  const templatePages: MetadataRoute.Sitemap = FORM_TEMPLATES.map((t) => ({
    url: `${baseUrl}/templates/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Comparison pages
  const comparePages: MetadataRoute.Sitemap = ['typeform', 'jotform', 'tally', 'google-forms'].map((c) => ({
    url: `${baseUrl}/compare/${c}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...blogPages, ...careerPages, ...templatePages, ...comparePages];
}
