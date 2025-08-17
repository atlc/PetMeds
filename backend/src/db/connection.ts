import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * PostgreSQL connection pool configuration
 * Manages multiple database connections for efficient query handling
 */
const pool = new Pool({
  // Database connection parameters
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'petmeds',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  
  // Connection pool settings
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),        // Maximum number of connections
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // Close idle connections after 30s
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'), // Connection timeout
  
  // SSL configuration for production environments
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Allow self-signed certificates in production
  } : false
});

/**
 * Handle pool errors to prevent application crashes
 * Logs errors and can implement retry logic if needed
 */
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Test database connection
 * Used during startup to verify database accessibility
 * 
 * @returns Promise<boolean> - True if connection successful, false otherwise
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

/**
 * Close all database connections in the pool
 * Called during application shutdown for graceful cleanup
 * 
 * @returns Promise<void>
 */
export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('✅ Database pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
  }
};

/**
 * Get a client from the connection pool
 * Use this for transactions or when you need a dedicated connection
 * 
 * @returns Promise<PoolClient> - Database client for manual connection management
 */
export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

// Export the configured pool for use in other modules
export { pool };
