import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { getDbConnection, ensureDbInitialized } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Veuillez sélectionner un fichier SQL de sauvegarde' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.sql')) {
      return NextResponse.json(
        { error: 'Le fichier sélectionné doit être un fichier SQL valide (.sql)' },
        { status: 400 }
      );
    }

    const sqlContent = await file.text();

    if (!sqlContent || sqlContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Le fichier SQL est vide' },
        { status: 400 }
      );
    }

    const primaryConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'fitvault_db',
      multipleStatements: true,
    };

    const fallbackConfig = {
      ...primaryConfig,
      user: process.env.DB_FALLBACK_USER || 'citrus',
      password: process.env.DB_FALLBACK_PASS || 'citrus21012013',
    };

    let conn: mysql.Connection | null = null;

    try {
      conn = await mysql.createConnection(primaryConfig);
    } catch (err: any) {
      if (err?.code === 'ER_ACCESS_DENIED_ERROR' || err?.code === 'ECONNREFUSED') {
        conn = await mysql.createConnection(fallbackConfig);
      } else {
        throw err;
      }
    }

    try {
      // Execute the SQL dump
      await conn.query('SET FOREIGN_KEY_CHECKS = 0;');
      await conn.query(sqlContent);
      await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
    } finally {
      await conn.end();
    }

    // Run ensureDbInitialized on pool to ensure everything is consistent
    const pool = await getDbConnection();
    await ensureDbInitialized(pool);

    return NextResponse.json({
      success: true,
      message: 'Base de données restaurée avec succès !',
    });
  } catch (error: any) {
    console.error('Error restoring database:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la restauration de la base de données' },
      { status: 500 }
    );
  }
}
