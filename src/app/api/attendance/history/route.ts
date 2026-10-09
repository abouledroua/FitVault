import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { formatDate, formatTime } from '@/lib/formatters';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // YYYY-MM-DD
    const memberIdParam = searchParams.get('member_id');

    const db = await getDbConnection();

    let query = `
      SELECT 
        a.id as attendance_id,
        m.id as member_id,
        m.barcode,
        m.first_name,
        m.last_name,
        m.photo_url as photo,
        a.checked_in_at,
        a.checked_out_at,
        a.status,
        a.is_debt_session,
        s.name as sport_name,
        d.amount as debt_amount,
        o.title as offer_title
      FROM attendance_logs a
      JOIN members m ON a.member_id = m.id
      LEFT JOIN sports s ON a.sport_id = s.id
      LEFT JOIN member_debts d ON a.debt_id = d.id
      LEFT JOIN inscriptions i ON a.inscription_id = i.id
      LEFT JOIN offers o ON i.offer_id = o.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (dateParam) {
      query += ` AND DATE(a.checked_in_at) = ?`;
      params.push(dateParam);
    }

    if (memberIdParam) {
      query += ` AND a.member_id = ?`;
      params.push(memberIdParam);
    }

    query += ` ORDER BY a.checked_in_at DESC LIMIT 200`;

    const [rows] = await db.query<RowDataPacket[]>(query, params);

    const formatted = rows.map(r => ({
      id: r.attendance_id,
      memberId: r.member_id,
      barcode: r.barcode,
      name: `${r.first_name} ${r.last_name}`,
      photo: r.photo,
      date: formatDate(r.checked_in_at),
      checkInTime: formatTime(r.checked_in_at),
      checkOutTime: r.checked_out_at ? formatTime(r.checked_out_at) : 'Toujours présent',
      isDebtSession: Boolean(r.is_debt_session),
      debtAmount: r.debt_amount,
      sportName: r.sport_name || 'Entraînement',
      offerTitle: r.offer_title || 'Sans abonnement',
      status: r.status
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement de l\'historique' }, { status: 500 });
  }
}
