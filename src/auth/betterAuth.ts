import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import { databaseSchema } from "../db/schema.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "postgresql",
    schema: databaseSchema,
  }),
  user: {
    modelName: "users",
  },
  session: {
    modelName: "user_sessions",
    expiresIn: 60 * 60 * 24 * 7,
  },
  account: {
    modelName: "accounts",
  },
  verification: {
    modelName: "email_verifications",
  },
  // enable email & password provider
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  providers: [
    {
      type: "email",
      sendVerificationRequest: async (data: { email: string; url?: string }) => {
        console.log("Send verification email to:", data.email, data.url);
      },
    },
  ],
});
