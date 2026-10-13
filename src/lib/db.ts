import mysql from 'mysql2/promise';
import { getCurrentSession } from '@/lib/session';

let pool: mysql.Pool | null = null;
let dbInitDone = false;

/**
 * Interface pour enregistrer une action dans la table de log
 */
export interface AuditLogOptions {
  action: string;
  tableName?: string | null;
  recordId?: number | string | null;
  details?: any;
  userId?: number | null;
  deviceUuid?: string | null;
  userName?: string | null;
  deviceName?: string | null;
  ipAddress?: string | null;
}

/**
 * Enregistre une action d'audit dans la table `log`
 * Récupère automatiquement l'utilisateur et le deviceUuid de la session courante si non spécifiés
 */
export async function createAuditLog(options: AuditLogOptions) {
  try {
    const db = await getDbConnection();

    let userId = options.userId ?? null;
    let deviceUuid = options.deviceUuid ?? null;
    let userName = options.userName ?? null;
    let deviceName = options.deviceName ?? null;

    // Si userId ou deviceUuid ne sont pas fournis, on tente de les récupérer de la session active
    if (!userId || !deviceUuid) {
      try {
        const session = await getCurrentSession();
        if (session) {
          if (!userId) userId = session.userId;
          if (!deviceUuid) deviceUuid = session.deviceUuid;
          if (!userName) userName = session.fullName || session.username;
          if (!deviceName) deviceName = session.deviceName;
        }
      } catch {
        // En dehors du contexte de requête (ex: scripts CLI ou init), session peut échouer
      }
    }

    const detailsStr = options.details
      ? typeof options.details === 'string'
        ? options.details
        : JSON.stringify(options.details)
      : null;

    await db.query(
      `INSERT INTO log (user_id, device_uuid, action, table_name, record_id, details, user_name, device_name, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        deviceUuid,
        options.action,
        options.tableName || null,
        options.recordId ? String(options.recordId) : null,
        detailsStr,
        userName,
        deviceName,
        options.ipAddress || null,
      ]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export async function ensureDbInitialized(db: mysql.Pool) {
  if (dbInitDone) return;
  try {
    // 0. Ensure log table exists for auditing all database actions
    await db.query(`
      CREATE TABLE IF NOT EXISTS log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id INT NULL,
        device_uuid VARCHAR(64) NULL,
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(100) NULL,
        record_id VARCHAR(100) NULL,
        details LONGTEXT NULL,
        user_name VARCHAR(255) NULL,
        device_name VARCHAR(255) NULL,
        ip_address VARCHAR(100) NULL,
        INDEX idx_timestamp (timestamp),
        INDEX idx_user_id (user_id),
        INDEX idx_device_uuid (device_uuid),
        INDEX idx_action (action),
        INDEX idx_table_name (table_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `);

    // 1. Ensure device_fingerprints table exists for cross-browser device consistency
    // Note for MySQL 5.1: Only one TIMESTAMP column can have CURRENT_TIMESTAMP default per table.
    // We use TIMESTAMP for last_seen_at and DATETIME for created_at.
    await db.query(`
      CREATE TABLE IF NOT EXISTS device_fingerprints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_key VARCHAR(255) NOT NULL UNIQUE,
        device_uuid VARCHAR(16) NOT NULL,
        device_name VARCHAR(255) DEFAULT NULL,
        last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at DATETIME NULL,
        INDEX idx_client_key (client_key),
        INDEX idx_device_uuid (device_uuid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `);

    // 2. Check if users table is empty
    const [rows]: any = await db.query('SELECT COUNT(*) as count FROM users');
    if (rows && rows[0]?.count === 0) {
      const bcrypt = (await import('bcrypt')).default;
      const hash = await bcrypt.hash('admin', 10);
      await db.query(
        'INSERT INTO users (full_name, username, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
        ['Administrateur', 'admin', hash, 'admin']
      );
      console.log('✅ Base de données initialisée: Utilisateur admin/admin créé automatiquement.');
    }

    // 3. Ensure products table has is_archived column
    const [prodCols]: any = await db.query("SHOW COLUMNS FROM products LIKE 'is_archived'");
    if (prodCols.length === 0) {
      await db.query("ALTER TABLE products ADD COLUMN is_archived TINYINT(1) DEFAULT 0");
    }

    // 4. Ensure users table has photo_url column
    const [userCols]: any = await db.query("SHOW COLUMNS FROM users LIKE 'photo_url'");
    if (userCols.length === 0) {
      await db.query("ALTER TABLE users ADD COLUMN photo_url VARCHAR(255) DEFAULT NULL");
    }

    // 5. Ensure gym_settings table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS gym_settings (
        id INT PRIMARY KEY DEFAULT 1,
        gym_name VARCHAR(255) DEFAULT '',
        facebook VARCHAR(255) DEFAULT '',
        phone VARCHAR(100) DEFAULT '',
        logo_url VARCHAR(255) DEFAULT NULL,
        badge_image_url VARCHAR(255) DEFAULT NULL,
        badge_template VARCHAR(50) DEFAULT 'standard',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8
    `);

    // Ensure badge_template column exists if table was already created
    const [badgeCols]: any = await db.query("SHOW COLUMNS FROM gym_settings LIKE 'badge_template'");
    if (badgeCols.length === 0) {
      await db.query("ALTER TABLE gym_settings ADD COLUMN badge_template VARCHAR(50) DEFAULT 'standard'");
    }

    // Ensure initial gym_settings row exists
    await db.query(`
      INSERT IGNORE INTO gym_settings (id, gym_name, facebook, phone, badge_template)
      VALUES (1, 'FitVault Gym', '', '', 'standard')
    `);

    // 6. Ensure existing sessions never expire prematurely
    await db.query("UPDATE user_sessions SET expires_at = DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE expires_at < DATE_ADD(NOW(), INTERVAL 30 DAY)").catch(() => {});

    dbInitDone = true;
  } catch (error) {
    console.error('Error during DB initialization check:', error);
    try {
      const fs = await import('fs');
      const path = await import('path');
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      const logFile = path.join(logDir, 'db-error.log');
      const msg = `[${new Date().toISOString()}] [DB_INIT_ERROR] ${error instanceof Error ? error.stack || error.message : String(error)}\n`;
      fs.appendFileSync(logFile, msg);
    } catch {}
  }
}

export async function getDbConnection() {
  if (pool) {
    await ensureDbInitialized(pool);
    return pool;
  }

  const dbConfigPrimary = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'fitvault_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  const dbConfigFallback = {
    ...dbConfigPrimary,
    user: process.env.DB_FALLBACK_USER || 'citrus',
    password: process.env.DB_FALLBACK_PASS || 'citrus21012013',
  };

  const logDbError = async (context: string, err: unknown) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      const logFile = path.join(logDir, 'db-error.log');
      const msg = `[${new Date().toISOString()}] [${context}] ${err instanceof Error ? err.stack || err.message : String(err)}\n`;
      fs.appendFileSync(logFile, msg);
    } catch {}
  };

  try {
    // Try primary connection
    pool = mysql.createPool(dbConfigPrimary);
    const connection = await pool.getConnection();
    connection.release();
    console.log('Connected to MySQL via Primary Credentials');
  } catch (error: unknown) {
    await logDbError('PRIMARY_CONNECTION_FAILED', error);
    if (error instanceof Error && 'code' in error && (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ECONNREFUSED')) {
      console.warn('Primary connection failed. Attempting fallback...');
      // Try fallback connection
      pool = mysql.createPool(dbConfigFallback);
      try {
        const fallbackConnection = await pool.getConnection();
        fallbackConnection.release();
        console.log('Connected to MySQL via Fallback Credentials');
      } catch (fallbackError) {
        await logDbError('FALLBACK_CONNECTION_FAILED', fallbackError);
        console.error('Fallback connection also failed:', fallbackError);
        throw fallbackError;
      }
    } else {
      throw error;
    }
  }

  await ensureDbInitialized(pool);
  return pool;
}
