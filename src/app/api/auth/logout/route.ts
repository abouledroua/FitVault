import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDbConnection } from '@/lib/db';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('fitvault_session')?.value;
    
    if (sessionToken) {
      const { getCurrentSession } = await import('@/lib/session');
      const session = await getCurrentSession();
      
      const db = await getDbConnection();
      await db.query('DELETE FROM user_sessions WHERE session_token = ?', [sessionToken]);

      if (session) {
        const { createAuditLog } = await import('@/lib/db');
        await createAuditLog({
          action: 'LOGOUT',
          tableName: 'user_sessions',
          recordId: session.userId,
          userId: session.userId,
          deviceUuid: session.deviceUuid,
          userName: session.fullName || session.username,
          deviceName: session.deviceName,
          details: { username: session.username }
        });
      }
    }
  } catch (err) {
    console.error('Logout error:', err);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('fitvault_session');
  return response;
}
