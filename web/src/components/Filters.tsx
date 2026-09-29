"use client";

import { ReactNode, useEffect, useId, useRef, useState } from "react";
import type { Dataset, Filters } from "@/lib/data";
import { monthLabel } from "@/lib/format";

type Props = {
  ds: Dataset;
  filters: Filters;
  onChange: (f: Filters) => void;
  onReset: () => void;
  isDefault: boolean;
};

export function FilterBar({ ds, filters, onChange, onReset, isDefault }: Props) {
  const last = ds.months.length - 1;
  const idx = (ym: string) => ds.months.indexOf(ym);
  const presets: { label: string; from: number; to: number }[] = [
    { label: "All months", from: 0, to: last },
    { label: "2010", from: idx("2010-01"), to: idx("2010-12") },
    { label: "2011", from: idx("2011-01"), to: last },
    { label: "Christmas 2010", from: idx("2010-09"), to: idx("2010-12") },
    { label: "Christmas 2011", from: idx("2011-09"), to: last },
  ].filter((p) => p.from >= 0 && p.to >= 0);

  const uk = ds.countries.indexOf("United Kingdom");
  const allCountries = ds.countries.map((_, i) => i);

  return (
    <div className="filter-bar" role="region" aria-label="Filters">
      <div className="filter-group">
        <span className="filter-label" id="period-label">
          Period
        </span>
        <div className="segmented" role="group" aria-labelledby="period-label">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={filters.from === p.from && filters.to === p.to}
              onClick={() => onChange({ ...filters, from: p.from, to: p.to })}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="range">
          <label>
            <span className="sr-only">From month</span>
            <select
              value={filters.from}
              onChange={(e) => {
                const from = Number(e.target.value);
                onChange({ ...filters, from, to: Math.max(from, filters.to) });
              }}
            >
              {ds.months.map((m, i) => (
                <option key={m} value={i}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <span aria-hidden="true">to</span>
          <label>
            <span className="sr-only">To month</span>
            <select
              value={filters.to}
              onChange={(e) => {
                const to = Number(e.target.value);
                onChange({ ...filters, to, from: Math.min(to, filters.from) });
              }}
            >
              {ds.months.map((m, i) => (
                <option key={m} value={i}>
                  {monthLabel(m)}
                  {i === last && ds.lastMonthPartial ? " (partial)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Countries</span>
        <MultiSelect
          label="Countries"
          options={ds.countries}
          selected={filters.countries}
          onChange={(countries) => onChange({ ...filters, countries })}
          summary={(s) =>
            s.size === ds.countries.length
              ? `All ${ds.countries.length}`
              : s.size === 1
                ? ds.countries[[...s][0]]
                : s.size === ds.countries.length - 1 && !s.has(uk)
                  ? "Outside the UK"
                  : `${s.size} of ${ds.countries.length}`
          }
          quick={[
            { label: "All", set: new Set(allCountries) },
            { label: "UK only", set: new Set([uk]) },
            { label: "Outside the UK", set: new Set(allCountries.filter((i) => i !== uk)) },
          ]}
          searchable
        />
      </div>

      <div className="filter-group">
        <span className="filter-label">Customer segments</span>
        <MultiSelect
          label="Customer segments"
          options={ds.segments}
          selected={filters.segments}
          onChange={(segments) => onChange({ ...filters, segments })}
          summary={(s) =>
            s.size === ds.segments.length ? "All 7" : s.size === 1 ? ds.segments[[...s][0]] : `${s.size} of ${ds.segments.length}`
          }
          quick={[{ label: "All", set: new Set(ds.segments.map((_, i) => i)) }]}
        />
      </div>

      {!isDefault && (
        <button type="button" className="link-button reset" onClick={onReset}>
          Clear filters
        </button>
      )}
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  summary,
  quick,
  searchable,
}: {
  label: string;
  options: string[];
  selected: Set<number>;
  onChange: (s: Set<number>) => void;
  summary: (s: Set<number>) => ReactNode;
  quick: { label: string; set: Set<number> }[];
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>(".select-trigger")?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const visible = options.map((o, i) => ({ o, i })).filter(({ o }) => !q || o.toLowerCase().includes(q));
  const same = (a: Set<number>, b: Set<number>) => a.size === b.size && [...a].every((v) => b.has(v));

  function toggle(i: number) {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    if (next.size > 0) onChange(next);
  }

  return (
    <div className="select" ref={root}>
      <button
        type="button"
        className="select-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label}: ${typeof summary(selected) === "string" ? summary(selected) : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        {summary(selected)}
        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div className="select-panel" id={panelId}>
          <div className="select-quick">
            {quick.map((qk) => (
              <button key={qk.label} type="button" aria-pressed={same(qk.set, selected)} onClick={() => onChange(new Set(qk.set))}>
                {qk.label}
              </button>
            ))}
          </div>
          {searchable && (
            <input
              type="search"
              placeholder="Find a country"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={`Search ${label.toLowerCase()}`}
              autoFocus
            />
          )}
          <ul className="select-list">
            {visible.map(({ o, i }) => (
              <li key={o}>
                <label>
                  <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} />
                  <span>{o}</span>
                </label>
              </li>
            ))}
            {visible.length === 0 && <li className="select-empty">No country matches “{query}”.</li>}
          </ul>
          <p className="select-foot">At least one stays selected.</p>
        </div>
      )}
    </div>
  );
}
