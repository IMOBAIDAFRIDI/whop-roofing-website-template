import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const Logo = (p: P) => (
  <svg {...base} {...p} viewBox="0 0 32 32" strokeWidth={3}>
    <path d="M4 18 16 7l12 11" />
    <path d="M9 16v10h14V16" strokeWidth={2.5} />
  </svg>
);

const icons = {
  repair: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" /></>,
  replace: <><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
  inspect: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.3-4.3" /><path d="M8.5 11h5M11 8.5v5" /></>,
  gutter: <><path d="M3 6h18v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" /><path d="M17 12v8" /><path d="M15 20h4" /></>,
  storm: <><path d="M17.5 17A4.5 4.5 0 0 0 17 8a6 6 0 0 0-11.6 1.6A4 4 0 0 0 6 17" /><path d="m13 12-3 5h4l-3 5" /></>,
  check: <path d="m5 12 5 5L20 7" />,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor" stroke="none" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
} as const;

export type IconName = keyof typeof icons;

export function Icon({ name, ...p }: P & { name: IconName }) {
  return (
    <svg {...base} {...p} aria-hidden="true">
      {icons[name]}
    </svg>
  );
}
