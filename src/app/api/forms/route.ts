import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyWorkspaceAccess } from '@/lib/workspace-auth';
import { checkLimit } from '@/lib/subscription';

// GET /api/forms - List all forms for a workspace
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspaceId from query params or session default
    const workspaceId = request.nextUrl.searchParams.get('workspaceId') || session.user.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 });
    }

    // Verify user has access to this workspace
    const access = await verifyWorkspaceAccess(session.user.id, workspaceId);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const forms = await prisma.form.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to include submission count
    const formsWithStats = forms.map((form) => ({
      id: form.id,
      name: form.name,
      description: form.description,
      status: form.status,
      formType: form.formType,
      fields: JSON.parse(form.fields),
      settings: form.settings ? JSON.parse(form.settings) : null,
      views: form.views,
      submissions: form._count.submissions,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
    }));

    return NextResponse.json({ forms: formsWithStats });
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forms' },
      { status: 500 }
    );
  }
}

// POST /api/forms - Create a new form
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, fields, settings, status, formType, workspaceId: requestWorkspaceId } = await request.json();

    // Use provided workspaceId or session default
    const workspaceId = requestWorkspaceId || session.user.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 });
    }

    // Verify user has editor+ access to this workspace
    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'editor');
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    // Check form creation limit
    const limitCheck = await checkLimit(workspaceId, 'createForm');
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.reason || 'Form limit reached' },
        { status: 402 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Quick create mode (endpoint type) - minimal setup, immediately active
    if (formType === 'endpoint') {
      const form = await prisma.form.create({
        data: {
          name,
          description: description || null,
          fields: '[]', // No predefined fields for API-only forms
          settings: null,
          status: 'active', // Immediately active for quick create
          formType: 'endpoint',
          workspaceId,
        },
      });

      const baseUrl = request.nextUrl.origin;
      const customDomain = await prisma.customDomain.findUnique({
        where: { workspaceId },
      });
      const publishedDomain =
        customDomain?.status === 'verified' ? `https://${customDomain.domain}` : baseUrl;

      return NextResponse.json({
        form: {
          id: form.id,
          name: form.name,
          description: form.description,
          status: form.status,
          formType: form.formType,
          fields: [],
          createdAt: form.createdAt,
        },
        endpoint: `${baseUrl}/api/forms/${form.id}/submissions`,
        formUrl: `${publishedDomain}/f/${form.id}`,
      });
    }

    // Builder mode - full form with fields
    if (!fields) {
      return NextResponse.json(
        { error: 'Fields are required for builder forms' },
        { status: 400 }
      );
    }

    const form = await prisma.form.create({
      data: {
        name,
        description: description || null,
        fields: JSON.stringify(fields),
        settings: settings ? JSON.stringify(settings) : null,
        status: status || 'draft',
        formType: 'builder',
        workspaceId,
      },
    });

    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        status: form.status,
        formType: form.formType,
        fields: JSON.parse(form.fields),
        settings: form.settings ? JSON.parse(form.settings) : null,
        createdAt: form.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating form:', error);
    return NextResponse.json(
      { error: 'Failed to create form' },
      { status: 500 }
    );
  }
}
