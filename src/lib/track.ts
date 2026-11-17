/**
 * Thin, safe wrapper around the Whop pixel (`window.whop`), which Whop
 * auto-installs on every page of a whop.site / whop.app website.
 *
 * Custom events fired by this template:
 *   - service_viewed     a service card scrolls into view or is opened
 *   - estimate_requested the estimate form is submitted successfully
 *   - deposit_started    the visitor opens the deposit checkout / presses pay
 * plus standard events: view_content, initiate_checkout, lead.
 *
 * Every call is also mirrored into an in-page log (see <PixelDebug/>, toggled
 * with ?debug=1) so events are easy to verify in a screen recording.
 */

type Params = Record<string, unknown>;

declare global {
  interface Window {
    whop?: {
      track: (event: string, params?: Params) => void;
      setScope?: (...ids: string[]) => void;
    };
  }
}

export interface TrackedEvent {
  name: string;
  params?: Params;
  at: string;
  delivered: boolean;
}

const log: TrackedEvent[] = [];
const listeners = new Set<(events: TrackedEvent[]) => void>();

export function track(name: string, params?: Params) {
  let delivered = false;
  try {
    if (typeof window !== "undefined" && window.whop?.track) {
      window.whop.track(name, params);
      delivered = true;
    }
  } catch (err) {
    console.warn("[whop.track] failed", err);
  }
  const entry = { name, params, at: new Date().toLocaleTimeString(), delivered };
  log.unshift(entry);
  if (log.length > 50) log.pop();
  console.info(`[whop.track] ${name}`, params ?? {}, delivered ? "" : "(pixel not loaded: dev/local)");
  listeners.forEach((fn) => fn([...log]));
}

export function onTrack(fn: (events: TrackedEvent[]) => void) {
  listeners.add(fn);
  fn([...log]);
  return () => {
    listeners.delete(fn);
  };
}

/** Unique, per-action id so Whop dedupes the same conversion across browser + server. */
export function eventId(prefix: string) {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${rnd}`;
}
