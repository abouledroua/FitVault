import { NextResponse } from 'next/server';
import { getDbConnection, createAuditLog } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { attendance_id } = data;
    
    if (!attendance_id) {
      return NextResponse.json({ error: 'ID de présence requis' }, { status: 400 });
    }
    
    const db = await getDbConnection();
    
    await db.query(
      'UPDATE attendance_logs SET status = ?, checked_out_at = NOW() WHERE id = ? AND status = ?',
      ['departed', attendance_id, 'present']
    );

    await createAuditLog({
      action: 'MEMBER_CHECKOUT',
      tableName: 'attendance_logs',
      recordId: attendance_id,
      details: { attendance_id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking departure:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
