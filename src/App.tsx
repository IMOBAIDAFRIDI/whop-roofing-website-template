import { useEffect, useState, type CSSProperties } from "react";
import { site, type PlanKey } from "./site.config";
import { loadConfig, type RuntimeConfig } from "./lib/api";
import { Header, Hero, TrustBar, Services, Pricing, Financing, ServiceArea, Reviews, Footer } from "./components/Sections";
import { EstimateForm } from "./components/EstimateForm";
import { CheckoutModal } from "./components/CheckoutModal";
import { PixelDebug } from "./components/PixelDebug";
import { CrewDashboard } from "./pages/CrewDashboard";

const themeVars = {
  "--brand": site.theme.primary,
  "--brand-dark": site.theme.primaryDark,
  "--ink": site.theme.ink,
  "--accent": site.theme.accent,
} as CSSProperties;

export default function App() {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<PlanKey | null>(null);

  useEffect(() => {
    loadConfig().then(setConfig, (e) => setConfigError(e.message));
    // Re-open the deposit flow when returning from an off-site step (3D Secure).
    if (new URLSearchParams(location.search).get("deposit_return")) setCheckout("deposit");
  }, []);

  const isCrew = location.pathname.replace(/\/$/, "") === "/crew";

  return (
    <div style={themeVars} className="app">
      {isCrew ? (
        <CrewDashboard />
      ) : (
        <>
          <Header onEstimate={() => scrollToId("estimate")} />
          <main>
            <Hero onBook={() => setCheckout("inspection")} />
            <TrustBar />
            <Services onBook={setCheckout} />
            <Pricing onSelect={setCheckout} />
            <Financing onStart={() => setCheckout("deposit")} />
            <ServiceArea />
            <Reviews />
            <EstimateForm />
          </main>
          <Footer />
          {checkout && (
            <CheckoutModal planKey={checkout} config={config} configError={configError} onClose={() => setCheckout(null)} />
          )}
        </>
      )}
      <PixelDebug />
    </div>
  );
}

export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
