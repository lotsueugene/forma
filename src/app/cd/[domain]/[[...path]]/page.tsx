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

  // Look up the custom domain
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
    },
  });

  // If domain not found or not verified, show 404
  if (!customDomain || customDomain.status !== 'verified') {
    notFound();
  }

  const workspace = customDomain.workspace;
  const forms = workspace.forms;

  // If no path, show form listing or redirect to first form
  if (!path || path.length === 0) {
    if (forms.length === 1) {
      // If only one form, show it directly
      return <FormPageClient formId={forms[0].id} />;
    }

    // Show form listing
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            {workspace.name}
          </h1>

          {forms.length === 0 ? (
            <p className="text-gray-500">No forms available.</p>
          ) : (
            <div className="space-y-4">
              {forms.map((form) => (
                <a
                  key={form.id}
                  href={`/${form.id}`}
                  className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
                >
                  <h2 className="text-lg font-medium text-gray-900">
                    {form.name}
                  </h2>
                  {form.description && (
                    <p className="text-gray-500 mt-1">{form.description}</p>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Path provided - should be a form ID
  const formId = path[0];

  // Check if the form belongs to this workspace
  const form = await prisma.form.findFirst({
    where: {
      id: formId,
      workspaceId: workspace.id,
      status: 'active',
    },
  });

  if (!form) {
    notFound();
  }

  // Render the form
  return <FormPageClient formId={formId} />;
}

// Generate metadata
export async function generateMetadata({ params }: Props) {
  const { domain, path } = await params;

  const customDomain = await prisma.customDomain.findUnique({
    where: { domain },
    include: {
      workspace: true,
    },
  });

  if (!customDomain || customDomain.status !== 'verified') {
    return { title: 'Not Found' };
  }

  if (path && path.length > 0) {
    const form = await prisma.form.findFirst({
      where: {
        id: path[0],
        workspaceId: customDomain.workspaceId,
      },
    });

    if (form) {
      return {
        title: form.name,
        description: form.description || `Fill out ${form.name}`,
      };
    }
  }

  return {
    title: customDomain.workspace.name,
    description: `Forms by ${customDomain.workspace.name}`,
  };
}
