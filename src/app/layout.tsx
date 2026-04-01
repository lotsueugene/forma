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
  title: 'Forma - The Modern Form Builder',
  description: 'Build powerful forms, collect submissions, and integrate with your favorite tools. Enterprise-grade security included.',
  keywords: ['form builder', 'forms', 'online forms', 'surveys', 'integrations', 'saas'],
  authors: [{ name: 'Forma' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://withforma.io',
    title: 'Forma - The Modern Form Builder',
    description: 'Build powerful forms, collect submissions, and integrate with your favorite tools.',
    siteName: 'Forma',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Forma - The Modern Form Builder',
    description: 'Build powerful forms, collect submissions, and integrate with your favorite tools.',
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
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
