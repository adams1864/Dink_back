import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '..', '.env'), override: true });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkDatabase() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check total products
    const countResult = await client.query('SELECT COUNT(*) as count FROM products');
    console.log(`📦 Total products in database: ${countResult.rows[0].count}\n`);

    // Check products by status
    const statusResult = await client.query(`
      SELECT status, COUNT(*) as count 
      FROM products 
      GROUP BY status
    `);
    console.log('📊 Products by status:');
    statusResult.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count}`);
    });
    console.log('');

    // Check if new columns exist
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name IN ('sku', 'material', 'weight', 'fit', 'features', 'is_new', 'is_best_seller')
      ORDER BY column_name
    `);
    console.log('✅ New columns added:');
    columnsResult.rows.forEach(row => {
      console.log(`   ✓ ${row.column_name}`);
    });
    console.log('');

    // Show sample products
    const sampleResult = await client.query(`
      SELECT id, name, category, gender, status, stock, price 
      FROM products 
      LIMIT 5
    `);
    console.log('🔍 Sample products:');
    sampleResult.rows.forEach(row => {
      console.log(`   ID: ${row.id} | ${row.name}`);
      console.log(`      Category: ${row.category || 'NULL'} | Gender: ${row.gender || 'NULL'}`);
      console.log(`      Status: ${row.status} | Stock: ${row.stock} | Price: ${row.price}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
