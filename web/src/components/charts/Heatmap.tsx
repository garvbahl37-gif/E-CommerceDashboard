"use client";

import { useState } from "react";
import { seqColor, seqStep, TipRow, TipState, Tooltip, useWidth } from "./primitives";

/** Grid of cells on a quantised one-hue sequential ramp. NaN cells are left empty. */
export function Heatmap({
  rows,
  cols,
  values,
  max,
  format,
  cellTitle,
  rowLabelWidth = 64,
  colEvery = 1,
  cellHeight = 22,
  cellLabel,
  extraRows,
  colTitle,
}: {
  rows: string[];
  cols: string[];
  values: number[][];
  max: number;
  format: (v: number) => string;
  cellTitle: (r: number, c: number) => string;
  rowLabelWidth?: number;
  colEvery?: number;
  cellHeight?: number;
  cellLabel?: (v: number, r: number, c: number) => string;
  extraRows?: (r: number, c: number) => TipRow[];
  colTitle?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<[number, number] | null>(null);
  const top = colTitle ? 36 : 20;
  const gap = 2;
  const cw = Math.max(4, (width - rowLabelWidth) / Math.max(1, cols.length));
  const height = top + rows.length * cellHeight;
  const rowEvery = cellHeight < 14 ? 3 : 1;

  const tip: TipState = active
    ? {
        x: rowLabelWidth + active[1] * cw + cw / 2,
        y: top + active[0] * cellHeight,
        title: cellTitle(active[0], active[1]),
        rows: [{ value: format(values[active[0]][active[1]]), label: "" }, ...(extraRows?.(active[0], active[1]) ?? [])],
      }
    : null;

  return (
    <div ref={ref} className="plot" style={{ height }} onPointerLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={height} aria-hidden="true">
          {colTitle && (
            <text x={rowLabelWidth} y={11} className="tick">
              {colTitle}
            </text>
          )}
          {cols.map((c, j) =>
            j % colEvery === 0 ? (
              <text key={j} x={rowLabelWidth + j * cw + cw / 2} y={top - 8} textAnchor="middle" className="tick">
                {c}
              </text>
            ) : null,
          )}
          {rows.map((r, i) => (
            <g key={i} transform={`translate(0,${top + i * cellHeight})`}>
              {i % rowEvery === 0 && (
                <text x={rowLabelWidth - 8} y={cellHeight / 2} dy="0.34em" textAnchor="end" className="tick">
                  {r}
                </text>
              )}
              {values[i].map((v, j) =>
                Number.isFinite(v) ? (
                  <g key={j} onPointerEnter={() => setActive([i, j])}>
                    <rect
                      x={rowLabelWidth + j * cw + gap / 2}
                      y={gap / 2}
                      width={Math.max(1, cw - gap)}
                      height={cellHeight - gap}
                      rx={cellHeight > 30 ? 4 : 2}
                      fill={seqColor(max > 0 ? v / max : 0)}
                      className={active && active[0] === i && active[1] === j ? "cell is-active" : "cell"}
                    />
                    {cellLabel && cw > 34 && (
                      <text
                        x={rowLabelWidth + j * cw + cw / 2}
                        y={cellHeight / 2}
                        dy="0.34em"
                        textAnchor="middle"
                        className="cell-label"
                        style={{ fill: `var(--seq-ink-${seqStep(max > 0 ? v / max : 0)})` }}
                      >
                        {cellLabel(v, i, j)}
                      </text>
                    )}
                  </g>
                ) : null,
              )}
            </g>
          ))}
        </svg>
      )}
      <Tooltip tip={tip} width={width} />
    </div>
  );
}

export function RampLegend({ low, high }: { low: string; high: string }) {
  return (
    <span className="ramp-legend">
      <span>{low}</span>
      <span className="ramp">
        {Array.from({ length: 9 }, (_, k) => (
          <span key={k} style={{ background: `var(--seq-${k})` }} />
        ))}
      </span>
      <span>{high}</span>
    </span>
  );
}
