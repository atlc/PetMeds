import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'petmeds',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Check if we already have data
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) > 0) {
      console.log('Database already has data, skipping seed...');
      return;
    }

    // Insert sample dosage units if they don't exist
    await pool.query(`
      INSERT INTO dosage_units (name, abbreviation) 
      VALUES 
        ('milligram', 'mg'),
        ('gram', 'g'),
        ('milliliter', 'ml'),
        ('drop', 'drop'),
        ('tablet', 'tab'),
        ('capsule', 'cap'),
        ('unit', 'unit')
      ON CONFLICT (name) DO NOTHING
    `);

    console.log('Sample dosage units inserted');

    // Insert a sample user
    const userResult = await pool.query(`
      INSERT INTO users (name, email, image_url, timezone)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, ['Sample User', 'sample@example.com', 'https://via.placeholder.com/150', 'UTC']);

    const userId = userResult.rows[0].id;
    console.log('Sample user inserted');

    // Insert a sample household
    const householdResult = await pool.query(`
      INSERT INTO households (name, description)
      VALUES ($1, $2)
      RETURNING id
    `, ['Sample Household', 'A sample household for testing']);

    const householdId = householdResult.rows[0].id;
    console.log('Sample household inserted');

    // Add user as household owner
    await pool.query(`
      INSERT INTO household_members (household_id, user_id, role)
      VALUES ($1, $2, $3)
    `, [householdId, userId, 'owner']);

    console.log('User added as household owner');

    // Insert a sample pet
    const petResult = await pool.query(`
      INSERT INTO pets (household_id, name, species, birthdate, weight_kg, image_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [householdId, 'Buddy', 'Dog', '2020-01-15', 25.5, 'https://via.placeholder.com/150']);

    const petId = petResult.rows[0].id;
    console.log('Sample pet inserted');

    // Insert a sample medication
    const medicationResult = await pool.query(`
      INSERT INTO medications (
        pet_id, name, dosage_amount, dosage_unit_id, schedule_interval, 
        schedule_unit, specific_times, days_of_week, is_prn, 
        start_date, end_date, notes, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      petId, 'Heartgard Plus', 1, 5, 30, 'days', 
      ['08:00'], ['monday', 'wednesday', 'friday'], false,
      new Date(), new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      'Monthly heartworm prevention', true
    ]);

    const medicationId = medicationResult.rows[0].id;
    console.log('Sample medication inserted');

    // Get dosage unit for the medication
    const dosageUnitResult = await pool.query(`
      SELECT id FROM dosage_units WHERE name = 'tablet' LIMIT 1
    `);
    const dosageUnitId = dosageUnitResult.rows[0].id;

    // Update medication with correct dosage unit
    await pool.query(`
      UPDATE medications SET dosage_unit_id = $1 WHERE id = $2
    `, [dosageUnitId, medicationId]);

    console.log('Database seeding completed successfully!');
    console.log(`Created user: ${userId}`);
    console.log(`Created household: ${householdId}`);
    console.log(`Created pet: ${petId}`);
    console.log(`Created medication: ${medicationId}`);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
