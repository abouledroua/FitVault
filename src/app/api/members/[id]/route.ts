import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: Request, context: any) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams.id;
    const db = await getDbConnection();
    
    const [
      [members],
      [inscriptions],
      [attendance],
      [debts],
      [caissePayments]
    ]: any = await Promise.all([
      db.query('SELECT * FROM members WHERE id = ?', [id]),
      db.query(`
        SELECT 
          i.*,
          o.title as offer_title,
          o.price as offer_price,
          o.duration_type,
          o.duration_value,
          o.sessions_count,
          GROUP_CONCAT(s.name SEPARATOR ', ') as sports_included
        FROM inscriptions i
        JOIN offers o ON i.offer_id = o.id
        LEFT JOIN offer_sports os ON o.id = os.offer_id
        LEFT JOIN sports s ON os.sport_id = s.id
        WHERE i.member_id = ?
        GROUP BY i.id
        ORDER BY i.start_date DESC
      `, [id]),
      db.query(`
        SELECT 
          a.id,
          a.checked_in_at,
          a.checked_out_at,
          a.status,
          a.is_debt_session,
          s.name as sport_name,
          d.amount as debt_amount
        FROM attendance_logs a
        LEFT JOIN sports s ON a.sport_id = s.id
        LEFT JOIN member_debts d ON a.debt_id = d.id
        WHERE a.member_id = ? 
        ORDER BY a.checked_in_at DESC
      `, [id]),
      db.query('SELECT * FROM member_debts WHERE member_id = ? ORDER BY incurred_at DESC', [id]),
      db.query(`
        SELECT 
          c.id,
          c.flow_direction,
          c.module_category,
          c.transaction_type,
          c.amount,
          c.transaction_date,
          c.motif,
          c.note,
          c.related_id,
          u.full_name as user_name
        FROM caisse_transactions c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.member_id = ? AND c.flow_direction = 'in'
        ORDER BY c.transaction_date DESC
      `, [id])
    ]);

    if (!members || members.length === 0) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    }

    // Consolidate payments: include any paid subscriptions that don't have a caisse_transactions record
    const recordedInscriptionIds = new Set(
      caissePayments
        .filter((p: any) => p.related_id && p.transaction_type === 'paiement_inscription')
        .map((p: any) => Number(p.related_id))
    );

    const extraPayments: any[] = [];
    for (const insc of inscriptions) {
      const paidVal = parseFloat(insc.total_paid || '0');
      if (paidVal > 0 && !recordedInscriptionIds.has(Number(insc.id))) {
        extraPayments.push({
          id: `insc-${insc.id}`,
          flow_direction: 'in',
          module_category: 'entrainement',
          transaction_type: 'paiement_inscription',
          amount: insc.total_paid,
          transaction_date: insc.created_at || insc.start_date,
          motif: `Abonnement: ${insc.offer_title}`,
          note: `Règlement inscription (Mode: ${insc.payment_status === 'paid' ? 'Soldé' : 'Partiel'})`,
          user_name: 'Système'
        });
      }
    }

    const payments = [...caissePayments, ...extraPayments].sort(
      (a: any, b: any) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );

    return NextResponse.json({
      member: members[0],
      inscriptions,
      attendance,
      debts,
      payments
    });
  } catch (error) {
    console.error('Error fetching member details:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams.id;
    
    const formData = await request.formData();
    let barcode = formData.get('barcode') as string;
    const first_name = formData.get('first_name') as string;
    const last_name = formData.get('last_name') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const emergency_contact = formData.get('emergency_contact') as string;
    const gender = formData.get('gender') as string;
    const date_of_birth = formData.get('date_of_birth') as string;
    const address = formData.get('address') as string;
    
    const db = await getDbConnection();
    
    if (!barcode) {
      const [rows]: any = await db.query("SELECT MAX(CAST(barcode AS UNSIGNED)) as max_barcode FROM members WHERE barcode REGEXP '^[0-9]+$'");
      const maxBarcode = rows[0]?.max_barcode;
      if (maxBarcode) {
        barcode = String(maxBarcode + 1);
      } else {
        barcode = '1000';
      }
    }
    
    const photo = formData.get('photo') as File;
    let photoQueryPart = '';
    let queryParams: any[] = [barcode, first_name || '', last_name || '', phone || '', email || null, emergency_contact || null, gender || null, date_of_birth || null, address || null];
    
    const initial_debt_raw = formData.get('initial_debt');
    let debtQueryPart = '';
    if (initial_debt_raw !== null && initial_debt_raw !== undefined) {
      const newInitialDebt = Math.max(0, parseFloat((initial_debt_raw as string) || '0') || 0);
      const [existing]: any = await db.query('SELECT initial_debt, total_debt FROM members WHERE id = ?', [id]);
      if (existing && existing.length > 0) {
        const oldInitialDebt = parseFloat(existing[0].initial_debt || '0') || 0;
        const currentTotalDebt = parseFloat(existing[0].total_debt || '0') || 0;
        const diff = newInitialDebt - oldInitialDebt;
        const newTotalDebt = Math.max(0, currentTotalDebt + diff);

        debtQueryPart = ', initial_debt = ?, total_debt = ?';
        queryParams.push(newInitialDebt, newTotalDebt);

        // Keep member_debts synchronized for the initial debt line item
        const [existingDebtRows]: any = await db.query(
          "SELECT id FROM member_debts WHERE member_id = ? AND (reason LIKE '%initial%' OR reason LIKE '%antérieur%') LIMIT 1",
          [id]
        );

        if (existingDebtRows && existingDebtRows.length > 0) {
          const debtRowId = existingDebtRows[0].id;
          if (newInitialDebt > 0) {
            await db.query('UPDATE member_debts SET amount = ? WHERE id = ?', [newInitialDebt, debtRowId]);
          } else {
            await db.query('DELETE FROM member_debts WHERE id = ?', [debtRowId]);
          }
        } else if (newInitialDebt > 0) {
          await db.query(
            "INSERT INTO member_debts (member_id, amount, reason, status) VALUES (?, ?, 'Solde initial / Dette antérieure', 'unpaid')",
            [id, newInitialDebt]
          );
        }
      }
    }

    if (photo && photo.size > 0) {
      const bytes = await photo.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uploadDir = path.join(process.cwd(), 'public', 'photo', 'member');
      await fs.mkdir(uploadDir, { recursive: true });
      
      const filename = `${Date.now()}-${photo.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const filepath = path.join(uploadDir, filename);
      
      await fs.writeFile(filepath, buffer);
      
      const photo_url = `/photo/member/${filename}`;
      photoQueryPart = ', photo_url = ?';
      queryParams.push(photo_url);
    }
    
    queryParams.push(id);
    
    await db.query(
      `UPDATE members SET barcode = ?, first_name = ?, last_name = ?, phone = ?, email = ?, emergency_contact = ?, gender = ?, date_of_birth = ?, address = ? ${debtQueryPart} ${photoQueryPart} WHERE id = ?`,
      queryParams
    );

    const { createAuditLog } = await import('@/lib/db');
    await createAuditLog({
      action: 'UPDATE_MEMBER',
      tableName: 'members',
      recordId: id,
      details: {
        first_name,
        last_name,
        phone,
        barcode
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams.id;
    const db = await getDbConnection();

    // Fetch member info before deletion for logging
    const [existingMember]: any = await db.query('SELECT first_name, last_name, barcode, phone FROM members WHERE id = ?', [id]);

    // 1. Check for product sales (boutique) - Cannot delete member if products were sold to them
    const [saleRows]: any = await db.query('SELECT COUNT(*) as count FROM product_sales WHERE member_id = ?', [id]);
    if (saleRows[0]?.count > 0) {
      return NextResponse.json({ 
        error: 'Suppression impossible : ce membre possède des achats enregistrés dans la boutique (des articles lui ont été vendus).' 
      }, { status: 400 });
    }

    // 2. Check for inscriptions (abonnements)
    const [inscRows]: any = await db.query('SELECT COUNT(*) as count FROM inscriptions WHERE member_id = ?', [id]);
    if (inscRows[0]?.count > 0) {
      return NextResponse.json({ 
        error: 'Suppression impossible : ce membre possède des abonnements / inscriptions enregistrés.' 
      }, { status: 400 });
    }

    // 3. Check for debts or unpaid balances
    const [debtRows]: any = await db.query('SELECT COUNT(*) as count FROM member_debts WHERE member_id = ?', [id]);
    if (debtRows[0]?.count > 0) {
      return NextResponse.json({ 
        error: 'Suppression impossible : ce membre possède des dettes ou reliquats impayés.' 
      }, { status: 400 });
    }

    // 4. Check for payments in caisse
    const [caisseRows]: any = await db.query('SELECT COUNT(*) as count FROM caisse_transactions WHERE member_id = ?', [id]);
    if (caisseRows[0]?.count > 0) {
      return NextResponse.json({ 
        error: 'Suppression impossible : ce membre possède des paiements ou règlements financiers enregistrés en caisse.' 
      }, { status: 400 });
    }

    // 5. Check for attendance logs (séances)
    const [attendanceRows]: any = await db.query('SELECT COUNT(*) as count FROM attendance_logs WHERE member_id = ?', [id]);
    if (attendanceRows[0]?.count > 0) {
      return NextResponse.json({ 
        error: 'Suppression impossible : ce membre possède un historique de séances / pointages de présence.' 
      }, { status: 400 });
    }

    // If completely clean, proceed with delete
    await db.query('DELETE FROM members WHERE id = ?', [id]);

    const { createAuditLog } = await import('@/lib/db');
    await createAuditLog({
      action: 'DELETE_MEMBER',
      tableName: 'members',
      recordId: id,
      details: existingMember?.[0] || { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de la suppression' }, { status: 500 });
  }
}
