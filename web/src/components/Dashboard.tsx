"use client";

import { useEffect, useMemo, useState } from "react";
import { Columns, HBars } from "./charts/Bars";
import { ClusterFacets, ClusterPoint } from "./charts/ClusterFacets";
import { Concentration } from "./charts/Concentration";
import { Dumbbell } from "./charts/Dumbbell";
import { Heatmap, RampLegend } from "./charts/Heatmap";
import { ChartFrame, DataTable, LegendItem, Segmented, ShareBar, Sparkline } from "./charts/primitives";
import { StackedColumns } from "./charts/StackedColumns";
import { TrendChart } from "./charts/TrendChart";
import { ActiveFilters, FilterPanel } from "./Filters";
import {
  Dataset,
  DAYS,
  defaultFilters,
  facets as computeFacets,
  Filters,
  filtersFromQuery,
  filtersToQuery,
  prepare,
  previousPeriod,
  RawData,
  summarise,
  Summary,
} from "@/lib/data";
import { gbp, gbpCompact, int, monthLabel, monthShort, pct, titleCase } from "@/lib/format";

export function Dashboard() {
  const [ds, setDs] = useState<Dataset | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/data/dashboard.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<RawData>;
      })
      .then((raw) => live && setDs(prepare(raw)))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, []);

  if (error)
    return (
      <div className="state">
        <h1>The sales data didn’t load.</h1>
        <p>Check your connection, then reload the page.</p>
      </div>
    );
  if (!ds)
    return (
      <div className="state" aria-busy="true">
        <div className="loader" aria-hidden="true" />
        <p>Loading 36,969 orders…</p>
      </div>
    );
  return <Loaded ds={ds} />;
}

type Metric = "revenue" | "orders" | "customers" | "aov";
const METRICS: { value: Metric; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "orders", label: "Orders" },
  { value: "customers", label: "Customers" },
  { value: "aov", label: "Avg order" },
];
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "customers", label: "Customers" },
  { id: "products", label: "Products" },
  { id: "markets", label: "Markets" },
  { id: "timing", label: "Timing" },
];

