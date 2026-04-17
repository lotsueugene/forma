import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/admin/',
          '/_next/',
          '/f/', // Public forms shouldn't be indexed (they're user content)
        ],
      },
    ],
    sitemap: `${process.env.NEXTAUTH_URL || 'https://withforma.io'}/sitemap.xml`,
  };
}
