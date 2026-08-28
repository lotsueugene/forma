import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { getClientIp } from '@/lib/api-rate-limit';
import { checkAiUsageLimit, recordAiUsage } from '@/lib/ai-usage';
import { getSubscriptionInfo } from '@/lib/subscription';
import { getDefaultWorkspace, verifyWorkspaceAccess } from '@/lib/workspace-auth';

interface GeneratedField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface AiGenerationUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
}

interface AiGenerationResult {
  name: string;
  description: string;
  fields: GeneratedField[];
  usage: AiGenerationUsage;
}

// Generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

const AVAILABLE_FIELD_TYPES = [
  'text',      // Short text input
  'email',     // Email address
  'phone',     // Phone number
  'textarea',  // Long text / paragraph
  'number',    // Numeric input
  'date',      // Date picker
  'checkbox',  // Multiple choice (checkboxes)
  'radio',     // Single choice (radio buttons)
  'select',    // Dropdown select
  'file',      // File upload
  'rating',    // Star rating (1-5)
  'url',       // URL input
];

const DEFAULT_BEDROCK_MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

function getBedrockModelId() {
  return process.env.BEDROCK_MODEL_ID || DEFAULT_BEDROCK_MODEL_ID;
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function errorCode(error: unknown) {
  if (error instanceof Error && error.name) return error.name;
  return 'unknown_error';
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function generateFormWithAI(prompt: string, modelId: string): Promise<AiGenerationResult> {
  const systemPrompt = `You are a form builder AI. Given a user's description, generate a form with appropriate fields.

Available field types: ${AVAILABLE_FIELD_TYPES.join(', ')}

Rules:
- Only use the field types listed above
- For checkbox, radio, and select types, include an "options" array with the choices
- Keep forms practical — typically 4-10 fields
- Always include at least a name and email field unless the user specifically says not to
- Mark fields as required when they are essential to the form's purpose
- Use clear, professional labels
- Add helpful placeholder text

Respond with ONLY valid JSON in this exact format, no other text:
{
  "name": "Form Name",
  "description": "A short one-sentence description of the form's purpose",
  "fields": [
    {
      "type": "text",
      "label": "Field Label",
      "placeholder": "Placeholder text",
      "required": true,
      "options": []
    }
  ]
}

Do not include "options" for field types that don't need them (text, email, phone, textarea, number, date, file, rating, url). Only include "options" for checkbox, radio, and select types.`;

  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2048,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: `Create a form for: ${prompt}`,
      },
    ],
    system: systemPrompt,
  });

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const text = responseBody.content?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error('AI response did not include text content');
  }

  // Extract JSON from response (handle cases where model wraps in markdown)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Add IDs to each field and validate types
  const fields: GeneratedField[] = parsed.fields
    .filter((f: { type: string }) => AVAILABLE_FIELD_TYPES.includes(f.type))
    .map((f: { type: string; label: string; placeholder?: string; required?: boolean; options?: string[] }) => ({
      id: generateId(),
      type: f.type,
      label: f.label,
      placeholder: f.placeholder || '',
      required: f.required ?? false,
      ...(f.options && ['checkbox', 'radio', 'select'].includes(f.type)
        ? { options: f.options }
      : {}),
    }));

  const inputTokens = numberOrNull(responseBody.usage?.input_tokens);
  const outputTokens = numberOrNull(responseBody.usage?.output_tokens);

  return {
    name: parsed.name || 'Generated Form',
    description: parsed.description || '',
    fields,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens:
        numberOrNull(responseBody.usage?.total_tokens) ??
        (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null),
    },
  };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');
  const modelId = getBedrockModelId();
  const startedAt = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const prompt = body.prompt;
    const promptText = typeof prompt === 'string' ? prompt.trim() : '';
    const requestedWorkspaceId =
      typeof body.workspaceId === 'string' && body.workspaceId.trim()
        ? body.workspaceId.trim()
        : null;
    const fallbackWorkspaceId = session.user.workspaceId ||
      (await getDefaultWorkspace(session.user.id))?.id ||
      null;
    const workspaceId = requestedWorkspaceId || fallbackWorkspaceId;

    if (!promptText || promptText.length < 3) {
      return NextResponse.json(
        { error: 'Please provide a description of the form you want to create' },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      await recordAiUsage({
        userId: session.user.id,
        modelId,
        status: 'blocked',
        prompt: promptText,
        latencyMs: Date.now() - startedAt,
        ip,
        userAgent,
        errorCode: 'no_workspace',
        errorMessage: 'No workspace selected',
      });
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 });
    }

    const access = await verifyWorkspaceAccess(session.user.id, workspaceId, 'editor');
    if (!access.allowed) {
      await recordAiUsage({
        userId: session.user.id,
        workspaceId,
        modelId,
        status: 'blocked',
        prompt: promptText,
        latencyMs: Date.now() - startedAt,
        ip,
        userAgent,
        errorCode: 'insufficient_workspace_access',
        errorMessage: access.error || 'Insufficient permissions',
      });
      return NextResponse.json({ error: access.error || 'Insufficient permissions' }, { status: 403 });
    }

    const subscription = await getSubscriptionInfo(workspaceId);
    if (!subscription.features.aiGeneration) {
      await recordAiUsage({
        userId: session.user.id,
        workspaceId,
        modelId,
        status: 'blocked',
        prompt: promptText,
        latencyMs: Date.now() - startedAt,
        ip,
        userAgent,
        errorCode: 'plan_restricted',
        errorMessage: 'AI generation is not available on this plan',
      });
      return NextResponse.json(
        { error: 'AI generation is available on Pro plans.' },
        { status: 402 }
      );
    }

    const limit = await checkAiUsageLimit({ userId: session.user.id, ip });
    if (!limit.allowed) {
      await recordAiUsage({
        userId: session.user.id,
        workspaceId,
        modelId,
        status: 'rate_limited',
        prompt: promptText,
        latencyMs: Date.now() - startedAt,
        ip,
        userAgent,
        errorCode: 'daily_limit_exceeded',
        errorMessage: `Daily AI limit exceeded. User ${limit.userCount}/${limit.userLimit}, IP ${limit.ipCount}/${limit.ipLimit}.`,
      });
      const response = NextResponse.json(
        { error: 'Daily AI generation limit reached. Please try again tomorrow.' },
        { status: 429 }
      );
      if (limit.retryAfterSeconds) {
        response.headers.set('Retry-After', String(limit.retryAfterSeconds));
      }
      return response;
    }

    let result: AiGenerationResult;
    try {
      result = await generateFormWithAI(promptText, modelId);
    } catch (error) {
      await recordAiUsage({
        userId: session.user.id,
        workspaceId,
        modelId,
        status: 'failed',
        prompt: promptText,
        latencyMs: Date.now() - startedAt,
        ip,
        userAgent,
        errorCode: errorCode(error),
        errorMessage: errorMessage(error),
      });
      throw error;
    }

    await recordAiUsage({
      userId: session.user.id,
      workspaceId,
      modelId,
      status: 'success',
      prompt: promptText,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
      generatedFieldCount: result.fields.length,
      latencyMs: Date.now() - startedAt,
      ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      name: result.name,
      description: result.description,
      fields: result.fields,
    });
  } catch (error) {
    console.error('Error generating form:', error);
    return NextResponse.json(
      { error: 'Failed to generate form. Please try again.' },
      { status: 500 }
    );
  }
}
