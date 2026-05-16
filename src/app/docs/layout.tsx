import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'Forma documentation — guides, integrations, API reference, and examples for building forms, accepting payments, and wiring submissions into your stack.',
  alternates: { canonical: '/docs' },
  openGraph: {
    title: 'Forma Documentation',
    description: 'Guides, integrations, API reference, and examples for the Forma form builder.',
    url: '/docs',
  },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
