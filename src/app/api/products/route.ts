import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// GET all products
export async function GET() {
  try {
    const db = await getDbConnection();
    const query = `
      SELECT * FROM products ORDER BY name ASC
    `;
    const [rows] = await db.query<RowDataPacket[]>(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement des produits' }, { status: 500 });
  }
}

// POST create product
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      barcode,
      name,
      category,
      product_type, // 'standard' | 'fractional'
      buy_price_unit,
      sell_price_unit,
      container_capacity,
      serving_dose_size,
      sell_price_whole,
      sell_price_dose,
      sell_price_per_100g,
      stock_quantity,
      min_stock_alert
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Le nom du produit est obligatoire' }, { status: 400 });
    }

    const db = await getDbConnection();
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO products 
       (barcode, name, category, product_type, buy_price_unit, sell_price_unit, container_capacity, serving_dose_size, sell_price_whole, sell_price_dose, sell_price_per_100g, stock_quantity, min_stock_alert)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        barcode?.trim() || null,
        name.trim(),
        category?.trim() || 'Général',
        product_type || 'standard',
        parseFloat(buy_price_unit) || 0,
        parseFloat(sell_price_unit) || 0,
        container_capacity ? parseFloat(container_capacity) : null,
        serving_dose_size ? parseFloat(serving_dose_size) : null,
        sell_price_whole ? parseFloat(sell_price_whole) : null,
        sell_price_dose ? parseFloat(sell_price_dose) : null,
        sell_price_per_100g ? parseFloat(sell_price_per_100g) : null,
        parseFloat(stock_quantity) || 0,
        parseFloat(min_stock_alert) || 5
      ]
    );

    return NextResponse.json({ success: true, productId: result.insertId });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du produit' }, { status: 500 });
  }
}

// PUT update product
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      barcode,
      name,
      category,
      product_type,
      buy_price_unit,
      sell_price_unit,
      container_capacity,
      serving_dose_size,
      sell_price_whole,
      sell_price_dose,
      sell_price_per_100g,
      stock_quantity,
      min_stock_alert
    } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'ID et nom requis' }, { status: 400 });
    }

    const db = await getDbConnection();
    await db.query(
      `UPDATE products SET 
        barcode = ?, 
        name = ?, 
        category = ?, 
        product_type = ?, 
        buy_price_unit = ?, 
        sell_price_unit = ?, 
        container_capacity = ?, 
        serving_dose_size = ?, 
        sell_price_whole = ?, 
        sell_price_dose = ?, 
        sell_price_per_100g = ?, 
        stock_quantity = ?, 
        min_stock_alert = ?
       WHERE id = ?`,
      [
        barcode?.trim() || null,
        name.trim(),
        category?.trim() || 'Général',
        product_type || 'standard',
        parseFloat(buy_price_unit) || 0,
        parseFloat(sell_price_unit) || 0,
        container_capacity ? parseFloat(container_capacity) : null,
        serving_dose_size ? parseFloat(serving_dose_size) : null,
        sell_price_whole ? parseFloat(sell_price_whole) : null,
        sell_price_dose ? parseFloat(sell_price_dose) : null,
        sell_price_per_100g ? parseFloat(sell_price_per_100g) : null,
        parseFloat(stock_quantity) || 0,
        parseFloat(min_stock_alert) || 5,
        id
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 });
  }
}

// PATCH archive / restore product
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, is_archived } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const db = await getDbConnection();
    await db.query('UPDATE products SET is_archived = ? WHERE id = ?', [Boolean(is_archived), id]);

    return NextResponse.json({
      success: true,
      is_archived: Boolean(is_archived),
      message: is_archived ? 'Produit archivé avec succès' : 'Produit restauré avec succès'
    });
  } catch (error) {
    console.error('Error toggling product archive status:', error);
    return NextResponse.json({ error: 'Erreur serveur lors de l\'archivage' }, { status: 500 });
  }
}

// DELETE product
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const db = await getDbConnection();

    // Check if product was sold at least once
    const [saleRows]: any = await db.query(
      'SELECT COUNT(*) as count FROM product_sale_items WHERE product_id = ?',
      [id]
    );

    if (saleRows[0]?.count > 0) {
      return NextResponse.json({
        error: 'Suppression impossible : cet article a déjà été vendu au moins une fois. Vous pouvez l\'archiver pour le masquer définitivement des ventes sans corrompre l\'historique comptable.'
      }, { status: 400 });
    }

    await db.query('DELETE FROM products WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
