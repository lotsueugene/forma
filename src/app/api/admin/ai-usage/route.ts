import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin-auth';

function intParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

// GET /api/admin/ai-usage - AI usage telemetry and summary
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const page = intParam(params.get('page'), 1, 1, 10000);
    const limit = intParam(params.get('limit'), 20, 1, 100);
    const days = intParam(params.get('days'), 7, 1, 90);
    const status = params.get('status') || '';
    const userId = params.get('userId') || '';
    const ip = params.get('ip') || '';
    const search = params.get('search') || '';

    const where: Prisma.AiUsageLogWhereInput = {
      createdAt: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
    };

    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (ip) where.ip = ip;
    if (search) {
      where.OR = [
        { userId: { contains: search, mode: 'insensitive' } },
        { ip: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { provider: { contains: search, mode: 'insensitive' } },
        { modelId: { contains: search, mode: 'insensitive' } },
        { errorCode: { contains: search, mode: 'insensitive' } },
        { errorMessage: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [logs, total, aggregate, statusCounts, topUsers, topIps] = await Promise.all([
      prisma.aiUsageLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
          workspace: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.aiUsageLog.count({ where }),
      prisma.aiUsageLog.aggregate({
        where,
        _count: { _all: true },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          generatedFieldCount: true,
        },
        _avg: { latencyMs: true },
      }),
      prisma.aiUsageLog.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      prisma.aiUsageLog.groupBy({
        by: ['userId'],
        where,
        _count: { _all: true },
        _sum: { totalTokens: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
      prisma.aiUsageLog.groupBy({
        by: ['ip'],
        where: { ...where, ip: { not: null } },
        _count: { _all: true },
        _sum: { totalTokens: true },
        orderBy: { _count: { ip: 'desc' } },
        take: 10,
      }),
    ]);

    const topUserDetails = topUsers.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: topUsers.map((row) => row.userId) } },
          select: { id: true, name: true, email: true, role: true },
        })
      : [];
    const userById = new Map(topUserDetails.map((user) => [user.id, user]));

    return NextResponse.json({
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        provider: log.provider,
        modelId: log.modelId,
        status: log.status,
        promptHash: log.promptHash,
        promptChars: log.promptChars,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        totalTokens: log.totalTokens,
        generatedFieldCount: log.generatedFieldCount,
        latencyMs: log.latencyMs,
        ip: log.ip,
        userAgent: log.userAgent,
        errorCode: log.errorCode,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt,
        user: log.user,
        workspace: log.workspace,
      })),
      summary: {
        total: aggregate._count._all,
        inputTokens: aggregate._sum.inputTokens || 0,
        outputTokens: aggregate._sum.outputTokens || 0,
        totalTokens: aggregate._sum.totalTokens || 0,
        generatedFieldCount: aggregate._sum.generatedFieldCount || 0,
        averageLatencyMs: Math.round(aggregate._avg.latencyMs || 0),
        byStatus: Object.fromEntries(
          statusCounts.map((row) => [row.status, row._count._all])
        ),
        topUsers: topUsers.map((row) => ({
          userId: row.userId,
          user: userById.get(row.userId) || null,
          requests: row._count._all,
          totalTokens: row._sum.totalTokens || 0,
        })),
        topIps: topIps.map((row) => ({
          ip: row.ip,
          requests: row._count._all,
          totalTokens: row._sum.totalTokens || 0,
        })),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      window: { days },
    });
  } catch (error) {
    console.error('Admin AI usage error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI usage' },
      { status: 500 }
    );
  }
}
