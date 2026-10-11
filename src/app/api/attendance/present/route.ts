import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { formatDate, formatTime } from '@/lib/formatters';

export async function GET() {
  try {
    const db = await getDbConnection();
    
    // Fetch all members present today (both currently present and departed), ordered with present at top
    const query = `
      SELECT 
        a.id as attendance_id,
        m.id as member_id,
        m.barcode,
        m.first_name,
        m.last_name,
        m.photo_url as photo,
        a.checked_in_at as arrivalTime,
        a.checked_out_at as departureTime,
        a.status as attendance_status,
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
      WHERE DATE(a.checked_in_at) = CURDATE()
      ORDER BY 
        (CASE WHEN a.status = 'present' THEN 0 ELSE 1 END) ASC,
        a.checked_in_at DESC
    `;
    
    const [rows] = await db.query<RowDataPacket[]>(query);
    
    // Map database fields to the frontend structure
    const allTodayMembers = rows.map(row => {
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
        departureTime: row.departureTime ? formatTime(row.departureTime) : null,
        lastInscription: row.lastInscription ? formatDate(row.lastInscription) : 'Aucun',
        expiryDate: row.expiryDate ? formatDate(row.expiryDate) : 'Aucun',
        status: status,
        attendanceStatus: row.attendance_status,
        isPresent: row.attendance_status === 'present',
        isDebtSession: Boolean(row.is_debt_session),
        sportName: row.sport_name || 'Entraînement',
        debtAmount: row.debt_amount
      };
    });

    const presentOnly = allTodayMembers.filter(m => m.isPresent);

    // Count unique members who visited today and total entries
    const [todayCountRows]: any = await db.query(
      `SELECT COUNT(DISTINCT member_id) as total_unique, COUNT(*) as total_entries 
       FROM attendance_logs 
       WHERE DATE(checked_in_at) = CURDATE()`
    );
    const totalToday = Number(todayCountRows?.[0]?.total_unique || 0);
    const totalEntries = Number(todayCountRows?.[0]?.total_entries || 0);

    return NextResponse.json({
      allToday: allTodayMembers,
      present: presentOnly,
      presentCount: presentOnly.length,
      totalToday,
      totalEntries
    });
  } catch (error) {
    console.error('Error fetching present members:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
