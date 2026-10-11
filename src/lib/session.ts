import { cookies } from 'next/headers';
import { getDbConnection } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export interface CurrentSession {
  userId: number;
  username: string;
  fullName: string;
  role: string;
  photoUrl?: string | null;
  deviceId: number;
  deviceUuid: string;
  deviceName: string;
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('fitvault_session')?.value;

    if (!sessionToken) return null;

    const db = await getDbConnection();
    const query = `
      SELECT 
        s.id as session_id,
        s.expires_at,
        u.id as user_id,
        u.username,
        u.full_name,
        u.role,
        u.photo_url,
        d.id as device_id,
        d.device_uuid,
        d.device_name
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      JOIN user_devices d ON s.device_id = d.id
      WHERE s.session_token = ?
      LIMIT 1
    `;

    const [rows] = await db.query<RowDataPacket[]>(query, [sessionToken]);

    if (!rows || rows.length === 0) {
      return null;
    }

    // Sliding session: keep session active for 1 year
    db.query(
      'UPDATE user_sessions SET expires_at = DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE session_token = ?',
      [sessionToken]
    ).catch(() => {});

    const row = rows[0];
    return {
      userId: row.user_id,
      username: row.username,
      fullName: row.full_name,
      role: row.role,
      photoUrl: row.photo_url || null,
      deviceId: row.device_id,
      deviceUuid: row.device_uuid,
      deviceName: row.device_name,
    };
  } catch (error) {
    console.error('Error in getCurrentSession:', error);
    return null;
  }
}
