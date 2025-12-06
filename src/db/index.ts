import "../env.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

const connectionUri = process.env.DATABASE_URL;

if (!connectionUri) {
	throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
	connectionString: connectionUri,
	ssl:
		process.env.NODE_ENV === "production"
			? { rejectUnauthorized: false }
			: false,
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;