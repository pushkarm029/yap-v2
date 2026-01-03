import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { verifyUploadedFileSize, extractImageKey } from '@/lib/r2-storage';
import { hashUserId } from '@/lib/utils/crypto';
import pino from 'pino';

const apiLogger = pino({ name: 'api:upload-verify' });

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { publicUrl, expectedSize } = await request.json();

    if (!publicUrl || !expectedSize) {
      return NextResponse.json({ error: 'Missing publicUrl or expectedSize' }, { status: 400 });
    }

    if (typeof expectedSize !== 'number' || !Number.isFinite(expectedSize) || expectedSize <= 0) {
      return NextResponse.json(
        { error: 'Invalid expectedSize: must be a positive number' },
        { status: 400 }
      );
    }

    // Extract image key from public URL
    const imageKey = extractImageKey(publicUrl);
    if (!imageKey) {
      return NextResponse.json({ error: 'Invalid public URL' }, { status: 400 });
    }

    // Verify the uploaded file
    const result = await verifyUploadedFileSize(imageKey, expectedSize);

    if (!result.success) {
      apiLogger.warn(
        {
          userIdHash: hashUserId(session.user.id),
          imageKey,
          expectedSize,
          actualSize: result.actualSize,
          error: result.error,
        },
        'Upload verification failed'
      );

      return NextResponse.json(
        { error: result.error || 'Upload verification failed' },
        { status: 400 }
      );
    }

    apiLogger.info(
      {
        userIdHash: hashUserId(session.user.id),
        imageKey,
        actualSize: result.actualSize,
      },
      'Upload verified successfully'
    );

    return NextResponse.json({ success: true, actualSize: result.actualSize });
  } catch (error) {
    apiLogger.error({ error }, 'Error verifying upload');

    return NextResponse.json({ error: 'Failed to verify upload' }, { status: 500 });
  }
}
