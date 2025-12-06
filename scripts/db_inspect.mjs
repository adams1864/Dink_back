import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Please set DATABASE_URL env var');
  process.exit(1);
}

console.log('Connecting to PostgreSQL database...');

const client = new Client({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();

  const tablesResult = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  );
  const tableNames = tablesResult.rows.map((row) => row.table_name);
  console.log('Tables:');
  console.log(tableNames);

  for (const tableName of tableNames) {
    console.log('\nTable:', tableName);
    const columnsResult = await client.query(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      [tableName]
    );
    console.log(columnsResult.rows);
  }
} catch (err) {
  console.error('DB inspect failed', err);
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}
