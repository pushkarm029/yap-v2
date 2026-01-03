import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const pendingCode = cookieStore.get('pendingInviteCode');

    return NextResponse.json({
      hasCode: !!pendingCode?.value,
    });
  } catch {
    return NextResponse.json({ hasCode: false });
  }
}
