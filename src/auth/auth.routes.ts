import express from "express";
import jwt from "jsonwebtoken";
import { auth as betterAuthInstance } from "./betterAuth.js";

const router = express.Router();

// Login: try to use Better Auth API if available, otherwise fallback to simple JWT
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Missing email or password" });

  try {
    const a = betterAuthInstance as any;
    if (a && a.api && typeof a.api.signInEmail === "function") {
      // call server-side signInEmail per docs (body wrapper)
      const result = await a.api.signInEmail({ body: { email, password } });
      console.log('signInEmail result:', result);
      return res.json(result);
    }
  } catch (err) {
    console.error("better-auth login error", err);
  }
  // If we reach here, Better Auth was not available or failed
  const msg = "Better Auth login failed or is not available";
  console.error(msg);
  return res.status(502).json({ error: msg });
});

// Register: try to use Better Auth user creation if available
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Missing email or password" });

  try {
    const a = betterAuthInstance as any;
    if (a && a.api && typeof a.api.signUpEmail === "function") {
      const result = await a.api.signUpEmail({ body: { email, password } });
      console.log('signUpEmail result:', result);
      return res.status(201).json(result);
    }
  } catch (err) {
    console.error("better-auth register error", err);
    return res.status(502).json({ error: "Better Auth register failed", details: String(err) });
  }

  const msg = "Better Auth register is not available on the server";
  console.error(msg);
  return res.status(502).json({ error: msg });
});

export default router;
