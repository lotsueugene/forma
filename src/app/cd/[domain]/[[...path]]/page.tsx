import { notFound, permanentRedirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import FormPageClient from '@/app/f/[id]/FormPageClient';
import BookingPageClient from '@/app/book/[id]/BookingPageClient';

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
    if (customDomain.defaultForm && customDomain.defaultForm.status === 'active') {
      return <FormPageClient formId={customDomain.defaultForm.id} />;
    }
    if (forms.length === 1) {
      return <FormPageClient formId={forms[0].id} />;
    }
    if (forms.length === 0) {
      notFound();
    }
    return <FormPageClient formId={forms[0].id} />;
  }

  // Path provided — try bookingSlug first (renders dedicated booking UI),
  // then slug (renders regular form UI), then raw ID as a fallback.
  const slugOrId = path[0];

  const byBookingSlug = await prisma.form.findFirst({
    where: {
      bookingSlug: slugOrId,
      workspaceId: workspace.id,
      status: 'active',
    },
  });
  if (byBookingSlug) {
    return <BookingPageClient formId={byBookingSlug.id} />;
  }

  const bySlug = await prisma.form.findFirst({
    where: {
      slug: slugOrId,
      workspaceId: workspace.id,
      status: 'active',
    },
  });
  if (bySlug) {
    return <FormPageClient formId={bySlug.id} />;
  }

  const byId = await prisma.form.findFirst({
    where: {
      id: slugOrId,
      workspaceId: workspace.id,
      status: 'active',
    },
  });
  if (byId) {
    return <FormPageClient formId={byId.id} />;
  }

  // Last resort: honour the slug-redirect grace period so an external link
  // that was created before a rename still reaches the form. Only active
  // forms get redirected; expired rows are ignored and cleaned up lazily.
  const redirectRow = await prisma.formSlugRedirect.findUnique({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: slugOrId } },
    include: { form: true },
  });
  if (redirectRow && redirectRow.expiresAt > new Date() && redirectRow.form.status === 'active') {
    const target =
      redirectRow.kind === 'bookingSlug' && redirectRow.form.bookingSlug
        ? redirectRow.form.bookingSlug
        : redirectRow.form.slug || redirectRow.form.id;
    permanentRedirect(`/${target}`);
  }

  notFound();
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

  if (path && path.length > 0) {
    const slugOrId = path[0];

    // bookingSlug → slug → id
    let form = await prisma.form.findFirst({
      where: { bookingSlug: slugOrId, workspaceId: customDomain.workspaceId },
    });
    if (!form) {
      form = await prisma.form.findFirst({
        where: { slug: slugOrId, workspaceId: customDomain.workspaceId },
      });
    }
    if (!form) {
      form = await prisma.form.findFirst({
        where: { id: slugOrId, workspaceId: customDomain.workspaceId },
      });
    }

    if (form) {
      return {
        title: form.name,
        description: form.description || `Fill out ${form.name}`,
      };
    }
  }

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
