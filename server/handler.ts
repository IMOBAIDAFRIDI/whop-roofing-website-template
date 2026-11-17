import { createWhop, readEnv, WhopApiError, type Env, type WhopContext } from "./whop";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const fail = (message: string, status = 400, detail?: unknown) => json({ error: message, detail }, status);

async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Request body must be JSON.");
  }
}

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function requireAccount(whop: WhopContext) {
  if (!whop.accountId) {
    throw new HttpError(500, "No Whop account configured (WHOP_ACCOUNT_ID / SANDBOX_ACCOUNT_ID).");
  }
}

function plans(env: Env) {
  return {
    inspection: env.PLAN_INSPECTION_ID || "",
    deposit: env.PLAN_DEPOSIT_ID || "",
    flatRate: env.PLAN_FLAT_RATE_ID || "",
  };
}

function splitName(name: string) {
  const [first, ...rest] = name.split(/\s+/);
  return { first_name: first || undefined, last_name: rest.join(" ") || undefined };
}

/* ------------------------------------------------------------------ */
/* routes                                                              */
/* ------------------------------------------------------------------ */

/** Public, non-secret runtime config the browser needs to mount Elements. */
function getConfig(env: Env, whop: WhopContext) {
  return json({
    environment: whop.environment,
    accountId: whop.accountId,
    plans: plans(env),
  });
}

interface EstimateBody {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  zip?: string;
  service?: string;
  roofType?: string;
  urgency?: string;
  message?: string;
  eventId?: string;
  pageUrl?: string;
}

/**
 * "Request an Estimate" → a Lead on the Whop account.
 *  1. POST /members        – resolve/create the person as a member of the account (CRM record)
 *  2. POST /members/:id/notes – attach the estimate details to that record
 *  3. POST /events (lead)  – record the lead conversion (shows in People / Leads / pixel reporting),
 *                            deduped against the browser pixel by event_id
 */
async function createEstimateLead(req: Request, whop: WhopContext) {
  requireAccount(whop);
  const b = await readJson<EstimateBody>(req);
  const name = str(b.name, 120);
  const email = str(b.email, 200).toLowerCase();
  const phone = str(b.phone, 40);
  const zip = str(b.zip, 12);
  if (!name) throw new HttpError(422, "Please enter your name.");
  if (!isEmail(email)) throw new HttpError(422, "Please enter a valid email address.");
  if (!phone) throw new HttpError(422, "Please enter a phone number.");

  const eventId = str(b.eventId, 100) || `est_${crypto.randomUUID()}`;
  const { first_name, last_name } = splitName(name);

  // 1. CRM member record
  let memberId: string | undefined;
  try {
    const member = await whop.request<{ id: string }>(
      "POST",
      "/members",
      { account_id: whop.accountId, email, name },
      `member-${email}`,
    );
    memberId = member?.id;
  } catch (err) {
    console.error("[estimate] member create failed", err);
  }

  // 2. Estimate details as a note on the member
  if (memberId) {
    const note = [
      `Estimate request (${eventId})`,
      `Service: ${str(b.service, 80) || "n/a"}`,
      `Roof type: ${str(b.roofType, 80) || "n/a"}`,
      `Urgency: ${str(b.urgency, 80) || "n/a"}`,
      `Phone: ${phone}`,
      `Address: ${str(b.address, 200) || "n/a"} ${zip}`,
      `Message: ${str(b.message, 1500) || "-"}`,
    ].join("\n");
    try {
      await whop.request("POST", `/members/${memberId}/notes`, { content: note });
    } catch (err) {
      console.error("[estimate] note create failed", err);
    }
  }

  // 3. Lead event (server-side, source of truth for the lead)
  const event = await whop.request<{ id: string }>("POST", "/events", {
    account_id: whop.accountId,
    event_name: "lead",
    action_source: "website",
    event_id: eventId,
    url: str(b.pageUrl, 2000) || undefined,
    user: {
      email,
      phone,
      name,
      first_name,
      last_name,
      postal_code: zip || undefined,
      country: "US",
      member_id: memberId,
    },
    context: {
      user_agent: req.headers.get("user-agent") || undefined,
      ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || undefined,
    },
  });

  return json({ ok: true, leadEventId: event?.id, eventId, memberId });
}

interface SetupIntent {
  id: string;
  status: "succeeded" | "requires_action" | "processing" | "canceled" | string;
  client_secret: string | null;
  payment_method_id: string | null;
  member_id: string | null;
  last_setup_error?: { message?: string } | null;
}

interface Invoice {
  id: string;
  status: string;
  total?: number;
  amount_due?: number;
  checkout_link?: string | null;
  member_id?: string | null;
  payment_method_id?: string | null;
  scheduled_charge_at?: string | null;
  number?: string | null;
}

