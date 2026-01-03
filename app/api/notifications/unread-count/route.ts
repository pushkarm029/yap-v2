import { auth } from '@/auth';
import { db } from '@/lib/database';
import { ok } from '@/lib/api';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return ok({ count: 0 });
    }

    const count = await db.getUnreadNotificationCount(session.user.id);
    return ok({ count });
  } catch {
    return ok({ count: 0 });
  }
}
