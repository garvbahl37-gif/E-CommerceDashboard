"use client";

import { useMemo, useState } from "react";
import { Dataset, defaultFilters, Filters, isEurope } from "@/lib/data";
import { gbpCompact, int, monthLabel } from "@/lib/format";

type Facets = { countryRev: Float64Array; segCust: Float64Array; monthRev: Float64Array };

type Props = {
  ds: Dataset;
  filters: Filters;
  facets: Facets;
  onChange: (f: Filters) => void;
};

function sameSet(a: Set<number>, b: Set<number>) {
  return a.size === b.size && [...a].every((v) => b.has(v));
}

export function FilterPanel({ ds, filters, facets, onChange }: Props) {
  const last = ds.months.length - 1;
  const idx = (ym: string) => ds.months.indexOf(ym);
  const presets = [
    { label: "All time", from: 0, to: last },
    { label: "2010", from: idx("2010-01"), to: idx("2010-12") },
    { label: "2011", from: idx("2011-01"), to: last },
    { label: "Last 6 months", from: last - 5, to: last },
    { label: "Christmas 2010", from: idx("2010-09"), to: idx("2010-12") },
    { label: "Christmas 2011", from: idx("2011-09"), to: last },
  ].filter((p) => p.from >= 0 && p.to >= 0);

  const def = defaultFilters(ds);
  const periodDirty = filters.from !== def.from || filters.to !== def.to;
  const segDirty = filters.segments.size !== ds.segments.length;
  const countryDirty = filters.countries.size !== ds.countries.length;

  return (
    <div className="filters">
      <section className="filter-block" aria-labelledby="f-period">
        <div className="filter-head">
          <h2 id="f-period">Period</h2>
          {periodDirty && (
            <button type="button" className="text-button" onClick={() => onChange({ ...filters, from: def.from, to: def.to })}>
              Reset
            </button>
          )}
        </div>
        <div className="chips" role="group" aria-label="Period presets">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              className="chip"
              aria-pressed={filters.from === p.from && filters.to === p.to}
              onClick={() => onChange({ ...filters, from: p.from, to: p.to })}
            >
              {p.label}
            </button>
          ))}
        </div>
        <RangeBrush ds={ds} filters={filters} monthRev={facets.monthRev} onChange={onChange} />
      </section>

      <section className="filter-block" aria-labelledby="f-seg">
        <div className="filter-head">
          <h2 id="f-seg">Customer segment</h2>
          {segDirty && (
            <button type="button" className="text-button" onClick={() => onChange({ ...filters, segments: def.segments })}>
              Reset
            </button>
          )}
        </div>
        <CheckList
          options={ds.segments.map((s, i) => ({ index: i, label: s, meta: `${int(facets.segCust[i])}` }))}
          selected={filters.segments}
          onChange={(segments) => onChange({ ...filters, segments })}
          metaLabel="customers"
        />
      </section>

      <section className="filter-block" aria-labelledby="f-country">
        <div className="filter-head">
          <h2 id="f-country">Country</h2>
          {countryDirty && (
            <button type="button" className="text-button" onClick={() => onChange({ ...filters, countries: def.countries })}>
              Reset
            </button>
          )}
        </div>
        <CountryFilter ds={ds} filters={filters} countryRev={facets.countryRev} onChange={onChange} />
      </section>
    </div>
  );
}