interface DepositBody {
  confirmationToken?: string;
  setupIntentId?: string;
  email?: string;
  name?: string;
  jobRef?: string;
  returnUrl?: string;
}

/**
 * Deposit checkout, step 1: the browser's PaymentElement (setup mode) +
 * BrandingElement produced a confirmation token. Turn it into a saved card
 * with a Setup Intent, then charge the deposit plan to that card.
 */
async function startDeposit(req: Request, env: Env, whop: WhopContext) {
  requireAccount(whop);
  const b = await readJson<DepositBody>(req);
  const token = str(b.confirmationToken, 200);
  const email = str(b.email, 200).toLowerCase();
  if (!token) throw new HttpError(422, "Missing confirmation token.");
  if (!isEmail(email)) throw new HttpError(422, "A valid email is required.");
  const jobRef = str(b.jobRef, 60) || `JOB-${Date.now().toString(36).toUpperCase()}`;

  const intent = await whop.request<SetupIntent>(
    "POST",
    "/setup_intents",
    {
      account_id: whop.accountId,
      confirmation_token: token,
      currency: "usd",
      email,
      metadata: { job_ref: jobRef, purpose: "roofing_deposit_card_on_file" },
      return_url: str(b.returnUrl, 2000) || undefined,
    },
    `sint-${token}`,
  );

  if (intent.status === "succeeded") {
    return json(await chargeDeposit(env, whop, intent, jobRef, str(b.name, 120)));
  }
  return json({
    ok: false,
    setupIntentId: intent.id,
    status: intent.status,
    clientSecret: intent.client_secret,
    jobRef,
    error: intent.last_setup_error?.message,
  });
}

/** Deposit checkout, step 2 (after 3DS / handleNextAction): re-read the intent and charge. */
async function completeDeposit(req: Request, env: Env, whop: WhopContext) {
  requireAccount(whop);
  const b = await readJson<DepositBody>(req);
  const id = str(b.setupIntentId, 80);
  if (!id.startsWith("sint_")) throw new HttpError(422, "Missing setup intent id.");
  const intent = await whop.request<SetupIntent>("GET", `/setup_intents/${id}`);
  if (intent.status !== "succeeded") {
    return json({ ok: false, status: intent.status, setupIntentId: id, error: intent.last_setup_error?.message });
  }
  return json(await chargeDeposit(env, whop, intent, str(b.jobRef, 60) || id, str(b.name, 120)));
}

async function chargeDeposit(env: Env, whop: WhopContext, intent: SetupIntent, jobRef: string, name: string) {
  const depositPlan = plans(env).deposit;
  if (!depositPlan) throw new HttpError(500, "PLAN_DEPOSIT_ID is not configured.");
  if (!intent.payment_method_id || !intent.member_id) {
    throw new HttpError(502, "Setup intent succeeded but returned no payment method / member.");
  }

  // Deposit invoice against the stored card. Issuing with a payment_method_id
  // and no due date charges it off-session right away.
  const draft = await whop.request<Invoice>(
    "POST",
    "/invoices",
    {
      account_id: whop.accountId,
      member_id: intent.member_id,
      customer_name: name || undefined,
      payment_method_id: intent.payment_method_id,
      items: [{ variant_id: depositPlan, quantity: 1 }],
      memo: `Project deposit for ${jobRef}. Your card is saved on file for the final balance once the job is complete.`,
      metadata: { job_ref: jobRef, stage: "deposit", setup_intent_id: intent.id },
    },
    `deposit-inv-${intent.id}`,
  );
  const issued = await whop.request<Invoice>("POST", `/invoices/${draft.id}/issue`, {}, `deposit-issue-${draft.id}`);

  return {
    ok: true,
    jobRef,
    setupIntentId: intent.id,
    paymentMethodId: intent.payment_method_id,
    memberId: intent.member_id,
    depositInvoice: pickInvoice(issued),
  };
}

const pickInvoice = (i: Invoice) => ({
  id: i.id,
  number: i.number,
  status: i.status,
  total: i.total,
  amountDue: i.amount_due,
  checkoutLink: i.checkout_link,
  scheduledChargeAt: i.scheduled_charge_at,
  paymentMethodId: i.payment_method_id,
});

/* ---------------------------- admin ------------------------------- */

function assertAdmin(req: Request, env: Env) {
  const key = env.ADMIN_KEY;
  if (!key) throw new HttpError(503, "ADMIN_KEY secret is not set; the crew dashboard is disabled.");
  if (req.headers.get("x-admin-key") !== key) throw new HttpError(401, "Wrong admin key.");
}

