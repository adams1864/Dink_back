const base = "http://localhost:4000";

async function main() {
  const payload = { email: `test${Date.now()}@example.com`, password: "s3cureP@ssw0rd" };
  const registerRes = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const registerBody = await registerRes.text();
  console.log("register status", registerRes.status, registerBody);

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const loginBody = await loginRes.text();
  console.log("login status", loginRes.status, loginBody);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
