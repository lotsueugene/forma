import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import FormPageClient from './FormPageClient';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const form = await prisma.form.findFirst({
      where: { id, status: 'active' },
      select: { name: true, description: true, settings: true },
    });

    if (!form) {
      return { title: 'Form Not Found' };
    }

    let settings = null;
    try { settings = form.settings ? JSON.parse(form.settings) : null; } catch { /* ignore */ }
    const social = settings?.social;

    const title = social?.title || form.name;
    const description = social?.description || form.description || `Fill out ${form.name}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        ...(social?.ogImage ? { images: [{ url: social.ogImage, width: 1200, height: 630 }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        ...(social?.ogImage ? { images: [social.ogImage] } : {}),
      },
      ...(social?.favicon ? { icons: { icon: social.favicon } } : {}),
    };
  } catch {
    return { title: 'Form' };
  }
}

export default async function PublicFormPage({ params }: Props) {
  const { id } = await params;
  return <FormPageClient formId={id} />;
}
