import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  WhopElements,
  Checkout,
  CheckoutElement,
  ExpressCheckoutElement,
  Payments,
  PaymentElement,
  BrandingElement,
  usePayments,
  useWhop,
} from "@whop/elements-react";
import { loadWhop } from "@whop/elements";
import { site, type PlanKey } from "../site.config";
import { api, type RuntimeConfig } from "../lib/api";
import { eventId, track } from "../lib/track";
import { Icon } from "./Icons";

// Whop Elements runtime, loaded once on first checkout open.
let whopLoader: ReturnType<typeof loadWhop> | null = null;
const getLoader = () => (whopLoader ??= loadWhop());

const PENDING_KEY = "roofing.pendingDeposit";
const depositPrice = site.offers.find((o) => o.key === "deposit")?.price ?? 0;

interface Props {
  planKey: PlanKey;
  config: RuntimeConfig | null;
  configError: string | null;
  onClose: () => void;
}

export function CheckoutModal({ planKey, config, configError, onClose }: Props) {
  const offer = site.offers.find((o) => o.key === planKey)!;
  const planId = config?.plans[planKey] ?? "";
  const opened = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
    };
  }, [onClose]);

  // Standard + custom pixel events when a checkout opens.
  useEffect(() => {
    if (!planId || opened.current) return;
    opened.current = true;
    const common = { variant_id: planId, value: offer.price, currency: "USD" };
    track("initiate_checkout", { ...common, event_id: eventId("ic") });
    if (planKey === "deposit") track("deposit_started", { ...common, event_id: eventId("dep"), step: "checkout_opened" });
  }, [planId, planKey, offer.price]);

  let body: React.ReactNode;
  if (configError) body = <Notice tone="error">Checkout is unavailable: {configError}</Notice>;
  else if (!config) body = <div className="skeleton" aria-busy="true">Loading secure checkout…</div>;
  else if (!planId || !config.accountId)
    body = (
      <Notice tone="error">
        This plan isn't connected yet. Set <code>{planEnvName(planKey)}</code> (and the account id) as Whop app secrets.
      </Notice>
    );
  else
    body = (
      <WhopElements elements={getLoader()} environment={config.environment}>
        {planKey === "deposit" ? (
          <DepositCheckout accountId={config.accountId} planId={planId} />
        ) : (
          <PlanCheckout planKey={planKey} planId={planId} />
        )}
      </WhopElements>
    );

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__panel">
        <button className="modal__close" onClick={onClose} aria-label="Close checkout">
          <Icon name="close" />
        </button>
        <div className="modal__summary">
          <span className="eyebrow">{site.company.name}</span>
          <h2 id="checkout-title">{offer.name}</h2>
          <div className="price__amount">
            ${offer.price.toLocaleString("en-US")}
            <span>{offer.priceNote}</span>
          </div>
          <ul className="checklist checklist--sm">
            {offer.includes.map((i) => (
              <li key={i}>
                <Icon name="check" width={16} height={16} /> {i}
              </li>
            ))}
          </ul>
          {config?.environment === "sandbox" && <span className="pill">Sandbox · test card 4242 4242 4242 4242</span>}
        </div>
        <div className="modal__pay">{body}</div>
      </div>
    </div>
  );
}

function planEnvName(k: PlanKey) {
  return k === "inspection" ? "PLAN_INSPECTION_ID" : k === "deposit" ? "PLAN_DEPOSIT_ID" : "PLAN_FLAT_RATE_ID";
}

