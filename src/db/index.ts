import "../env.js";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

const connectionUri = process.env.DATABASE_URL;

if (!connectionUri) {
	throw new Error("DATABASE_URL is not set");
}

const sql = neon(connectionUri);
export const db = drizzle(sql, { schema });
export type Database = typeof db;