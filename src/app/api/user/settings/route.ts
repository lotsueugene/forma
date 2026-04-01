import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/user/settings - Get user settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json({
      settings: {
        notifyNewSubmissions: settings.notifyNewSubmissions,
        notifyWeeklyDigest: settings.notifyWeeklyDigest,
        notifyFormErrors: settings.notifyFormErrors,
        notifyTeamInvites: settings.notifyTeamInvites,
        notifyBilling: settings.notifyBilling,
        notifyMarketing: settings.notifyMarketing,
        timezone: settings.timezone,
      },
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/user/settings - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {
        notifyNewSubmissions: data.notifyNewSubmissions,
        notifyWeeklyDigest: data.notifyWeeklyDigest,
        notifyFormErrors: data.notifyFormErrors,
        notifyTeamInvites: data.notifyTeamInvites,
        notifyBilling: data.notifyBilling,
        notifyMarketing: data.notifyMarketing,
        timezone: data.timezone,
      },
      create: {
        userId: session.user.id,
        notifyNewSubmissions: data.notifyNewSubmissions ?? true,
        notifyWeeklyDigest: data.notifyWeeklyDigest ?? true,
        notifyFormErrors: data.notifyFormErrors ?? true,
        notifyTeamInvites: data.notifyTeamInvites ?? true,
        notifyBilling: data.notifyBilling ?? true,
        notifyMarketing: data.notifyMarketing ?? false,
        timezone: data.timezone,
      },
    });

    return NextResponse.json({
      settings: {
        notifyNewSubmissions: settings.notifyNewSubmissions,
        notifyWeeklyDigest: settings.notifyWeeklyDigest,
        notifyFormErrors: settings.notifyFormErrors,
        notifyTeamInvites: settings.notifyTeamInvites,
        notifyBilling: settings.notifyBilling,
        notifyMarketing: settings.notifyMarketing,
        timezone: settings.timezone,
      },
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
