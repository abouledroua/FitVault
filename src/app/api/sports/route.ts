import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET all sports
export async function GET() {
  try {
    const db = await getDbConnection();
    const query = `
      SELECT 
        s.id,
        s.name,
        s.description,
        s.default_single_session_price,
        s.is_active,
        s.created_at,
        COUNT(os.offer_id) as linked_offers_count
      FROM sports s
      LEFT JOIN offer_sports os ON s.id = os.sport_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `;
    const [rows] = await db.query<RowDataPacket[]>(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching sports:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement des disciplines sportives' }, { status: 500 });
  }
}

// POST create sport
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, default_single_session_price } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Le nom du sport est obligatoire' }, { status: 400 });
    }

    const price = parseFloat(default_single_session_price) || 0;

    const db = await getDbConnection();
    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO sports (name, description, default_single_session_price, is_active) VALUES (?, ?, ?, TRUE)',
      [name.trim(), description?.trim() || null, price]
    );

    return NextResponse.json({
      success: true,
      sportId: result.insertId,
      message: 'Discipline sportive créée avec succès',
    });
  } catch (error) {
    console.error('Error creating sport:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du sport' }, { status: 500 });
  }
}

// PUT update sport
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, default_single_session_price, is_active } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: 'ID et nom obligatoires' }, { status: 400 });
    }

    const price = parseFloat(default_single_session_price) || 0;
    const active = is_active !== undefined ? Boolean(is_active) : true;

    const db = await getDbConnection();
    await db.query(
      'UPDATE sports SET name = ?, description = ?, default_single_session_price = ?, is_active = ? WHERE id = ?',
      [name.trim(), description?.trim() || null, price, active, id]
    );

    return NextResponse.json({ success: true, message: 'Discipline mise à jour avec succès' });
  } catch (error) {
    console.error('Error updating sport:', error);
    return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 });
  }
}

// PATCH toggle sport active status
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, is_active } = body;

    if (!id || is_active === undefined) {
      return NextResponse.json({ error: 'ID et statut is_active requis' }, { status: 400 });
    }

    const db = await getDbConnection();
    await db.query('UPDATE sports SET is_active = ? WHERE id = ?', [Boolean(is_active), id]);

    return NextResponse.json({ 
      success: true, 
      message: `Discipline ${is_active ? 'activée' : 'désactivée'} avec succès` 
    });
  } catch (error) {
    console.error('Error toggling sport status:', error);
    return NextResponse.json({ error: 'Erreur lors du changement de statut' }, { status: 500 });
  }
}

// DELETE sport
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const db = await getDbConnection();
    
    // 1. Check if linked to offer_sports
    const [offerSports]: any = await db.query('SELECT COUNT(*) as count FROM offer_sports WHERE sport_id = ?', [id]);
    if (offerSports[0]?.count > 0) {
      return NextResponse.json({ 
        error: 'Suppression impossible : cette discipline sportive est utilisée dans une ou plusieurs formules d\'abonnement (offer_sports). Vous pouvez la désactiver à la place.' 
      }, { status: 400 });
    }

    // 2. Check if linked to attendance_logs
    const [logs]: any = await db.query('SELECT COUNT(*) as count FROM attendance_logs WHERE sport_id = ?', [id]);
    if (logs[0]?.count > 0) {
      return NextResponse.json({ 
        error: 'Suppression impossible : cette discipline possède des historiques de présence enregistrés. Vous pouvez la désactiver à la place.' 
      }, { status: 400 });
    }

    await db.query('DELETE FROM sports WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Discipline supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting sport:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
