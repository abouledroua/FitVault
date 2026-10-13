import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { getCurrentSession } from '@/lib/session';
import { addMonths, addDays } from 'date-fns';

export async function GET(request: Request, context: any) {
  try {
    const resolvedParams = await context.params;
    const memberId = resolvedParams.id;
    const db = await getDbConnection();

    const query = `
      SELECT 
        i.*,
        o.title as offer_title,
        o.price as offer_price,
        o.duration_type,
        o.duration_value,
        o.sessions_count,
        GROUP_CONCAT(s.name SEPARATOR ', ') as sports_included
      FROM inscriptions i
      JOIN offers o ON i.offer_id = o.id
      LEFT JOIN offer_sports os ON o.id = os.offer_id
      LEFT JOIN sports s ON os.sport_id = s.id
      WHERE i.member_id = ?
      GROUP BY i.id
      ORDER BY i.start_date DESC
    `;

    const [rows]: any = await db.query(query, [memberId]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching member inscriptions:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement des abonnements' }, { status: 500 });
  }
}

export async function POST(request: Request, context: any) {
  try {
    const resolvedParams = await context.params;
    const memberId = resolvedParams.id;
    const body = await request.json();
    const { offer_id, start_date, amount_paid, payment_method } = body;

    if (!offer_id || !start_date) {
      return NextResponse.json({ error: 'Formule et date de début obligatoires' }, { status: 400 });
    }

    const session = await getCurrentSession();
    const userId = session?.userId || 1;
    const deviceId = session?.deviceId || 1;

    const db = await getDbConnection();

    // 1. Get offer details
    const [offers]: any = await db.query('SELECT * FROM offers WHERE id = ?', [offer_id]);
    if (offers.length === 0) {
      return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });
    }
    const offer = offers[0];

    // 2. Calculate end_date
    const startDateObj = new Date(start_date);
    let endDateObj = new Date(start_date);

    if (offer.duration_type === 'session') {
      endDateObj = addDays(startDateObj, 1);
    } else if (offer.duration_type === 'standard_month') {
      endDateObj = addMonths(startDateObj, offer.duration_value || 1);
    } else if (offer.duration_type === 'custom_months') {
      endDateObj = addMonths(startDateObj, offer.duration_value || 1);
    } else if (offer.duration_type === 'custom_days') {
      endDateObj = addDays(startDateObj, offer.duration_value || 30);
    }

    const formattedStartDate = startDateObj.toISOString().split('T')[0];
    const formattedEndDate = endDateObj.toISOString().split('T')[0];

    // 3. Compute payments & debt
    const price = parseFloat(offer.price);
    const paid = parseFloat(amount_paid) || 0;
    const remainingDebt = Math.max(0, price - paid);

    let paymentStatus = 'pending';
    if (paid >= price) {
      paymentStatus = 'paid';
    } else if (paid > 0) {
      paymentStatus = 'partial';
    }

    // 4. Insert inscription
    const [inscResult]: any = await db.query(
      `INSERT INTO inscriptions 
       (member_id, offer_id, start_date, end_date, remaining_sessions, status, total_paid, payment_status)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        memberId,
        offer.id,
        formattedStartDate,
        formattedEndDate,
        offer.sessions_count || null,
        paid,
        paymentStatus
      ]
    );

    const inscriptionId = inscResult.insertId;

    // 5. If paid amount > 0, record in Caisse
    if (paid > 0) {
      await db.query(
        `INSERT INTO caisse_transactions 
         (user_id, device_id, flow_direction, module_category, transaction_type, amount, related_id, member_id, motif, note)
         VALUES (?, ?, 'in', 'entrainement', 'paiement_inscription', ?, ?, ?, ?, ?)`,
        [
          userId,
          deviceId,
          paid,
          inscriptionId,
          memberId,
          `Abonnement: ${offer.title}`,
          `Mode de règlement: ${payment_method || 'Espèces'}`
        ]
      );
    }

    // 6. If remaining debt > 0, record debt
    if (remainingDebt > 0) {
      await db.query(
        `INSERT INTO member_debts (member_id, amount, reason, status)
         VALUES (?, ?, ?, 'unpaid')`,
        [memberId, remainingDebt, `Reste à payer abonnement: ${offer.title}`]
      );

      // Increment member's total_debt
      await db.query(
        'UPDATE members SET total_debt = total_debt + ? WHERE id = ?',
        [remainingDebt, memberId]
      );
    }

    const { createAuditLog } = await import('@/lib/db');
    await createAuditLog({
      action: 'CREATE_INSCRIPTION',
      tableName: 'inscriptions',
      recordId: inscriptionId,
      details: {
        memberId,
        offerTitle: offer.title,
        price,
        paid,
        remainingDebt,
        startDate: formattedStartDate,
        endDate: formattedEndDate
      }
    });

    return NextResponse.json({
      success: true,
      inscriptionId,
      message: 'Abonnement enregistré avec succès'
    });
  } catch (error) {
    console.error('Error creating inscription:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement de l\'abonnement' }, { status: 500 });
  }
}
