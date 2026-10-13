import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const db = await getDbConnection();
    const [rows] = await db.query<RowDataPacket[]>(`
      SELECT m.*,
        COALESCE(ps.cnt, 0) AS sales_count,
        COALESCE(i.cnt, 0) AS inscriptions_count,
        COALESCE(a.cnt, 0) AS attendance_count,
        COALESCE(c.cnt, 0) AS caisse_count,
        COALESCE(d.cnt, 0) AS debts_count
      FROM members m
      LEFT JOIN (SELECT member_id, COUNT(*) as cnt FROM product_sales GROUP BY member_id) ps ON ps.member_id = m.id
      LEFT JOIN (SELECT member_id, COUNT(*) as cnt FROM inscriptions GROUP BY member_id) i ON i.member_id = m.id
      LEFT JOIN (SELECT member_id, COUNT(*) as cnt FROM attendance_logs GROUP BY member_id) a ON a.member_id = m.id
      LEFT JOIN (SELECT member_id, COUNT(*) as cnt FROM caisse_transactions WHERE member_id IS NOT NULL GROUP BY member_id) c ON c.member_id = m.id
      LEFT JOIN (SELECT member_id, COUNT(*) as cnt FROM member_debts GROUP BY member_id) d ON d.member_id = m.id
      ORDER BY m.last_name ASC, m.first_name ASC
    `);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const barcode = formData.get('barcode') as string;
    const first_name = formData.get('first_name') as string;
    const last_name = formData.get('last_name') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const emergency_contact = formData.get('emergency_contact') as string;
    const gender = formData.get('gender') as string;
    const date_of_birth = formData.get('date_of_birth') as string;
    const address = formData.get('address') as string;

    let photo_url = null;
    const photo = formData.get('photo') as File;

    if (photo && photo.size > 0) {
      const bytes = await photo.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = path.join(process.cwd(), 'public', 'photo', 'member');
      await fs.mkdir(uploadDir, { recursive: true });

      const filename = `${Date.now()}-${photo.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const filepath = path.join(uploadDir, filename);

      await fs.writeFile(filepath, buffer);
      photo_url = `/photo/member/${filename}`;
    }

    const db = await getDbConnection();
    let finalBarcode = barcode;

    if (!finalBarcode) {
      const [rows]: any = await db.query("SELECT MAX(CAST(barcode AS UNSIGNED)) as max_barcode FROM members WHERE barcode REGEXP '^[0-9]+$'");
      const maxBarcode = rows[0]?.max_barcode;
      if (maxBarcode) {
        finalBarcode = String(maxBarcode + 1);
      } else {
        finalBarcode = '1000';
      }
    }

    const initial_debt = Math.max(0, parseFloat((formData.get('initial_debt') as string) || '0') || 0);

    const [result]: any = await db.query(
      'INSERT INTO members (barcode, first_name, last_name, phone, email, emergency_contact, photo_url, gender, date_of_birth, address, initial_debt, total_debt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [finalBarcode, first_name || '', last_name || '', phone || '', email || null, emergency_contact || null, photo_url, gender || null, date_of_birth || null, address || null, initial_debt, initial_debt]
    );

    if (initial_debt > 0) {
      await db.query(
        "INSERT INTO member_debts (member_id, amount, reason, status) VALUES (?, ?, 'Solde initial / Dette antérieure', 'unpaid')",
        [result.insertId, initial_debt]
      );
    }

    const { createAuditLog } = await import('@/lib/db');
    await createAuditLog({
      action: 'CREATE_MEMBER',
      tableName: 'members',
      recordId: result.insertId,
      details: {
        barcode: finalBarcode,
        first_name,
        last_name,
        phone,
        initial_debt
      }
    });

    return NextResponse.json({ id: result.insertId, barcode: finalBarcode }, { status: 201 });
  } catch (error) {
    console.error('Error creating member:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
