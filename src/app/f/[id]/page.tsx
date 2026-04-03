'use client';

import { useParams } from 'next/navigation';
import FormPageClient from './FormPageClient';

export default function PublicFormPage() {
  const params = useParams();
  const formId = params.id as string;

  return <FormPageClient formId={formId} />;
}
