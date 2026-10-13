import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { getCurrentSession } from '@/lib/session';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { formatDate, formatTime } from '@/lib/formatters';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all'; // 'all', 'entrainement', 'boutique', 'general'
    const period = searchParams.get('period') || 'today'; // 'today', 'month', 'all'
    const specificDate = searchParams.get('date'); // YYYY-MM-DD

    const db = await getDbConnection();

    // Base query for transactions
    let query = `
      SELECT 
        c.*,
        u.full_name as user_name,
        d.device_name,
        CONCAT(m.first_name, ' ', m.last_name) as member_name,
        m.barcode as member_barcode
      FROM caisse_transactions c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN user_devices d ON c.device_id = d.id
      LEFT JOIN members m ON c.member_id = m.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filter by module category
    if (category !== 'all') {
      query += ' AND c.module_category = ?';
      params.push(category);
    }

    // Filter by period / date
    if (specificDate) {
      query += ' AND DATE(c.transaction_date) = ?';
      params.push(specificDate);
    } else if (period === 'today') {
      query += ' AND DATE(c.transaction_date) = CURDATE()';
    } else if (period === 'month') {
      query += ' AND YEAR(c.transaction_date) = YEAR(CURDATE()) AND MONTH(c.transaction_date) = MONTH(CURDATE())';
    }

    query += ' ORDER BY c.transaction_date DESC LIMIT 300';

    const [transactions] = await db.query<RowDataPacket[]>(query, params);

    // Compute stats
    // Total global cash in/out (all time or current filter)
    let statsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN flow_direction = 'in' THEN amount ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN flow_direction = 'out' THEN amount ELSE 0 END), 0) as total_out,
        COALESCE(SUM(CASE WHEN module_category = 'entrainement' AND flow_direction = 'in' THEN amount ELSE 0 END), 0) as entrainement_in,
        COALESCE(SUM(CASE WHEN module_category = 'boutique' AND flow_direction = 'in' THEN amount ELSE 0 END), 0) as boutique_in,
        COALESCE(SUM(CASE WHEN module_category = 'boutique' AND flow_direction = 'out' THEN amount ELSE 0 END), 0) as boutique_out
      FROM caisse_transactions
      WHERE 1=1
    `;

    const statsParams: any[] = [];
    if (specificDate) {
      statsQuery += ' AND DATE(transaction_date) = ?';
      statsParams.push(specificDate);
    } else if (period === 'today') {
      statsQuery += ' AND DATE(transaction_date) = CURDATE()';
    } else if (period === 'month') {
      statsQuery += ' AND YEAR(transaction_date) = YEAR(CURDATE()) AND MONTH(transaction_date) = MONTH(CURDATE())';
    }

    const [statsRows] = await db.query<RowDataPacket[]>(statsQuery, statsParams);
    const stats = statsRows[0] || {};

    const totalIn = parseFloat(stats.total_in || 0);
    const totalOut = parseFloat(stats.total_out || 0);
    const netBalance = totalIn - totalOut;

    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      flowDirection: t.flow_direction,
      moduleCategory: t.module_category,
      transactionType: t.transaction_type,
      amount: parseFloat(t.amount).toFixed(2),
      motif: t.motif,
      note: t.note,
      date: formatDate(t.transaction_date),
      time: formatTime(t.transaction_date),
      userName: t.user_name || 'Système',
      deviceName: t.device_name || 'Poste Caisse',
      memberName: t.member_name,
      memberBarcode: t.member_barcode
    }));

    return NextResponse.json({
      stats: {
        totalIn: totalIn.toFixed(2),
        totalOut: totalOut.toFixed(2),
        netBalance: netBalance.toFixed(2),
        entrainementTotal: parseFloat(stats.entrainement_in || 0).toFixed(2),
        boutiqueTotal: (parseFloat(stats.boutique_in || 0) - parseFloat(stats.boutique_out || 0)).toFixed(2)
      },
      transactions: formattedTransactions
    });
  } catch (error) {
    console.error('Error fetching caisse data:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement des données de caisse' }, { status: 500 });
  }
}

// POST manual alimentation or retrait
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operation_type, amount, motif, note, member_id, flow_direction, module_category } = body;

    // We can have either operation_type (general caisse) or flow_direction (member payments)
    const direction = flow_direction || (operation_type === 'alimentation' ? 'in' : 'out');
    const category = module_category || 'general';
    const type = operation_type || 'paiement_manuel';

    if (!amount || !motif || !motif.trim()) {
      return NextResponse.json({ error: 'Montant et motif obligatoires' }, { status: 400 });
    }

    const session = await getCurrentSession();
    const userId = session?.userId || 1;
    const deviceId = session?.deviceId || 1;

    const amountVal = parseFloat(amount);

    if (isNaN(amountVal) || amountVal <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }

    const db = await getDbConnection();
    
    // Check if we need to update a debt for the member
    if (member_id && motif === 'Règlement Dette') {
      // Actually, we could deduct debt, but this depends on business logic. 
      // For now, if motif is "Règlement Dette", we just decrease member's total_debt.
      await db.query('UPDATE members SET total_debt = GREATEST(0, total_debt - ?) WHERE id = ?', [amountVal, member_id]);
    }
    
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO caisse_transactions 
       (user_id, device_id, flow_direction, module_category, transaction_type, amount, motif, note, member_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        deviceId,
        direction,
        category,
        type,
        amountVal,
        motif.trim(),
        note?.trim() || null,
        member_id || null
      ]
    );

    const { createAuditLog } = await import('@/lib/db');
    await createAuditLog({
      action: 'CAISSE_TRANSACTION',
      tableName: 'caisse_transactions',
      recordId: result.insertId,
      details: {
        direction,
        category,
        type,
        amount: amountVal,
        motif: motif.trim(),
        member_id
      }
    });

    return NextResponse.json({
      success: true,
      transactionId: result.insertId,
      message: 'Paiement enregistré avec succès'
    });
  } catch (error) {
    console.error('Error adding caisse transaction:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement de l\'opération' }, { status: 500 });
  }
}