/** Two-thumb month range over a mini revenue area, so the reader sees what they're selecting. */
function RangeBrush({
  ds,
  filters,
  monthRev,
  onChange,
}: {
  ds: Dataset;
  filters: Filters;
  monthRev: Float64Array;
  onChange: (f: Filters) => void;
}) {
  const n = ds.months.length;
  const max = Math.max(1, ...monthRev);
  const W = 100;
  const H = 40;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - (v / max) * (H - 4);
  const pts = Array.from(monthRev, (v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`);
  const areaD = `M0,${H}L${pts.join("L")}L${W},${H}Z`;
  const selPts = pts.slice(filters.from, filters.to + 1);
  const selD =
    filters.from === filters.to
      ? ""
      : `M${x(filters.from)},${H}L${selPts.join("L")}L${x(filters.to)},${H}Z`;

  return (
    <div className="brush">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="brush-plot" aria-hidden="true">
        <path d={areaD} className="brush-all" />
        {selD && <path d={selD} className="brush-sel" />}
        <line x1={x(filters.from)} x2={x(filters.from)} y1={0} y2={H} className="brush-edge" vectorEffect="non-scaling-stroke" />
        <line x1={x(filters.to)} x2={x(filters.to)} y1={0} y2={H} className="brush-edge" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="brush-inputs">
        <input
          type="range"
          min={0}
          max={n - 1}
          value={filters.from}
          aria-label="Start month"
          aria-valuetext={monthLabel(ds.months[filters.from], true)}
          onChange={(e) => {
            const from = Math.min(Number(e.target.value), filters.to);
            onChange({ ...filters, from });
          }}
        />
        <input
          type="range"
          min={0}
          max={n - 1}
          value={filters.to}
          aria-label="End month"
          aria-valuetext={monthLabel(ds.months[filters.to], true)}
          onChange={(e) => {
            const to = Math.max(Number(e.target.value), filters.from);
            onChange({ ...filters, to });
          }}
        />
      </div>
      <div className="brush-labels">
        <span>{monthLabel(ds.months[filters.from])}</span>
        <span>
          {monthLabel(ds.months[filters.to])}
          {filters.to === n - 1 && ds.lastMonthPartial ? " (to 9th)" : ""}
        </span>
      </div>
    </div>
  );
}

function CheckList({
  options,
  selected,
  onChange,
  metaLabel,
  max,
}: {
  options: { index: number; label: string; meta: string }[];
  selected: Set<number>;
  onChange: (s: Set<number>) => void;
  metaLabel: string;
  max?: number;
}) {
  function toggle(i: number) {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    if (next.size > 0) onChange(next);
  }
  const shown = max ? options.slice(0, max) : options;
  return (
    <ul className="checklist" style={max ? undefined : undefined}>
      {shown.map((o) => {
        const on = selected.has(o.index);
        const only = on && selected.size === 1;
        return (
          <li key={o.index} className={on ? "is-on" : undefined}>
            <label>
              <input type="checkbox" checked={on} onChange={() => toggle(o.index)} />
              <span className="check-label">{o.label}</span>
              <span className="check-meta" title={`${o.meta} ${metaLabel}`}>
                {o.meta}
              </span>
            </label>
            {!only && (
              <button
                type="button"
                className="only-button"
                onClick={() => onChange(new Set([o.index]))}
                aria-label={`Show only ${o.label}`}
              >
                Only
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CountryFilter({
  ds,
  filters,
  countryRev,
  onChange,
}: {
  ds: Dataset;
  filters: Filters;
  countryRev: Float64Array;
  onChange: (f: Filters) => void;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const uk = ds.countries.indexOf("United Kingdom");
  const all = ds.countries.map((_, i) => i);
  const groups = [
    { label: "All", set: new Set(all) },
    { label: "UK", set: new Set([uk]) },
    { label: "Europe", set: new Set(all.filter((i) => i !== uk && isEurope(ds.countries[i]))) },
    { label: "Rest of world", set: new Set(all.filter((i) => i !== uk && !isEurope(ds.countries[i]))) },
    { label: "Outside UK", set: new Set(all.filter((i) => i !== uk)) },
  ];

  const q = query.trim().toLowerCase();
  const options = useMemo(
    () =>
      ds.countries
        .map((c, i) => ({ index: i, label: c, rev: countryRev[i] }))
        .filter((o) => !q || o.label.toLowerCase().includes(q))
        .sort((a, b) => b.rev - a.rev)
        .map((o) => ({ index: o.index, label: o.label, meta: o.rev > 0 ? gbpCompact(o.rev) : "–" })),
    [ds.countries, countryRev, q],
  );

  return (
    <>
      <div className="chips" role="group" aria-label="Country groups">
        {groups.map((g) => (
          <button
            key={g.label}
            type="button"
            className="chip"
            aria-pressed={sameSet(g.set, filters.countries)}
            onClick={() => onChange({ ...filters, countries: new Set(g.set) })}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="search">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <circle cx="6" cy="6" r="4.3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9.3 9.3L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder={`Search ${ds.countries.length} countries`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search countries"
        />
      </div>
      {options.length === 0 ? (
        <p className="filter-empty">No country matches “{query}”.</p>
      ) : (
        <CheckList
          options={options}
          selected={filters.countries}
          onChange={(countries) => onChange({ ...filters, countries })}
          metaLabel="revenue"
          max={expanded || q ? undefined : 8}
        />
      )}
      {!q && options.length > 8 && (
        <button type="button" className="text-button more" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
          {expanded ? "Show fewer" : `Show all ${options.length}`}
        </button>
      )}
    </>
  );
}

/** Removable chips for every active filter, shown above the results. */
export function ActiveFilters({ ds, filters, onChange }: { ds: Dataset; filters: Filters; onChange: (f: Filters) => void }) {
  const def = defaultFilters(ds);
  const chips: { label: string; clear: () => void }[] = [];
  if (filters.from !== def.from || filters.to !== def.to)
    chips.push({
      label:
        filters.from === filters.to
          ? monthLabel(ds.months[filters.from])
          : `${monthLabel(ds.months[filters.from])} – ${monthLabel(ds.months[filters.to])}`,
      clear: () => onChange({ ...filters, from: def.from, to: def.to }),
    });
  const uk = ds.countries.indexOf("United Kingdom");
  if (filters.countries.size !== ds.countries.length) {
    const names = [...filters.countries].map((i) => ds.countries[i]);
    const outsideUK = filters.countries.size === ds.countries.length - 1 && !filters.countries.has(uk);
    chips.push({
      label: outsideUK ? "Outside the UK" : names.length <= 2 ? names.join(", ") : `${names.length} countries`,
      clear: () => onChange({ ...filters, countries: def.countries }),
    });
  }
  if (filters.segments.size !== ds.segments.length) {
    const names = [...filters.segments].map((i) => ds.segments[i]);
    chips.push({
      label: names.length <= 2 ? names.join(", ") : `${names.length} segments`,
      clear: () => onChange({ ...filters, segments: def.segments }),
    });
  }
  if (!chips.length) return <p className="active-none">Showing everything. Use the filters, or click a bar or a month, to narrow it down.</p>;
  return (
    <div className="active-filters" aria-label="Active filters">
      {chips.map((c) => (
        <span key={c.label} className="active-chip">
          {c.label}
          <button type="button" onClick={c.clear} aria-label={`Remove filter: ${c.label}`}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button type="button" className="text-button" onClick={() => onChange(def)}>
          Clear all
        </button>
      )}
    </div>
  );
}
