"use client";

import { scaleBand, scaleLinear } from "d3-scale";
import { useState } from "react";
import { barPath, TipState, Tooltip, useWidth } from "./primitives";
import { gbpCompact } from "@/lib/format";

export type BarRow = { key: string; label: string; value: number; accent?: boolean; detail?: string };

/** Horizontal bars, value at the tip. Labels sit above each bar so long names never truncate. */
export function HBars({
  rows,
  format,
  tipFormat = format,
  rowHeight = 38,
}: {
  rows: BarRow[];
  format: (v: number) => string;
  tipFormat?: (v: number) => string;
  rowHeight?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const height = rows.length * rowHeight + 4;
  const valueRoom = 64;
  const x = scaleLinear()
    .domain([0, Math.max(1, ...rows.map((r) => r.value))])
    .range([0, Math.max(0, width - valueRoom)]);
  const barH = 10;

  const a = active !== null ? rows[active] : null;
  const tip: TipState = a
    ? {
        x: Math.min(x(a.value), width - 10),
        y: active! * rowHeight + 14,
        title: a.label,
        rows: [{ value: tipFormat(a.value), label: a.detail ?? "" }],
      }
    : null;

  return (
    <div ref={ref} className="plot" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="list">
          {rows.map((r, i) => {
            const y0 = i * rowHeight;
            return (
              <g
                key={r.key}
                role="listitem"
                tabIndex={0}
                aria-label={`${r.label}: ${tipFormat(r.value)}`}
                className={`bar-row${active === i ? " is-active" : ""}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                <rect x={0} y={y0} width={width} height={rowHeight} fill="transparent" />
                <text x={0} y={y0 + 13} className="bar-label">
                  {r.label}
                </text>
                <line x1={0} x2={0} y1={y0 + 19} y2={y0 + 19 + barH} className="axis-line" />
                <path
                  d={barPath(0, y0 + 19, Math.max(2, x(r.value)), barH, "right")}
                  className={r.accent ? "bar bar-accent" : "bar"}
                />
                <text x={x(r.value) + 8} y={y0 + 19 + barH / 2} dy="0.34em" className="bar-value">
                  {format(r.value)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip tip={tip} width={width} />
    </div>
  );
}

/** Vertical columns with a value on the tallest cap and the rest on hover/focus. */
export function Columns({
  rows,
  height = 240,
  format = gbpCompact,
  tipFormat = format,
}: {
  rows: BarRow[];
  height?: number;
  format?: (v: number) => string;
  tipFormat?: (v: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const m = { top: 22, right: 4, bottom: 26, left: 48 };
  const w = Math.max(0, width - m.left - m.right);
  const h = height - m.top - m.bottom;
  const xb = scaleBand<number>()
    .domain(rows.map((_, i) => i))
    .range([0, w])
    .paddingInner(0.25)
    .paddingOuter(0.1);
  const y = scaleLinear().domain([0, Math.max(1, ...rows.map((r) => r.value))]).nice(4).range([h, 0]);
  const bw = Math.min(24, xb.bandwidth());
  const maxIdx = rows.reduce((b, r, i) => (r.value > rows[b].value ? i : b), 0);
  const skip = xb.bandwidth() < 26 ? 2 : 1;

  const a = active !== null ? rows[active] : null;
  const tip: TipState = a
    ? {
        x: m.left + (xb(active!) ?? 0) + xb.bandwidth() / 2,
        y: m.top + y(a.value),
        title: a.label,
        rows: [{ value: tipFormat(a.value), label: a.detail ?? "" }],
      }
    : null;

  return (
    <div ref={ref} className="plot" style={{ height }}>
      {width > 0 && rows.length > 0 && (
        <svg width={width} height={height} role="list">
          <g transform={`translate(${m.left},${m.top})`}>
            {y.ticks(4).map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x2={w} className={t === 0 ? "axis-line" : "grid-line"} />
                <text x={-10} dy="0.32em" textAnchor="end" className="tick">
                  {format(t)}
                </text>
              </g>
            ))}
            {rows.map((r, i) => {
              const bx = (xb(i) ?? 0) + (xb.bandwidth() - bw) / 2;
              return (
                <g
                  key={r.key}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${r.label}: ${tipFormat(r.value)}`}
                  className={`bar-row${active === i ? " is-active" : ""}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  <rect x={xb(i)} y={0} width={xb.step()} height={h} fill="transparent" />
                  <path d={barPath(bx, y(r.value), bw, h - y(r.value), "up")} className={r.accent ? "bar bar-accent" : "bar"} />
                  {i === maxIdx && r.value > 0 && (
                    <text x={bx + bw / 2} y={y(r.value) - 7} textAnchor="middle" className="bar-value">
                      {format(r.value)}
                    </text>
                  )}
                  {i % skip === 0 && (
                    <text x={bx + bw / 2} y={h + 18} textAnchor="middle" className="tick">
                      {r.key}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}
      <Tooltip tip={tip} width={width} />
    </div>
  );
}
