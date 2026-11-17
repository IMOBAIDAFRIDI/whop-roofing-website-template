import { useState, type FormEvent } from "react";
import { site } from "../site.config";
import { api } from "../lib/api";
import { eventId, track } from "../lib/track";
import { Icon } from "./Icons";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "done"; name: string } | { kind: "error"; message: string };

export function EstimateForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    if ((data.company_website ?? "").length > 0) return; // honeypot
    const id = eventId("est");
    setStatus({ kind: "sending" });
    try {
      // Server creates the Lead on the Whop account (member + note + lead event).
      await api("/api/estimate", {
        method: "POST",
        json: { ...data, eventId: id, pageUrl: location.href },
      });
      // Custom pixel event; same event_id as the server-side lead for dedupe.
      track("estimate_requested", {
        event_id: id,
        service: data.service,
        roof_type: data.roofType,
        urgency: data.urgency,
        postal_code: data.zip,
      });
      form.reset();
      setStatus({ kind: "done", name: data.name?.split(" ")[0] || "there" });
    } catch (err) {
      setStatus({ kind: "error", message: (err as Error).message });
    }
  }

  return (
    <section className="section section--tint" id="estimate">
      <div className="container estimate">
        <div className="estimate__intro">
          <span className="eyebrow">Free estimate</span>
          <h2>Request an estimate</h2>
          <p>Tell us about your roof and a project manager will call you within one business day, usually the same day.</p>
          <ul className="checklist">
            <li><Icon name="check" /> No-pressure, written quote</li>
            <li><Icon name="check" /> Insurance claim guidance</li>
            <li><Icon name="check" /> Financing options available</li>
          </ul>
          <p className="muted">
            Prefer to talk? Call <a href={`tel:${site.company.phone.replace(/\D/g, "")}`}>{site.company.phone}</a>
          </p>
        </div>

        {status.kind === "done" ? (
          <div className="card estimate__done" role="status">
            <div className="success-icon"><Icon name="check" width={32} height={32} /></div>
            <h3>Thanks, {status.name}! Your request is in.</h3>
            <p>We'll reach out within one business day. Need it faster? Book an inspection online and pick your slot right away.</p>
            <button className="btn btn--dark" onClick={() => setStatus({ kind: "idle" })}>Send another request</button>
          </div>
        ) : (
          <form className="card form" onSubmit={submit}>
            <div className="form__row">
              <label>
                <span>Full name *</span>
                <input name="name" required autoComplete="name" placeholder="Jordan Smith" />
              </label>
              <label>
                <span>Phone *</span>
                <input name="phone" required type="tel" autoComplete="tel" placeholder="(512) 555-0100" />
              </label>
            </div>
            <div className="form__row">
              <label>
                <span>Email *</span>
                <input name="email" required type="email" autoComplete="email" placeholder="you@email.com" />
              </label>
              <label>
                <span>ZIP code *</span>
                <input name="zip" required inputMode="numeric" pattern="\d{5}" maxLength={5} autoComplete="postal-code" placeholder="78704" />
              </label>
            </div>
            <label>
              <span>Street address</span>
              <input name="address" autoComplete="street-address" placeholder="123 Main St" />
            </label>
            <div className="form__row form__row--3">
              <label>
                <span>Service</span>
                <select name="service" defaultValue={site.estimateForm.services[0]}>
                  {site.estimateForm.services.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label>
                <span>Roof type</span>
                <select name="roofType" defaultValue={site.estimateForm.roofTypes[0]}>
                  {site.estimateForm.roofTypes.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
              <label>
                <span>Timeline</span>
                <select name="urgency" defaultValue={site.estimateForm.urgency[1]}>
                  {site.estimateForm.urgency.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <label>
              <span>Anything we should know?</span>
              <textarea name="message" rows={3} placeholder="Leak over the kitchen after last week's storm…" />
            </label>
            <input type="text" name="company_website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
            {status.kind === "error" && <p className="form__error" role="alert">{status.message}</p>}
            <button className="btn btn--primary btn--block btn--lg" disabled={status.kind === "sending"}>
              {status.kind === "sending" ? "Sending…" : "Request my free estimate"}
            </button>
            <p className="fineprint">By submitting you agree to be contacted about your project. No spam, ever.</p>
          </form>
        )}
      </div>
    </section>
  );
}
