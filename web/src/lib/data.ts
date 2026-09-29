// Data model + all aggregation logic. Everything is recomputed client-side from
// invoice-level rows so every number on the page agrees with the active filters.

export type RawData = {
  meta: {
    epoch: string;
    firstDate: string;
    lastDate: string;
    lines: number;
    topProducts: number;
    totalProducts: number;
  };
  countries: string[];
  segments: string[];
  clusters: string[];
  months: string[]; // "2009-12" … "2011-12"
  products: string[];
  customers: {
    id: number[];
    segment: number[];
    cluster: number[];
    recency: number[];
    frequency: number[];
    monetary: number[];
    rScore: number[];
    fScore: number[];
  };
  invoices: {
    day: number[];
    hour: number[];
    country: number[];
    customer: number[];
    revenue: number[];
    units: number[];
  };
  productRows: {
    product: number[];
    month: number[];
    country: number[];
    segment: number[];
    revenue: number[];
    units: number[];
  };
};

export type Dataset = RawData & {
  invMonth: Int16Array; // month index per invoice
  invDow: Int8Array; // 0 = Monday … 6 = Sunday
  custFirstMonth: Int16Array; // first purchase month across the full history
  lastMonthPartial: boolean; // data ends before the final month is complete
  lastDay: number; // day index of final date
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Countries grouped for one-click region filters.
const EUROPE = new Set([
  "Austria", "Belgium", "Channel Islands", "Cyprus", "Czech Republic", "Denmark", "EIRE", "Finland",
  "France", "Germany", "Greece", "Iceland", "Italy", "Lithuania", "Malta", "Netherlands", "Norway",
  "Poland", "Portugal", "Spain", "Sweden", "Switzerland", "European Community",
]);
export function isEurope(country: string) {
  return EUROPE.has(country);
}

export function prepare(raw: RawData): Dataset {
  const epoch = new Date(raw.meta.epoch + "T00:00:00Z");
  const e0 = epoch.getUTCFullYear() * 12 + epoch.getUTCMonth();
  const epochDow = (epoch.getUTCDay() + 6) % 7; // Monday-first
  const n = raw.invoices.day.length;
  const invMonth = new Int16Array(n);
  const invDow = new Int8Array(n);
  const custFirstMonth = new Int16Array(raw.customers.id.length).fill(-1);
  for (let i = 0; i < n; i++) {
    const day = raw.invoices.day[i];
    const d = new Date(epoch.getTime() + day * 86400000);
    const m = d.getUTCFullYear() * 12 + d.getUTCMonth() - e0;
    invMonth[i] = m;
    invDow[i] = (epochDow + day) % 7;
    const c = raw.invoices.customer[i];
    if (custFirstMonth[c] === -1 || m < custFirstMonth[c]) custFirstMonth[c] = m;
  }
  const last = new Date(raw.meta.lastDate + "T00:00:00Z");
  const monthEnd = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 0));
  const lastDay = Math.round((last.getTime() - epoch.getTime()) / 86400000);
  return {
    ...raw,
    invMonth,
    invDow,
    custFirstMonth,
    lastMonthPartial: last.getUTCDate() < monthEnd.getUTCDate(),
    lastDay,
  };
}

export type Filters = {
  from: number; // month index, inclusive
  to: number; // month index, inclusive
  countries: Set<number>;
  segments: Set<number>;
};

export function defaultFilters(ds: Dataset): Filters {
  return {
    from: 0,
    to: ds.months.length - 1,
    countries: new Set(ds.countries.map((_, i) => i)),
    segments: new Set(ds.segments.map((_, i) => i)),
  };
}

// ─── URL state ──────────────────────────────────────────────────────────
// ?from=2010-01&to=2010-12&c=0.3.5 (or cx= for "all except") &s=0.1

function encodeSet(all: number, set: Set<number>, key: string, params: URLSearchParams) {
  if (set.size === all) return;
  const inc = [...set].sort((a, b) => a - b);
  const exc = Array.from({ length: all }, (_, i) => i).filter((i) => !set.has(i));
  if (exc.length < inc.length) params.set(key + "x", exc.join("."));
  else params.set(key, inc.join("."));
}

