import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

interface GeneratedField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
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

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function generateFormWithAI(prompt: string): Promise<{ name: string; description: string; fields: GeneratedField[] }> {
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
    modelId: 'anthropic.claude-haiku-4-5-20251001-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body,
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const text = responseBody.content[0].text;

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

  return {
    name: parsed.name || 'Generated Form',
    description: parsed.description || '',
    fields,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'Please provide a description of the form you want to create' },
        { status: 400 }
      );
    }

    const result = await generateFormWithAI(prompt.trim());

    return NextResponse.json({
      success: true,
      name: result.name,
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
