import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/admin-auth';

// GET /api/admin/check - Lightweight admin access check
export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      admin: true,
      user: admin.user,
    });
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json(
      { error: 'Failed to verify admin access' },
      { status: 500 }
    );
  }
}
