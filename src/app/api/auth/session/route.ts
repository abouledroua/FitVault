import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/session';

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      username: session.username,
      fullName: session.fullName,
      role: session.role,
      photoUrl: session.photoUrl || null,
    },
    device: {
      id: session.deviceId,
      uuid: session.deviceUuid,
      name: session.deviceName,
    }
  });
}
