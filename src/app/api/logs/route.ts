import { NextResponse } from 'next/server';
import { getDbConnection, createAuditLog } from '@/lib/db';
import { getCurrentSession } from '@/lib/session';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/**
 * GET /api/logs
 * Accessible uniquement par les administrateurs
 */
export async function GET(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Cette interface est strictement réservée à l\'administrateur.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = (page - 1) * limit;

    const action = searchParams.get('action') || '';
    const tableName = searchParams.get('tableName') || '';
    const userId = searchParams.get('userId') || '';
    const deviceUuid = searchParams.get('deviceUuid') || '';
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const db = await getDbConnection();

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (action) {
      whereClause += ' AND l.action = ?';
      params.push(action);
    }

    if (tableName) {
      whereClause += ' AND l.table_name = ?';
      params.push(tableName);
    }

    if (userId) {
      whereClause += ' AND l.user_id = ?';
      params.push(userId);
    }

    if (deviceUuid) {
      whereClause += ' AND l.device_uuid = ?';
      params.push(deviceUuid);
    }

    if (startDate) {
      whereClause += ' AND DATE(l.timestamp) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND DATE(l.timestamp) <= ?';
      params.push(endDate);
    }

    if (search.trim()) {
      whereClause += ' AND (l.action LIKE ? OR l.table_name LIKE ? OR l.details LIKE ? OR l.user_name LIKE ? OR l.device_name LIKE ? OR l.device_uuid LIKE ? OR l.record_id LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s, s, s);
    }

    // 1. Total count
    const [countRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM log l ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // 2. Fetch logs with user and device details if available
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT 
        l.id,
        l.timestamp,
        l.user_id,
        l.device_uuid,
        l.action,
        l.table_name,
        l.record_id,
        l.details,
        l.user_name,
        l.device_name,
        l.ip_address,
        u.username,
        u.full_name as current_user_fullname,
        u.role as user_role,
        d.device_name as current_device_name
      FROM log l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN user_devices d ON l.device_uuid = d.device_uuid
      ${whereClause}
      ORDER BY l.timestamp DESC, l.id DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 3. Stats for dashboard filter cards
    const [statsRows] = await db.query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(DISTINCT l.user_id) as unique_users,
        COUNT(DISTINCT l.device_uuid) as unique_devices,
        SUM(CASE WHEN DATE(l.timestamp) = CURDATE() THEN 1 ELSE 0 END) as today_logs
      FROM log l
    `);

    // 4. Distinct tables and actions for filter dropdowns
    const [filterOptions] = await db.query<RowDataPacket[]>(`
      SELECT 
        DISTINCT action, table_name 
      FROM log 
      WHERE table_name IS NOT NULL AND table_name != ''
      LIMIT 100
    `);

    return NextResponse.json({
      logs: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: statsRows[0] || {
        total_logs: 0,
        unique_users: 0,
        unique_devices: 0,
        today_logs: 0,
      },
      availableFilters: {
        actions: Array.from(new Set(filterOptions.map((f: RowDataPacket) => f.action).filter(Boolean))),
        tables: Array.from(new Set(filterOptions.map((f: RowDataPacket) => f.table_name).filter(Boolean))),
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des logs' }, { status: 500 });
  }
}

/**
 * DELETE /api/logs
 * Permet à l'administrateur de purger les logs plus anciens qu'une certaine date
 */
export async function DELETE(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé. Administrateur requis.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const olderThanDays = parseInt(searchParams.get('days') || '90', 10);

    if (isNaN(olderThanDays) || olderThanDays < 7) {
      return NextResponse.json({ error: 'Période de rétention invalide (minimum 7 jours).' }, { status: 400 });
    }

    const db = await getDbConnection();
    const [res] = await db.query<ResultSetHeader>(
      'DELETE FROM log WHERE timestamp < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [olderThanDays]
    );

    // Enregistrer l'action de purge elle-même
    await createAuditLog({
      action: 'PURGE_LOGS',
      tableName: 'log',
      details: { deletedRows: res.affectedRows, olderThanDays },
      userId: session.userId,
      deviceUuid: session.deviceUuid,
      userName: session.fullName,
      deviceName: session.deviceName,
    });

    return NextResponse.json({
      success: true,
      deletedCount: res.affectedRows,
      message: `${res.affectedRows} logs anciens purgés avec succès.`
    });
  } catch (error) {
    console.error('Error purging audit logs:', error);
    return NextResponse.json({ error: 'Erreur lors de la purge des logs' }, { status: 500 });
  }
}
