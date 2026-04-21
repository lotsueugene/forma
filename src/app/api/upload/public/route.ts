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

    // Validate magic bytes to prevent file type spoofing
    const validSignatures: Record<string, number[][]> = {
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47]],
      'image/gif': [[0x47, 0x49, 0x46, 0x38]],
      'image/webp': [[0x52, 0x49, 0x46, 0x46]],
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    };
    const sigs = validSignatures[file.type];
    if (sigs) {
      const matchesSig = sigs.some(sig => sig.every((byte, i) => buffer[i] === byte));
      if (!matchesSig) {
        return NextResponse.json({ error: 'File content does not match declared type' }, { status: 400 });
      }
    }

    // Sanitize SVG uploads
    if (file.type === 'image/svg+xml') {
      const svgContent = buffer.toString('utf-8');
      if (!svgContent.trimStart().startsWith('<')) {
        return NextResponse.json({ error: 'Invalid SVG file' }, { status: 400 });
      }
      const sanitized = svgContent
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<script[\s\S]*?\/>/gi, '')
        .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/\bon\w+\s*=\s*'[^']*'/gi, '')
        .replace(/javascript\s*:/gi, 'blocked:')
        .replace(/<iframe[\s\S]*?(<\/iframe>|\/?>)/gi, '')
        .replace(/<foreignObject[\s\S]*?(<\/foreignObject>|\/?>)/gi, '');
      // Use sanitized buffer for upload
      const sanitizedBuffer = Buffer.from(sanitized, 'utf-8');
      const ext = file.name.split('.').pop() || 'bin';
      const key = `form-uploads/${formId}/${crypto.randomUUID()}.${ext}`;
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: sanitizedBuffer,
        ContentType: file.type,
        ContentDisposition: `attachment; filename="${file.name}"`,
      }));
      const url = `https://${BUCKET}.s3.${process.env.AWS_S3_REGION || 'us-east-1'}.amazonaws.com/${key}`;
      return NextResponse.json({ url, name: file.name, size: file.size, type: file.type });
    }

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
