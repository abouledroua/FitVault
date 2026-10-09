import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { formatDate, formatTime } from '@/lib/formatters';

export async function GET() {
  try {
    const db = await getDbConnection();
    
    // Fetch members currently marked as present
    const query = `
      SELECT 
        a.id as attendance_id,
        m.id as member_id,
        m.barcode,
        m.first_name,
        m.last_name,
        m.photo_url as photo,
        a.checked_in_at as arrivalTime,
        a.is_debt_session,
        s.name as sport_name,
        d.amount as debt_amount,
        i.start_date as lastInscription,
        i.end_date as expiryDate,
        i.status as inscriptionStatus
      FROM attendance_logs a
      JOIN members m ON a.member_id = m.id
      LEFT JOIN sports s ON a.sport_id = s.id
      LEFT JOIN member_debts d ON a.debt_id = d.id
      LEFT JOIN inscriptions i ON a.inscription_id = i.id
      WHERE a.status = 'present'
      ORDER BY a.checked_in_at DESC
    `;
    
    const [rows] = await db.query<RowDataPacket[]>(query);
    
    // Map database fields to the frontend structure
    const presentMembers = rows.map(row => {
      let status = 'valid';
      
      if (row.is_debt_session) {
        status = 'debt';
      } else if (row.expiryDate) {
        const expiry = new Date(row.expiryDate);
        const now = new Date();
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays < 0) {
          status = 'expired';
        } else if (diffDays <= 7) {
          status = 'warning';
        }
      } else {
        status = 'expired';
      }

      return {
        id: row.attendance_id,
        memberId: row.member_id,
        barcode: row.barcode,
        name: `${row.first_name} ${row.last_name}`,
        photo: row.photo || '',
        arrivalTime: formatTime(row.arrivalTime),
        lastInscription: row.lastInscription ? formatDate(row.lastInscription) : 'Aucun',
        expiryDate: row.expiryDate ? formatDate(row.expiryDate) : 'Aucun',
        status: status,
        isDebtSession: Boolean(row.is_debt_session),
        sportName: row.sport_name || 'Entraînement',
        debtAmount: row.debt_amount
      };
    });

    return NextResponse.json(presentMembers);
  } catch (error) {
    console.error('Error fetching present members:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
