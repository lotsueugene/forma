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

const appUrl = process.env.NEXTAUTH_URL || 'https://withforma.io';

// Title and description lengths are tuned for SERP / social previews:
// title 52 chars (target 50-60), description 137 chars (target 110-160).
// Shorter and Google/Twitter will pad with arbitrary text or look skimpy;
// longer and they'll truncate the keyword tail.
const SITE_TITLE = 'Forma — Open-Source Form Builder with Payments & API';
const SITE_DESCRIPTION =
  'Build powerful forms, collect submissions, accept payments, and integrate with your stack. Open-source, self-hostable, free forever plan.';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: SITE_TITLE,
    template: '%s | Forma',
  },
  description: SITE_DESCRIPTION,
  keywords: ['form builder', 'forms', 'online forms', 'surveys', 'integrations', 'saas', 'typeform alternative', 'payment forms', 'form analytics', 'custom forms', 'open source form builder', 'self-hosted forms'],
  authors: [{ name: 'Forma', url: appUrl }],
  creator: 'Forma',
  publisher: 'Forma',
  alternates: {
    canonical: appUrl,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: appUrl,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: 'Forma',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
              url: appUrl,
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              description: 'Build powerful forms, collect submissions, accept payments, and integrate with your favorite tools.',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                description: 'Free plan available',
              },
              // aggregateRating omitted until we have real collected reviews
              // (G2, Capterra, on-platform). Google treats fabricated ratings
              // as spam and can demote the whole site.
            }),
          }}
        />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
