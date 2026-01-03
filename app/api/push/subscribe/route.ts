import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/database';
import { apiLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await request.json();

    // Validate subscription format
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription format' }, { status: 400 });
    }

    await db.savePushSubscription(session.user.id, subscription);

    apiLogger.info({ userId: session.user.id }, 'Push subscription saved');
    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error }, 'Error saving push subscription');
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
    }

    await db.deletePushSubscription(session.user.id, endpoint);

    apiLogger.info({ userId: session.user.id }, 'Push subscription deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error }, 'Error deleting push subscription');
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }
}
