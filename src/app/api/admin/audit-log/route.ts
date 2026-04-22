import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';

// GET /api/admin/audit-log - List audit log entries
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const action = searchParams.get('action') || '';
    const userId = searchParams.get('userId') || '';
    const search = searchParams.get('search') || '';

    const where: Record<string, unknown> = {};
    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }
    if (userId) {
      where.userId = userId;
    }
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { userId: { contains: search, mode: 'insensitive' } },
        { resourceType: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Decode details once so we can both return them and scan for referenced
    // entity IDs (workspaceId, formId, etc.) to enrich.
    const parsed = logs.map((log) => ({
      raw: log,
      details: (log.details ? (() => {
        try { return JSON.parse(log.details as string) as Record<string, unknown>; }
        catch { return null; }
      })() : null) as Record<string, unknown> | null,
    }));

    // Collect all referenced ids so we can batch-resolve names for the UI
    // (otherwise slug-change entries and similar just dump raw cuids).
    const userIds = new Set<string>();
    const formIds = new Set<string>();
    const workspaceIds = new Set<string>();

    const asId = (v: unknown): string | null =>
      typeof v === 'string' && v.length > 0 ? v : null;

    for (const { raw, details } of parsed) {
      if (raw.userId) userIds.add(raw.userId);
      if (raw.resourceType === 'form' && raw.resourceId) formIds.add(raw.resourceId);
      if (raw.resourceType === 'workspace' && raw.resourceId) workspaceIds.add(raw.resourceId);
      if (details) {
        const wid = asId(details.workspaceId);
        if (wid) workspaceIds.add(wid);
        const fid = asId(details.formId);
        if (fid) formIds.add(fid);
        const uid = asId(details.userId) ?? asId(details.actorId);
        if (uid) userIds.add(uid);
      }
    }

    const [users, forms, workspaces] = await Promise.all([
      userIds.size > 0
        ? prisma.user.findMany({
            where: { id: { in: Array.from(userIds) } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      formIds.size > 0
        ? prisma.form.findMany({
            where: { id: { in: Array.from(formIds) } },
            select: { id: true, name: true, workspaceId: true },
          })
        : Promise.resolve([]),
      workspaceIds.size > 0
        ? prisma.workspace.findMany({
            where: { id: { in: Array.from(workspaceIds) } },
            select: { id: true, name: true, slug: true },
          })
        : Promise.resolve([]),
    ]);

    const userById = new Map(users.map((u) => [u.id, u]));
    const formById = new Map(forms.map((f) => [f.id, f]));
    const workspaceById = new Map(workspaces.map((w) => [w.id, w]));

    return NextResponse.json({
      logs: parsed.map(({ raw, details }) => {
        const user = raw.userId ? userById.get(raw.userId) ?? null : null;
        let resource: { type: string; id: string; name: string } | null = null;
        if (raw.resourceType === 'form' && raw.resourceId) {
          const f = formById.get(raw.resourceId);
          if (f) resource = { type: 'form', id: f.id, name: f.name };
        } else if (raw.resourceType === 'workspace' && raw.resourceId) {
          const w = workspaceById.get(raw.resourceId);
          if (w) resource = { type: 'workspace', id: w.id, name: w.name };
        }
        const workspace = (() => {
          const wid = details ? asId(details.workspaceId) : null;
          if (!wid) return null;
          const w = workspaceById.get(wid);
          return w ? { id: w.id, name: w.name } : null;
        })();
        return {
          id: raw.id,
          action: raw.action,
          userId: raw.userId,
          ip: raw.ip,
          resourceType: raw.resourceType,
          resourceId: raw.resourceId,
          details,
          createdAt: raw.createdAt,
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
          resource,
          workspace,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin audit log error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
