"use client";

import { scaleLinear } from "d3-scale";
import { area, line } from "d3-shape";
import { PointerEvent, useState } from "react";
import { TipState, Tooltip, useWidth } from "./primitives";

type Pt = { x: number; y: number };

/**
 * Cumulative share of revenue against share of customers, ranked by spend.
 * The diagonal is what equal spending would look like; the bow above it is concentration.
 */
export function Concentration({ points, marker, height = 280 }: { points: Pt[]; marker: number; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<Pt | null>(null);
  const m = { top: 16, right: 16, bottom: 34, left: 44 };
  const w = Math.max(0, width - m.left - m.right);
  const h = height - m.top - m.bottom;
  const x = scaleLinear().domain([0, 100]).range([0, w]);
  const y = scaleLinear().domain([0, 100]).range([h, 0]);
  const path = line<Pt>().x((d) => x(d.x)).y((d) => y(d.y))(points) ?? "";
  const wash = area<Pt>().x((d) => x(d.x)).y0((d) => y(d.x)).y1((d) => y(d.y))(points) ?? "";

  const interp = (px: number) => {
    for (let i = 1; i < points.length; i++) {
      if (points[i].x >= px) {
        const a = points[i - 1];
        const b = points[i];
        const t = b.x === a.x ? 1 : (px - a.x) / (b.x - a.x);
        return a.y + t * (b.y - a.y);
      }
    }
    return 100;
  };
  const mk = { x: marker, y: interp(marker) };

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = Math.max(1, Math.min(100, Math.round(x.invert(e.clientX - rect.left - m.left))));
    setActive({ x: px, y: interp(px) });
  }

  const tip: TipState = active
    ? {
        x: m.left + x(active.x),
        y: m.top + y(active.y),
        title: `Top ${active.x}% of customers`,
        rows: [{ value: `${active.y.toFixed(1)}%`, label: "of revenue" }],
      }
    : null;

  return (
    <div ref={ref} className="plot" style={{ height }}>
      {width > 0 && points.length > 1 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Customer concentration curve. The top ${marker}% of customers bring in ${mk.y.toFixed(0)}% of revenue.`}
          onPointerMove={onMove}
          onPointerLeave={() => setActive(null)}
        >
          <g transform={`translate(${m.left},${m.top})`}>
            {[0, 25, 50, 75, 100].map((t) => (
              <g key={t}>
                <line x1={0} x2={w} y1={y(t)} y2={y(t)} className={t === 0 ? "axis-line" : "grid-line"} />
                <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" className="tick">
                  {t}%
                </text>
                <text x={x(t)} y={h + 18} textAnchor={t === 0 ? "start" : t === 100 ? "end" : "middle"} className="tick">
                  {t}%
                </text>
              </g>
            ))}
            <text x={w} y={h + 32} textAnchor="end" className="tick">
              Customers, biggest spenders first
            </text>
            <line x1={0} y1={h} x2={w} y2={0} className="axis-line" />
            <text x={x(58)} y={y(52)} className="tick" transform={`rotate(${(-Math.atan2(h, w) * 180) / Math.PI} ${x(58)} ${y(52)})`}>
              if everyone spent the same
            </text>
            <path d={wash} className="trend-area" />
            <path d={path} className="trend-line" />
            <line x1={x(mk.x)} x2={x(mk.x)} y1={y(mk.y)} y2={h} className="crosshair" />
            <circle cx={x(mk.x)} cy={y(mk.y)} r={5} className="dot-peak" />
            <text x={x(mk.x) + 10} y={y(mk.y) + 16} className="peak-label">
              Top {marker}% → {mk.y.toFixed(0)}% of revenue
            </text>
            {active && <circle cx={x(active.x)} cy={y(active.y)} r={5} className="dot-active" />}
          </g>
        </svg>
      )}
      <Tooltip tip={tip} width={width} />
    </div>
  );
}