function Loaded({ ds }: { ds: Dataset }) {
  const [filters, setFilters] = useState<Filters>(() => filtersFromQuery(ds, window.location.search));
  const [drawer, setDrawer] = useState(false);
  const [metric, setMetric] = useState<Metric>("revenue");
  const [hideUK, setHideUK] = useState(false);
  const [productCount, setProductCount] = useState<"10" | "25">("10");
  const [copied, setCopied] = useState(false);

  // Keep the URL in step with the filters so any view can be shared.
  useEffect(() => {
    const q = filtersToQuery(ds, filters);
    window.history.replaceState(null, "", q || window.location.pathname);
  }, [ds, filters]);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  const s = useMemo(() => summarise(ds, filters), [ds, filters]);
  const p = useMemo(() => {
    const prevF = previousPeriod(filters);
    return prevF ? { f: prevF, s: summarise(ds, prevF) } : null;
  }, [ds, filters]);
  const fc = useMemo(() => computeFacets(ds, filters), [ds, filters]);

  const def = defaultFilters(ds);
  const activeGroups =
    Number(filters.from !== def.from || filters.to !== def.to) +
    Number(filters.countries.size !== ds.countries.length) +
    Number(filters.segments.size !== ds.segments.length);

  const lastIdx = ds.months.length - 1;
  const isPartial = (m: number) => m === lastIdx && ds.lastMonthPartial;
  const empty = s.orders === 0;

  // ── Cross-filter helpers: click once to focus, again to clear.
  const only = (set: Set<number>, i: number) => set.size === 1 && set.has(i);
  const toggleCountry = (name: string) => {
    const i = ds.countries.indexOf(name);
    setFilters((f) => ({ ...f, countries: only(f.countries, i) ? def.countries : new Set([i]) }));
  };
  const toggleSegment = (name: string) => {
    const i = ds.segments.indexOf(name);
    setFilters((f) => ({ ...f, segments: only(f.segments, i) ? def.segments : new Set([i]) }));
  };
  const focusMonth = (k: number) => {
    const m = filters.from + k;
    setFilters((f) => (f.from === m && f.to === m ? { ...f, from: def.from, to: def.to } : { ...f, from: m, to: m }));
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  // ── Headline copy
  const rangeText =
    filters.from === filters.to
      ? monthLabel(ds.months[filters.from], true)
      : `${monthLabel(ds.months[filters.from], true)} to ${monthLabel(ds.months[filters.to], true)}`;
  const prevText = p
    ? p.f.from === p.f.to
      ? monthLabel(ds.months[p.f.from])
      : `${monthLabel(ds.months[p.f.from])} – ${monthLabel(ds.months[p.f.to])}`
    : null;
  const topCountry = s.countries[0];

  // ── Monthly series
  const metricValue = (d: Summary["monthly"][number]) =>
    metric === "revenue" ? d.revenue : metric === "orders" ? d.orders : metric === "customers" ? d.customers : d.aov;
  const metricFormat = metric === "revenue" ? gbpCompact : metric === "aov" ? (v: number) => gbp(v) : (v: number) => int(v);
  const trend = s.monthly.map((d) => ({
    label: monthLabel(ds.months[d.month], true),
    short: monthShort(ds.months[d.month]),
    value: metricValue(d),
    partial: isPartial(d.month),
    rows: [
      { value: gbp(d.revenue), label: "revenue" },
      { value: int(d.orders), label: "orders" },
      { value: int(d.customers), label: "customers" },
      { value: gbp(d.aov, 2), label: "average order" },
    ],
  }));
  const peakByYear = new Map<string, number>();
  trend.forEach((d, i) => {
    if (d.partial || d.value <= 0) return;
    const yr = d.label.slice(-4);
    const cur = peakByYear.get(yr);
    if (cur === undefined || d.value > trend[cur].value) peakByYear.set(yr, i);
  });
  // Only mark a peak for years with at least six months in view; a lone month isn't a peak.
  const monthsInYear = (yr: string) => trend.filter((d) => d.label.endsWith(yr)).length;
  const peaks = [...peakByYear].filter(([yr]) => monthsInYear(yr) >= 6).map(([, i]) => i);
  const peakMonth = s.monthly
    .filter((d) => !isPartial(d.month))
    .reduce<Summary["monthly"][number] | null>((b, d) => (!b || d.revenue > b.revenue ? d : b), null);

  // ── New vs returning
  const stackRows = s.monthly.map((d) => ({
    key: monthShort(ds.months[d.month]),
    label: monthLabel(ds.months[d.month], true) + (isPartial(d.month) ? " (to date)" : ""),
    a: d.returningRevenue,
    b: d.newRevenue,
  }));
  const newRevTotal = s.monthly.reduce((a, d) => a + d.newRevenue, 0);

  // ── Order sizes
  const binLabel = (lo: number, hi: number) =>
    hi === Infinity ? `${gbpCompact(lo)}+` : lo === 0 ? `<${gbpCompact(hi)}` : `${gbpCompact(lo)}–${gbpCompact(hi).slice(1)}`;
  const binRows = s.orderBins.map((b) => ({
    key: b.hi === Infinity ? `${gbpCompact(b.lo)}+` : b.lo === 0 ? `<${gbpCompact(b.hi)}` : gbpCompact(b.lo),
    label: `Orders of ${binLabel(b.lo, b.hi)}`,
    value: b.orders,
    share: s.revenue ? (b.revenue / s.revenue) * 100 : 0,
    detail: `orders, ${pct(s.revenue ? (b.revenue / s.revenue) * 100 : 0)} of revenue`,
  }));
  const bigBins = s.orderBins.filter((b) => b.lo >= 1000);
  const bigOrders = bigBins.reduce((a, b) => a + b.orders, 0);
  const bigRev = bigBins.reduce((a, b) => a + b.revenue, 0);

  // ── Segments
  const totalSegCust = s.segments.reduce((a, b) => a + b.customers, 0);
  const segRows = s.segments
    .filter((g) => filters.segments.has(g.index))
    .map((g) => ({
      key: ds.segments[g.index],
      label: ds.segments[g.index],
      a: totalSegCust ? (g.customers / totalSegCust) * 100 : 0,
      b: s.revenue ? (g.revenue / s.revenue) * 100 : 0,
      detail: `${int(g.customers)} customers, ${gbp(g.revenue)}`,
    }))
    .sort((x, y) => y.b - x.b);
  const champ = segRows.find((r) => r.key === "Champions");

  // ── RFM grid (rows: recency 5 → 1, cols: frequency 1 → 5)
  const rfmVals = [4, 3, 2, 1, 0].map((r) => Array.from(s.rfm.count[r]));
  const rfmMax = Math.max(1, ...rfmVals.flat());
  const best = s.rfm.count[4][4] + s.rfm.count[4][3] + s.rfm.count[3][4] + s.rfm.count[3][3];
  const rfmTable = [5, 4, 3, 2, 1].flatMap((r) =>
    [1, 2, 3, 4, 5].map((f) => ({ r, f, n: s.rfm.count[r - 1][f - 1], spend: s.rfm.spend[r - 1][f - 1] })),
  );

  // ── Cohorts
  const cohortMaxCols = s.cohorts.length ? Math.max(...s.cohorts.map((c) => c.retention.length)) : 0;
  const cohortVals = s.cohorts.map((c) =>
    Array.from({ length: cohortMaxCols }, (_, k) => (k === 0 ? NaN : (c.retention[k] ?? NaN))),
  );
  const m1 = s.cohorts.filter((c) => c.retention.length > 1 && c.size >= 20);
  const avgM1 = m1.length ? m1.reduce((a, c) => a + c.retention[1], 0) / m1.length : NaN;
  const cohortMax = Math.max(1, ...cohortVals.flat().filter(Number.isFinite));
  type Cohort = Summary["cohorts"][number];

  // ── Clusters (RFM values are all-time; points shown for customers active in the filter)
  const clusterPoints: ClusterPoint[] = useMemo(() => {
    const out: ClusterPoint[] = [];
    for (const c of s.activeCustomers.keys()) {
      out.push({
        id: ds.customers.id[c],
        recency: ds.customers.recency[c],
        monetary: ds.customers.monetary[c],
        frequency: ds.customers.frequency[c],
        cluster: ds.customers.cluster[c],
      });
    }
    return out;
  }, [s, ds]);

  // ── Products
  type ProductRow = Summary["products"][number] & { rank: number };
  const productRows: ProductRow[] = s.products.slice(0, Number(productCount)).map((p, i) => ({ ...p, rank: i + 1 }));

  // ── Countries
  const uk = ds.countries.indexOf("United Kingdom");
  const ukRev = s.countries.find((c) => c.index === uk)?.revenue ?? 0;
  const countryBars = s.countries
    .filter((c) => !(hideUK && c.index === uk))
    .slice(0, 10)
    .map((c) => ({
      key: ds.countries[c.index],
      label: ds.countries[c.index],
      value: c.revenue,
      accent: c.index === uk,
      detail: `${pct((c.revenue / s.revenue) * 100)} of revenue`,
    }));
  type CountryRow = Summary["countries"][number];

  // ── Weekday × hour
  const hours = Array.from({ length: 15 }, (_, k) => k + 6); // 06:00–20:00
  const heatVals = s.heat.map((row) => hours.map((h) => row[h]));
  const heatMax = Math.max(1, ...heatVals.flat());
  let busiest = { d: 0, h: 0, v: -1 };
  heatVals.forEach((row, d) => row.forEach((v, j) => v > busiest.v && (busiest = { d, h: hours[j], v })));
  const dayTotals = s.heat.map((row) => row.reduce((a, b) => a + b, 0));
  const quietDay = dayTotals.indexOf(Math.min(...dayTotals));

  // ── Quarters
  const bestQ = s.quarters.reduce<(typeof s.quarters)[number] | null>((b, q) => (!b || q.revenue > b.revenue ? q : b), null);
  const qRows = s.quarters.map((q) => ({
    key: q.label.replace(/^20(\d\d) /, "’$1 "),
    label: q.label,
    value: q.revenue,
    detail: "revenue",
  }));

  const ps = p?.s;
  // Sparklines leave out a partial final month so the tiles don't show a false collapse.
  const full = s.monthly.filter((d) => !isPartial(d.month));
  const kpis = [
    { label: "Revenue", value: gbpCompact(s.revenue), full: gbp(s.revenue), cur: s.revenue, prev: ps?.revenue, spark: full.map((d) => d.revenue) },
    { label: "Orders", value: int(s.orders), cur: s.orders, prev: ps?.orders, spark: full.map((d) => d.orders) },
    { label: "Active customers", value: int(s.customers), cur: s.customers, prev: ps?.customers, spark: full.map((d) => d.customers) },
    { label: "Average order", value: gbp(s.aov, 2), cur: s.aov, prev: ps?.aov, spark: full.map((d) => d.aov) },
    { label: "New customers", value: int(s.newCustomers), cur: s.newCustomers, prev: ps?.newCustomers, spark: full.map((d) => d.newCustomers) },
    { label: "Ordered more than once", value: pct(s.repeatRate), cur: s.repeatRate, prev: ps?.repeatRate, points: true, meter: s.repeatRate },
  ];

  return (
    <div className="shell">
      <aside id="filters" className={`sidebar${drawer ? " is-open" : ""}`} aria-label="Filters">
        <div className="sidebar-top">
          <span className="sidebar-title">Filters</span>
          <button type="button" className="drawer-done" onClick={() => setDrawer(false)}>
            Show {int(s.orders)} orders
          </button>
        </div>
        <FilterPanel ds={ds} filters={filters} facets={fc} onChange={setFilters} />
      </aside>
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}

      <main id="main" className="content">
        <div className="toolbar">
          <button type="button" className="filters-toggle" onClick={() => setDrawer(true)} aria-expanded={drawer} aria-controls="filters">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M1.5 3h11M3.5 7h7M5.5 11h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Filters
            {activeGroups > 0 && <span className="badge">{activeGroups}</span>}
          </button>
          <nav className="section-nav" aria-label="Sections">
            {SECTIONS.map((sec) => (
              <a key={sec.id} href={`#${sec.id}`}>
                {sec.label}
              </a>
            ))}
          </nav>
          <button type="button" className="ghost-button copy-link" onClick={copyLink} aria-label={copied ? "Link copied" : "Copy link to this view"}>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M6 8a2.5 2.5 0 003.5 0l2-2a2.5 2.5 0 00-3.5-3.5l-.6.6M8 6a2.5 2.5 0 00-3.5 0l-2 2a2.5 2.5 0 003.5 3.5l.6-.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="btn-text" aria-live="polite">
              {copied ? "Link copied" : "Copy link"}
            </span>
          </button>
        </div>

        <ActiveFilters ds={ds} filters={filters} onChange={setFilters} />

        <section id="overview" className="hero" aria-labelledby="hero-title">
          <p className="hero-range">
            {rangeText}
            {isPartial(filters.to) && filters.from !== filters.to ? " (data ends 9 December)" : ""}
          </p>
          {empty ? (
            <>
              <h1 id="hero-title" className="hero-title">
                No orders match these filters.
              </h1>
              <p className="hero-lede">Widen the period, or add countries or customer segments back in.</p>
            </>
          ) : (
            <>
              <h1 id="hero-title" className="hero-title">
                {int(s.customers)} {s.customers === 1 ? "customer" : "customers"} placed {int(s.orders)}{" "}
                {s.orders === 1 ? "order" : "orders"} worth {gbpCompact(s.revenue)}.
              </h1>
              <p className="hero-lede">
                {peakMonth && s.monthly.length > 1 && (
                  <>
                    {monthLabel(ds.months[peakMonth.month], true)} was the biggest month, at {gbp(peakMonth.revenue)}.{" "}
                  </>
                )}
                {topCountry &&
                  (s.countries.length === 1
                    ? `Every order came from ${ds.countries[topCountry.index]}.`
                    : `${ds.countries[topCountry.index]} accounts for ${pct((topCountry.revenue / s.revenue) * 100)} of revenue.`)}
              </p>
            </>
          )}
        </section>

        {!empty && (
          <>
            <div className="kpis">
              {kpis.map((k) => (
                <Kpi key={k.label} {...k} prevText={prevText} />
              ))}
            </div>

            <ChartFrame
              title="Monthly performance"
              reading={
                isPartial(filters.to) && filters.from !== filters.to
                  ? "Peaks are marked for each year. December 2011 is hollow because the data stops on the 9th. Click a month to focus on it."
                  : "Peaks are marked for each year. Click a month to focus on it."
              }
              actions={<Segmented label="Measure" options={METRICS} value={metric} onChange={setMetric} />}
              className="chart-wide"
              table={{
                rows: s.monthly,
                columns: [
                  { label: "Month", value: (r) => monthLabel(ds.months[r.month]) + (isPartial(r.month) ? " (partial)" : ""), sort: (r) => r.month },
                  { label: "Revenue", value: (r) => gbp(r.revenue), numeric: true, sort: (r) => r.revenue },
                  { label: "Orders", value: (r) => int(r.orders), numeric: true, sort: (r) => r.orders },
                  { label: "Customers", value: (r) => int(r.customers), numeric: true, sort: (r) => r.customers },
                  { label: "New customers", value: (r) => int(r.newCustomers), numeric: true, sort: (r) => r.newCustomers },
                  { label: "Avg order", value: (r) => gbp(r.aov, 2), numeric: true, sort: (r) => r.aov },
                ],
              }}
            >
              <TrendChart data={trend} highlight={peaks} height={320} axisFormat={metricFormat} onSelect={focusMonth} />
            </ChartFrame>

            <div className="grid-2">
              <ChartFrame
                title="New vs returning revenue"
                reading={`First-month orders from new customers brought in ${pct(s.revenue ? (newRevTotal / s.revenue) * 100 : 0)} of revenue. The rest came from customers buying again.`}
                legend={
                  <>
                    <LegendItem color="var(--s1)" label="Returning customers" />
                    <LegendItem color="var(--s2)" label="New customers" />
                  </>
                }
                table={{
                  rows: stackRows,
                  columns: [
                    { label: "Month", value: (r) => r.label },
                    { label: "Returning", value: (r) => gbp(r.a), numeric: true, sort: (r) => r.a },
                    { label: "New", value: (r) => gbp(r.b), numeric: true, sort: (r) => r.b },
                  ],
                }}
              >
                <StackedColumns rows={stackRows} aLabel="Returning" bLabel="New" format={gbpCompact} tipFormat={(v) => gbp(v)} />
              </ChartFrame>

              <ChartFrame
                title="Order size"
                reading={`Half of all orders are under ${gbp(s.medianOrder)}. Orders over £1K are ${pct(
                  s.orders ? (bigOrders / s.orders) * 100 : 0,
                )} of orders but ${pct(s.revenue ? (bigRev / s.revenue) * 100 : 0)} of revenue.`}
                table={{
                  rows: binRows,
                  columns: [
                    { label: "Order value", value: (r) => r.label.replace("Orders of ", "") },
                    { label: "Orders", value: (r) => int(r.value), numeric: true, sort: (r) => r.value },
                    { label: "Share of revenue", value: (r) => pct(r.share), numeric: true, sort: (r) => r.share },
                  ],
                }}
              >
                <p className="axis-caption">Orders by value, from each bar’s lower bound</p>
                <Columns rows={binRows} height={248} format={(v) => int(v)} tipFormat={(v) => int(v)} />
              </ChartFrame>
            </div>

            <section id="customers" className="section" aria-labelledby="customers-h">
              <header className="section-head">
                <h2 id="customers-h">Customers</h2>
                <p>
                  Segments come from RFM scoring: how recently, how often and how much each customer buys. Shares use revenue
                  from the selected period. Click a segment to filter the page.
                </p>
              </header>
              <div className="grid-2">
                <ChartFrame
                  title="Share of customers vs share of revenue"
                  reading={
                    segRows.length === 1
                      ? `Showing ${segRows[0].label} only. Click it again to bring the other segments back.`
                      : champ
                        ? `Champions are ${pct(champ.a, 0)} of customers and bring in ${pct(champ.b, 0)} of revenue.`
                        : undefined
                  }
                  legend={
                    <>
                      <LegendItem color="var(--s2)" label="Customers" shape="dot" />
                      <LegendItem color="var(--s1)" label="Revenue" shape="dot" />
                    </>
                  }
                  table={{
                    rows: segRows,
                    columns: [
                      { label: "Segment", value: (r) => r.label },
                      { label: "Customers", value: (r) => pct(r.a), numeric: true, sort: (r) => r.a },
                      { label: "Revenue", value: (r) => pct(r.b), numeric: true, sort: (r) => r.b },
                    ],
                  }}
                >
                  <Dumbbell
                    rows={segRows}
                    aLabel="Customers"
                    bLabel="Revenue"
                    onSelect={toggleSegment}
                    selected={(k) => only(filters.segments, ds.segments.indexOf(k))}
                  />
                </ChartFrame>

                <ChartFrame
                  title="RFM grid"
                  reading={`${int(best)} customers sit in the top-right corner: they ordered recently and often.`}
                  legend={<RampLegend low="Fewer" high="More customers" />}
                  table={{
                    rows: rfmTable,
                    columns: [
                      { label: "Recency score", value: (x) => x.r, sort: (x) => x.r },
                      { label: "Frequency score", value: (x) => x.f, sort: (x) => x.f },
                      { label: "Customers", value: (x) => int(x.n), numeric: true, sort: (x) => x.n },
                      { label: "Avg spend", value: (x) => (x.n ? gbp(x.spend / x.n) : "–"), numeric: true, sort: (x) => (x.n ? x.spend / x.n : 0) },
                    ],
                  }}
                >
                  <Heatmap
                    rows={["5 recent", "4", "3", "2", "1 lapsed"]}
                    cols={["1", "2", "3", "4", "5"]}
                    colTitle="Order frequency score →"
                    values={rfmVals}
                    max={rfmMax}
                    format={(v) => `${int(v)} customers`}
                    cellTitle={(r, c) => `Recency ${5 - r}, frequency ${c + 1}`}
                    extraRows={(r, c) => {
                      const n = s.rfm.count[4 - r][c];
                      return n ? [{ value: gbp(s.rfm.spend[4 - r][c] / n), label: "average spend in period" }] : [];
                    }}
                    cellLabel={(v) => (v ? int(v) : "")}
                    rowLabelWidth={72}
                    cellHeight={48}
                  />
                </ChartFrame>
              </div>

              <div className="grid-2">
                <ChartFrame
                  title="Customer concentration"
                  reading={`The top 20% of customers bring in ${pct(s.top20Share, 0)} of revenue. The top 1% alone bring in ${pct(s.top1Share, 0)}.`}
                  table={{
                    rows: [1, 5, 10, 20, 30, 50, 80].map((k) => {
                      const pt = s.concentration.reduce((b, q) => (Math.abs(q.x - k) < Math.abs(b.x - k) ? q : b), s.concentration[0]);
                      return { k, y: pt.y };
                    }),
                    columns: [
                      { label: "Top customers", value: (r) => `${r.k}%`, sort: (r) => r.k },
                      { label: "Share of revenue", value: (r) => pct(r.y), numeric: true, sort: (r) => r.y },
                    ],
                  }}
                >
                  <Concentration points={s.concentration} marker={20} />
                </ChartFrame>

                <ChartFrame
                  title="Who comes back"
                  reading={
                    Number.isFinite(avgM1)
                      ? `On average, ${pct(avgM1, 0)} of a month’s new customers order again the following month.`
                      : filters.to - filters.from < 1
                        ? "Pick at least two months to see who comes back."
                        : "Too few new customers in this selection to measure repeat orders."
                  }
                  legend={<RampLegend low="Fewer return" high={`${pct(cohortMax, 0)} return`} />}
                  table={{
                    rows: s.cohorts,
                    columns: [
                      { label: "First order", value: (r: Cohort) => monthLabel(ds.months[r.month]), sort: (r: Cohort) => r.month },
                      { label: "New customers", value: (r: Cohort) => int(r.size), numeric: true, sort: (r: Cohort) => r.size },
                      ...[1, 3, 6, 12].map((k) => ({
                        label: k === 1 ? "Back after 1 month" : `After ${k}`,
                        value: (r: Cohort) => (r.retention[k] !== undefined ? pct(r.retention[k]) : "–"),
                        numeric: true,
                        sort: (r: Cohort) => r.retention[k] ?? -1,
                      })),
                    ],
                  }}
                >
                  <Heatmap
                    rows={s.cohorts.map((c) => monthLabel(ds.months[c.month]))}
                    cols={Array.from({ length: cohortMaxCols }, (_, k) => String(k))}
                    colTitle="Months after first order →"
                    colEvery={cohortMaxCols > 13 ? 3 : 1}
                    values={cohortVals}
                    max={cohortMax}
                    format={(v) => `${pct(v)} ordered again`}
                    cellTitle={(r, c) =>
                      `${int(s.cohorts[r].size)} new in ${monthLabel(ds.months[s.cohorts[r].month])}, ${c} month${c === 1 ? "" : "s"} later`
                    }
                    rowLabelWidth={68}
                    cellHeight={s.cohorts.length > 14 ? 11 : 20}
                  />
                </ChartFrame>
              </div>

              <ChartFrame
                title="Four kinds of customer"
                reading="K-Means clusters on all-time recency, frequency and spend. Each panel shows its cluster against everyone else in grey. Across: days since last order. Up: lifetime spend (log scale)."
                className="chart-wide"
              >
                <ClusterFacets points={clusterPoints} clusters={ds.clusters} />
              </ChartFrame>
            </section>

            <section id="products" className="section" aria-labelledby="products-h">
              <header className="section-head">
                <h2 id="products-h">Products</h2>
                <p>
                  Rankings cover the {ds.meta.topProducts} best-selling of {int(ds.meta.totalProducts)} products. Postage, fees and
                  manual adjustments are left out.
                </p>
              </header>
              <ChartFrame
                title={`Top ${productCount} products`}
                reading={
                  productRows[0]
                    ? `${titleCase(ds.products[productRows[0].index])} leads with ${gbp(productRows[0].revenue)}. Click a column heading to sort.`
                    : "No product sales in this selection."
                }
                actions={
                  <Segmented
                    label="How many products"
                    options={[
                      { value: "10", label: "Top 10" },
                      { value: "25", label: "Top 25" },
                    ]}
                    value={productCount}
                    onChange={setProductCount}
                  />
                }
                className="chart-wide"
              >
                <DataTable<ProductRow>
                  rows={productRows}
                  columns={[
                    { label: "#", value: (r) => <span className="rank">{r.rank}</span>, sort: (r) => r.rank, width: "48px", numeric: true },
                    { label: "Product", value: (r) => <span className="product-name">{titleCase(ds.products[r.index])}</span>, sort: (r) => ds.products[r.index] },
                    {
                      label: "Monthly trend",
                      value: (r) => (
                        <span className="cell-spark">
                          <Sparkline values={r.trend} height={26} />
                        </span>
                      ),
                      sort: (r) => r.trend[r.trend.length - 1] ?? 0,
                      width: "20%",
                    },
                    { label: "Revenue", value: (r) => gbp(r.revenue), numeric: true, sort: (r) => r.revenue },
                    { label: "Units", value: (r) => int(r.units), numeric: true, sort: (r) => r.units },
                    { label: "Share of revenue", value: (r) => <ShareBar pct={(r.revenue / s.revenue) * 100} />, sort: (r) => r.revenue, width: "20%" },
                  ]}
                />
              </ChartFrame>
            </section>

            <section id="markets" className="section" aria-labelledby="markets-h">
              <header className="section-head">
                <h2 id="markets-h">Markets</h2>
                <p>Click a country, in the chart or the table, to filter the page to it. Click it again to clear.</p>
              </header>
              <div className="grid-2 grid-wide-right">
                <ChartFrame
                  title="Top 10 countries"
                  reading={
                    ukRev > 0 && s.countries.length > 1
                      ? `The UK, in red, brings in ${pct((ukRev / s.revenue) * 100)} of revenue.`
                      : `${s.countries.length} ${s.countries.length === 1 ? "country" : "countries"} in this selection.`
                  }
                  actions={
                    ukRev > 0 && s.countries.length > 1 ? (
                      <label className="toggle">
                        <input type="checkbox" checked={hideUK} onChange={(e) => setHideUK(e.target.checked)} />
                        Hide UK
                      </label>
                    ) : undefined
                  }
                >
                  <HBars
                    rows={countryBars}
                    format={gbpCompact}
                    tipFormat={(v) => gbp(v)}
                    onSelect={toggleCountry}
                    selected={(k) => only(filters.countries, ds.countries.indexOf(k))}
                  />
                </ChartFrame>

                <ChartFrame title="Every country" reading={`${s.countries.length} countries placed orders in this selection. Click a column heading to sort.`}>
                  <DataTable<CountryRow>
                    rows={s.countries}
                    maxHeight={440}
                    onRowClick={(r) => toggleCountry(ds.countries[r.index])}
                    rowActive={(r) => only(filters.countries, r.index)}
                    columns={[
                      { label: "Country", value: (r) => ds.countries[r.index], sort: (r) => ds.countries[r.index] },
                      { label: "Revenue", value: (r) => gbpCompact(r.revenue), numeric: true, sort: (r) => r.revenue },
                      { label: "Share", value: (r) => <ShareBar pct={(r.revenue / s.revenue) * 100} accent={r.index === uk} />, sort: (r) => r.revenue, width: "26%" },
                      { label: "Orders", value: (r) => int(r.orders), numeric: true, sort: (r) => r.orders },
                      { label: "Customers", value: (r) => int(r.customers), numeric: true, sort: (r) => r.customers },
                      { label: "Avg order", value: (r) => gbp(r.revenue / r.orders), numeric: true, sort: (r) => r.revenue / r.orders },
                    ]}
                  />
                </ChartFrame>
              </div>
            </section>

            <section id="timing" className="section" aria-labelledby="timing-h">
              <header className="section-head">
                <h2 id="timing-h">Timing</h2>
                <p>Order times are UK time, from the invoice timestamp.</p>
              </header>
              <div className="grid-2 grid-wide-left">
                <ChartFrame
                  title="Revenue by weekday and hour"
                  reading={`${FULL_DAYS[busiest.d]} around ${String(busiest.h).padStart(2, "0")}:00 is the busiest hour.${
                    dayTotals[quietDay] < s.revenue * 0.01 ? ` ${FULL_DAYS[quietDay]}s are almost silent.` : ""
                  }`}
                  legend={<RampLegend low="Less" high="More revenue" />}
                  table={{
                    rows: DAYS.map((d, i) => ({ d, i })),
                    columns: [
                      { label: "Day", value: (r) => r.d, sort: (r) => r.i },
                      ...[8, 10, 12, 14, 16].map((h) => ({
                        label: `${h}:00`,
                        value: (r: { i: number }) => gbpCompact(s.heat[r.i][h]),
                        numeric: true,
                        sort: (r: { i: number }) => s.heat[r.i][h],
                      })),
                      { label: "Day total", value: (r) => gbp(dayTotals[r.i]), numeric: true, sort: (r) => dayTotals[r.i] },
                    ],
                  }}
                >
                  <Heatmap
                    rows={DAYS}
                    cols={hours.map((h) => String(h).padStart(2, "0"))}
                    colEvery={2}
                    values={heatVals}
                    max={heatMax}
                    format={(v) => gbp(v)}
                    cellTitle={(r, c) => `${FULL_DAYS[r]}, ${String(hours[c]).padStart(2, "0")}:00–${String(hours[c] + 1).padStart(2, "0")}:00`}
                    rowLabelWidth={40}
                    cellHeight={32}
                  />
                </ChartFrame>

                <ChartFrame
                  title="Revenue by quarter"
                  reading={
                    bestQ
                      ? `${bestQ.label} was the strongest quarter, at ${gbp(bestQ.revenue)}.${
                          bestQ.label.endsWith("Q4") ? " Wholesale buyers stock up ahead of Christmas." : ""
                        }`
                      : undefined
                  }
                  table={{
                    rows: qRows,
                    columns: [
                      { label: "Quarter", value: (r) => r.label },
                      { label: "Revenue", value: (r) => gbp(r.value), numeric: true, sort: (r) => r.value },
                    ],
                  }}
                >
                  <Columns rows={qRows} height={264} />
                </ChartFrame>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Kpi({
  label,
  value,
  full,
  cur,
  prev,
  prevText,
  points,
  spark,
  meter,
}: {
  label: string;
  value: string;
  full?: string;
  cur: number;
  prev?: number;
  prevText: string | null;
  points?: boolean;
  spark?: number[];
  meter?: number;
}) {
  let delta: { text: string; up: boolean } | null = null;
  if (prev !== undefined && prevText) {
    if (points) {
      const d = cur - prev;
      delta = { text: `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1)} pts`, up: d >= 0 };
    } else if (prev > 0) {
      const d = ((cur - prev) / prev) * 100;
      delta = { text: `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}%`, up: d >= 0 };
    }
  }
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" title={full}>
        {value}
      </div>
      <div className="kpi-delta">
        {delta ? (
          <>
            <span className={`delta ${delta.up ? "is-up" : "is-down"}`}>
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true">
                <path d={delta.up ? "M5 1l4 7H1z" : "M5 9L1 2h8z"} fill="currentColor" />
              </svg>
              {delta.text}
            </span>
            <span className="delta-vs">vs {prevText}</span>
          </>
        ) : (
          <span className="delta-vs">No earlier period to compare</span>
        )}
      </div>
      {spark && spark.length > 1 && (
        <div className="kpi-spark">
          <Sparkline values={spark} />
        </div>
      )}
      {meter !== undefined && (
        <div className="kpi-meter" role="img" aria-label={`${meter.toFixed(1)}%`}>
          <span style={{ width: `${Math.min(100, meter)}%` }} />
        </div>
      )}
    </div>
  );
}
