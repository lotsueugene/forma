import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'image/x-icon', 'image/vnd.microsoft.icon',
  'application/pdf',
];

// POST /api/upload - Upload a file to S3
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'uploads';
    const workspaceId = formData.get('workspaceId') as string | null;

    // Gate file uploads behind paid plan
    if (workspaceId) {
      const info = await getSubscriptionInfo(workspaceId);
      if (info.plan === 'free') {
        return NextResponse.json({ error: 'File uploads require Trial or Pro plan.' }, { status: 402 });
      }
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'bin';
    const key = `${folder}/${crypto.randomUUID()}.${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }));

    const url = `https://${BUCKET}.s3.${process.env.AWS_S3_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
