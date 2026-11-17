import { useEffect, useRef, useState } from "react";
import { site, type PlanKey, type Service } from "../site.config";
import { track } from "../lib/track";
import { Icon, Logo } from "./Icons";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

/* ------------------------------- header ------------------------------- */

export function Header({ onEstimate }: { onEstimate: () => void }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["Services", "#services"],
    ["Pricing", "#pricing"],
    ["Financing", "#financing"],
    ["Service area", "#area"],
    ["Reviews", "#reviews"],
  ];
  return (
    <header className="header">
      <div className="container header__inner">
        <a href="/" className="brand" aria-label={site.company.name}>
          <span className="brand__mark">
            <Logo width={22} height={22} />
          </span>
          <span className="brand__name">{site.company.name}</span>
        </a>
        <nav className={`nav ${open ? "nav--open" : ""}`} aria-label="Main">
          {links.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
        </nav>
        <div className="header__cta">
          <a className="header__phone" href={`tel:${site.company.phone.replace(/\D/g, "")}`}>
            <Icon name="phone" width={18} height={18} /> {site.company.phone}
          </a>
          <button className="btn btn--primary btn--sm" onClick={onEstimate}>
            Free estimate
          </button>
          <button className="nav-toggle" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------- hero -------------------------------- */

export function Hero({ onBook }: { onBook: () => void }) {
  return (
    <section className="hero">
      <div className="hero__bg" aria-hidden="true" />
      <div className="container hero__inner">
        <div className="hero__copy">
          <span className="eyebrow eyebrow--light">{site.hero.eyebrow}</span>
          <h1>{site.hero.headline}</h1>
          <p className="hero__sub">{site.hero.sub}</p>
          <div className="hero__actions">
            <button className="btn btn--primary btn--lg" onClick={onBook}>
              Book a $149 inspection <Icon name="arrow" width={18} height={18} />
            </button>
            <a className="btn btn--ghost btn--lg" href="#estimate">
              Request a free estimate
            </a>
          </div>
          <ul className="hero__stats">
            {site.hero.stats.map((s) => (
              <li key={s.label}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <aside className="hero__card" aria-label="Why homeowners choose us">
          <h2>Why {site.company.shortName}?</h2>
          <ul className="checklist">
            <li><Icon name="shield" /> {site.company.license}</li>
            <li><Icon name="clock" /> {site.company.hours}</li>
            <li><Icon name="card" /> Secure checkout on Whop with financing options</li>
            <li><Icon name="check" /> Inspection fee credited toward any job</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}

export function TrustBar() {
  return (
    <div className="trustbar">
      <div className="container trustbar__inner">
        {site.trust.map((t) => (
          <span key={t}>
            <Icon name="shield" width={18} height={18} /> {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ services ------------------------------ */

const serviceToPlan: Record<string, PlanKey | undefined> = {
  "roof-inspection": "inspection",
  "roof-replacement": "deposit",
  "roof-repair": "deposit",
  gutters: "flatRate",
};

function ServiceCard({ s, onBook }: { s: Service; onBook: (k: PlanKey) => void }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  // service_viewed: fire once when at least 60% of the card is on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !seen.current) {
          seen.current = true;
          track("service_viewed", { service_id: s.id, service_name: s.name, trigger: "scroll" });
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [s.id, s.name]);

  const plan = serviceToPlan[s.id];
  return (
    <article ref={ref} className="service" id={`service-${s.id}`}>
      <div className="service__icon">
        <Icon name={s.icon} width={28} height={28} />
      </div>
      <h3>{s.name}</h3>
      <p className="service__tag">{s.tagline}</p>
      <p>{s.description}</p>
      <ul className="checklist checklist--sm">
        {s.bullets.map((b) => (
          <li key={b}>
            <Icon name="check" width={16} height={16} /> {b}
          </li>
        ))}
      </ul>
      <div className="service__foot">
        {s.startingAt && (
          <span className="service__price">
            from <strong>{s.startingAt}</strong>
          </span>
        )}
        <button
          className="link-btn"
          onClick={() => {
            track("service_viewed", { service_id: s.id, service_name: s.name, trigger: "click" });
            if (plan) onBook(plan);
            else document.getElementById("estimate")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          {plan === "inspection" ? "Book now" : plan === "flatRate" ? "Buy flat rate" : plan ? "Reserve a date" : "Get an estimate"}
          <Icon name="arrow" width={16} height={16} />
        </button>
      </div>
    </article>
  );
}

export function Services({ onBook }: { onBook: (k: PlanKey) => void }) {
  return (
    <section className="section" id="services">
      <div className="container">
        <div className="section__head">
          <span className="eyebrow">Services</span>
          <h2>Everything your roof needs, from one licensed crew</h2>
          <p>Repairs, replacements and inspections for asphalt, metal and tile roofs, plus gutters and storm response.</p>
        </div>
        <div className="grid grid--services">
          {site.services.map((s) => (
            <ServiceCard key={s.id} s={s} onBook={onBook} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- pricing ------------------------------ */

export function Pricing({ onSelect }: { onSelect: (k: PlanKey) => void }) {
  return (
    <section className="section section--tint" id="pricing">
      <div className="container">
        <div className="section__head">
          <span className="eyebrow">Book online</span>
          <h2>Transparent pricing. Pay securely on Whop.</h2>
          <p>Start with an inspection, reserve your project with a deposit, or buy a flat-rate service outright.</p>
        </div>
        <div className="grid grid--pricing">
          {site.offers.map((o) => (
            <article key={o.key} className={`price ${o.highlight ? "price--hl" : ""}`}>
              {o.highlight && <span className="price__badge">Most booked</span>}
              <h3>{o.name}</h3>
              <div className="price__amount">
                {money(o.price)}
                <span>{o.priceNote}</span>
              </div>
              <p>{o.description}</p>
              <ul className="checklist checklist--sm">
                {o.includes.map((i) => (
                  <li key={i}>
                    <Icon name="check" width={16} height={16} /> {i}
                  </li>
                ))}
              </ul>
              <button className={`btn ${o.highlight ? "btn--primary" : "btn--dark"} btn--block`} onClick={() => onSelect(o.key)}>
                {o.cta}
              </button>
            </article>
          ))}
        </div>
        <p className="fineprint">
          <Icon name="shield" width={16} height={16} /> Payments are processed by Whop. Card details never touch our servers.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------ financing ----------------------------- */

export function Financing({ onStart }: { onStart: () => void }) {
  return (
    <section className="section" id="financing">
      <div className="container financing">
        <div>
          <span className="eyebrow">Financing</span>
          <h2>{site.financing.headline}</h2>
          <p>{site.financing.sub}</p>
          <ul className="checklist">
            {site.financing.points.map((p) => (
              <li key={p}>
                <Icon name="check" /> {p}
              </li>
            ))}
          </ul>
          <button className="btn btn--primary" onClick={onStart}>
            Reserve with a deposit
          </button>
        </div>
        <div className="financing__card" aria-hidden="true">
          <div className="financing__row">
            <span>Roof replacement</span>
            <strong>$12,400</strong>
          </div>
          <div className="financing__row financing__row--muted">
            <span>Deposit today</span>
            <strong>$500</strong>
          </div>
          <div className="financing__split">
            <span>or 4 payments of</span>
            <strong>$125</strong>
          </div>
          <div className="financing__logos">
            <span>Klarna</span>
            <span>Afterpay</span>
            <span>Splitit</span>
          </div>
          <small>Options shown at checkout depend on eligibility.</small>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- service area ---------------------------- */

export function ServiceArea() {
  const [zip, setZip] = useState("");
  const valid = /^\d{5}$/.test(zip);
  const inArea = valid && site.serviceArea.zipPrefixes.some((p) => zip.startsWith(p));
  return (
    <section className="section section--dark" id="area">
      <div className="container area">
        <div>
          <span className="eyebrow eyebrow--light">Service area</span>
          <h2>{site.serviceArea.headline}</h2>
          <p>{site.serviceArea.sub}</p>
          <label className="zip">
            <span>Check your ZIP</span>
            <div className="zip__row">
              <input inputMode="numeric" maxLength={5} placeholder="78704" value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))} />
              {valid && (
                <span className={`zip__result ${inArea ? "ok" : "no"}`}>
                  {inArea ? "✓ We serve your area" : "Outside our usual area. Call us anyway!"}
                </span>
              )}
            </div>
          </label>
        </div>
        <ul className="cities">
          {site.serviceArea.cities.map((c) => (
            <li key={c}>
              <Icon name="pin" width={16} height={16} /> {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------- reviews ------------------------------ */

export function Reviews() {
  return (
    <section className="section" id="reviews">
      <div className="container">
        <div className="section__head">
          <span className="eyebrow">Reviews</span>
          <h2>Homeowners trust {site.company.shortName}</h2>
          <p>{site.hero.stats[1]?.value} average rating · BBB A+ · Manufacturer certified</p>
        </div>
        <div className="grid grid--reviews">
          {site.reviews.map((r) => (
            <figure key={r.name} className="review">
              <div className="stars" aria-label={`${r.rating} out of 5 stars`}>
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Icon key={i} name="star" width={18} height={18} />
                ))}
              </div>
              <blockquote>“{r.text}”</blockquote>
              <figcaption>
                <strong>{r.name}</strong> · {r.city}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- footer ------------------------------- */

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div>
          <a href="/" className="brand brand--light">
            <span className="brand__mark">
              <Logo width={22} height={22} />
            </span>
            <span className="brand__name">{site.company.name}</span>
          </a>
          <p>{site.company.tagline}</p>
          <p className="muted">{site.company.license}</p>
        </div>
        <div>
          <h4>Contact</h4>
          <p>
            <a href={`tel:${site.company.phone.replace(/\D/g, "")}`}>{site.company.phone}</a>
            <br />
            <a href={`mailto:${site.company.email}`}>{site.company.email}</a>
            <br />
            {site.company.address}
          </p>
        </div>
        <div>
          <h4>Hours</h4>
          <p>{site.company.hours}</p>
        </div>
      </div>
      <div className="container footer__base">
        © {new Date().getFullYear()} {site.company.name}. Payments secured by Whop.
      </div>
    </footer>
  );
}
