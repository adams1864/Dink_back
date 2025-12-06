import fs from 'fs';
import path from 'path';
import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';

function loadSqlStatements(filePath: string){
  const sql = fs.readFileSync(filePath, 'utf8');
  return sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => (statement.endsWith(';') ? statement : `${statement};`));
}

async function applySqlFile(filePath: string){
  const statements = loadSqlStatements(filePath);
  for (const stmt of statements){
    console.log('Executing:', stmt.slice(0, 120).replace(/\n/g, ' '));
    await db.execute(sql.raw(stmt));
  }
}

async function main(){
  const migrationsDir = path.resolve(process.cwd(), 'drizzle');
  const sqlFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql') && file.includes('better_auth'))
    .sort();

  if (sqlFiles.length === 0){
    console.log('No SQL migration files found in drizzle directory.');
    return;
  }

  try{
    for (const file of sqlFiles){
      const sqlPath = path.join(migrationsDir, file);
      console.log(`\nApplying migration ${file}`);
      await applySqlFile(sqlPath);
    }
    console.log('\nAll Better Auth migrations applied (or already existed).');
  }catch(err){
    console.error('Migration failed:', err);
    process.exitCode = 1;
  }finally{
    process.exit();
  }
}

main();
