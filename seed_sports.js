const mysql = require('mysql2/promise');

async function seedData() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'citrus',
    password: 'citrus21012013',
    database: 'fitvault_db'
  });

  await conn.query(`
    INSERT IGNORE INTO sports (id, name, description, default_single_session_price, is_active) VALUES 
    (1, 'Musculation', 'Plateau musculation et charges libres', 50.00, TRUE),
    (2, 'Cardio Training', 'Tapis, vélos, elliptiques et rameurs', 40.00, TRUE),
    (3, 'Zumba / Fitness', 'Cours collectifs rythmés et danse fitness', 60.00, TRUE);
  `);

  await conn.query(`
    INSERT IGNORE INTO offers (id, title, description, price, duration_type, duration_value, sessions_count, is_active) VALUES
    (1, 'Pass Musculation 1 Mois', 'Accès complet au plateau musculation pendant 30 jours', 300.00, 'standard_month', 1, NULL, TRUE),
    (2, 'Pack Total (Muscu + Cardio + Zumba) 1 Mois', 'Accès illimité à toutes les activités', 500.00, 'standard_month', 1, NULL, TRUE),
    (3, 'Carnet 10 Séances Multi-Sports', 'Valable 2 mois sur toutes les disciplines', 400.00, 'custom_months', 2, 10, TRUE);
  `);

  await conn.query(`
    INSERT IGNORE INTO offer_sports (offer_id, sport_id) VALUES
    (1, 1),
    (2, 1), (2, 2), (2, 3),
    (3, 1), (3, 2), (3, 3);
  `);

  console.log('Seeded sports and sample offers successfully.');
  await conn.end();
}

seedData().catch(console.error);
