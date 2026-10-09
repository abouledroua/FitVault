const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    user: 'citrus',
    password: 'citrus21012013',
    database: 'fitvault_db'
  });
  
  try {
    await conn.query("ALTER TABLE members ADD COLUMN gender ENUM('M', 'F') NULL;");
    await conn.query("ALTER TABLE members ADD COLUMN date_of_birth DATE NULL;");
    await conn.query("ALTER TABLE members ADD COLUMN address TEXT NULL;");
    console.log("Migration done");
  } catch (e) {
    console.log("Error or already exists:", e.message);
  }
  process.exit(0);
}
run();
