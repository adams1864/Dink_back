import fs from 'fs/promises';
import path from 'path';
import { Client } from 'pg';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(process.cwd(), '.env'), override: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Please set DATABASE_URL env var');
  process.exit(1);
}

const dir = path.join(process.cwd(), 'drizzle');

const client = new Client({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

function splitStatements(sqlText) {
  const statements = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let dollarTag = null;

  for (let i = 0; i < sqlText.length; i += 1) {
    const char = sqlText[i];
    const next = i + 1 < sqlText.length ? sqlText[i + 1] : '';

    if (!inSingle && !inDouble && !dollarTag && char === '-' && next === '-') {
      const end = sqlText.indexOf('\n', i + 2);
      if (end === -1) break;
      i = end;
      continue;
    }

    if (!inSingle && !inDouble && !dollarTag && char === '/' && next === '*') {
      const endComment = sqlText.indexOf('*/', i + 2);
      if (endComment === -1) break;
      i = endComment + 1;
      continue;
    }

    if (!inSingle && !inDouble && char === '$') {
      let j = i + 1;
      while (j < sqlText.length && sqlText[j] !== '$' && /[A-Za-z0-9_]/.test(sqlText[j])) {
        j += 1;
      }
      if (j < sqlText.length && sqlText[j] === '$') {
        const tag = sqlText.slice(i, j + 1);
        if (dollarTag && tag === dollarTag) {
          current += tag;
          dollarTag = null;
          i = j;
          continue;
        }
        if (!dollarTag) {
          dollarTag = tag;
          current += tag;
          i = j;
          continue;
        }
      }
    }

    if (!dollarTag) {
      if (!inDouble && char === "'") {
        if (inSingle && next === "'") {
          current += "''";
          i += 1;
          continue;
        }
        inSingle = !inSingle;
        current += char;
        continue;
      }
      if (!inSingle && char === '"') {
        inDouble = !inDouble;
        current += char;
        continue;
      }
    }

    current += char;

    if (!inSingle && !inDouble && !dollarTag && char === ';') {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
    }
  }

  const tail = current.trim();
  if (tail.length > 0) {
    statements.push(tail);
  }

  return statements;
}

console.log('Connecting to PostgreSQL database...');
await client.connect();

try {
  const files = await fs.readdir(dir);
  const sqlFiles = files.filter((file) => file.endsWith('.sql')).sort();

  for (const file of sqlFiles) {
    const filePath = path.join(dir, file);
    let sqlText = await fs.readFile(filePath, 'utf8');
    sqlText = sqlText.replace(/-->\s*statement-breakpoint/g, ';');
    if (!sqlText.trim()) {
      console.log('\n---- Skipping', file, '(empty)');
      continue;
    }

    console.log('\n---- Running', file);
    const statements = splitStatements(sqlText);

    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (err) {
        const code = err && typeof err === 'object' ? err.code : undefined;
        if (code === '42701' || code === '42P07' || code === '23505' || code === '42710') {
          console.warn('Ignored DB error (already exists):', code, statement.split('\n')[0]);
          continue;
        }
        console.error('Failed to run statement in', file);
        console.error('Statement snippet:', statement.slice(0, 200));
        console.error(err);
        throw err;
      }
    }

    console.log('OK');
  }

  console.log('\nAll SQL files executed');
} finally {
  await client.end();
}
