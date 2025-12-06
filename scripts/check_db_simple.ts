import { sql } from "drizzle-orm";
import { db } from "../src/db/index.js";

async function checkDb() {
  try {
    console.log("Checking database connection...");
    const result = await db.execute(sql`SELECT 1`);
    console.log("Database connection successful:", result);

    console.log("Checking tables...");
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Tables found:", tables.rows.map((r: any) => r.table_name));
  } catch (error) {
    console.error("Database check failed:", error);
  } finally {
    process.exit(0);
  }
}

checkDb();
