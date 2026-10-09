const mysql = require('mysql2/promise');

async function seedProducts() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'citrus',
    password: 'citrus21012013',
    database: 'fitvault_db'
  });

  await conn.query(`
    INSERT IGNORE INTO products 
    (id, barcode, name, category, product_type, buy_price_unit, sell_price_unit, container_capacity, serving_dose_size, sell_price_whole, sell_price_dose, sell_price_per_100g, stock_quantity, min_stock_alert) 
    VALUES
    (1, '3001', 'Yaourt Protéiné Danone', 'Nutrition', 'standard', 8.00, 15.00, NULL, NULL, NULL, NULL, NULL, 24, 5),
    (2, '3002', 'Bouteille Eau Minérale 0.5L', 'Boissons', 'standard', 2.50, 5.00, NULL, NULL, NULL, NULL, NULL, 50, 10),
    (3, '3003', 'Barre Protéinée Chocolat', 'Snacks', 'standard', 18.00, 30.00, NULL, NULL, NULL, NULL, NULL, 15, 5),
    (4, '3004', 'Whey Gold Standard 2kg (Vrac / Dose)', 'Suppléments', 'fractional', 450.00, 650.00, 2000.00, 30.00, 650.00, 15.00, 40.00, 2000.00, 200),
    (5, '3005', 'Créatine Monohydrate (Dose)', 'Suppléments', 'fractional', 200.00, 350.00, 500.00, 5.00, 350.00, 10.00, 80.00, 500.00, 50);
  `);

  console.log('Sample products seeded successfully.');
  await conn.end();
}

seedProducts().catch(console.error);
