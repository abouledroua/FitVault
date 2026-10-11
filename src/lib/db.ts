import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let dbInitDone = false;

export async function ensureDbInitialized(db: mysql.Pool) {
  if (dbInitDone) return;
  try {
    // 1. Ensure device_fingerprints table exists for cross-browser device consistency
    await db.query(`
      CREATE TABLE IF NOT EXISTS device_fingerprints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_key VARCHAR(255) NOT NULL UNIQUE,
        device_uuid VARCHAR(16) NOT NULL,
        device_name VARCHAR(255) DEFAULT NULL,
        last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_client_key (client_key),
        INDEX idx_device_uuid (device_uuid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. Check if users table is empty
    const [rows]: any = await db.query('SELECT COUNT(*) as count FROM users');
    if (rows && rows[0]?.count === 0) {
      const bcrypt = (await import('bcrypt')).default;
      const hash = await bcrypt.hash('admin', 10);
      await db.query(
        'INSERT INTO users (full_name, username, password_hash, role, is_active) VALUES (?, ?, ?, ?, TRUE)',
        ['Administrateur', 'admin', hash, 'admin']
      );
      console.log('✅ Base de données initialisée: Utilisateur admin/admin créé automatiquement.');
    }

    // 3. Ensure products table has is_archived column
    const [prodCols]: any = await db.query("SHOW COLUMNS FROM products LIKE 'is_archived'");
    if (prodCols.length === 0) {
      await db.query("ALTER TABLE products ADD COLUMN is_archived BOOLEAN DEFAULT FALSE");
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
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

  try {
    // Try primary connection
    pool = mysql.createPool(dbConfigPrimary);
    const connection = await pool.getConnection();
    connection.release();
    console.log('Connected to MySQL via Primary Credentials');
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ECONNREFUSED')) {
      console.warn('Primary connection failed. Attempting fallback...');
      // Try fallback connection
      pool = mysql.createPool(dbConfigFallback);
      try {
        const fallbackConnection = await pool.getConnection();
        fallbackConnection.release();
        console.log('Connected to MySQL via Fallback Credentials');
      } catch (fallbackError) {
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

