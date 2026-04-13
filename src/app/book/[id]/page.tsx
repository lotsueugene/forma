import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import BookingPageClient from './BookingPageClient';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const form = await prisma.form.findFirst({
      where: { id, status: 'active' },
      select: { name: true, description: true },
    });

    if (!form) {
      return { title: 'Booking Not Found' };
    }

    return {
      title: `Book - ${form.name}`,
      description: form.description || `Book a time for ${form.name}`,
    };
  } catch {
    return { title: 'Book a Time' };
  }
}

export default async function BookingPage({ params }: Props) {
  const { id } = await params;
  return <BookingPageClient formId={id} />;
}
