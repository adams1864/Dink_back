import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

let databaseUrl = '';
for (const line of envLines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    databaseUrl = trimmed.substring('DATABASE_URL='.length).trim();
    // Remove quotes if present
    if ((databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) ||
        (databaseUrl.startsWith("'") && databaseUrl.endsWith("'"))) {
      databaseUrl = databaseUrl.slice(1, -1);
    }
    break;
  }
}

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('✅ Loaded DATABASE_URL from .env file');

const sql = neon(databaseUrl);

console.log('🔄 Starting product data migration...\n');

async function updateProductData() {
  try {
    // Fetch all products
    const products = await sql`SELECT * FROM products`;
    console.log(`📦 Found ${products.length} products to update\n`);

    // Update each product
    for (const product of products) {
      let category = 'accessories';
      let gender = 'men';
      const name = (product.name || '').toLowerCase();
      const size = (product.size || '').toLowerCase();

      // Determine category
      if (name.includes('jersey') || name.includes('kit') || 
          name.includes('portugal') || name.includes('messi')) {
        category = 'match-kits';
      } else if (name.includes('squadra') || name.includes('training') || 
                 name.includes('addidas')) {
        category = 'training';
      } else if (name.includes('casual') || name.includes('hoodie') || 
                 name.includes('jacket')) {
        category = 'casual';
      }

      // Determine gender
      if (name.includes('kids') || size.includes('4-5') || size.includes('6-7') ||
          size.includes('8-9') || size.includes('10-11') || size.includes('12-13')) {
        gender = 'kids';
      } else if (name.includes('women')) {
        gender = 'women';
      }

      // Set defaults for empty fields
      const sku = product.sku || `SKU-${String(product.id).padStart(4, '0')}`;
      const material = product.material || '100% Polyester';
      const weight = product.weight || (gender === 'kids' ? '150g' : '180g');
      const fit = product.fit || (gender === 'kids' ? 'Youth Fit' : 'Athletic Fit');
      const features = product.features || JSON.stringify(['Moisture Wicking', 'Breathable', 'Quick Dry']);

      // Update the product
      await sql`
        UPDATE products
        SET 
          category = ${category},
          gender = ${gender},
          status = 'published',
          sku = ${sku},
          material = ${material},
          weight = ${weight},
          fit = ${fit},
          features = ${features}
        WHERE id = ${product.id}
      `;

      console.log(`✅ Updated Product ID ${product.id}: ${product.name}`);
      console.log(`   Category: ${category}, Gender: ${gender}\n`);
    }

    console.log('✅ Product data migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Updated ${products.length} products`);
    console.log(`   - Set proper categories and gender values`);
    console.log(`   - Added default values for new fields`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

updateProductData()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
