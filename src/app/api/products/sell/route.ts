import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { getCurrentSession } from '@/lib/session';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      customer_type, 
      member_id, 
      guest_name, 
      payment_method, 
      items 
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Le panier est vide' }, { status: 400 });
    }

    if (payment_method === 'debt' && (!member_id || customer_type !== 'member')) {
      return NextResponse.json({ error: 'Le paiement à crédit (dette) nécessite de sélectionner un membre enregistré' }, { status: 400 });
    }

    const session = await getCurrentSession();
    const userId = session?.userId || 1;
    const deviceId = session?.deviceId || 1;

    const db = await getDbConnection();

    // 1. Calculate total and prepare line items
    let grandTotal = 0;
    const processedItems: any[] = [];

    for (const item of items) {
      const [prodRows] = await db.query<RowDataPacket[]>('SELECT * FROM products WHERE id = ?', [item.product_id]);
      if (prodRows.length === 0) continue;
      const product = prodRows[0];
      if (product.is_archived) {
        return NextResponse.json({
          error: `L'article "${product.name}" est archivé et n'est plus disponible à la vente.`
        }, { status: 400 });
      }
      let unitPrice = 0;
      let stockDeducted = parseFloat(item.quantity_sold) || 1;

      if (item.sale_format === 'piece_standard') {
        unitPrice = parseFloat(product.sell_price_unit);
        stockDeducted = item.quantity_sold;
      } else if (item.sale_format === 'whole_pack') {
        unitPrice = parseFloat(product.sell_price_whole || product.sell_price_unit);
        stockDeducted = (product.container_capacity || 1) * item.quantity_sold;
      } else if (item.sale_format === 'spoon_dose') {
        unitPrice = parseFloat(product.sell_price_dose || 15);
        stockDeducted = (product.serving_dose_size || 30) * item.quantity_sold;
      } else if (item.sale_format === 'by_weight') {
        // Price per 100g, item.quantity_sold is e.g. 1 (meaning 100g) or grams
        unitPrice = parseFloat(product.sell_price_per_100g || 40);
        stockDeducted = item.quantity_sold; // grams
      }

      const linePrice = parseFloat((unitPrice * item.quantity_sold).toFixed(2));
      grandTotal += linePrice;

      processedItems.push({
        product_id: product.id,
        product_name: product.name,
        sale_format: item.sale_format,
        quantity_sold: item.quantity_sold,
        stock_deducted: stockDeducted,
        unit_price_charged: unitPrice,
        total_line_price: linePrice
      });
    }

    if (processedItems.length === 0) {
      return NextResponse.json({ error: 'Aucun produit valide dans la commande' }, { status: 400 });
    }

    grandTotal = parseFloat(grandTotal.toFixed(2));

    // 2. Insert into product_sales
    const [saleResult] = await db.query<ResultSetHeader>(
      `INSERT INTO product_sales 
       (user_id, device_id, customer_type, member_id, guest_name, total_amount, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        deviceId,
        customer_type || 'passage',
        customer_type === 'member' ? member_id : null,
        customer_type === 'passage' ? (guest_name || 'Client de Passage') : null,
        grandTotal,
        payment_method || 'cash'
      ]
    );

    const saleId = saleResult.insertId;

    // 3. Insert sale items & deduct stock
    for (const pItem of processedItems) {
      await db.query(
        `INSERT INTO product_sale_items 
         (sale_id, product_id, sale_format, quantity_sold, stock_deducted, unit_price_charged, total_line_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          pItem.product_id,
          pItem.sale_format,
          pItem.quantity_sold,
          pItem.stock_deducted,
          pItem.unit_price_charged,
          pItem.total_line_price
        ]
      );

      // Deduct stock
      await db.query(
        'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?',
        [pItem.stock_deducted, pItem.product_id]
      );
    }

    // 4. Record payment in Caisse (if paid cash/card) or Member Debt (if debt)
    if (payment_method === 'cash' || payment_method === 'card') {
      await db.query(
        `INSERT INTO caisse_transactions 
         (user_id, device_id, flow_direction, module_category, transaction_type, amount, related_id, member_id, motif, note)
         VALUES (?, ?, 'in', 'boutique', 'vente_produit', ?, ?, ?, ?, ?)`,
        [
          userId,
          deviceId,
          grandTotal,
          saleId,
          customer_type === 'member' ? member_id : null,
          `Vente Boutique (${processedItems.map(i => i.product_name).join(', ')})`,
          `Règlement: ${payment_method === 'cash' ? 'Espèces' : 'Carte'} - Client: ${customer_type === 'member' ? `Membre #${member_id}` : guest_name || 'Passage'}`
        ]
      );
    } else if (payment_method === 'debt' && member_id) {
      // Record member debt
      await db.query(
        `INSERT INTO member_debts 
         (member_id, product_sale_id, amount, reason, status)
         VALUES (?, ?, ?, ?, 'unpaid')`,
        [
          member_id,
          saleId,
          grandTotal,
          `Achat boutique à crédit (${processedItems.map(i => i.product_name).join(', ')})`
        ]
      );

      // Increment member's total_debt
      await db.query(
        'UPDATE members SET total_debt = total_debt + ? WHERE id = ?',
        [grandTotal, member_id]
      );
    }

    return NextResponse.json({
      success: true,
      saleId,
      grandTotal,
      message: 'Vente effectuée avec succès'
    });
  } catch (error) {
    console.error('Error processing sale:', error);
    return NextResponse.json({ error: 'Erreur lors de la vente' }, { status: 500 });
  }
}

export { GET } from '../sales/route';