async function listPaymentMethods(url: URL, whop: WhopContext) {
  const memberId = str(url.searchParams.get("member_id"), 80);
  if (!memberId.startsWith("mber_")) throw new HttpError(422, "member_id (mber_…) is required.");
  const qs = new URLSearchParams({ member_id: memberId, account_id: whop.accountId, first: "10" });
  const res = await whop.request<{ data: any[] }>("GET", `/payment_methods?${qs}`);
  return json({
    data: (res?.data ?? []).map((m) => ({
      id: m.id,
      type: m.payment_method_type,
      brand: m.card?.brand,
      last4: m.card?.last4,
      exp: m.card ? `${m.card.exp_month}/${m.card.exp_year}` : undefined,
    })),
  });
}

async function listInvoices(whop: WhopContext) {
  const qs = new URLSearchParams({ account_id: whop.accountId, first: "15" });
  const res = await whop.request<{ data: Invoice[] }>("GET", `/invoices?${qs}`);
  return json({ data: (res?.data ?? []).map(pickInvoice) });
}

interface FinalInvoiceBody {
  memberId?: string;
  customerName?: string;
  amount?: number | string;
  description?: string;
  jobRef?: string;
  collection?: "auto" | "manual";
  paymentMethodId?: string;
  dueInDays?: number | string;
}

/**
 * Final balance once the job is done, via the Invoices API:
 *  - auto:   invoice carries the saved payment_method_id → /issue charges it off-session now
 *  - manual: invoice without a method → /send emails the customer a Whop checkout link
 */
async function createFinalInvoice(req: Request, whop: WhopContext) {
  requireAccount(whop);
  const b = await readJson<FinalInvoiceBody>(req);
  const memberId = str(b.memberId, 80);
  const amount = Math.round(Number(b.amount) * 100) / 100;
  const collection = b.collection === "manual" ? "manual" : "auto";
  const paymentMethodId = str(b.paymentMethodId, 80);
  const jobRef = str(b.jobRef, 60) || "JOB";
  if (!memberId.startsWith("mber_")) throw new HttpError(422, "memberId (mber_…) is required.");
  if (!Number.isFinite(amount) || amount < 1) throw new HttpError(422, "Amount must be at least $1.00.");
  if (collection === "auto" && !paymentMethodId.startsWith("payt_")) {
    throw new HttpError(422, "Auto-charge needs the saved paymentMethodId (payt_…).");
  }
  const dueInDays = Math.min(Math.max(Number(b.dueInDays) || 7, 1), 60);
  const description = str(b.description, 30) || "Final balance";

  const draft = await whop.request<Invoice>(
    "POST",
    "/invoices",
    {
      account_id: whop.accountId,
      member_id: memberId,
      customer_name: str(b.customerName, 120) || undefined,
      payment_method_id: collection === "auto" ? paymentMethodId : undefined,
      due_at: collection === "manual" ? new Date(Date.now() + dueInDays * 86400000).toISOString() : undefined,
      items: [
        {
          quantity: 1,
          variant: {
            title: description,
            billing_type: "one_time",
            initial_price: amount,
            currency: "usd",
          },
        },
      ],
      memo: `Final balance for ${jobRef}. Thank you for choosing us!`,
      metadata: { job_ref: jobRef, stage: "final_balance", collection },
    },
    `final-${jobRef}-${amount}-${collection}`,
  );

  const action = collection === "auto" ? "issue" : "send";
  const done = await whop.request<Invoice>("POST", `/invoices/${draft.id}/${action}`, {}, `final-${action}-${draft.id}`);
  return json({ ok: true, collection, invoice: pickInvoice(done) });
}

/* ------------------------------------------------------------------ */
/* router                                                              */
/* ------------------------------------------------------------------ */

export async function handleApi(req: Request, rawEnv?: Env): Promise<Response> {
  const env = readEnv(rawEnv);
  const url = new URL(req.url);
  const whop = createWhop(env);
  const route = `${req.method} ${url.pathname.replace(/\/$/, "")}`;

  try {
    switch (route) {
      case "GET /api/config":
        return getConfig(env, whop);
      case "GET /api/health":
        return json({ ok: true, environment: whop.environment, accountConfigured: Boolean(whop.accountId) });
      case "POST /api/estimate":
        return await createEstimateLead(req, whop);
      case "POST /api/deposit":
        return await startDeposit(req, env, whop);
      case "POST /api/deposit/complete":
        return await completeDeposit(req, env, whop);
      case "GET /api/admin/payment-methods":
        assertAdmin(req, env);
        return await listPaymentMethods(url, whop);
      case "GET /api/admin/invoices":
        assertAdmin(req, env);
        return await listInvoices(whop);
      case "POST /api/admin/final-invoice":
        assertAdmin(req, env);
        return await createFinalInvoice(req, whop);
      default:
        return fail("Not found", 404);
    }
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status);
    if (err instanceof WhopApiError) {
      console.error(err.message);
      const body = err.body as any;
      const message = body?.error?.message || body?.message || "Whop API request failed.";
      return fail(message, err.status >= 500 ? 502 : err.status, body);
    }
    console.error(err);
    return fail("Unexpected server error.", 500);
  }
}
