# Roofing Company Website Template (Whop Websites)

A production-ready, rebrandable website for a US roofing contractor, built on **Whop Websites** and deployed to a whop.app / whop.site address. It shows a roofer's full money flow on Whop, end to end:

**estimate request (Lead) → inspection fee or deposit (Payment Elements) → card on file (Setup Intent) → final balance (Invoices API)**, with custom `whop.track` pixel events at every step.

## Features

| Requirement | Where |
| --- | --- |
| Services (repair, replacement, inspection), service area, financing, reviews/trust, contact | `src/components/Sections.tsx`, content in `src/site.config.ts` |
| 3 real plans: $149 inspection, $500 deposit, $1,450 flat-rate gutters | `scripts/setup-plans.mjs` (creates them via `POST /products` + `POST /variants`) |
| **CheckoutElement + ExpressCheckoutElement** (Apple Pay / Google Pay / PayPal) | `PlanCheckout` in `src/components/CheckoutModal.tsx` |
| **PaymentElement + BrandingElement** | `DepositCheckout` in `src/components/CheckoutModal.tsx` |
| Financing (Klarna / Afterpay / Splitit) surfaces automatically | All checkout runs inside Whop Elements; no custom card forms anywhere |
| "Request an Estimate" form → **Lead on the account** | `POST /api/estimate` → Whop `POST /members` + member note + `POST /events` (`lead`) |
| **Card-on-file via setup intent** at deposit checkout | PaymentElement in `mode: "setup"` → `createConfirmationToken()` → `POST /setup_intents` |
| Deposit charged to the saved card | `POST /invoices` (deposit plan + `payment_method_id`) → `POST /invoices/:id/issue` |
| **Final balance via Invoices API**: auto-charge **or** send for manual payment | `/crew` dashboard → `POST /api/admin/final-invoice` → `/invoices/:id/issue` (auto) or `/invoices/:id/send` (email + checkout link) |
| Custom pixel events `estimate_requested`, `service_viewed`, `deposit_started` | `src/lib/track.ts`; live log at `?debug=1` |
| Responsive (mobile + desktop) | `src/styles.css` |
| Reusable template | Edit **only** `src/site.config.ts` + secrets. No structural changes needed |

## Stack

- Vite + React 19 + TypeScript on Cloudflare Workers (`@cloudflare/vite-plugin` + `wrangler.jsonc`), packed for Whop hosting by `@whop/cli/vite`
- `dist/client`: static site. `dist/server/index.js`: the worker (`server/index.ts`), which handles `/api/*` and serves assets
- Server talks to the Whop REST API (`/api/v1`). In production, Whop's hosting proxy signs requests to `WHOP_API_ORIGIN` with the app's key, so **no API key lives in the code or in secrets**.
- `@whop/elements` + `@whop/elements-react` 1.10.0 for all payment UI

```
src/site.config.ts        ← the only file to edit when rebranding
src/components/           ← sections, estimate form, checkout modal, pixel log
src/pages/CrewDashboard   ← /crew: bill final balances (admin key protected)
server/handler.ts         ← /api routes (leads, setup intents, invoices)
server/whop.ts            ← tiny Whop REST client (prod proxy / dev key / sandbox)
scripts/setup-plans.mjs   ← creates the product + 3 plans
```

## Deploy (about 10 minutes)

**1. Install the Whop CLI and sign in.** Run `whop` once to pick your business.

```bash
curl -fsSL https://whop.com/install.sh | sh
whop
```

**2. Create the website app** (claims the domain and writes `whop.app.json`). Run it in an empty folder, then copy this project's files into the new folder, keeping the generated `whop.app.json`:

```bash
whop apps init --app_type website --name "Summit Peak Roofing" --domain summit-peak-roofing
```

Or link this folder to an existing website app directly with `whop apps deploy --app app_xxxxxxxx`.

**3. Create the plans.** Get an API key with product, plan, invoice and payment scopes at whop.com/dashboard/developer. Use your `biz_` id:

```bash
WHOP_API_KEY=... ACCOUNT_ID=biz_xxx npm run setup:plans
```

**4. Set the secrets that the script prints:**

