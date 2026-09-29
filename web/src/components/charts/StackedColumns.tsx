"use client";

import { scaleBand, scaleLinear } from "d3-scale";
import { useState } from "react";
import { barPath, TipState, Tooltip, useWidth } from "./primitives";

export type StackRow = { key: string; label: string; a: number; b: number };

/** Two-part columns (a at the base, b on top) separated by a 2px surface gap. */
export function StackedColumns({
  rows,
  aLabel,
  bLabel,
  format,
  tipFormat = format,
  height = 260,
}: {
  rows: StackRow[];
  aLabel: string;
  bLabel: string;
  format: (v: number) => string;
  tipFormat?: (v: number) => string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const m = { top: 12, right: 4, bottom: 26, left: 52 };
  const w = Math.max(0, width - m.left - m.right);
  const h = height - m.top - m.bottom;
  const xb = scaleBand<number>().domain(rows.map((_, i) => i)).range([0, w]).paddingInner(0.28).paddingOuter(0.1);
  const y = scaleLinear().domain([0, Math.max(1e-9, ...rows.map((r) => r.a + r.b))]).nice(4).range([h, 0]);
  const bw = Math.min(24, xb.bandwidth());
  const every = xb.step() < 22 ? 3 : xb.step() < 34 ? 2 : 1;
  const gap = 2;

  const r0 = active !== null ? rows[active] : null;
  const tip: TipState = r0
    ? {
        x: m.left + (xb(active!) ?? 0) + xb.bandwidth() / 2,
        y: m.top + y(r0.a + r0.b),
        title: r0.label,
        rows: [
          { key: "var(--s2)", value: tipFormat(r0.b), label: bLabel.toLowerCase() },
          { key: "var(--s1)", value: tipFormat(r0.a), label: aLabel.toLowerCase() },
          {
            value: r0.a + r0.b > 0 ? `${((r0.b / (r0.a + r0.b)) * 100).toFixed(0)}%` : "–",
            label: `from ${bLabel.toLowerCase()}`,
          },
        ],
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
              const ha = h - y(r.a);
              const hb = h - y(r.b);
              const topB = y(r.a + r.b);
              return (
                <g
                  key={r.key + i}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${r.label}: ${aLabel} ${tipFormat(r.a)}, ${bLabel} ${tipFormat(r.b)}`}
                  className={`bar-row${active === i ? " is-active" : ""}`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  <rect x={xb(i)} y={0} width={xb.step()} height={h} fill="transparent" />
                  {r.b > 0 && ha > 0 ? (
                    <>
                      <rect x={bx} y={h - ha} width={bw} height={Math.max(0, ha)} className="bar" />
                      <path d={barPath(bx, topB, bw, Math.max(0, hb - gap), "up")} className="bar bar-b" />
                    </>
                  ) : (
                    <path d={barPath(bx, topB, bw, Math.max(0, ha + hb), "up")} className={r.b > 0 ? "bar bar-b" : "bar"} />
                  )}
                  {i % every === 0 && (
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
