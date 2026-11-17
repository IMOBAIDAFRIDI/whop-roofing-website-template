#!/usr/bin/env node
/**
 * Creates the Whop product + 3 one-time plans this template sells, then
 * prints the `whop apps secrets set` commands to wire them up.
 *
 *   WHOP_API_KEY=... ACCOUNT_ID=biz_... npm run setup:plans
 *   # sandbox:
 *   WHOP_ENVIRONMENT=sandbox WHOP_API_KEY=<sandbox key> ACCOUNT_ID=biz_... npm run setup:plans
 *
 * Optional overrides: COMPANY_NAME, INSPECTION_PRICE, DEPOSIT_PRICE, FLAT_RATE_PRICE, FLAT_RATE_TITLE
 */

const env = process.env;
const sandbox = env.WHOP_ENVIRONMENT === "sandbox";
const base = sandbox ? "https://sandbox-api.whop.com/api/v1" : "https://api.whop.com/api/v1";
const key = env.WHOP_API_KEY;
const accountId = env.ACCOUNT_ID;

if (!key || !accountId) {
  console.error("Set WHOP_API_KEY and ACCOUNT_ID (biz_…) first. Keys: https://whop.com/dashboard/developer");
  process.exit(1);
}

const company = env.COMPANY_NAME || "Summit Peak Roofing";
const plans = [
  { secret: "PLAN_INSPECTION_ID", title: "Roof Inspection", price: Number(env.INSPECTION_PRICE || 149) },
  { secret: "PLAN_DEPOSIT_ID", title: "Project Deposit", price: Number(env.DEPOSIT_PRICE || 500) },
  { secret: "PLAN_FLAT_RATE_ID", title: (env.FLAT_RATE_TITLE || "Gutter Replacement").slice(0, 30), price: Number(env.FLAT_RATE_PRICE || 1450) },
];

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Api-Version-Date": "2026-11-16-2",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

const product = await call("POST", "/products", {
  account_id: accountId,
  title: `${company} Services`.slice(0, 80),
  headline: "Roof inspections, project deposits and flat-rate services",
});
console.log(`✓ product ${product.id}`);

const out = [];
for (const p of plans) {
  const v = await call("POST", "/variants", {
    account_id: accountId,
    product_id: product.id,
    title: p.title,
    billing_type: "one_time",
    initial_price: p.price,
    currency: "usd",
    unlimited_stock: true,
  });
  console.log(`✓ ${p.title.padEnd(20)} $${p.price}  → ${v.id}`);
  out.push(`${p.secret}=${v.id}`);
}

console.log("\nNow run (inside the linked project):\n");
for (const line of out) console.log(`  whop apps secrets set --secret ${line}`);
if (sandbox) {
  console.log(`  whop apps secrets set --secret WHOP_ENVIRONMENT=sandbox`);
  console.log(`  whop apps secrets set --secret SANDBOX_ACCOUNT_ID=${accountId}`);
  console.log(`  whop apps secrets set --secret SANDBOX_API_KEY=<your sandbox key>`);
}
console.log(`  whop apps secrets set --secret ADMIN_KEY=<choose a long random string>\n`);
