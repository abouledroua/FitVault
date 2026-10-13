import { NextResponse } from 'next/server';
import { getDbConnection, createAuditLog } from '@/lib/db';
import { getCurrentSession } from '@/lib/session';

export async function DELETE(request: Request, context: any) {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const resolvedParams = await context.params;
    const id = resolvedParams.id;
    const db = await getDbConnection();

    await db.query('DELETE FROM caisse_transactions WHERE id = ?', [id]);

    await createAuditLog({
      action: 'DELETE_CAISSE_TRANSACTION',
      tableName: 'caisse_transactions',
      recordId: id,
      details: { transactionId: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
