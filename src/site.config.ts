/**
 * ─────────────────────────────────────────────────────────────────────────
 *  TEMPLATE CONFIG — this is the only file you edit to rebrand the site.
 *  Company name, colors, services, service area, pricing copy, reviews and
 *  financing all live here. Whop plan IDs are NOT here: they're runtime
 *  secrets (PLAN_INSPECTION_ID, PLAN_DEPOSIT_ID, PLAN_FLAT_RATE_ID) so the
 *  same build can be pointed at any Whop business.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type PlanKey = "inspection" | "deposit" | "flatRate";

export interface Service {
  id: string;
  name: string;
  tagline: string;
  description: string;
  bullets: string[];
  icon: "repair" | "replace" | "inspect" | "gutter" | "storm";
  startingAt?: string;
}

export interface Offer {
  key: PlanKey;
  name: string;
  price: number;
  priceNote: string;
  description: string;
  includes: string[];
  cta: string;
  highlight?: boolean;
}

export const site = {
  company: {
    name: "Summit Peak Roofing",
    shortName: "Summit Peak",
    tagline: "Roofs built for the next 30 years.",
    phone: "(512) 555-0142",
    email: "office@summitpeakroofing.com",
    address: "2400 Ridgeview Dr, Austin, TX 78704",
    license: "TX Lic. #RC-448120 · Fully insured · GAF Certified",
    founded: 2009,
    hours: "Mon–Sat 7am–7pm · 24/7 storm emergency line",
  },

  theme: {
    // Brand colors drive the whole site via CSS variables.
    primary: "#c2410c", // burnt orange
    primaryDark: "#9a3412",
    ink: "#0f172a",
    accent: "#facc15",
  },

  hero: {
    eyebrow: "Austin's 5-star residential roofer",
    headline: "Leaks fixed fast. Roofs replaced right.",
    sub: "Licensed crews, manufacturer-backed warranties, and transparent pricing. Book a $149 inspection online, or secure your project date with a deposit. Financing available at checkout.",
    stats: [
      { value: "3,800+", label: "roofs completed" },
      { value: "4.9★", label: "from 640 reviews" },
      { value: "50-yr", label: "GAF warranty" },
    ],
  },

  services: [
    {
      id: "roof-repair",
      name: "Roof Repair",
      tagline: "Leaks, missing shingles, flashing",
      description:
        "Targeted repairs that stop leaks at the source: shingles, flashing, vents, skylights and valleys. Most repairs are done the same day.",
      bullets: ["Same-week scheduling", "Photo report of every fix", "2-year workmanship warranty"],
      icon: "repair",
      startingAt: "$350",
    },
    {
      id: "roof-replacement",
      name: "Roof Replacement",
      tagline: "Full tear-off & new system",
      description:
        "Complete tear-off and replacement with architectural shingles, metal, or tile. Includes decking inspection, ice & water shield, and full cleanup.",
      bullets: ["GAF & Owens Corning systems", "Up to 50-year warranty", "Magnetic nail sweep cleanup"],
      icon: "replace",
      startingAt: "$9,800",
    },
    {
      id: "roof-inspection",
      name: "Roof Inspection",
      tagline: "Certified 21-point inspection",
      description:
        "A certified inspector checks 21 points from decking to drip edge, with drone photos and a written report you can use for insurance or a home sale.",
      bullets: ["Drone + attic inspection", "Written report in 24h", "Fee credited toward any job"],
      icon: "inspect",
      startingAt: "$149",
    },
    {
      id: "storm-damage",
      name: "Storm & Hail Damage",
      tagline: "Insurance claim support",
      description:
        "Emergency tarping within 24 hours and full documentation for your insurance adjuster. We work directly with all major carriers.",
      bullets: ["24/7 emergency tarping", "Adjuster meeting included", "Claim paperwork handled"],
      icon: "storm",
    },
    {
      id: "gutters",
      name: "Gutter Replacement",
      tagline: "Flat-rate seamless gutters",
      description:
        "Seamless 6\" aluminum gutters and downspouts with hidden hangers, installed in one day at a flat rate for single-story homes.",
      bullets: ["One-day install", "25 color options", "Flat rate, no surprises"],
      icon: "gutter",
      startingAt: "$1,450",
    },
  ] satisfies Service[],

  offers: [
    {
      key: "inspection",
      name: "Roof Inspection",
      price: 149,
      priceNote: "one-time",
      description: "Certified 21-point inspection with drone photos and a written report.",
      includes: ["Drone & attic inspection", "Written report within 24h", "$149 credited toward any job"],
      cta: "Book inspection",
    },
    {
      key: "deposit",
      name: "Project Deposit",
      price: 500,
      priceNote: "applied to your project",
      description:
        "Lock in your install date. Your card is saved securely on Whop and the final balance is billed when the job is complete.",
      includes: ["Reserves your crew & date", "Card on file for final balance", "Fully credited to your invoice"],
      cta: "Pay deposit",
      highlight: true,
    },
    {
      key: "flatRate",
      name: "Gutter Replacement",
      price: 1450,
      priceNote: "flat rate · single-story",
      description: "Seamless aluminum gutters and downspouts, installed in one day.",
      includes: ["Up to 150 linear ft", "Hidden hangers + downspouts", "Old gutter haul-away"],
      cta: "Buy flat-rate service",
    },
  ] satisfies Offer[],

  serviceArea: {
    headline: "Proudly serving Central Texas",
    sub: "Free estimates within 40 miles of downtown Austin. Storm response across the region.",
    cities: [
      "Austin",
      "Round Rock",
      "Cedar Park",
      "Georgetown",
      "Pflugerville",
      "Leander",
      "Lakeway",
      "Bee Cave",
      "Kyle",
      "Buda",
      "Dripping Springs",
      "Hutto",
    ],
    zipPrefixes: ["786", "787"],
  },

  financing: {
    headline: "Pay over time. Pick the plan that fits.",
    sub: "Checkout runs on Whop, so eligible buy-now-pay-later options like Klarna, Afterpay and Splitit appear automatically at payment. No separate application, no paperwork.",
    points: ["As low as 0% APR for qualified buyers", "Split your deposit or flat-rate service", "Decision in seconds at checkout"],
  },

  reviews: [
    {
      name: "Maria G.",
      city: "Round Rock",
      rating: 5,
      text: "Hail tore up our roof. They tarped it the same night, met our adjuster, and had a new roof on in nine days. Spotless cleanup.",
    },
    {
      name: "James T.",
      city: "Austin",
      rating: 5,
      text: "Booked the inspection online and got a detailed drone report the next day. No pressure, honest recommendations.",
    },
    {
      name: "Priya S.",
      city: "Cedar Park",
      rating: 5,
      text: "Paid the deposit online, crew showed up on the exact date, and the final invoice charged my saved card. Easiest contractor ever.",
    },
  ],

  trust: ["GAF Master Elite®", "BBB A+ Rated", "Owens Corning Preferred", "Licensed & Insured"],

  estimateForm: {
    services: ["Roof repair", "Roof replacement", "Inspection", "Storm / hail damage", "Gutters", "Not sure yet"],
    roofTypes: ["Asphalt shingle", "Metal", "Tile", "Flat / TPO", "Don't know"],
    urgency: ["Emergency (active leak)", "Within 2 weeks", "Within 1–3 months", "Just planning"],
  },
};

export type Site = typeof site;
