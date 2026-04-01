import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        fields: JSON.parse(form.fields),
        settings: form.settings ? JSON.parse(form.settings) : null,
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
