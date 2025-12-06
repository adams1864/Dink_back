import { auth } from "../src/auth/betterAuth.js";

const token = process.argv[2];

if (!token) {
  console.error("Usage: npx tsx scripts/checkSessionToken.ts <token>");
  process.exit(1);
}

async function main() {
  const instance = auth as any;
  const ctx = typeof instance.$context?.then === "function" ? await instance.$context : instance.$context;

  if (!ctx || !ctx.internalAdapter) {
    throw new Error("Better Auth context or internal adapter unavailable");
  }

  const session = await ctx.internalAdapter.findSession(token);
  console.log("session:", session);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
