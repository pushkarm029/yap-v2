import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generatePresignedUploadUrl } from '@/lib/r2-storage';
import { hashUserId } from '@/lib/utils/crypto';
import pino from 'pino';

const apiLogger = pino({ name: 'api:upload' });

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentType, fileSize } = await request.json();

    if (!contentType || !fileSize) {
      return NextResponse.json({ error: 'Missing contentType or fileSize' }, { status: 400 });
    }

    const result = await generatePresignedUploadUrl({
      userId: session.user.id,
      contentType,
      fileSize,
    });

    apiLogger.info(
      {
        userIdHash: hashUserId(session.user.id),
        imageKey: result.imageKey,
        contentType,
        fileSize,
      },
      'Presigned URL generated'
    );

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ error }, 'Error generating presigned URL');

    if (error instanceof Error && error.message.includes('Invalid file type')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('File too large')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
