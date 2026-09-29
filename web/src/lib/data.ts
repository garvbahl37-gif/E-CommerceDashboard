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

export type Summary = ReturnType<typeof summarise>;

export function summarise(ds: Dataset, f: Filters) {
  const { invoices, customers } = ds;
  const nM = ds.months.length;
  const nC = ds.countries.length;
  const nS = ds.segments.length;

  const monthRev = new Float64Array(nM);
  const monthOrders = new Float64Array(nM);
  const countryRev = new Float64Array(nC);
  const segRev = new Float64Array(nS);
  const segCust = new Float64Array(nS);
  const heat = Array.from({ length: 7 }, () => new Float64Array(24));
  const ordersPerCust = new Map<number, number>();
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
    countryRev[c] += r;
    segRev[seg] += r;
    heat[ds.invDow[i]][invoices.hour[i]] += r;
    ordersPerCust.set(cust, (ordersPerCust.get(cust) ?? 0) + 1);
    activeMonths.set(cust, (activeMonths.get(cust) ?? 0) | (1 << m));
  }

  const customerCount = ordersPerCust.size;
  let repeaters = 0;
  for (const [cust, k] of ordersPerCust) {
    if (k > 1) repeaters++;
    segCust[customers.segment[cust]]++;
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
  const prodRev = new Float64Array(ds.products.length);
  const prodUnits = new Float64Array(ds.products.length);
  const pr = ds.productRows;
  for (let i = 0; i < pr.product.length; i++) {
    const m = pr.month[i];
    if (m < f.from || m > f.to) continue;
    if (!f.countries.has(pr.country[i]) || !f.segments.has(pr.segment[i])) continue;
    prodRev[pr.product[i]] += pr.revenue[i];
    prodUnits[pr.product[i]] += pr.units[i];
  }

  const quarters = new Map<string, number>();
  for (let m = f.from; m <= f.to; m++) {
    const [y, mm] = ds.months[m].split("-").map(Number);
    const q = `${y} Q${Math.floor((mm - 1) / 3) + 1}`;
    quarters.set(q, (quarters.get(q) ?? 0) + monthRev[m]);
  }

  return {
    revenue,
    orders,
    units,
    customers: customerCount,
    aov: orders ? revenue / orders : 0,
    repeatRate: customerCount ? (repeaters / customerCount) * 100 : 0,
    mom,
    monthly: Array.from({ length: span }, (_, k) => ({
      month: f.from + k,
      revenue: monthRev[f.from + k],
      orders: monthOrders[f.from + k],
    })),
    countries: Array.from(countryRev, (rev, i) => ({ index: i, revenue: rev }))
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue),
    segments: Array.from(segRev, (rev, i) => ({
      index: i,
      revenue: rev,
      customers: segCust[i],
    })),
    heat,
    cohorts,
    products: Array.from(prodRev, (rev, i) => ({ index: i, revenue: rev, units: prodUnits[i] }))
      .filter((p) => p.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    quarters: [...quarters].map(([label, rev]) => ({ label, revenue: rev })),
    activeCustomers: ordersPerCust,
  };
}