function decodeSet(all: number, params: URLSearchParams, key: string): Set<number> {
  const parse = (v: string) =>
    v
      .split(".")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n < all);
  const inc = params.get(key);
  const exc = params.get(key + "x");
  if (inc) {
    const s = new Set(parse(inc));
    if (s.size) return s;
  }
  if (exc) {
    const ex = new Set(parse(exc));
    const s = new Set(Array.from({ length: all }, (_, i) => i).filter((i) => !ex.has(i)));
    if (s.size) return s;
  }
  return new Set(Array.from({ length: all }, (_, i) => i));
}

export function filtersToQuery(ds: Dataset, f: Filters) {
  const p = new URLSearchParams();
  if (f.from !== 0) p.set("from", ds.months[f.from]);
  if (f.to !== ds.months.length - 1) p.set("to", ds.months[f.to]);
  encodeSet(ds.countries.length, f.countries, "c", p);
  encodeSet(ds.segments.length, f.segments, "s", p);
  const q = p.toString();
  return q ? `?${q}` : "";
}

export function filtersFromQuery(ds: Dataset, search: string): Filters {
  const p = new URLSearchParams(search);
  const def = defaultFilters(ds);
  const from = ds.months.indexOf(p.get("from") ?? "");
  const to = ds.months.indexOf(p.get("to") ?? "");
  const f: Filters = {
    from: from >= 0 ? from : def.from,
    to: to >= 0 ? to : def.to,
    countries: decodeSet(ds.countries.length, p, "c"),
    segments: decodeSet(ds.segments.length, p, "s"),
  };
  if (f.from > f.to) [f.from, f.to] = [f.to, f.from];
  return f;
}

// ─── Facets: what each filter option holds under the *other* filters ───

export function facets(ds: Dataset, f: Filters) {
  const { invoices, customers } = ds;
  const countryRev = new Float64Array(ds.countries.length);
  const segCust = new Float64Array(ds.segments.length);
  const seen = new Uint8Array(customers.id.length);
  const monthRev = new Float64Array(ds.months.length);
  for (let i = 0; i < invoices.day.length; i++) {
    const c = invoices.country[i];
    const cust = invoices.customer[i];
    const seg = customers.segment[cust];
    const cOk = f.countries.has(c);
    const sOk = f.segments.has(seg);
    if (cOk && sOk) monthRev[ds.invMonth[i]] += invoices.revenue[i];
    const m = ds.invMonth[i];
    if (m < f.from || m > f.to) continue;
    if (sOk) countryRev[c] += invoices.revenue[i];
    if (cOk && !seen[cust]) {
      seen[cust] = 1;
      segCust[seg]++;
    }
  }
  return { countryRev, segCust, monthRev };
}

// ─── Main summary ───────────────────────────────────────────────────────

export type Summary = ReturnType<typeof summarise>;

export const ORDER_BINS = [0, 50, 100, 200, 350, 500, 1000, 2000, 5000, Infinity];

