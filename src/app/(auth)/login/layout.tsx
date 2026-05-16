import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Forma account to manage forms, view submissions, and configure integrations.',
  alternates: { canonical: '/login' },
  // Login pages have no SEO upside — keep them out of the index so Google
  // ranks marketing pages for branded queries instead.
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
