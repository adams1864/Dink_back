import { auth } from "../src/auth/betterAuth.js";

console.log("auth keys", Object.keys(auth));
console.log("typeof $context", typeof (auth as any).$context);
(async () => {
	const ctx = await (auth as any).$context;
	console.log("context keys", Object.keys(ctx));
	console.log("adapter keys", Object.keys(ctx.internalAdapter));
})();
