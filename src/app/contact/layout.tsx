import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with the Forma team. Sales, support, partnerships, or just a question — we read every message.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact Forma',
    description: 'Get in touch with the Forma team — sales, support, partnerships.',
    url: '/contact',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
