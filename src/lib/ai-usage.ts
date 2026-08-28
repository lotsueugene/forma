import { createHash } from 'crypto';
import { prisma } from './prisma';
import { auditLog } from './audit';

export type AiUsageStatus = 'success' | 'failed' | 'blocked' | 'rate_limited';

export interface AiUsageInput {
  userId: string;
  workspaceId?: string | null;
  action?: string;
  provider?: string;
  modelId: string;
  status: AiUsageStatus;
  prompt?: string;
  promptHash?: string | null;
  promptChars?: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  generatedFieldCount?: number | null;
  latencyMs?: number | null;
  ip?: string | null;
  userAgent?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface AiUsageLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  userCount: number;
  ipCount: number;
  userLimit: number;
  ipLimit: number;
}

const BILLABLE_STATUSES: AiUsageStatus[] = ['success', 'failed'];

function envInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAiUsageLimits() {
  return {
    perUser: envInt('AI_DAILY_LIMIT_PER_USER', 25),
    perIp: envInt('AI_DAILY_LIMIT_PER_IP', 75),
  };
}

export function hashPrompt(prompt: string) {
  return createHash('sha256').update(prompt.trim()).digest('hex');
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function checkAiUsageLimit(input: {
  userId: string;
  ip?: string | null;
}): Promise<AiUsageLimitResult> {
  const limits = getAiUsageLimits();
  const createdAt = { gte: startOfToday() };
  const status = { in: BILLABLE_STATUSES };

  const [userCount, ipCount] = await Promise.all([
    prisma.aiUsageLog.count({
      where: {
        userId: input.userId,
        status,
        createdAt,
      },
    }),
    input.ip
      ? prisma.aiUsageLog.count({
          where: {
            ip: input.ip,
            status,
            createdAt,
          },
        })
      : Promise.resolve(0),
  ]);

  const allowed = userCount < limits.perUser && ipCount < limits.perIp;
  const tomorrow = new Date(startOfToday().getTime() + 24 * 60 * 60 * 1000);

  return {
    allowed,
    retryAfterSeconds: allowed
      ? undefined
      : Math.max(60, Math.ceil((tomorrow.getTime() - Date.now()) / 1000)),
    userCount,
    ipCount,
    userLimit: limits.perUser,
    ipLimit: limits.perIp,
  };
}

export async function recordAiUsage(input: AiUsageInput) {
  const promptHash = input.promptHash ?? (input.prompt ? hashPrompt(input.prompt) : null);
  const promptChars = input.promptChars ?? input.prompt?.trim().length ?? 0;
  const action = input.action || 'form.generate';
  const provider = input.provider || 'bedrock';
  const userAgent = input.userAgent ? input.userAgent.slice(0, 500) : null;
  const errorMessage = input.errorMessage ? input.errorMessage.slice(0, 1000) : null;

  try {
    await prisma.aiUsageLog.create({
      data: {
        userId: input.userId,
        workspaceId: input.workspaceId || null,
        action,
        provider,
        modelId: input.modelId,
        status: input.status,
        promptHash,
        promptChars,
        inputTokens: input.inputTokens ?? null,
        outputTokens: input.outputTokens ?? null,
        totalTokens: input.totalTokens ?? null,
        generatedFieldCount: input.generatedFieldCount ?? null,
        latencyMs: input.latencyMs ?? null,
        ip: input.ip || null,
        userAgent,
        errorCode: input.errorCode || null,
        errorMessage,
      },
    });
  } catch (error) {
    console.error('Failed to write AI usage log:', error);
  }

  auditLog({
    action: `ai.${action}.${input.status}`,
    userId: input.userId,
    ip: input.ip || undefined,
    resourceType: input.workspaceId ? 'workspace' : undefined,
    resourceId: input.workspaceId || undefined,
    details: {
      provider,
      modelId: input.modelId,
      promptHash,
      promptChars,
      inputTokens: input.inputTokens ?? undefined,
      outputTokens: input.outputTokens ?? undefined,
      totalTokens: input.totalTokens ?? undefined,
      generatedFieldCount: input.generatedFieldCount ?? undefined,
      latencyMs: input.latencyMs ?? undefined,
      errorCode: input.errorCode ?? undefined,
      errorMessage: errorMessage ?? undefined,
      userAgent: userAgent ?? undefined,
    },
  });
}
