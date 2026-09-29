# Order Book: web dashboard

Next.js frontend for the E-Commerce Sales Intelligence project. Live at
https://ecommerce-dashboard-umber-five.vercel.app

## How it works

`scripts/export_web_data.py` (repo root) reduces the 100 MB cleaned CSV to
`public/data/dashboard.json`: one row per invoice, the RFM/cluster table, and
product aggregates for the 300 best-selling products. The browser loads that file
once and `src/lib/data.ts` recomputes every KPI and chart for the active filters.

```
src/
  app/            layout, dashboard (/) and about (/about) pages, globals.css (tokens)
  components/     Dashboard, Filters, Masthead
  components/charts/  TrendChart, Bars, Dumbbell, Heatmap, ClusterFacets, primitives
  lib/            data.ts (aggregation), format.ts
```

## Commands

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build
vercel deploy --prod
```
