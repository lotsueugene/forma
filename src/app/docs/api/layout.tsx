import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Reference',
  description:
    'Forma API reference — REST endpoints for forms, submissions, workspaces, webhooks, and integrations. Authentication, rate limits, and code examples.',
  alternates: { canonical: '/docs/api' },
  openGraph: {
    title: 'Forma API Reference',
    description: 'REST API for forms, submissions, workspaces, and webhooks.',
    url: '/docs/api',
  },
};

export default function DocsApiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
