const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function seed() {
  try {
    console.log("Attempting to connect to WampServer MySQL...");
    let connection = await mysql.createConnection({
      host: 'localhost',
      user: 'citrus',
      password: 'citrus21012013',
      multipleStatements: true
    });
    
    console.log("Connected to MySQL successfully!");
    
    console.log("Creating database fitvault_db...");
    await connection.query("CREATE DATABASE IF NOT EXISTS fitvault_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    
    await connection.query("USE fitvault_db;");
    
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    
    // Remove the CREATE DATABASE and USE statements from schemaSql to avoid issues
    const safeSchema = schemaSql.replace(/CREATE DATABASE IF NOT EXISTS fitvault_db[^;]+;/g, '').replace(/USE fitvault_db;/g, '');
    
    console.log("Importing tables...");
    await connection.query(safeSchema);
    console.log("Success! 'fitvault_db' database and all tables have been created.");
    
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error("\n[Error] Could not initialize database.");
    console.error(err);
    process.exit(1);
  }
}

seed();
