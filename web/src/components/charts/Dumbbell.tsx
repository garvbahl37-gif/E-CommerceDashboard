"use client";

import { scaleLinear } from "d3-scale";
import { useState } from "react";
import { TipState, Tooltip, useWidth } from "./primitives";
import { pct } from "@/lib/format";

export type DumbbellRow = { key: string; label: string; a: number; b: number; detail: string };

/**
 * Two shares per row on one percentage axis: a = share of customers, b = share of revenue.
 * The gap between the dots is the story (who punches above their weight).
 */
export function Dumbbell({
  rows,
  aLabel,
  bLabel,
  onSelect,
  selected,
}: {
  rows: DumbbellRow[];
  aLabel: string;
  bLabel: string;
  onSelect?: (key: string) => void;
  selected?: (key: string) => boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const rowH = 40;
  const height = rows.length * rowH + 24;
  const x = scaleLinear()
    .domain([0, Math.max(10, ...rows.flatMap((r) => [r.a, r.b]))])
    .nice(4)
    .range([6, Math.max(6, width - 52)]);

  const r0 = active !== null ? rows[active] : null;
  const tip: TipState = r0
    ? {
        x: x(Math.max(r0.a, r0.b)),
        y: active! * rowH + 16,
        title: r0.label,
        rows: [
          { key: "var(--s2)", value: pct(r0.a), label: aLabel.toLowerCase() },
          { key: "var(--s1)", value: pct(r0.b), label: bLabel.toLowerCase() },
          { value: r0.detail, label: "" },
          ...(onSelect ? [{ value: "", label: selected?.(r0.key) ? "Click to clear this filter" : "Click to filter the page" }] : []),
        ],
      }
    : null;

  return (
    <div ref={ref} className="plot" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role={onSelect ? "group" : "list"}>
          {x.ticks(4).map((t) => (
            <g key={t} transform={`translate(${x(t)},0)`}>
              <line y1={0} y2={rows.length * rowH} className="grid-line" />
              <text y={rows.length * rowH + 16} textAnchor="middle" className="tick">
                {t}%
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cy = i * rowH + 27;
            const lo = Math.min(r.a, r.b);
            const hi = Math.max(r.a, r.b);
            return (
              <g
                key={r.key}
                role={onSelect ? "button" : "listitem"}
                tabIndex={0}
                aria-label={`${r.label}: ${pct(r.a)} ${aLabel.toLowerCase()}, ${pct(r.b)} ${bLabel.toLowerCase()}`}
                aria-pressed={onSelect ? !!selected?.(r.key) : undefined}
                className={`bar-row${active === i ? " is-active" : ""}${onSelect ? " is-clickable" : ""}${selected?.(r.key) ? " is-selected" : ""}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={onSelect ? () => onSelect(r.key) : undefined}
                onKeyDown={
                  onSelect
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelect(r.key);
                        }
                      }
                    : undefined
                }
              >
                <rect x={0} y={i * rowH} width={width} height={rowH} rx={6} className="row-hit" />
                <text x={0} y={i * rowH + 12} className="bar-label">
                  {r.label}
                </text>
                <line x1={x(lo)} x2={x(hi)} y1={cy} y2={cy} className="dumbbell-link" />
                <circle cx={x(r.a)} cy={cy} r={5} className="dot" style={{ fill: "var(--s2)" }} />
                <circle cx={x(r.b)} cy={cy} r={5} className="dot" style={{ fill: "var(--s1)" }} />
                <text x={x(hi) + 10} y={cy} dy="0.34em" className="bar-value">
                  {pct(r.b, 0)}
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
