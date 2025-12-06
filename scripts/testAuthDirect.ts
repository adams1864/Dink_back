import { auth } from "../src/auth/betterAuth.js";

async function main(){
  const email = `test${Date.now()}@example.com`;
  const password = "s3cureP@ssw0rd";

  const signup = await auth.api.signUpEmail({ body: { email, password, name: email } });
  console.log("signUpEmail", signup);

  const login = await auth.api.signInEmail({ body: { email, password } });
  console.log("signInEmail", login);
}

main().catch((err) => {
  console.error("auth direct test failed", err);
  process.exit(1);
});
