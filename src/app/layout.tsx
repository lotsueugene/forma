import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import SessionProvider from '@/components/providers/SessionProvider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://withforma.io'),
  title: {
    default: 'Forma - The Modern Form Builder',
    template: '%s | Forma',
  },
  description: 'Build powerful forms, collect submissions, accept payments, and integrate with your favorite tools. Drag-and-drop builder with analytics, custom branding, and enterprise-grade security.',
  keywords: ['form builder', 'forms', 'online forms', 'surveys', 'integrations', 'saas', 'typeform alternative', 'payment forms', 'form analytics', 'custom forms'],
  authors: [{ name: 'Forma', url: 'https://withforma.io' }],
  creator: 'Forma',
  publisher: 'Forma',
  alternates: {
    canonical: 'https://withforma.io',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://withforma.io',
    title: 'Forma - The Modern Form Builder',
    description: 'Build powerful forms, collect submissions, accept payments, and integrate with your favorite tools.',
    siteName: 'Forma',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Forma - The Modern Form Builder',
    description: 'Build powerful forms, collect submissions, accept payments, and integrate with your favorite tools.',
  },
  verification: {
    google: 'JzO0nFZZ2-_OhGl1g2SdjyW3d-P5qP4Eb6dlhJoq78E',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Forma',
              url: 'https://withforma.io',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              description: 'Build powerful forms, collect submissions, accept payments, and integrate with your favorite tools.',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                description: 'Free plan available',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '100',
              },
            }),
          }}
        />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
