"use client";

import { scaleLinear, scaleLog } from "d3-scale";
import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { TipState, Tooltip, useWidth } from "./primitives";
import { gbp, gbpCompact, int } from "@/lib/format";

export type ClusterPoint = { id: number; recency: number; monetary: number; frequency: number; cluster: number };

/**
 * One small scatter per K-Means cluster (recency × spend, log scale). Every panel draws all
 * customers in a recessive grey and the panel's own cluster in the series colour, so four
 * groups never have to be told apart by hue alone.
 */
export function ClusterFacets({ points, clusters }: { points: ClusterPoint[]; clusters: string[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const cols = width > 900 ? 4 : width > 480 ? 2 : 1;
  const gapX = 20;
  const panelW = cols ? (width - gapX * (cols - 1)) / cols : 0;
  const panelH = Math.min(220, Math.max(170, panelW * 0.78));

  return (
    <div ref={ref} className="facets" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {width > 0 &&
        clusters.map((name, k) => (
          <Facet key={name} name={name} index={k} points={points} width={panelW} height={panelH} />
        ))}
    </div>
  );
}

function Facet({ name, index, points, width, height }: { name: string; index: number; points: ClusterPoint[]; width: number; height: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [tip, setTip] = useState<TipState>(null);
  const m = { top: 8, right: 8, bottom: 26, left: 44 };
  const w = Math.max(0, width - m.left - m.right);
  const h = height - m.top - m.bottom;
  const x = useMemo(() => scaleLinear().domain([0, 740]).range([0, w]), [w]);
  const y = useMemo(() => scaleLog().domain([2, 600000]).range([h, 0]).clamp(true), [h]);
  const own = useMemo(() => points.filter((p) => p.cluster === index), [points, index]);

  const stats = useMemo(() => {
    const med = (arr: number[]) => {
      const s = [...arr].sort((a, b) => a - b);
      return s.length ? s[Math.floor(s.length / 2)] : 0;
    };
    return {
      n: own.length,
      recency: med(own.map((p) => p.recency)),
      spend: med(own.map((p) => p.monetary)),
    };
  }, [own]);

  useEffect(() => {
    const c = canvas.current;
    if (!c || w <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(width * dpr);
    c.height = Math.round(height * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const css = getComputedStyle(c);
    const bg = css.getPropertyValue("--scatter-bg").trim();
    const fg = css.getPropertyValue("--s1").trim();
    ctx.translate(m.left, m.top);
    ctx.fillStyle = bg;
    for (const p of points) {
      if (p.cluster === index) continue;
      ctx.fillRect(x(p.recency) - 1, y(Math.max(2, p.monetary)) - 1, 2, 2);
    }
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = fg;
    for (const p of own) {
      ctx.beginPath();
      ctx.arc(x(p.recency), y(Math.max(2, p.monetary)), 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [points, own, index, width, height, w, x, y, m.left, m.top]);

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - m.left;
    const py = e.clientY - rect.top - m.top;
    let best: ClusterPoint | null = null;
    let bd = 144; // within 12px
    for (const p of own) {
      const dx = x(p.recency) - px;
      const dy = y(Math.max(2, p.monetary)) - py;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    setTip(
      best
        ? {
            x: m.left + x(best.recency),
            y: m.top + y(Math.max(2, best.monetary)),
            title: `Customer ${best.id}`,
            rows: [
              { value: gbp(best.monetary), label: "lifetime spend" },
              { value: int(best.frequency), label: "orders" },
              { value: `${best.recency} days`, label: "since last order" },
            ],
          }
        : null,
    );
  }

  const yTicks = [10, 1000, 100000];
  return (
    <div className="facet">
      <div className="facet-head">
        <h4>{name}</h4>
        <p>
          {stats.n === 0
            ? "No customers from this cluster in the selection."
            : `${int(stats.n)} customers. Typical spend ${gbpCompact(stats.spend)}, last seen ${stats.recency} days before the data ends.`}
        </p>
      </div>
      <div className="plot" style={{ height }} onPointerMove={onMove} onPointerLeave={() => setTip(null)}>
        <svg width={width} height={height} aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
          <g transform={`translate(${m.left},${m.top})`}>
            {yTicks.map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x2={w} className="grid-line" />
                <text x={-8} dy="0.32em" textAnchor="end" className="tick">
                  {gbpCompact(t)}
                </text>
              </g>
            ))}
            <line y1={h} y2={h} x2={w} className="axis-line" />
            {[0, 365, 730].map((t) => (
              <text key={t} x={x(t)} y={h + 17} textAnchor={t === 0 ? "start" : t === 730 ? "end" : "middle"} className="tick">
                {t === 0 ? "0 days" : `${t}`}
              </text>
            ))}
          </g>
        </svg>
        <canvas
          ref={canvas}
          style={{ width, height, position: "absolute", inset: 0 }}
          role="img"
          aria-label={`${name} cluster: ${stats.n} customers, median spend ${gbp(stats.spend)}, median ${stats.recency} days since last order`}
        />
        <Tooltip tip={tip} width={width} />
      </div>
    </div>
  );
}
