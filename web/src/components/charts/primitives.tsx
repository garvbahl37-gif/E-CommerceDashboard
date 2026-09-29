"use client";

import { ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";

/** Width of an element, tracked with ResizeObserver. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export type TipRow = { key?: string; value: string; label: string };
export type TipState = { x: number; y: number; title: string; rows: TipRow[] } | null;

/** Single floating readout. Values lead, labels follow; series keyed by a short line. */
export function Tooltip({ tip, width }: { tip: TipState; width: number }) {
  if (!tip) return null;
  const flip = tip.x > width - 200;
  return (
    <div
      className="tooltip"
      role="status"
      style={{
        left: flip ? undefined : tip.x + 14,
        right: flip ? width - tip.x + 14 : undefined,
        top: Math.max(0, tip.y - 12),
      }}
    >
      <div className="tooltip-title">{tip.title}</div>
      {tip.rows.map((r, i) => (
        <div className="tooltip-row" key={i}>
          {r.key && <span className="tooltip-key" style={{ background: r.key }} />}
          <strong>{r.value}</strong>
          {r.label && <span>{r.label}</span>}
        </div>
      ))}
    </div>
  );
}

export type Column<T> = {
  label: string;
  value: (row: T) => ReactNode;
  numeric?: boolean;
  sort?: (row: T) => number | string;
  width?: string;
};

/** Chart wrapper: title, one-line reading, optional controls, and a table view toggle. */
export function ChartFrame<T>({
  title,
  reading,
  legend,
  actions,
  table,
  className,
  children,
}: {
  title: string;
  reading?: ReactNode;
  legend?: ReactNode;
  actions?: ReactNode;
  table?: { rows: T[]; columns: Column<T>[] };
  className?: string;
  children: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className={`chart ${className ?? ""}`}>
      <figcaption className="chart-head">
        <div className="chart-titles">
          <h3>{title}</h3>
          {reading && <p className="chart-reading">{reading}</p>}
        </div>
        <div className="chart-actions">
          {!showTable && actions}
          {table && (
            <button
              type="button"
              className="ghost-button"
              aria-pressed={showTable}
              onClick={() => setShowTable((s) => !s)}
              title={showTable ? "Show chart" : "Show the numbers as a table"}
            >
              {showTable ? (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M1 12h12M3 10V6M7 10V3M11 10V7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M1.5 3.5h11M1.5 7h11M1.5 10.5h11M5 1.5v11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              )}
              {showTable ? "Chart" : "Table"}
            </button>
          )}
        </div>
      </figcaption>
      {legend && !showTable && <div className="legend">{legend}</div>}
      {showTable && table ? <DataTable rows={table.rows} columns={table.columns} maxHeight={420} /> : children}
    </figure>
  );
}

/** Sortable table; click a header to sort, click again to flip. */
export function DataTable<T>({
  rows,
  columns,
  maxHeight,
  initialSort,
  onRowClick,
  rowActive,
}: {
  rows: T[];
  columns: Column<T>[];
  maxHeight?: number;
  initialSort?: { index: number; desc: boolean };
  onRowClick?: (row: T) => void;
  rowActive?: (row: T) => boolean;
}) {
  const [sort, setSort] = useState<{ index: number; desc: boolean } | null>(initialSort ?? null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns[sort.index];
    const key = col.sort ?? ((r: T) => String(col.value(r)));
    return [...rows].sort((a, b) => {
      const va = key(a);
      const vb = key(b);
      const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sort.desc ? -c : c;
    });
  }, [rows, columns, sort]);

  return (
    <div className="table-wrap" style={maxHeight ? { maxHeight } : undefined}>
      <table>
        <thead>
          <tr>
            {columns.map((c, i) => {
              const active = sort?.index === i;
              return (
                <th
                  key={c.label}
                  className={c.numeric ? "num" : undefined}
                  scope="col"
                  style={c.width ? { width: c.width } : undefined}
                  aria-sort={active ? (sort!.desc ? "descending" : "ascending") : undefined}
                >
                  {c.label ? (
                    <button
                      type="button"
                      className="th-sort"
                      onClick={() => setSort(active ? { index: i, desc: !sort!.desc } : { index: i, desc: !!c.numeric })}
                    >
                      {c.label}
                      <span className={`sort-caret${active ? " is-on" : ""}`} aria-hidden="true">
                        {active ? (sort!.desc ? "↓" : "↑") : "↕"}
                      </span>
                    </button>
                  ) : null}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr
              key={i}
              className={`${onRowClick ? "is-clickable" : ""}${rowActive?.(r) ? " is-selected" : ""}`}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
            >
              {columns.map((c) => (
                <td key={c.label} className={c.numeric ? "num" : undefined}>
                  {c.value(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegendItem({ color, label, shape = "rect" }: { color: string; label: string; shape?: "rect" | "line" | "dot" }) {
  return (
    <span className="legend-item">
      <span className={`legend-swatch legend-${shape}`} style={{ background: color }} />
      {label}
    </span>
  );
}

/** Small segmented control for switching a chart's measure. */
export function Segmented<V extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <div className="segmented segmented-sm" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Tiny trend line; decorative (the value it summarises is always printed beside it). */
export function Sparkline({ values, height = 32, highlightLast = true }: { values: number[]; height?: number; highlightLast?: boolean }) {
  const w = 100;
  const n = values.length;
  if (n < 2) return <svg className="sparkline" height={height} aria-hidden="true" />;
  const max = Math.max(...values, 1e-9);
  const min = Math.min(0, ...values);
  const x = (i: number) => (i / (n - 1)) * w;
  const y = (v: number) => height - 3 - ((v - min) / (max - min || 1)) * (height - 6);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join("");
  return (
    <span className="spark-wrap" style={{ height }}>
      <svg className="sparkline" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" height={height} aria-hidden="true">
        <path d={`${d}L${w},${height}L0,${height}Z`} className="spark-area" />
        <path d={d} className="spark-line" vectorEffect="non-scaling-stroke" />
      </svg>
      {highlightLast && <span className="spark-dot" style={{ top: `${(y(values[n - 1]) / height) * 100}%` }} aria-hidden="true" />}
    </span>
  );
}

/** Inline share bar for table cells. */
export function ShareBar({ pct, accent }: { pct: number; accent?: boolean }) {
  return (
    <span className="share">
      <span className="share-track">
        <span className={`share-fill${accent ? " is-accent" : ""}`} style={{ width: `${Math.max(1, Math.min(100, pct))}%` }} />
      </span>
      <span className="share-value">{pct < 0.1 ? "<0.1" : pct.toFixed(1)}%</span>
    </span>
  );
}

/** Rect with only the data-end rounded (4px), square at the baseline. */
export function barPath(x: number, y: number, w: number, h: number, dir: "up" | "right", r = 4) {
  if (w <= 0 || h <= 0) return "";
  if (dir === "up") {
    const rr = Math.min(r, w / 2, h);
    return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
  }
  const rr = Math.min(r, h / 2, w);
  return `M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z`;
}

/** 9-step sequential ramp (CSS vars --seq-0 … --seq-8), quantised. */
export function seqStep(t: number) {
  return Math.max(0, Math.min(8, Math.round(t * 8)));
}
export function seqColor(t: number) {
  if (!Number.isFinite(t)) return "transparent";
  return `var(--seq-${seqStep(t)})`;
}
