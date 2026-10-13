import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return Number.isNaN(val) ? 'NULL' : String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = val.getFullYear();
    const m = pad(val.getMonth() + 1);
    const d = pad(val.getDate());
    const h = pad(val.getHours());
    const min = pad(val.getMinutes());
    const s = pad(val.getSeconds());
    return `'${y}-${m}-${d} ${h}:${min}:${s}'`;
  }
  if (Buffer.isBuffer(val)) {
    return `X'${val.toString('hex')}'`;
  }
  const str = String(val);
  const escaped = str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
  return `'${escaped}'`;
}

export async function GET() {
  try {
    const db = await getDbConnection();

    // Fetch all base tables in the current database
    const [tableRows] = await db.query<RowDataPacket[]>(
      "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'"
    );

    const now = new Date();
    const dateFormatted = now.toISOString().replace(/[:.]/g, '-');
    let dump = '';

    dump += `-- ========================================================\n`;
    dump += `-- FitVault MySQL Database Dump\n`;
    dump += `-- Date: ${now.toISOString()}\n`;
    dump += `-- Database: ${process.env.DB_NAME || 'fitvault_db'}\n`;
    dump += `-- ========================================================\n\n`;
    dump += `SET NAMES utf8;\n`;
    dump += `SET FOREIGN_KEY_CHECKS = 0;\n`;
    dump += `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n`;
    dump += `SET time_zone = "+00:00";\n\n`;

    for (const row of tableRows) {
      const tableName = Object.values(row)[0] as string;

      dump += `-- --------------------------------------------------------\n`;
      dump += `-- Structure for table \`${tableName}\`\n`;
      dump += `-- --------------------------------------------------------\n`;
      dump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;

      const [createResult] = await db.query<RowDataPacket[]>(`SHOW CREATE TABLE \`${tableName}\``);
      if (createResult && createResult[0]) {
        const createSql = createResult[0]['Create Table'] || createResult[0]['Create View'];
        dump += `${createSql};\n\n`;
      }

      // Fetch data
      const [rows] = await db.query<RowDataPacket[]>(`SELECT * FROM \`${tableName}\``);
      if (rows && rows.length > 0) {
        dump += `-- Data for table \`${tableName}\` (${rows.length} rows)\n`;

        // Batch inserts in chunks of 50
        const chunkSize = 50;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          const columns = Object.keys(chunk[0])
            .map((col) => `\`${col}\``)
            .join(', ');

          const valueRows = chunk.map((r) => {
            const vals = Object.values(r).map((v) => escapeSqlValue(v));
            return `(${vals.join(', ')})`;
          });

          dump += `INSERT INTO \`${tableName}\` (${columns}) VALUES\n  ${valueRows.join(',\n  ')};\n`;
        }
        dump += `\n`;
      }
    }

    dump += `-- --------------------------------------------------------\n`;
    dump += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    dump += `-- Dump completed at: ${new Date().toISOString()}\n`;

    const filename = `fitvault_backup_${dateFormatted.slice(0, 19)}.sql`;

    return new NextResponse(dump, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error exporting database:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la sauvegarde de la base de données' },
      { status: 500 }
    );
  }
}
