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

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Add new product fields
    await client.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sku" varchar(100)`);
    console.log('✓ Added sku column');
    
    await client.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "material" varchar(255)`);
    console.log('✓ Added material column');
    
    await client.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "weight" varchar(100)`);
    console.log('✓ Added weight column');
    
    await client.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "fit" varchar(100)`);
    console.log('✓ Added fit column');
    
    await client.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "features" text`);
    console.log('✓ Added features column');
    
    await client.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_new" boolean DEFAULT false`);
    console.log('✓ Added is_new column');
    
    await client.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_best_seller" boolean DEFAULT false`);
    console.log('✓ Added is_best_seller column');

    // Add new order fields
    await client.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customer_phone" varchar(20)`);
    console.log('✓ Added customer_phone column');
    
    await client.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "selected_size" varchar(50)`);
    console.log('✓ Added selected_size column');
    
    await client.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "selected_color" varchar(50)`);
    console.log('✓ Added selected_color column');
    
    await client.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_preferences" text`);
    console.log('✓ Added delivery_preferences column');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
