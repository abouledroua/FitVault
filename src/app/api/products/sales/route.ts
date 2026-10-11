import { NextResponse } from 'next/server';
import { getDbConnection } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const customerType = searchParams.get('customerType'); // 'all', 'member', 'passage'
    const paymentMethod = searchParams.get('paymentMethod'); // 'all', 'cash', 'card', 'debt'
    const search = searchParams.get('search')?.trim();

    const db = await getDbConnection();

    let query = `
      SELECT 
        s.id,
        s.user_id,
        u.username AS seller_username,
        s.customer_type,
        s.member_id,
        m.first_name AS member_first_name,
        m.last_name AS member_last_name,
        m.barcode AS member_barcode,
        m.phone AS member_phone,
        m.photo_url AS member_photo_url,
        s.guest_name,
        s.total_amount,
        s.payment_method,
        s.sale_date
      FROM product_sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN members m ON s.member_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (startDate) {
      query += ` AND DATE(s.sale_date) >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND DATE(s.sale_date) <= ?`;
      params.push(endDate);
    }

    if (customerType && customerType !== 'all') {
      query += ` AND s.customer_type = ?`;
      params.push(customerType);
    }

    if (paymentMethod && paymentMethod !== 'all') {
      query += ` AND s.payment_method = ?`;
      params.push(paymentMethod);
    }

    if (search) {
      query += ` AND (
        s.guest_name LIKE ? OR 
        m.first_name LIKE ? OR 
        m.last_name LIKE ? OR 
        m.barcode LIKE ? OR 
        m.phone LIKE ? OR
        CAST(s.id AS CHAR) LIKE ?
      )`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY s.sale_date DESC LIMIT 200`;

    const [sales] = await db.query<RowDataPacket[]>(query, params);

    if (sales.length === 0) {
      return NextResponse.json({
        sales: [],
        summary: {
          totalAmount: 0,
          salesCount: 0,
          cashTotal: 0,
          cardTotal: 0,
          debtTotal: 0
        }
      });
    }

    // Fetch line items for these sales
    const saleIds = sales.map(s => s.id);
    const [items] = await db.query<RowDataPacket[]>(
      `SELECT 
        psi.id,
        psi.sale_id,
        psi.product_id,
        COALESCE(p.name, 'Produit supprimé') AS product_name,
        p.barcode,
        p.category,
        psi.sale_format,
        psi.quantity_sold,
        psi.stock_deducted,
        psi.unit_price_charged,
        psi.total_line_price
      FROM product_sale_items psi
      LEFT JOIN products p ON psi.product_id = p.id
      WHERE psi.sale_id IN (?)
      ORDER BY psi.id ASC`,
      [saleIds]
    );

    // Group items by sale_id
    const itemsBySale: Record<number, any[]> = {};
    for (const item of items) {
      if (!itemsBySale[item.sale_id]) {
        itemsBySale[item.sale_id] = [];
      }
      itemsBySale[item.sale_id].push(item);
    }

    // Attach items and compute metrics
    let totalAmount = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    let debtTotal = 0;

    const enrichedSales = sales.map(sale => {
      const saleTotal = parseFloat(sale.total_amount) || 0;
      totalAmount += saleTotal;
      if (sale.payment_method === 'cash') cashTotal += saleTotal;
      else if (sale.payment_method === 'card') cardTotal += saleTotal;
      else if (sale.payment_method === 'debt') debtTotal += saleTotal;

      return {
        ...sale,
        total_amount: saleTotal.toFixed(2),
        items: itemsBySale[sale.id] || []
      };
    });

    return NextResponse.json({
      sales: enrichedSales,
      summary: {
        totalAmount: totalAmount.toFixed(2),
        salesCount: sales.length,
        cashTotal: cashTotal.toFixed(2),
        cardTotal: cardTotal.toFixed(2),
        debtTotal: debtTotal.toFixed(2)
      }
    });
  } catch (error: any) {
    console.error('Error fetching sales history:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la récupération des ventes' }, { status: 500 });
  }
}
