"use client";

import { ReactNode, useLayoutEffect, useRef, useState } from "react";

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
  const flip = tip.x > width - 190;
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
          <span>{r.label}</span>
        </div>
      ))}
    </div>
  );
}

export type Column<T> = { label: string; value: (row: T) => ReactNode; numeric?: boolean };

/** Chart wrapper: title, one-line reading of the chart, and a table view toggle. */
export function ChartFrame<T>({
  title,
  reading,
  legend,
  table,
  className,
  children,
}: {
  title: string;
  reading?: ReactNode;
  legend?: ReactNode;
  table?: { rows: T[]; columns: Column<T>[] };
  className?: string;
  children: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className={`chart ${className ?? ""}`}>
      <figcaption className="chart-head">
        <div>
          <h3>{title}</h3>
          {reading && <p className="chart-reading">{reading}</p>}
        </div>
        {table && (
          <button
            type="button"
            className="link-button"
            aria-pressed={showTable}
            onClick={() => setShowTable((s) => !s)}
          >
            {showTable ? "Show chart" : "Show table"}
          </button>
        )}
      </figcaption>
      {legend && !showTable && <div className="legend">{legend}</div>}
      {showTable && table ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {table.columns.map((c) => (
                  <th key={c.label} className={c.numeric ? "num" : undefined} scope="col">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {table.columns.map((c) => (
                    <td key={c.label} className={c.numeric ? "num" : undefined}>
                      {c.value(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </figure>
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
export function seqColor(t: number) {
  if (!Number.isFinite(t)) return "transparent";
  const k = Math.max(0, Math.min(8, Math.round(t * 8)));
  return `var(--seq-${k})`;
}
