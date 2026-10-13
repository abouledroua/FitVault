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

    // Remove the inscription
    await db.query('DELETE FROM inscriptions WHERE id = ?', [id]);

    // Also remove any related caisse_transactions
    await db.query(`DELETE FROM caisse_transactions WHERE related_id = ? AND module_category = 'entrainement'`, [id]);

    await createAuditLog({
      action: 'DELETE_INSCRIPTION',
      tableName: 'inscriptions',
      recordId: id,
      details: { inscriptionId: id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inscription:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
