import { auth } from "../src/auth/betterAuth.js";

console.log(Object.keys((auth as any).api));

for (const key of Object.keys((auth as any).api)) {
  const value = (auth as any).api[key];
  if (typeof value === "object" && value) {
    console.log(key, Object.keys(value));
  }
}
