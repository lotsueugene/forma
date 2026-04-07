import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
import { getSubscriptionInfo } from '@/lib/subscription';
import crypto from 'crypto';

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || 'withforma-uploads';
const FREE_MAX_SIZE = 5 * 1024 * 1024;  // 5MB
const PRO_MAX_SIZE = 50 * 1024 * 1024;  // 50MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
];

// POST /api/upload/public - Public file upload for form submissions (no auth required)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const formId = formData.get('formId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!formId) {
      return NextResponse.json({ error: 'Form ID required' }, { status: 400 });
    }

    // Look up workspace plan to determine size limit
    let maxSize = FREE_MAX_SIZE;
    try {
      const form = await prisma.form.findUnique({ where: { id: formId }, select: { workspaceId: true } });
      if (form) {
        const info = await getSubscriptionInfo(form.workspaceId);
        if (info.plan !== 'free') maxSize = PRO_MAX_SIZE;
      }
    } catch { /* fall back to free limit */ }

    if (file.size > maxSize) {
      const limitMB = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json({ error: `File must be under ${limitMB}MB` }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'bin';
    const key = `form-uploads/${formId}/${crypto.randomUUID()}.${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      ContentDisposition: `attachment; filename="${file.name}"`,
    }));

    const url = `https://${BUCKET}.s3.${process.env.AWS_S3_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return NextResponse.json({
      url,
      name: file.name,
      type: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