```bash
whop apps secrets set --secret PLAN_INSPECTION_ID=plan_...
whop apps secrets set --secret PLAN_DEPOSIT_ID=plan_...
whop apps secrets set --secret PLAN_FLAT_RATE_ID=plan_...
whop apps secrets set --secret ADMIN_KEY=some-long-random-string
```

**5. Deploy:**

```bash
npm install
whop apps deploy
```

**6. Check it.** Open `https://<domain>/api/health`. It should show `accountConfigured: true`.

### Sandbox / test checkout

The Whop CLI and the hosted runtime act on **production**. To run test payments against the Whop sandbox:

1. Create a sandbox business and API key at sandbox.whop.com/dashboard/developer.
2. Run `WHOP_ENVIRONMENT=sandbox WHOP_API_KEY=<sandbox key> ACCOUNT_ID=biz_<sandbox> npm run setup:plans`.
3. Set the secrets `WHOP_ENVIRONMENT=sandbox`, `SANDBOX_API_KEY`, `SANDBOX_ACCOUNT_ID`, and the sandbox `PLAN_*` ids.

The Elements then mount with `environment="sandbox"`, and the server calls `sandbox-api.whop.com`.

Test cards:

| Card | Result |
| --- | --- |
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| `5385 3083 6013 5181` | 3DS. Enter `Checkout1!` |

Use any future expiry and any CVC. Apple Pay and Google Pay are not available in the sandbox, so the express buttons hide themselves there.

### Local development

```bash
whop apps dev
```

This injects `WHOP_APP_ID` and a short-lived `WHOP_API_KEY`, so `/api/*` works locally through the same handler.

## Rebranding for another roofer

Edit `src/site.config.ts`: company, phone, license, theme colors, services, offers and prices, cities and ZIP prefixes, financing copy, reviews, and form options. Then:

1. Re-run `setup:plans` with `COMPANY_NAME`, `INSPECTION_PRICE`, `DEPOSIT_PRICE`, `FLAT_RATE_PRICE` and `FLAT_RATE_TITLE`.
2. Set the new plan ids as secrets.
3. Run `whop apps deploy`.

No component changes are needed.

## Verifying pixel events

- Append `?debug=1` to the URL for a live on-page log of every `whop.track` call.
- DevTools → Network: filter for `t.whop.tw` to see the beacons.
- Whop dashboard: the Websites / pixel event breakdown shows `service_viewed`, `estimate_requested`, `deposit_started` (plus `lead`, `initiate_checkout`, page views, checkout) about a minute later.
- Validate the install with `POST /api/v1/events/validate_pixel`.

## API flows

### Estimate → Lead

1. The browser `POST /api/estimate` creates the following on Whop:
   - `POST /members` (CRM record)
   - `POST /members/:id/notes` (the estimate details)
   - `POST /events` with `event_name: "lead"` and `action_source: "website"` (the person shows up in People / leads reporting)
2. The browser then fires `whop.track("estimate_requested", { event_id })` with the same `event_id`.

### Deposit → card on file

1. `<Payments mode="setup" setupFutureUsage="off_session">` renders PaymentElement + BrandingElement.
2. `createConfirmationToken()` → `POST /api/deposit` → `POST /setup_intents` saves the card.
3. If the setup intent comes back `requires_action`, `whop.payments.handleNextAction()` handles 3DS and then `POST /api/deposit/complete` runs.
4. The deposit is billed as an invoice for the deposit plan with the saved `payment_method_id`, then issued, which charges it right away.

### Final balance (`/crew`)

1. Enter `ADMIN_KEY`. The member id and payment method id are prefilled from the deposit success screen link.
2. Choose how to collect:
   - **Auto-charge**: `POST /invoices` with `payment_method_id`, then `/issue`. The saved card is charged off-session.
   - **Manual**: `POST /invoices` with `due_at`, then `/send`. The customer is emailed a Whop checkout link and reminders.

## Security notes

- No card data touches this code. All payment input lives in Whop Elements iframes.
- The production API key is never readable: the Whop hosting proxy injects it.
- `/api/admin/*` requires the `ADMIN_KEY` secret in the `x-admin-key` header.
- Idempotency keys are sent on every write (setup intents, invoices, members).
