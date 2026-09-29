"use client";

import { scaleLinear } from "d3-scale";
import { area, curveMonotoneX, line } from "d3-shape";
import { KeyboardEvent, PointerEvent, useState } from "react";
import { TipRow, TipState, Tooltip, useWidth } from "./primitives";

export type TrendPoint = { label: string; short: string; value: number; partial?: boolean; rows: TipRow[] };

/** Monthly measure: 2px line over a 10% wash, crosshair snaps to the nearest month. */
export function TrendChart({
  data,
  height = 300,
  highlight,
  axisFormat,
  labelFormat = axisFormat,
  onSelect,
}: {
  data: TrendPoint[];
  height?: number;
  highlight: number[];
  axisFormat: (v: number) => string;
  labelFormat?: (v: number) => string;
  onSelect?: (index: number) => void;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const m = { top: 28, right: 20, bottom: 30, left: 58 };
  const w = Math.max(0, width - m.left - m.right);
  const h = height - m.top - m.bottom;
  const max = Math.max(1e-9, ...data.map((d) => d.value));
  const x = scaleLinear().domain([0, Math.max(1, data.length - 1)]).range([0, w]);
  const y = scaleLinear().domain([0, max]).nice(4).range([h, 0]);
  const ticks = y.ticks(4);

  const partialIdx = data.findIndex((d) => d.partial);
  const complete = partialIdx >= 0 ? data.slice(0, partialIdx) : data;
  const linePath = line<TrendPoint>().x((_, i) => x(i)).y((d) => y(d.value)).curve(curveMonotoneX)(complete) ?? "";
  const areaPath =
    area<TrendPoint>().x((_, i) => x(i)).y0(h).y1((d) => y(d.value)).curve(curveMonotoneX)(complete) ?? "";

  const every = w < 420 ? 4 : w < 760 ? 2 : 1;

  function pick(clientX: number, rect: DOMRect) {
    const px = clientX - rect.left - m.left;
    const i = Math.round(x.invert(px));
    setActive(Math.max(0, Math.min(data.length - 1, i)));
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight") setActive((a) => Math.min(data.length - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? data.length) - 1));
    else if (e.key === "Escape") setActive(null);
    else if ((e.key === "Enter" || e.key === " ") && active !== null && onSelect) onSelect(active);
    else return;
    e.preventDefault();
  }

  const a = active !== null ? data[active] : null;
  const tip: TipState = a
    ? {
        x: m.left + x(active!),
        y: m.top + y(a.value),
        title: a.label + (a.partial ? " (to date)" : ""),
        rows: onSelect && data.length > 1 ? [...a.rows, { value: "", label: "Click to focus on this month" }] : a.rows,
      }
    : null;

  return (
    <div ref={ref} className="plot" style={{ height }}>
      {width > 0 && data.length > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="Monthly trend line chart. Use left and right arrow keys to read values, Enter to focus on a month."
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          onPointerMove={(e: PointerEvent<SVGSVGElement>) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActive(null)}
          onClick={() => active !== null && onSelect && data.length > 1 && onSelect(active)}
          style={{ cursor: onSelect && data.length > 1 ? "pointer" : undefined }}
        >
          <g transform={`translate(${m.left},${m.top})`}>
            {ticks.map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x2={w} className={t === 0 ? "axis-line" : "grid-line"} />
                <text x={-10} dy="0.32em" textAnchor="end" className="tick">
                  {axisFormat(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) =>
              i % every === 0 || i === data.length - 1 ? (
                <text key={d.label} x={x(i)} y={h + 20} textAnchor="middle" className="tick">
                  {d.short}
                </text>
              ) : null,
            )}
            <path d={areaPath} className="trend-area" />
            <path d={linePath} className="trend-line" />
            {partialIdx > 0 && (
              <line
                x1={x(partialIdx - 1)}
                y1={y(data[partialIdx - 1].value)}
                x2={x(partialIdx)}
                y2={y(data[partialIdx].value)}
                className="trend-partial"
              />
            )}
            {partialIdx >= 0 && <circle cx={x(partialIdx)} cy={y(data[partialIdx].value)} r={4.5} className="dot-hollow" />}
            {data.length === 1 && <circle cx={x(0)} cy={y(data[0].value)} r={5} className="dot-active" />}
            {highlight.map((i) => (
              <g key={i} transform={`translate(${x(i)},${y(data[i].value)})`}>
                <circle r={5} className="dot-peak" />
                <text y={-12} textAnchor={x(i) > w - 60 ? "end" : x(i) < 40 ? "start" : "middle"} className="peak-label">
                  {labelFormat(data[i].value)}
                </text>
              </g>
            ))}
            {a && (
              <g>
                <line x1={x(active!)} x2={x(active!)} y1={0} y2={h} className="crosshair" />
                <circle cx={x(active!)} cy={y(a.value)} r={5} className="dot-active" />
              </g>
            )}
          </g>
        </svg>
      )}
      <Tooltip tip={tip} width={width} />
    </div>
  );
}
