import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET all offers with linked sports
export async function GET() {
  try {
    const db = await getDbConnection();
    const query = `
      SELECT 
        o.id,
        o.title,
        o.description,
        o.price,
        o.duration_type,
        o.duration_value,
        o.sessions_count,
        o.is_active,
        GROUP_CONCAT(s.id) as sport_ids,
        GROUP_CONCAT(s.name SEPARATOR ', ') as sport_names
      FROM offers o
      LEFT JOIN offer_sports os ON o.id = os.offer_id
      LEFT JOIN sports s ON os.sport_id = s.id
      GROUP BY o.id
      ORDER BY o.title ASC
    `;
    const [rows] = await db.query<RowDataPacket[]>(query);
    
    const formatted = rows.map(r => ({
      ...r,
      sport_ids: r.sport_ids ? r.sport_ids.split(',').map((id: string) => parseInt(id, 10)) : [],
      sport_names: r.sport_names || 'Aucun sport spécifié'
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement des offres' }, { status: 500 });
  }
}

// POST create offer
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      title, 
      description, 
      price, 
      duration_type, 
      duration_value, 
      sessions_count, 
      sport_ids 
    } = body;

    if (!title || !price || !duration_type) {
      return NextResponse.json({ error: 'Titre, tarif et type de durée sont obligatoires' }, { status: 400 });
    }

    if (!Array.isArray(sport_ids) || sport_ids.length === 0) {
      return NextResponse.json({ error: 'Veuillez associer au moins une discipline sportive à cette offre' }, { status: 400 });
    }

    const db = await getDbConnection();
    
    // Insert offer
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO offers (title, description, price, duration_type, duration_value, sessions_count, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [
        title.trim(),
        description?.trim() || null,
        parseFloat(price),
        duration_type,
        parseInt(duration_value, 10) || 1,
        sessions_count ? parseInt(sessions_count, 10) : null
      ]
    );

    const offerId = result.insertId;

    // Link sports
    for (const sportId of sport_ids) {
      await db.query('INSERT INTO offer_sports (offer_id, sport_id) VALUES (?, ?)', [offerId, sportId]);
    }

    return NextResponse.json({ success: true, offerId, message: 'Offre créée avec succès' });
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de l\'offre' }, { status: 500 });
  }
}

// PUT update offer
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
      id, 
      title, 
      description, 
      price, 
      duration_type, 
      duration_value, 
      sessions_count, 
      sport_ids, 
      is_active 
    } = body;

    if (!id || !title || !price || !duration_type) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    const db = await getDbConnection();

    await db.query(
      `UPDATE offers SET 
        title = ?, 
        description = ?, 
        price = ?, 
        duration_type = ?, 
        duration_value = ?, 
        sessions_count = ?, 
        is_active = ? 
       WHERE id = ?`,
      [
        title.trim(),
        description?.trim() || null,
        parseFloat(price),
        duration_type,
        parseInt(duration_value, 10) || 1,
        sessions_count ? parseInt(sessions_count, 10) : null,
        is_active !== undefined ? Boolean(is_active) : true,
        id
      ]
    );

    if (Array.isArray(sport_ids)) {
      // Re-link sports
      await db.query('DELETE FROM offer_sports WHERE offer_id = ?', [id]);
      for (const sportId of sport_ids) {
        await db.query('INSERT INTO offer_sports (offer_id, sport_id) VALUES (?, ?)', [id, sportId]);
      }
    }

    return NextResponse.json({ success: true, message: 'Offre modifiée avec succès' });
  } catch (error) {
    console.error('Error updating offer:', error);
    return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 });
  }
}

// DELETE offer
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const db = await getDbConnection();
    // Check if linked to inscriptions
    const [inscriptions]: any = await db.query('SELECT COUNT(*) as count FROM inscriptions WHERE offer_id = ?', [id]);
    if (inscriptions[0]?.count > 0) {
      await db.query('UPDATE offers SET is_active = FALSE WHERE id = ?', [id]);
      return NextResponse.json({ success: true, message: 'Offre désactivée car des membres y sont déjà abonnés' });
    }

    await db.query('DELETE FROM offers WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Offre supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting offer:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
