import { useEffect, useState } from "react";
import { onTrack, type TrackedEvent } from "../lib/track";

/**
 * Floating log of whop.track calls, shown only with ?debug=1 (sticky for the
 * session). Lets a reviewer watch estimate_requested / service_viewed /
 * deposit_started fire live, next to DevTools → Network → t.whop.tw.
 */
export function PixelDebug() {
  const [enabled] = useState(() => {
    try {
      if (new URLSearchParams(location.search).get("debug") === "1") sessionStorage.setItem("pixelDebug", "1");
      return sessionStorage.getItem("pixelDebug") === "1";
    } catch {
      return false;
    }
  });
  const [events, setEvents] = useState<TrackedEvent[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => (enabled ? onTrack(setEvents) : undefined), [enabled]);
  if (!enabled) return null;

  return (
    <aside className={`pixel ${open ? "" : "pixel--min"}`} aria-label="Pixel event log">
      <button className="pixel__head" onClick={() => setOpen((o) => !o)}>
        <span className="pixel__dot" /> whop.track · {events.length} events {open ? "▾" : "▸"}
      </button>
      {open && (
        <ol className="pixel__list">
          {events.length === 0 && <li className="muted">Scroll the services or submit a form…</li>}
          {events.map((e, i) => (
            <li key={i}>
              <code className={e.name.includes("_") && !["initiate_checkout", "view_content"].includes(e.name) ? "custom" : ""}>{e.name}</code>
              <span className="muted">{e.at}{e.delivered ? "" : " · local"}</span>
              {e.params && <pre>{JSON.stringify(e.params, null, 0)}</pre>}
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
