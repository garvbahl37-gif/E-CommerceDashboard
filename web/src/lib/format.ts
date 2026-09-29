const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthLabel(ym: string, long = false) {
  const [y, m] = ym.split("-").map(Number);
  return `${(long ? MONTHS_LONG : MONTHS)[m - 1]} ${y}`;
}

export function monthShort(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `Jan ’${String(y).slice(2)}` : MONTHS[m - 1];
}

export function gbp(v: number, digits = 0) {
  return "£" + v.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function gbpCompact(v: number) {
  const a = Math.abs(v);
  if (a >= 1e6) return `£${(v / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, "")}M`;
  if (a >= 1e3) return `£${(v / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, "")}K`;
  return `£${v.toFixed(0)}`;
}

export function int(v: number) {
  return Math.round(v).toLocaleString("en-GB");
}

export function pct(v: number, digits = 1) {
  return `${v.toFixed(digits)}%`;
}

export function signedPct(v: number, digits = 1) {
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)}%`;
}

export function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/(^|[\s\-/(])([a-z])/g, (_, p, c) => p + c.toUpperCase())
    .replace(/\b(Of|And|With|In|The|For)\b/g, (w) => w.toLowerCase())
    .replace(/^./, (c) => c.toUpperCase());
}
