"use client";

import { useEffect, useMemo, useState } from "react";
import { Columns, HBars } from "./charts/Bars";
import { ClusterFacets, ClusterPoint } from "./charts/ClusterFacets";
import { Dumbbell } from "./charts/Dumbbell";
import { Heatmap, RampLegend } from "./charts/Heatmap";
import { ChartFrame, LegendItem } from "./charts/primitives";
import { TrendChart } from "./charts/TrendChart";
import { FilterBar } from "./Filters";
import { Dataset, DAYS, Filters, prepare, RawData, summarise } from "@/lib/data";
import { gbp, gbpCompact, int, monthLabel, monthShort, pct, signedPct, titleCase } from "@/lib/format";

function defaults(ds: Dataset): Filters {
  return {
    from: 0,
    to: ds.months.length - 1,
    countries: new Set(ds.countries.map((_, i) => i)),
    segments: new Set(ds.segments.map((_, i) => i)),
  };
}

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
        <p>Loading 36,969 orders…</p>
      </div>
    );
  return <Loaded ds={ds} />;
}

function Loaded({ ds }: { ds: Dataset }) {
  const [filters, setFilters] = useState<Filters>(() => defaults(ds));
  const [hideUK, setHideUK] = useState(false);
  const s = useMemo(() => summarise(ds, filters), [ds, filters]);

  const def = defaults(ds);
  const isDefault =
    filters.from === def.from &&
    filters.to === def.to &&
    filters.countries.size === def.countries.size &&
    filters.segments.size === def.segments.size;

  const lastIdx = ds.months.length - 1;
  const trend = s.monthly.map((d) => ({
    label: monthLabel(ds.months[d.month], true),
    short: monthShort(ds.months[d.month]),
    value: d.revenue,
    orders: d.orders,
    partial: d.month === lastIdx && ds.lastMonthPartial,
  }));

  // Peak month per calendar year in view, marked on the chart.
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

  const empty = s.orders === 0;
  const topCountry = s.countries[0];
  const peakMonth = trend.filter((d) => !d.partial).reduce<(typeof trend)[number] | null>((b, d) => (!b || d.value > b.value ? d : b), null);
  const rangeText =
    filters.from === filters.to
      ? monthLabel(ds.months[filters.from], true)
      : `${monthLabel(ds.months[filters.from], true)} to ${monthLabel(ds.months[filters.to], true)}${
          filters.to === lastIdx && ds.lastMonthPartial ? ` (data ends ${Number(ds.meta.lastDate.slice(8))} December)` : ""
        }`;

  // ── Segment shares
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

  // ── Cohorts
  const cohortMaxCols = s.cohorts.length ? Math.max(...s.cohorts.map((c) => c.retention.length)) : 0;
  const cohortVals = s.cohorts.map((c) =>
    Array.from({ length: cohortMaxCols }, (_, k) => (k === 0 ? NaN : (c.retention[k] ?? NaN))),
  );
  const m1 = s.cohorts.filter((c) => c.retention.length > 1 && c.size >= 20);
  const avgM1 = m1.length ? m1.reduce((a, c) => a + c.retention[1], 0) / m1.length : NaN;
  const cohortMax = Math.max(1, ...cohortVals.flat().filter(Number.isFinite));

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

  // ── Countries
  const uk = ds.countries.indexOf("United Kingdom");
  const ukRev = s.countries.find((c) => c.index === uk)?.revenue ?? 0;
  const countryRows = s.countries
    .filter((c) => !(hideUK && c.index === uk))
    .slice(0, 10)
    .map((c) => ({
      key: ds.countries[c.index],
      label: ds.countries[c.index],
      value: c.revenue,
      accent: c.index === uk,
      detail: `${pct((c.revenue / s.revenue) * 100)} of revenue`,
    }));

  // ── Products
  const productRows = s.products.map((p) => ({
    key: String(p.index),
    label: titleCase(ds.products[p.index]),
    value: p.revenue,
    detail: `${int(p.units)} units`,
  }));

  // ── Weekday × hour
  const hours = Array.from({ length: 15 }, (_, k) => k + 6); // 06:00–20:00
  const heatVals = s.heat.map((row) => hours.map((h) => row[h]));
  const heatMax = Math.max(1, ...heatVals.flat());
  let busiest = { d: 0, h: 0, v: -1 };
  heatVals.forEach((row, d) => row.forEach((v, j) => v > busiest.v && (busiest = { d, h: hours[j], v })));
  const dayTotals = s.heat.map((row) => row.reduce((a, b) => a + b, 0));
  const quietDay = dayTotals.indexOf(Math.min(...dayTotals));
  const fullDay = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // ── Quarters
  const bestQ = s.quarters.reduce<(typeof s.quarters)[number] | null>((b, q) => (!b || q.revenue > b.revenue ? q : b), null);
  const qRows = s.quarters.map((q) => ({
    key: q.label.replace(" ", " ").replace(/^20/, "’"),
    label: q.label,
    value: q.revenue,
    detail: "revenue",
  }));

  return (
    <>
      <FilterBar ds={ds} filters={filters} onChange={setFilters} onReset={() => setFilters(defaults(ds))} isDefault={isDefault} />

      <main id="main" className="page">
        <section className="hero" aria-labelledby="hero-title">
          <p className="hero-range">{rangeText}</p>
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
                {peakMonth && trend.length > 1 && (
                  <>
                    {peakMonth.label} was the biggest month, at {gbp(peakMonth.value)}.{" "}
                  </>
                )}
                {topCountry &&
                  (s.countries.length === 1
                    ? `Every order came from ${ds.countries[topCountry.index]}.`
                    : `${ds.countries[topCountry.index]} accounts for ${pct((topCountry.revenue / s.revenue) * 100)} of revenue.`)}
              </p>
            </>
          )}

          <dl className="stats">
            <Stat label="Revenue" value={gbp(s.revenue)} />
            <Stat label="Orders" value={int(s.orders)} />
            <Stat label="Customers" value={int(s.customers)} />
            <Stat label="Average order" value={gbp(s.aov, 2)} />
            <Stat label="Ordered more than once" value={pct(s.repeatRate)} />
            <Stat
              label={s.mom ? `${monthLabel(ds.months[s.mom.month])} vs ${monthLabel(ds.months[s.mom.prev])}` : "Month on month"}
              value={s.mom ? signedPct(s.mom.pct) : "Needs 2 full months"}
              tone={s.mom ? (s.mom.pct >= 0 ? "up" : "down") : undefined}
              small={!s.mom}
            />
          </dl>

          <ChartFrame
            title="Revenue by month"
            reading={
              ds.lastMonthPartial && filters.to === lastIdx
                ? "Peaks are marked for each year. The final point is hollow because December 2011 only runs to the 9th."
                : "Peaks are marked for each year."
            }
            className="chart-hero"
            table={{
              rows: trend,
              columns: [
                { label: "Month", value: (r) => r.label + (r.partial ? " (partial)" : "") },
                { label: "Revenue", value: (r) => gbp(r.value), numeric: true },
                { label: "Orders", value: (r) => int(r.orders), numeric: true },
              ],
            }}
          >
            <TrendChart data={trend} highlight={peaks} height={320} />
          </ChartFrame>
        </section>

        {!empty && (
          <>
            <section className="section" aria-labelledby="customers">
              <header className="section-head">
                <h2 id="customers">Who buys</h2>
                <p>
                  Customers are grouped by how recently, how often and how much they order (RFM). The shares
                  below use revenue from the selected period only.
                </p>
              </header>
              <div className="grid-2">
                <ChartFrame
                  title="Share of customers against share of revenue"
                  reading={
                    segRows.length === 1
                      ? `Showing ${segRows[0].label} only. Add segments back to compare shares.`
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
                      { label: "Customers", value: (r) => pct(r.a), numeric: true },
                      { label: "Revenue", value: (r) => pct(r.b), numeric: true },
                    ],
                  }}
                >
                  <Dumbbell rows={segRows} aLabel="Customers" bLabel="Revenue" />
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
                      { label: "First order", value: (r) => monthLabel(ds.months[r.month]) },
                      { label: "New customers", value: (r) => int(r.size), numeric: true },
                      { label: "Back after 1 month", value: (r) => (r.retention[1] !== undefined ? pct(r.retention[1]) : "–"), numeric: true },
                      { label: "After 3", value: (r) => (r.retention[3] !== undefined ? pct(r.retention[3]) : "–"), numeric: true },
                      { label: "After 6", value: (r) => (r.retention[6] !== undefined ? pct(r.retention[6]) : "–"), numeric: true },
                      { label: "After 12", value: (r) => (r.retention[12] !== undefined ? pct(r.retention[12]) : "–"), numeric: true },
                    ],
                  }}
                >
                  <p className="axis-note">Months after first order →</p>
                  <Heatmap
                    rows={s.cohorts.map((c) => monthLabel(ds.months[c.month]))}
                    cols={Array.from({ length: cohortMaxCols }, (_, k) => String(k))}
                    colEvery={cohortMaxCols > 13 ? 3 : 1}
                    values={cohortVals}
                    max={cohortMax}
                    format={(v) => `${pct(v)} ordered again`}
                    cellTitle={(r, c) =>
                      `${int(s.cohorts[r].size)} new in ${monthLabel(ds.months[s.cohorts[r].month])}, ${c} month${c === 1 ? "" : "s"} later`
                    }
                    rowLabelWidth={68}
                    cellHeight={s.cohorts.length > 14 ? 13 : 20}
                  />
                </ChartFrame>
              </div>

              <ChartFrame
                title="Four kinds of customer"
                reading="K-Means clusters on all-time recency, frequency and spend. Each panel shows its own cluster against everyone else in grey. Across: days since last order. Up: lifetime spend (log scale)."
              >
                <ClusterFacets points={clusterPoints} clusters={ds.clusters} />
              </ChartFrame>
            </section>

            <section className="section" aria-labelledby="products">
              <header className="section-head">
                <h2 id="products">What sells, and where</h2>
                <p>
                  Product rankings cover the {ds.meta.topProducts} best-selling of {int(ds.meta.totalProducts)} products, which
                  between them account for most of the revenue.
                </p>
              </header>
              <div className="grid-2">
                <ChartFrame
                  title="Top 10 products by revenue"
                  reading={productRows[0] ? `${productRows[0].label} leads with ${gbp(productRows[0].value)}.` : "No product sales in this selection."}
                  table={{
                    rows: productRows,
                    columns: [
                      { label: "Product", value: (r) => r.label },
                      { label: "Revenue", value: (r) => gbp(r.value), numeric: true },
                      { label: "Units", value: (r) => r.detail.replace(" units", ""), numeric: true },
                    ],
                  }}
                >
                  <HBars rows={productRows} format={gbpCompact} tipFormat={(v) => gbp(v)} />
                </ChartFrame>

                <ChartFrame
                  title="Top 10 countries by revenue"
                  reading={
                    ukRev > 0 && s.countries.length > 1
                      ? `The UK, in red, brings in ${pct((ukRev / s.revenue) * 100)} of revenue.`
                      : `${s.countries.length} ${s.countries.length === 1 ? "country" : "countries"} in this selection.`
                  }
                  table={{
                    rows: countryRows,
                    columns: [
                      { label: "Country", value: (r) => r.label },
                      { label: "Revenue", value: (r) => gbp(r.value), numeric: true },
                      { label: "Share", value: (r) => r.detail.replace(" of revenue", ""), numeric: true },
                    ],
                  }}
                >
                  {ukRev > 0 && s.countries.length > 1 && (
                    <label className="toggle">
                      <input type="checkbox" checked={hideUK} onChange={(e) => setHideUK(e.target.checked)} />
                      Leave out the UK to compare the rest
                    </label>
                  )}
                  <HBars rows={countryRows} format={gbpCompact} tipFormat={(v) => gbp(v)} />
                </ChartFrame>
              </div>
            </section>

            <section className="section" aria-labelledby="timing">
              <header className="section-head">
                <h2 id="timing">When orders come in</h2>
                <p>Order times are UK time, from the invoice timestamp.</p>
              </header>
              <div className="grid-2 grid-wide-left">
                <ChartFrame
                  title="Revenue by weekday and hour"
                  reading={`${fullDay[busiest.d]} around ${String(busiest.h).padStart(2, "0")}:00 is the busiest hour. ${
                    dayTotals[quietDay] < s.revenue * 0.01 ? `${fullDay[quietDay]}s are almost silent.` : ""
                  }`}
                  legend={<RampLegend low="Less" high="More revenue" />}
                  table={{
                    rows: DAYS.map((d, i) => ({ d, i })),
                    columns: [
                      { label: "Day", value: (r) => r.d },
                      ...[8, 10, 12, 14, 16].map((h) => ({
                        label: `${h}:00`,
                        value: (r: { i: number }) => gbpCompact(s.heat[r.i][h]),
                        numeric: true,
                      })),
                      { label: "Day total", value: (r) => gbp(dayTotals[r.i]), numeric: true },
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
                    cellTitle={(r, c) => `${fullDay[r]}, ${String(hours[c]).padStart(2, "0")}:00–${String(hours[c] + 1).padStart(2, "0")}:00`}
                    rowLabelWidth={40}
                    cellHeight={30}
                  />
                </ChartFrame>

                <ChartFrame
                  title="Revenue by quarter"
                  reading={
                    bestQ
                      ? `${bestQ.label} was the strongest quarter, at ${gbp(bestQ.revenue)}.${bestQ.label.endsWith("Q4") ? " Wholesale buyers stock up ahead of Christmas." : ""}`
                      : undefined
                  }
                  table={{
                    rows: qRows,
                    columns: [
                      { label: "Quarter", value: (r) => r.label },
                      { label: "Revenue", value: (r) => gbp(r.value), numeric: true },
                    ],
                  }}
                >
                  <Columns rows={qRows} height={240} />
                </ChartFrame>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}

function Stat({ label, value, tone, small }: { label: string; value: string; tone?: "up" | "down"; small?: boolean }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd className={`${tone ? `tone-${tone}` : ""}${small ? " stat-small" : ""}`}>
        {tone && (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d={tone === "up" ? "M5 1l4 6H1z" : "M5 9L1 3h8z"} fill="currentColor" />
          </svg>
        )}
        {value}
      </dd>
    </div>
  );
}
