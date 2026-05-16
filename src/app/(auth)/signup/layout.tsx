import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign up — free forever plan',
  description:
    'Create a free Forma account. Build unlimited forms on the free plan, no credit card required. Drag-and-drop builder, integrations, and payments.',
  alternates: { canonical: '/signup' },
  openGraph: {
    title: 'Sign up for Forma — free forever plan',
    description: 'Create a free Forma account. Build unlimited forms, no credit card required.',
    url: '/signup',
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
