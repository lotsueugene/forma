import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSubscriptionInfo } from '@/lib/subscription';

// GET /api/public/forms/[id] - Get form data for public rendering
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const form = await prisma.form.findFirst({
      where: {
        id,
        status: 'active', // Only return active forms
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found or not available' },
        { status: 404 }
      );
    }

    // Increment views
    await prisma.form.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    const settings = form.settings ? JSON.parse(form.settings) : null;

    // Enforce branding for non-Pro users — only Pro can remove "Powered by Forma"
    if (settings?.thankYou?.showBranding === false) {
      const info = await getSubscriptionInfo(form.workspaceId);
      if (info.plan !== 'pro') {
        settings.thankYou.showBranding = true;
      }
    }

    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        fields: JSON.parse(form.fields),
        settings,
      },
    });
  } catch (error) {
    console.error('Error fetching public form:', error);
    return NextResponse.json(
      { error: 'Failed to load form' },
      { status: 500 }
    );
  }
}
