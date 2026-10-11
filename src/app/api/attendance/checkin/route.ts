import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { barcode, member_id, sport_id } = body;

    if (!barcode && !member_id) {
      return NextResponse.json({ error: 'Code-barres ou ID membre requis' }, { status: 400 });
    }

    const db = await getDbConnection();

    // 1. Fetch Member
    let memberQuery = 'SELECT * FROM members WHERE ';
    const params = [];
    if (barcode) {
      memberQuery += 'barcode = ?';
      params.push(barcode.trim());
    } else {
      memberQuery += 'id = ?';
      params.push(member_id);
    }

    const [members] = await db.query<RowDataPacket[]>(memberQuery, params);
    if (members.length === 0) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    }
    const member = members[0];

    // 2. Check if already checked in
    const [alreadyPresent] = await db.query<RowDataPacket[]>(
      'SELECT * FROM attendance_logs WHERE member_id = ? AND status = ? ORDER BY checked_in_at DESC LIMIT 1',
      [member.id, 'present']
    );

    if (alreadyPresent.length > 0) {
      const attendance = alreadyPresent[0];
      const checkinTime = new Date(attendance.checked_in_at).getTime();
      const diffMs = Date.now() - checkinTime;
      const threeMinutesMs = 3 * 60 * 1000;

      // If scanned again in less than 3 minutes: preserve the exact current message
      if (diffMs < threeMinutesMs) {
        return NextResponse.json({
          alreadyPresent: true,
          attendanceId: attendance.id,
          member: {
            id: member.id,
            name: `${member.first_name} ${member.last_name}`,
            photo: member.photo_url,
            barcode: member.barcode,
          },
          message: `${member.first_name} ${member.last_name} est déjà présent(e) dans la salle.`
        });
      }

      // If more than 3 minutes passed: automatically mark departure
      await db.query(
        'UPDATE attendance_logs SET status = ?, checked_out_at = NOW() WHERE id = ?',
        ['departed', attendance.id]
      );

      return NextResponse.json({
        departed: true,
        attendanceId: attendance.id,
        member_name: `${member.first_name} ${member.last_name}`,
        member: {
          id: member.id,
          name: `${member.first_name} ${member.last_name}`,
          photo: member.photo_url,
          barcode: member.barcode,
        },
        message: `Départ enregistré pour ${member.first_name} ${member.last_name}.`
      });
    }

    // 3. Resolve Sport (Default to Musculation/First sport if not provided)
    let selectedSportId = sport_id;
    if (!selectedSportId) {
      const [defaultSport] = await db.query<RowDataPacket[]>('SELECT id, name, default_single_session_price FROM sports WHERE is_active = TRUE ORDER BY id ASC LIMIT 1');
      if (defaultSport.length > 0) {
        selectedSportId = defaultSport[0].id;
      } else {
        selectedSportId = 1;
      }
    }

    const [sportRows] = await db.query<RowDataPacket[]>('SELECT * FROM sports WHERE id = ?', [selectedSportId]);
    const sport = sportRows[0] || { name: 'Entraînement', default_single_session_price: '50.00' };

    // 4. Check for active valid inscription covering this sport
    const nowStr = new Date().toISOString().split('T')[0];
    const inscQuery = `
      SELECT i.*, o.title as offer_title 
      FROM inscriptions i
      JOIN offers o ON i.offer_id = o.id
      JOIN offer_sports os ON o.id = os.offer_id
      WHERE i.member_id = ? 
        AND os.sport_id = ?
        AND i.status = 'active'
        AND i.start_date <= ?
        AND i.end_date >= ?
      ORDER BY i.end_date DESC
      LIMIT 1
    `;

    const [validInscriptions] = await db.query<RowDataPacket[]>(inscQuery, [
      member.id,
      selectedSportId,
      nowStr,
      nowStr
    ]);

    let isDebt = false;
    let inscriptionId = null;
    let debtId = null;
    const sessionPrice = parseFloat(sport.default_single_session_price) || 50;

    if (validInscriptions.length > 0) {
      // Inscription valid!
      const insc = validInscriptions[0];
      inscriptionId = insc.id;

      // Decrement session if session-limited
      if (insc.remaining_sessions !== null && insc.remaining_sessions > 0) {
        const remaining = insc.remaining_sessions - 1;
        const newStatus = remaining <= 0 ? 'expired' : 'active';
        await db.query(
          'UPDATE inscriptions SET remaining_sessions = ?, status = ? WHERE id = ?',
          [remaining, newStatus, insc.id]
        );
      }
    } else {
      // No valid inscription found => Member allowed for 1 session in DEBT!
      isDebt = true;
    }

    // 5. Insert Attendance Log
    const [attResult] = await db.query<ResultSetHeader>(
      `INSERT INTO attendance_logs 
       (member_id, inscription_id, sport_id, is_debt_session, checked_in_at, status)
       VALUES (?, ?, ?, ?, NOW(), 'present')`,
      [member.id, inscriptionId, selectedSportId, isDebt]
    );

    const attendanceId = attResult.insertId;

    // 6. If debt session, record into member_debts and update member's total_debt
    if (isDebt) {
      const [debtResult] = await db.query<ResultSetHeader>(
        `INSERT INTO member_debts 
         (member_id, attendance_id, sport_id, amount, reason, status)
         VALUES (?, ?, ?, ?, ?, 'unpaid')`,
        [
          member.id,
          attendanceId,
          selectedSportId,
          sessionPrice,
          `Séance sans abonnement (${sport.name})`
        ]
      );

      debtId = debtResult.insertId;

      // Link debt_id back to attendance_logs
      await db.query('UPDATE attendance_logs SET debt_id = ? WHERE id = ?', [debtId, attendanceId]);

      // Increment member's total debt
      await db.query('UPDATE members SET total_debt = total_debt + ? WHERE id = ?', [sessionPrice, member.id]);
    }

    return NextResponse.json({
      success: true,
      attendanceId,
      member: {
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        barcode: member.barcode,
        photo: member.photo_url,
      },
      isDebtSession: isDebt,
      debtAmount: isDebt ? sessionPrice : 0,
      sportName: sport.name,
      message: isDebt
        ? `Séance enregistrée en dette (${sessionPrice} DA) pour ${member.first_name} ${member.last_name} (Abonnement expiré ou inexistant).`
        : `Pointage réussi ! Bon entraînement à ${member.first_name} ${member.last_name}.`
    });
  } catch (error) {
    console.error('Error in check-in:', error);
    return NextResponse.json({ error: 'Erreur lors du pointage' }, { status: 500 });
  }
}
