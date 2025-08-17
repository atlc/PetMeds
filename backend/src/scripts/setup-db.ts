import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function setupDatabase() {
  // Connect to default postgres database to create our database
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Check if database exists
    const dbExists = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'petmeds']
    );

    if (dbExists.rows.length === 0) {
      console.log(`Creating database: ${process.env.DB_NAME || 'petmeds'}`);
      await client.query(`CREATE DATABASE "${process.env.DB_NAME || 'petmeds'}"`);
      console.log('Database created successfully');
    } else {
      console.log('Database already exists');
    }

    await client.end();

    // Now connect to our database and run schema
    const dbClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'petmeds',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    });

    await dbClient.connect();
    console.log('Connected to PetMeds database');

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await dbClient.query(schema);
    console.log('Schema applied successfully');

    await dbClient.end();
    console.log('Database setup completed successfully');

  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