export function summarise(ds: Dataset, f: Filters) {
  const { invoices, customers } = ds;
  const nM = ds.months.length;
  const nC = ds.countries.length;
  const nS = ds.segments.length;

  const monthRev = new Float64Array(nM);
  const monthOrders = new Float64Array(nM);
  const monthNewRev = new Float64Array(nM);
  const monthCust = new Float64Array(nM);
  const monthNewCust = new Float64Array(nM);
  const countryRev = new Float64Array(nC);
  const countryOrders = new Float64Array(nC);
  const countryCustSeen = new Map<number, Set<number>>();
  const segRev = new Float64Array(nS);
  const segCust = new Float64Array(nS);
  const heat = Array.from({ length: 7 }, () => new Float64Array(24));
  const binOrders = new Float64Array(ORDER_BINS.length - 1);
  const binRev = new Float64Array(ORDER_BINS.length - 1);
  const ordersPerCust = new Map<number, number>();
  const revPerCust = new Map<number, number>();
  // customer -> bitmask of active months (25 months fits in 32 bits)
  const activeMonths = new Map<number, number>();

  let revenue = 0;
  let orders = 0;
  let units = 0;

  for (let i = 0; i < invoices.day.length; i++) {
    const m = ds.invMonth[i];
    if (m < f.from || m > f.to) continue;
    const c = invoices.country[i];
    if (!f.countries.has(c)) continue;
    const cust = invoices.customer[i];
    const seg = customers.segment[cust];
    if (!f.segments.has(seg)) continue;

    const r = invoices.revenue[i];
    revenue += r;
    orders += 1;
    units += invoices.units[i];
    monthRev[m] += r;
    monthOrders[m] += 1;
    if (ds.custFirstMonth[cust] === m) monthNewRev[m] += r;
    countryRev[c] += r;
    countryOrders[c] += 1;
    let cs = countryCustSeen.get(c);
    if (!cs) countryCustSeen.set(c, (cs = new Set()));
    cs.add(cust);
    segRev[seg] += r;
    heat[ds.invDow[i]][invoices.hour[i]] += r;
    let b = 0;
    while (r >= ORDER_BINS[b + 1]) b++;
    binOrders[b]++;
    binRev[b] += r;
    ordersPerCust.set(cust, (ordersPerCust.get(cust) ?? 0) + 1);
    revPerCust.set(cust, (revPerCust.get(cust) ?? 0) + r);
    activeMonths.set(cust, (activeMonths.get(cust) ?? 0) | (1 << m));
  }

  const customerCount = ordersPerCust.size;
  let repeaters = 0;
  let newCustomers = 0;
  const rfmCount = Array.from({ length: 5 }, () => new Float64Array(5));
  const rfmSpend = Array.from({ length: 5 }, () => new Float64Array(5));
  for (const [cust, k] of ordersPerCust) {
    if (k > 1) repeaters++;
    segCust[customers.segment[cust]]++;
    const mask = activeMonths.get(cust)!;
    for (let m = f.from; m <= f.to; m++) if (mask & (1 << m)) monthCust[m]++;
    const first = ds.custFirstMonth[cust];
    if (first >= f.from && first <= f.to && mask & (1 << first)) {
      newCustomers++;
      monthNewCust[first]++;
    }
    const rs = customers.rScore[cust] - 1;
    const fs = customers.fScore[cust] - 1;
    rfmCount[rs][fs]++;
    rfmSpend[rs][fs] += revPerCust.get(cust)!;
  }

  // Month-on-month growth between the last two *complete* months in range.
  let lastFull = f.to;
  if (ds.lastMonthPartial && lastFull === nM - 1) lastFull--;
  const mom =
    lastFull - 1 >= f.from && monthRev[lastFull - 1] > 0
      ? {
          month: lastFull,
          prev: lastFull - 1,
          pct: ((monthRev[lastFull] - monthRev[lastFull - 1]) / monthRev[lastFull - 1]) * 100,
        }
      : null;

  // Cohort retention: cohort = month of a customer's first-ever purchase,
  // restricted to cohorts that start inside the selected range.
  const span = f.to - f.from + 1;
  const cohortSize = new Float64Array(span);
  const cohortActive = Array.from({ length: span }, () => new Float64Array(span));
  for (const [cust, mask] of activeMonths) {
    const first = ds.custFirstMonth[cust];
    if (first < f.from || first > f.to) continue;
    if (!(mask & (1 << first))) continue;
    const row = first - f.from;
    cohortSize[row]++;
    for (let m = first; m <= f.to; m++) {
      if (mask & (1 << m)) cohortActive[row][m - first]++;
    }
  }
  const cohorts = Array.from({ length: span }, (_, row) => ({
    month: f.from + row,
    size: cohortSize[row],
    retention: Array.from({ length: span - row }, (_, k) =>
      cohortSize[row] > 0 ? (cohortActive[row][k] / cohortSize[row]) * 100 : NaN,
    ),
  })).filter((c) => c.size > 0);

  // Products (top-N catalogue, aggregated by month × country × segment)
  const nP = ds.products.length;
  const prodRev = new Float64Array(nP);
  const prodUnits = new Float64Array(nP);
  const prodMonth = new Float64Array(nP * span);
  const pr = ds.productRows;
  for (let i = 0; i < pr.product.length; i++) {
    const m = pr.month[i];
    if (m < f.from || m > f.to) continue;
    if (!f.countries.has(pr.country[i]) || !f.segments.has(pr.segment[i])) continue;
    const p = pr.product[i];
    prodRev[p] += pr.revenue[i];
    prodUnits[p] += pr.units[i];
    prodMonth[p * span + (m - f.from)] += pr.revenue[i];
  }

  const quarters = new Map<string, number>();
  for (let m = f.from; m <= f.to; m++) {
    const [y, mm] = ds.months[m].split("-").map(Number);
    const q = `${y} Q${Math.floor((mm - 1) / 3) + 1}`;
    quarters.set(q, (quarters.get(q) ?? 0) + monthRev[m]);
  }

  // Concentration curve: cumulative revenue share by customers ranked by spend.
  const spend = [...revPerCust.values()].sort((a, b) => b - a);
  const concentration: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  if (spend.length && revenue > 0) {
    let cum = 0;
    const steps = Math.min(100, spend.length);
    let next = 1;
    for (let i = 0; i < spend.length; i++) {
      cum += spend[i];
      const x = ((i + 1) / spend.length) * 100;
      if (x >= (next / steps) * 100 - 1e-9 || i === spend.length - 1) {
        concentration.push({ x, y: (cum / revenue) * 100 });
        next++;
      }
    }
  }
  const shareOfTop = (pctCustomers: number) => {
    const k = Math.max(1, Math.round((spend.length * pctCustomers) / 100));
    let s = 0;
    for (let i = 0; i < k && i < spend.length; i++) s += spend[i];
    return revenue ? (s / revenue) * 100 : 0;
  };

  const sortedOrders = orders
    ? (() => {
        const vals: number[] = [];
        for (let i = 0; i < invoices.day.length; i++) {
          const m = ds.invMonth[i];
          if (m < f.from || m > f.to) continue;
          if (!f.countries.has(invoices.country[i])) continue;
          if (!f.segments.has(customers.segment[invoices.customer[i]])) continue;
          vals.push(invoices.revenue[i]);
        }
        return vals.sort((a, b) => a - b);
      })()
    : [];
  const medianOrder = sortedOrders.length ? sortedOrders[Math.floor(sortedOrders.length / 2)] : 0;

  return {
    revenue,
    orders,
    units,
    customers: customerCount,
    newCustomers,
    aov: orders ? revenue / orders : 0,
    medianOrder,
    repeatRate: customerCount ? (repeaters / customerCount) * 100 : 0,
    mom,
    monthly: Array.from({ length: span }, (_, k) => {
      const m = f.from + k;
      return {
        month: m,
        revenue: monthRev[m],
        orders: monthOrders[m],
        customers: monthCust[m],
        newCustomers: monthNewCust[m],
        aov: monthOrders[m] ? monthRev[m] / monthOrders[m] : 0,
        newRevenue: monthNewRev[m],
        returningRevenue: monthRev[m] - monthNewRev[m],
      };
    }),
    countries: Array.from(countryRev, (rev, i) => ({
      index: i,
      revenue: rev,
      orders: countryOrders[i],
      customers: countryCustSeen.get(i)?.size ?? 0,
    }))
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue),
    segments: Array.from(segRev, (rev, i) => ({
      index: i,
      revenue: rev,
      customers: segCust[i],
    })),
    heat,
    cohorts,
    products: Array.from(prodRev, (rev, i) => ({
      index: i,
      revenue: rev,
      units: prodUnits[i],
      trend: Array.from(prodMonth.subarray(i * span, (i + 1) * span)),
    }))
      .filter((p) => p.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 25),
    quarters: [...quarters].map(([label, rev]) => ({ label, revenue: rev })),
    orderBins: Array.from(binOrders, (n, i) => ({ lo: ORDER_BINS[i], hi: ORDER_BINS[i + 1], orders: n, revenue: binRev[i] })),
    concentration,
    top20Share: shareOfTop(20),
    top1Share: shareOfTop(1),
    rfm: { count: rfmCount, spend: rfmSpend },
    activeCustomers: ordersPerCust,
  };
}

/** The equal-length period immediately before the selection, if the data covers it. */
export function previousPeriod(f: Filters): Filters | null {
  const span = f.to - f.from + 1;
  if (f.from - span < 0) return null;
  return { ...f, from: f.from - span, to: f.from - 1 };
}
