import { useEffect, useState, type FormEvent } from "react";
import { site } from "../site.config";
import { api } from "../lib/api";
import { Icon, Logo } from "../components/Icons";

interface Method { id: string; type: string; brand?: string; last4?: string; exp?: string }
interface Inv { id: string; number?: string | null; status: string; total?: number; amountDue?: number; checkoutLink?: string | null; scheduledChargeAt?: string | null }

/**
 * /crew: internal page for the office / project manager.
 * Bills the final balance of a finished job with the Whop Invoices API:
 *   • Auto-charge the card saved at deposit time (off-session), or
 *   • Send the invoice by email for manual payment through a Whop checkout link.
 * Protected by the ADMIN_KEY app secret (sent as x-admin-key).
 */
export function CrewDashboard() {
  const q = new URLSearchParams(location.search);
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem("crewKey") ?? "");
  const [memberId, setMemberId] = useState(q.get("member") ?? "");
  const [pm, setPm] = useState(q.get("pm") ?? "");
  const [jobRef, setJobRef] = useState(q.get("job") ?? "");
  const [methods, setMethods] = useState<Method[] | null>(null);
  const [invoices, setInvoices] = useState<Inv[]>([]);
  const [collection, setCollection] = useState<"auto" | "manual">("auto");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string; inv?: Inv } | null>(null);

  useEffect(() => {
    if (adminKey) sessionStorage.setItem("crewKey", adminKey);
  }, [adminKey]);

  async function refreshInvoices() {
    if (!adminKey) return;
    try {
      const r = await api<{ data: Inv[] }>("/api/admin/invoices", { adminKey });
      setInvoices(r.data);
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    }
  }
  useEffect(() => {
    refreshInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookupMethods() {
    setMsg(null);
    try {
      const r = await api<{ data: Method[] }>(`/api/admin/payment-methods?member_id=${encodeURIComponent(memberId)}`, { adminKey });
      setMethods(r.data);
      if (!pm && r.data[0]) setPm(r.data[0].id);
    } catch (e) {
      setMsg({ tone: "error", text: (e as Error).message });
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ invoice: Inv }>("/api/admin/final-invoice", {
        method: "POST",
        adminKey,
        json: {
          memberId,
          paymentMethodId: pm,
          jobRef,
          collection,
          amount: f.amount,
          description: f.description,
          customerName: f.customerName,
          dueInDays: f.dueInDays,
        },
      });
      setMsg({
        tone: "ok",
        text:
          collection === "auto"
            ? `Invoice issued and charged to the saved card (status: ${r.invoice.status}).`
            : `Invoice emailed to the customer (status: ${r.invoice.status}).`,
        inv: r.invoice,
      });
      refreshInvoices();
    } catch (err) {
      setMsg({ tone: "error", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="crew">
      <header className="crew__bar">
        <a href="/" className="brand brand--light">
          <span className="brand__mark"><Logo width={20} height={20} /></span>
          <span className="brand__name">{site.company.shortName} · Crew</span>
        </a>
        <label className="crew__key">
          <span>Admin key</span>
          <input type="password" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} placeholder="ADMIN_KEY" />
        </label>
      </header>

      <main className="container crew__main">
        <section className="card">
          <h1>Bill the final balance</h1>
          <p className="muted">
            Deposit → job → final invoice. Pick the customer's saved card to auto-charge, or email them a Whop invoice to pay manually.
          </p>
          <form className="form" onSubmit={submit}>
            <div className="form__row">
              <label><span>Job reference</span><input value={jobRef} onChange={(e) => setJobRef(e.target.value)} placeholder="JOB-AB12CD" required /></label>
              <label><span>Customer name</span><input name="customerName" placeholder="Jordan Smith" /></label>
            </div>
            <label>
              <span>Whop member ID</span>
              <div className="inline">
                <input value={memberId} onChange={(e) => setMemberId(e.target.value)} placeholder="mber_…" required />
                <button type="button" className="btn btn--dark btn--sm" onClick={lookupMethods} disabled={!memberId || !adminKey}>
                  Find saved cards
                </button>
              </div>
            </label>
            {methods && (
              <div className="methods">
                {methods.length === 0 && <p className="muted">No saved payment methods for this member.</p>}
                {methods.map((m) => (
                  <label key={m.id} className={`method ${pm === m.id ? "method--on" : ""}`}>
                    <input type="radio" name="pm" checked={pm === m.id} onChange={() => setPm(m.id)} />
                    <Icon name="card" width={18} height={18} />
                    <span>{m.brand ? `${m.brand.toUpperCase()} •••• ${m.last4}` : m.type}</span>
                    <span className="muted small">{m.exp} · {m.id}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="form__row">
              <label><span>Final balance (USD)</span><input name="amount" type="number" min="1" step="0.01" placeholder="11900.00" required /></label>
              <label><span>Line item (max 30 chars)</span><input name="description" maxLength={30} defaultValue="Roof replacement balance" /></label>
            </div>

            <fieldset className="seg">
              <legend>Collection</legend>
              <label className={collection === "auto" ? "on" : ""}>
                <input type="radio" checked={collection === "auto"} onChange={() => setCollection("auto")} />
                Auto-charge saved card
              </label>
              <label className={collection === "manual" ? "on" : ""}>
                <input type="radio" checked={collection === "manual"} onChange={() => setCollection("manual")} />
                Send for manual payment
              </label>
            </fieldset>

            {collection === "auto" ? (
              <label><span>Saved payment method</span><input value={pm} onChange={(e) => setPm(e.target.value)} placeholder="payt_…" required /></label>
            ) : (
              <label><span>Due in (days)</span><input name="dueInDays" type="number" min={1} max={60} defaultValue={7} /></label>
            )}

            {msg && (
              <div className={`notice notice--${msg.tone}`}>
                {msg.text}
                {msg.inv?.checkoutLink && (
                  <> <a href={msg.inv.checkoutLink} target="_blank" rel="noreferrer">Open invoice checkout ↗</a></>
                )}
                {msg.inv && <div className="small muted">Invoice {msg.inv.number || msg.inv.id}</div>}
              </div>
            )}
            <button className="btn btn--primary btn--lg" disabled={busy || !adminKey}>
              {busy ? "Working…" : collection === "auto" ? "Create invoice & charge card" : "Create & email invoice"}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="crew__listhead">
            <h2>Recent invoices</h2>
            <button className="link-btn" onClick={refreshInvoices} disabled={!adminKey}>Refresh</button>
          </div>
          <table className="table">
            <thead><tr><th>Invoice</th><th>Status</th><th>Total</th><th /></tr></thead>
            <tbody>
              {invoices.length === 0 && <tr><td colSpan={4} className="muted">No invoices yet{adminKey ? "" : ". Enter the admin key"}.</td></tr>}
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td>{i.number || i.id}</td>
                  <td><span className={`status status--${i.status}`}>{i.status}</span></td>
                  <td>{typeof i.total === "number" ? `$${i.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "-"}</td>
                  <td>{i.checkoutLink && <a href={i.checkoutLink} target="_blank" rel="noreferrer">Pay link ↗</a>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
