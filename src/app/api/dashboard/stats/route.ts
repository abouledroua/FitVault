import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { getCurrentSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';
import { formatTime } from '@/lib/formatters';

export async function GET() {
  try {
    const session = await getCurrentSession();
    const db = await getDbConnection();

    // 1. Caisse today & total
    const [caisseToday]: any = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN flow_direction = 'in' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN flow_direction = 'out' THEN amount ELSE 0 END), 0) as balance_today
      FROM caisse_transactions
      WHERE DATE(transaction_date) = CURDATE()
    `);

    const [caisseNet]: any = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN flow_direction = 'in' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN flow_direction = 'out' THEN amount ELSE 0 END), 0) as net_total
      FROM caisse_transactions
    `);

    // 2. Present members count
    const [presentCount]: any = await db.query(`
      SELECT COUNT(*) as count FROM attendance_logs WHERE status = 'present'
    `);

    // 3. Boutique sales today
    const [boutiqueToday]: any = await db.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as sales_count
      FROM product_sales
      WHERE DATE(sale_date) = CURDATE()
    `);

    // 4. Low stock alert count
    const [lowStockCount]: any = await db.query(`
      SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock_alert
    `);

    // 5. Total active members
    const [membersCount]: any = await db.query(`
      SELECT COUNT(*) as count FROM members
    `);

    // 6. Recent activity (last 5 attendance logs)
    const [recentLogs] = await db.query<RowDataPacket[]>(`
      SELECT 
        a.id,
        a.checked_in_at,
        a.is_debt_session,
        m.first_name,
        m.last_name,
        m.barcode,
        s.name as sport_name
      FROM attendance_logs a
      JOIN members m ON a.member_id = m.id
      LEFT JOIN sports s ON a.sport_id = s.id
      ORDER BY a.checked_in_at DESC
      LIMIT 5
    `);

    const formattedLogs = recentLogs.map(r => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`,
      barcode: r.barcode,
      sportName: r.sport_name || 'Entraînement',
      isDebtSession: Boolean(r.is_debt_session),
      time: formatTime(r.checked_in_at)
    }));

    return NextResponse.json({
      device: {
        name: session?.deviceName || 'Poste Caisse & Accueil',
        uuid: session?.deviceUuid || 'Non défini',
      },
      user: {
        name: session?.fullName || session?.username || 'Admin'
      },
      stats: {
        caisseNet: parseFloat(caisseNet[0]?.net_total || 0).toFixed(2),
        caisseToday: parseFloat(caisseToday[0]?.balance_today || 0).toFixed(2),
        presentCount: presentCount[0]?.count || 0,
        boutiqueSalesToday: parseFloat(boutiqueToday[0]?.total_sales || 0).toFixed(2),
        boutiqueCountToday: boutiqueToday[0]?.sales_count || 0,
        lowStockCount: lowStockCount[0]?.count || 0,
        membersCount: membersCount[0]?.count || 0
      },
      recentActivity: formattedLogs
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement des statistiques' }, { status: 500 });
  }
}
