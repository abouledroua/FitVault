import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDbConnection } from '@/lib/db';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('fitvault_session')?.value;
    
    if (sessionToken) {
      const db = await getDbConnection();
      await db.query('DELETE FROM user_sessions WHERE session_token = ?', [sessionToken]);
    }
  } catch (err) {
    console.error('Logout error:', err);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('fitvault_session');
  return response;
}
