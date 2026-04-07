'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Spinner, Rocket } from '@phosphor-icons/react';
import type { FormTemplate } from '@/lib/form-templates';

export default function TemplateUseButton({ template }: { template: FormTemplate }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUse = async () => {
    if (!session) {
      router.push(`/signup?template=${template.slug}`);
      return;
    }

    setLoading(true);
    try {
      // Get user's workspace
      const wsRes = await fetch('/api/workspaces');
      const wsData = await wsRes.json();
      const workspace = wsData.workspaces?.[0];

      if (!workspace) {
        router.push('/dashboard');
        return;
      }

      // Create form from template
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.title,
          description: template.description,
          fields: template.fields,
          status: 'draft',
          workspaceId: workspace.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/dashboard/forms/${data.form.id}/edit`);
      } else {
        router.push('/dashboard/forms/new');
      }
    } catch {
      router.push('/dashboard/forms/new');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleUse} disabled={loading} className="btn btn-primary">
      {loading ? (
        <>
          <Spinner size={18} className="animate-spin" />
          Creating...
        </>
      ) : (
        <>
          <Rocket size={18} weight="fill" />
          Use This Template
        </>
      )}
    </button>
  );
}
