import { NextResponse } from 'next/server';
import { getDbConnection, createAuditLog } from '@/lib/db';
import { getCurrentSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';
import { formatCurrency } from '@/lib/formatters';

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const db = await getDbConnection();

    // 1. Fetch all members
    const [members] = await db.query<RowDataPacket[]>('SELECT id, first_name, last_name, initial_debt, total_debt, created_at FROM members ORDER BY id ASC');

    let totalDebtSum = 0;
    let updatedMembersCount = 0;
    const detailsList: any[] = [];

    for (const m of members) {
      const memberId = m.id;
      const initialDebt = parseFloat(m.initial_debt || '0') || 0;

      // Ensure initial debt row exists in member_debts if initial_debt > 0
      if (initialDebt > 0) {
        const [initDebtRows] = await db.query<RowDataPacket[]>(
          "SELECT id, amount FROM member_debts WHERE member_id = ? AND (reason LIKE '%initial%' OR reason LIKE '%antérieur%') LIMIT 1",
          [memberId]
        );
        if (initDebtRows.length === 0) {
          await db.query(
            "INSERT INTO member_debts (member_id, amount, reason, status, incurred_at) VALUES (?, ?, 'Solde initial / Dette antérieure', 'unpaid', COALESCE(?, NOW()))",
            [memberId, initialDebt, m.created_at]
          );
        } else if (parseFloat(initDebtRows[0].amount) !== initialDebt) {
          await db.query(
            "UPDATE member_debts SET amount = ? WHERE id = ?",
            [initialDebt, initDebtRows[0].id]
          );
        }
      }

      // 2. Fetch all debts for this member
      const [debts] = await db.query<RowDataPacket[]>(
        'SELECT id, amount, status FROM member_debts WHERE member_id = ? ORDER BY incurred_at ASC, id ASC',
        [memberId]
      );

      const totalIncurred = debts.reduce((sum, d) => sum + (parseFloat(d.amount || '0') || 0), 0);

      // 3. Fetch all debt repayment transactions in caisse
      const [repaymentRows] = await db.query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(amount), 0) as total_repaid 
         FROM caisse_transactions 
         WHERE member_id = ? 
           AND flow_direction = 'in' 
           AND (motif = 'Règlement Dette' OR motif LIKE '%Dette%' OR transaction_type = 'reglement_dette')`,
        [memberId]
      );

      const totalRepaid = parseFloat(repaymentRows[0]?.total_repaid || '0') || 0;
      const netDebt = Math.max(0, Math.round((totalIncurred - totalRepaid) * 100) / 100);

      // 4. Update FIFO settlement statuses in member_debts
      let runningRepaid = totalRepaid;
      for (const debt of debts) {
        const debtAmt = parseFloat(debt.amount || '0') || 0;
        if (runningRepaid >= debtAmt && debtAmt > 0) {
          runningRepaid -= debtAmt;
          if (debt.status !== 'settled') {
            await db.query("UPDATE member_debts SET status = 'settled', settled_at = NOW() WHERE id = ?", [debt.id]);
          }
        } else {
          runningRepaid = 0;
          if (debt.status !== 'unpaid') {
            await db.query("UPDATE member_debts SET status = 'unpaid', settled_at = NULL WHERE id = ?", [debt.id]);
          }
        }
      }

      // 5. Update members.total_debt if changed
      const currentDebt = parseFloat(m.total_debt || '0') || 0;
      if (Math.abs(currentDebt - netDebt) > 0.001) {
        await db.query('UPDATE members SET total_debt = ? WHERE id = ?', [netDebt, memberId]);
        updatedMembersCount++;
        detailsList.push({
          memberId,
          name: `${m.last_name} ${m.first_name}`,
          oldDebt: currentDebt,
          newDebt: netDebt
        });
      }

      totalDebtSum += netDebt;
    }

    totalDebtSum = Math.round(totalDebtSum * 100) / 100;

    // 6. Audit log
    await createAuditLog({
      action: 'RECALCULATE_ALL_DEBTS',
      tableName: 'members',
      recordId: 'all',
      details: {
        totalMembersProcessed: members.length,
        updatedMembersCount,
        totalDebtSum,
        changes: detailsList.slice(0, 50)
      }
    });

    return NextResponse.json({
      success: true,
      totalMembers: members.length,
      updatedCount: updatedMembersCount,
      totalDebtSum,
      message: updatedMembersCount > 0
        ? `Dettes recalculées avec succès : ${updatedMembersCount} membre(s) mis à jour (Total dû : ${formatCurrency(totalDebtSum, 2)})`
        : `Toutes les dettes sont déjà parfaitement synchronisées (Total dû : ${formatCurrency(totalDebtSum, 2)})`
    });
  } catch (error) {
    console.error('Error recalculating members debts:', error);
    return NextResponse.json({ error: 'Erreur lors du recalcul des dettes' }, { status: 500 });
  }
}
