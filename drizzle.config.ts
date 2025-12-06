import { defineConfig } from "drizzle-kit";
import fs from "fs";

// Check if the command is 'generate'
const isGenerate = process.argv.includes("generate");

const envFileContent = fs.readFileSync(".env", "utf-8");
const envConfig = Object.fromEntries(
  envFileContent.split("\n").map((line) => {
    const [key, ...value] = line.split("=");
    // remove carriage return from value
    const cleanValue = value.join("=").replace(/\r/g, "");
    return [key, cleanValue];
  })
);

const databaseUrl = envConfig["DATABASE_URL"];
const dialect = envConfig["DB_DIALECT"] === "mysql" ? "mysql" : "postgresql";
const out = dialect === "mysql" ? "./drizzle-mysql" : "./drizzle";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: out,
  dialect: dialect,
  dbCredentials: isGenerate ? undefined : {
    url: databaseUrl!,
  },
});