function Notice({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return <div className={`notice notice--${tone}`}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Inspection fee + flat-rate service: CheckoutElement + Express        */
/* ------------------------------------------------------------------ */

function PlanCheckout({ planKey, planId }: { planKey: PlanKey; planId: string }) {
  const [paid, setPaid] = useState<string | null>(null);
  const [expressAvailable, setExpressAvailable] = useState(true);
  const returnUrl = `${location.origin}/?checkout_return=${planKey}`;
  const metadata = { source: "website", offer: planKey };

  const onComplete = (p: { result: string; paymentId?: string; sessionId: string }) => {
    if (p.result === "payment") setPaid(p.paymentId ?? p.sessionId);
  };

  if (paid) {
    return (
      <div className="pay-success" role="status">
        <div className="success-icon"><Icon name="check" width={32} height={32} /></div>
        <h3>Payment received. You're booked!</h3>
        <p>
          {planKey === "inspection"
            ? "Our scheduler will text you within the hour to confirm your inspection window."
            : "We'll call to schedule your install date. Most installs happen within 7 days."}
        </p>
        <p className="muted small">Reference: {paid}</p>
      </div>
    );
  }

  return (
    <div className="checkout-stack">
      {expressAvailable && (
        <>
          <Checkout plan={planId} returnUrl={returnUrl} metadata={metadata} onComplete={onComplete}>
            <ExpressCheckoutElement wallets={{ applePay: "auto", googlePay: "auto", payPal: "auto" }} onError={() => setExpressAvailable(false)} />
          </Checkout>
          <div className="divider"><span>or pay with card, bank or financing</span></div>
        </>
      )}
      <Checkout plan={planId} returnUrl={returnUrl} metadata={metadata} onComplete={onComplete}>
        <CheckoutElement />
      </Checkout>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Deposit: PaymentElement (setup mode) + BrandingElement               */
/*   → setup intent saves the card → deposit invoice charges it         */
/* ------------------------------------------------------------------ */

interface DepositResult {
  ok: boolean;
  jobRef: string;
  setupIntentId: string;
  paymentMethodId?: string;
  memberId?: string;
  depositInvoice?: { id: string; status: string; total?: number; number?: string | null };
  status?: string;
  clientSecret?: string | null;
  error?: string;
}

function DepositCheckout({ accountId, planId }: { accountId: string; planId: string }) {
  return (
    <Payments accountId={accountId} mode="setup" currency="usd" setupFutureUsage="off_session">
      <DepositForm planId={planId} />
    </Payments>
  );
}

function DepositForm({ planId }: { planId: string }) {
  const payments = usePayments();
  const whop = useWhop();
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DepositResult | null>(null);

  // Returning from 3D Secure: finish the deposit with the stored setup intent.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!params.get("deposit_return") || !raw) return;
    const pending = JSON.parse(raw) as { setupIntentId: string; jobRef: string; name: string };
    setBusy(true);
    finish(pending).finally(() => {
      setBusy(false);
      history.replaceState(null, "", location.pathname);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finish(p: { setupIntentId: string; jobRef: string; name: string }) {
    try {
      const r = await api<DepositResult>("/api/deposit/complete", { method: "POST", json: p });
      if (r.ok) {
        sessionStorage.removeItem(PENDING_KEY);
        setResult(r);
      } else setError(r.error || `Card verification ${r.status}. Please try again.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!payments) return;
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setError(null);
    setBusy(true);
    const jobRef = `JOB-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    track("deposit_started", { event_id: eventId("dep"), variant_id: planId, value: depositPrice, currency: "USD", step: "pay_pressed", job_ref: jobRef });
    try {
      const { confirmationToken } = await payments.createConfirmationToken({
        billingDetails: {
          email: f.email,
          name: f.name,
          phone: f.phone || undefined,
          address: { line1: f.line1, city: f.city, state: f.state, postal_code: f.zip, country: "US" },
        },
      });
      const r = await api<DepositResult>("/api/deposit", {
        method: "POST",
        json: { confirmationToken, email: f.email, name: f.name, jobRef, returnUrl: `${location.origin}/?deposit_return=1` },
      });
      if (r.ok) return setResult(r);

      if (r.status === "requires_action" && r.clientSecret && whop) {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({ setupIntentId: r.setupIntentId, jobRef: r.jobRef, name: f.name }));
        const next = await whop.payments.handleNextAction({ clientSecret: r.clientSecret, returnUrl: `${location.origin}/?deposit_return=1` });
        if (next.redirected) return; // page is navigating to the off-site step
        if (next.status === "succeeded" || next.status === "processing") {
          await finish({ setupIntentId: r.setupIntentId, jobRef: r.jobRef, name: f.name });
        } else setError(next.lastPaymentError?.message || "Card verification was not completed.");
        return;
      }
      setError(r.error || `Card could not be saved (${r.status}).`);
    } catch (err) {
      const msg = (err as Error).message || "";
      if (!/payment_request_cancelled/i.test(msg)) setError(msg || "Payment failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const crewLink = `/crew?member=${encodeURIComponent(result.memberId ?? "")}&pm=${encodeURIComponent(result.paymentMethodId ?? "")}&job=${encodeURIComponent(result.jobRef)}`;
    return (
      <div className="pay-success" role="status">
        <div className="success-icon"><Icon name="check" width={32} height={32} /></div>
        <h3>Deposit received. Your date is reserved!</h3>
        <p>Your card is securely saved on Whop. When the job is complete we'll bill the final balance to it, and you'll get an itemized invoice by email.</p>
        <dl className="kv">
          <dt>Job</dt><dd>{result.jobRef}</dd>
          <dt>Deposit invoice</dt><dd>{result.depositInvoice?.number || result.depositInvoice?.id} · {result.depositInvoice?.status}</dd>
          <dt>Card on file</dt><dd>{result.paymentMethodId}</dd>
        </dl>
        <a className="link-btn small" href={crewLink}>Crew view: bill the final balance <Icon name="arrow" width={14} height={14} /></a>
      </div>
    );
  }

  return (
    <form className="form deposit" onSubmit={submit}>
      <div className="form__row">
        <label><span>Full name *</span><input name="name" required autoComplete="name" /></label>
        <label><span>Email *</span><input name="email" type="email" required autoComplete="email" /></label>
      </div>
      <label><span>Phone</span><input name="phone" type="tel" autoComplete="tel" /></label>
      <label><span>Billing address *</span><input name="line1" required autoComplete="address-line1" placeholder="Street address" /></label>
      <div className="form__row form__row--3">
        <label><span>City *</span><input name="city" required autoComplete="address-level2" /></label>
        <label><span>State *</span><input name="state" required maxLength={2} autoComplete="address-level1" placeholder="TX" /></label>
        <label><span>ZIP *</span><input name="zip" required inputMode="numeric" maxLength={5} autoComplete="postal-code" /></label>
      </div>

      <div className="elements-box">
        <PaymentElement
          layout="accordion"
          fields={{ billingDetails: "never" }}
          onChange={(ev) => setComplete(Boolean(ev.complete))}
          fallback={<div className="skeleton">Loading payment methods…</div>}
        />
        <BrandingElement />
      </div>

      {error && <p className="form__error" role="alert">{error}</p>}
      <button className="btn btn--primary btn--block btn--lg" disabled={!payments || !complete || busy}>
        {busy ? "Processing…" : `Save card & pay $${depositPrice.toLocaleString("en-US")} deposit`}
      </button>
      <p className="fineprint">
        <Icon name="shield" width={14} height={14} /> Your card is saved by Whop and used only for this project's final balance, billed when the job is complete.
      </p>
    </form>
  );
}
