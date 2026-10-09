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
        (SELECT COUNT(*) FROM product_sales WHERE member_id = m.id) AS sales_count,
        (SELECT COUNT(*) FROM inscriptions WHERE member_id = m.id) AS inscriptions_count,
        (SELECT COUNT(*) FROM attendance_logs WHERE member_id = m.id) AS attendance_count,
        (SELECT COUNT(*) FROM caisse_transactions WHERE member_id = m.id) AS caisse_count,
        (SELECT COUNT(*) FROM member_debts WHERE member_id = m.id) AS debts_count
      FROM members m 
      ORDER BY m.created_at DESC
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
    
    const [result]: any = await db.query(
      'INSERT INTO members (barcode, first_name, last_name, phone, email, emergency_contact, photo_url, gender, date_of_birth, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [finalBarcode, first_name, last_name, phone || null, email || null, emergency_contact || null, photo_url, gender || null, date_of_birth || null, address || null]
    );
    
    return NextResponse.json({ id: result.insertId, barcode: finalBarcode }, { status: 201 });
  } catch (error) {
    console.error('Error creating member:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
