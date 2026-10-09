import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { getCurrentSession } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const db = await getDbConnection();
    const [devices]: any = await db.query(`
      SELECT 
        d.id, 
        d.device_name as name, 
        d.device_uuid as uuid, 
        d.ip_address,
        u.username as user,
        d.last_active_at
      FROM user_devices d
      LEFT JOIN users u ON d.user_id = u.id
      ORDER BY d.id DESC
    `);
    
    return NextResponse.json(devices);
  } catch (error) {
    console.error('Fetch devices error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
