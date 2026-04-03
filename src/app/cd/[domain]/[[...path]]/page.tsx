import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import FormPageClient from '@/app/f/[id]/FormPageClient';

interface Props {
  params: Promise<{
    domain: string;
    path?: string[];
  }>;
}

export default async function CustomDomainPage({ params }: Props) {
  const { domain, path } = await params;

  // Look up the custom domain with default form
  const customDomain = await prisma.customDomain.findUnique({
    where: { domain },
    include: {
      workspace: {
        include: {
          forms: {
            where: { status: 'active' },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
      defaultForm: true,
    },
  });

  // If domain not found or not verified, show 404
  if (!customDomain || customDomain.status !== 'verified') {
    notFound();
  }

  const workspace = customDomain.workspace;
  const forms = workspace.forms;

  // If no path, show default form or first form
  if (!path || path.length === 0) {
    // If default form is set and active, show it
    if (customDomain.defaultForm && customDomain.defaultForm.status === 'active') {
      return <FormPageClient formId={customDomain.defaultForm.id} />;
    }

    // If only one form, show it directly
    if (forms.length === 1) {
      return <FormPageClient formId={forms[0].id} />;
    }

    // If no forms, show 404
    if (forms.length === 0) {
      notFound();
    }

    // Multiple forms but no default - show first form
    return <FormPageClient formId={forms[0].id} />;
  }

  // Path provided - look up by slug first, then by ID
  const slugOrId = path[0];

  // Try to find form by slug
  let form = await prisma.form.findFirst({
    where: {
      slug: slugOrId,
      workspaceId: workspace.id,
      status: 'active',
    },
  });

  // If not found by slug, try by ID
  if (!form) {
    form = await prisma.form.findFirst({
      where: {
        id: slugOrId,
        workspaceId: workspace.id,
        status: 'active',
      },
    });
  }

  if (!form) {
    notFound();
  }

  // Render the form
  return <FormPageClient formId={form.id} />;
}

// Generate metadata
export async function generateMetadata({ params }: Props) {
  const { domain, path } = await params;

  const customDomain = await prisma.customDomain.findUnique({
    where: { domain },
    include: {
      workspace: true,
      defaultForm: true,
    },
  });

  if (!customDomain || customDomain.status !== 'verified') {
    return { title: 'Not Found' };
  }

  // If path provided, look up form by slug or ID
  if (path && path.length > 0) {
    const slugOrId = path[0];

    // Try slug first, then ID
    let form = await prisma.form.findFirst({
      where: {
        slug: slugOrId,
        workspaceId: customDomain.workspaceId,
      },
    });

    if (!form) {
      form = await prisma.form.findFirst({
        where: {
          id: slugOrId,
          workspaceId: customDomain.workspaceId,
        },
      });
    }

    if (form) {
      return {
        title: form.name,
        description: form.description || `Fill out ${form.name}`,
      };
    }
  }

  // No path - use default form metadata if set
  if (customDomain.defaultForm) {
    return {
      title: customDomain.defaultForm.name,
      description: customDomain.defaultForm.description || `Fill out ${customDomain.defaultForm.name}`,
    };
  }

  return {
    title: customDomain.workspace.name,
    description: `Forms by ${customDomain.workspace.name}`,
  };
}
