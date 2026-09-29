# E-Commerce Sales Intelligence Dashboard

An end-to-end analytics project analysing 779K+ cleaned retail transaction lines (36,969 orders) across 41 countries, featuring interactive visualisations, customer segmentation, and strategic business insights.

**Live dashboard:** https://ecommerce-dashboard-umber-five.vercel.app

![Python](https://img.shields.io/badge/Python-3.9+-blue)
![Streamlit](https://img.shields.io/badge/Streamlit-1.x-red)
![Pandas](https://img.shields.io/badge/Pandas-2.x-green)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.x-orange)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black)

[![Dashboard overview](docs/screenshots/dashboard-overview.png)](https://ecommerce-dashboard-umber-five.vercel.app)

## Overview

This project transforms raw transactional data from the [UCI Online Retail II](https://archive.ics.uci.edu/ml/datasets/Online+Retail+II) dataset into actionable business intelligence through:

- **Web Dashboard (Next.js)** — Fast, filterable dashboard deployed on Vercel; every chart recomputes in the browser for any period, country and customer segment
- **Streamlit Dashboard** — The original Python dashboard with the same cross-filters
- **RFM Customer Segmentation** — Recency, Frequency, Monetary scoring to classify 5,878 customers into 7 behavioral segments
- **K-Means Clustering** — Unsupervised learning to discover 4 natural customer groups with CLV estimation
- **16 Publication-Quality Visualizations** — Monthly trends, cohort retention, geographic analysis, and more

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | Python 3.9+ |
| Data Processing | Pandas, NumPy |
| Visualization | Matplotlib, Seaborn |
| Machine Learning | scikit-learn (K-Means, StandardScaler) |
| Dashboard | Streamlit |
| Web frontend | Next.js 16, React 19, TypeScript, d3-scale/d3-shape (hand-built SVG charts) |
| Hosting | Vercel (web), Streamlit Cloud (Python app) |
| Dataset | UCI Online Retail II (1.07M raw lines, 779K after cleaning) |

## Project Structure

```
├── app.py                          # Streamlit dashboard
├── pages/1_About.py                # Streamlit About page
├── web/                            # Next.js frontend (deployed to Vercel)
│   ├── public/data/dashboard.json  # Compact invoice-level export (~460 KB gzipped)
│   └── src/                        # App Router pages, charts, aggregation logic
├── scripts/
│   ├── data_cleaning.py            # Phase 2: Data cleaning & feature engineering
│   ├── kpi_analysis.py             # Phase 3: KPI analysis & 12 visualizations
│   ├── advanced_analytics.py       # Phase 4: K-Means clustering & CLV estimation
│   ├── extract_kpis.py             # KPI extraction utility
│   └── export_web_data.py          # Builds web/public/data/dashboard.json
├── outputs/
│   ├── figures/                    # 16 saved chart images
│   └── reports/
│       ├── executive_summary.md    # 1-page executive summary
│       ├── strategic_recommendations.md
│       ├── dashboard_guide.md
│       └── resume_bullets.md
├── data/
│   ├── raw/                        # Original Excel file (not tracked)
│   └── cleaned/                    # Processed CSVs (tracked, used by both dashboards)
├── docs/screenshots/               # README screenshots of the web dashboard
├── requirements.txt
├── TODO.md
└── README.md
```

## Key Findings

- **Revenue**: £17.37M across 36,969 orders from 5,878 customers (average order £470)
- **Customer Concentration**: 22% of customers (Champions) drive ~68% of revenue
- **Geographic Risk**: 82.8% of revenue from the UK alone
- **Retention**: only ~21% of a month's new customers order again the next month (~79% Month-1 churn)
- **Repeat Buying**: 72.4% of customers order more than once over the two years
- **Seasonality**: Q4 generates peak revenue; November 2010 (£1.17M) is the biggest month

## Web Dashboard (Next.js)

Live at **https://ecommerce-dashboard-umber-five.vercel.app**

**Filtering**
- A filter sidebar with every option visible: period presets, a drag-to-select month range over a mini revenue chart, customer segments and countries
- Each option shows what it holds under the other filters (customers per segment, revenue per country), plus an **Only** button to isolate it
- One-click country groups: UK, Europe, Rest of world, Outside UK, and a country search
- **Click to filter** from the charts: a country bar or table row, a customer segment, or a month on the trend chart. Click again to clear
- Removable chips for every active filter, and **Copy link**: the filters live in the URL, so any view can be shared
- On phones the filters open as a drawer

**Charts**
- KPI tiles with monthly sparklines and change vs the previous period of the same length
- Monthly performance with a switch between revenue, orders, customers and average order; yearly peaks marked
- New vs returning revenue (stacked) and order-size distribution
- RFM segments (share of customers vs share of revenue), RFM recency × frequency grid, customer concentration curve, cohort retention heatmap, K-Means cluster small multiples
- Top 10/25 products table with monthly trend sparklines and revenue share
- Top 10 countries plus a sortable table of every country (revenue, share, orders, customers, average order)
- Weekday × hour revenue heatmap and quarterly revenue
- Every chart has hover and keyboard tooltips and a table view; light and dark mode; responsive down to phone width

```bash
# Rebuild the data export after changing the pipeline
python scripts/export_web_data.py

cd web
npm install
npm run dev        # http://localhost:3000
npm run build
```

Deploy: pushes to `main` auto-deploy via the connected Vercel project `ecommerce-dashboard` (Root Directory `web`); manual deploy with `cd web && vercel deploy --prod`.

### Screenshots

**Filtered view.** Here, Germany's Champions in 2011, with each KPI compared to 2010.

![Filtered view](docs/screenshots/filtered-view.png)

**Monthly mix.** Revenue from new vs returning customers, and the order-size distribution.

![New vs returning revenue and order size](docs/screenshots/overview-charts.png)

**Customers.** RFM segments, the RFM grid, customer concentration, cohort retention and the four K-Means clusters.

![Customers section](docs/screenshots/customers.png)

**Products.** Top products with monthly trends and share of revenue.

![Products table](docs/screenshots/products.png)

**Markets.** Click a country in the chart or the table to filter the page.

![Markets section](docs/screenshots/markets.png)

**Timing.** Revenue by weekday and hour, and by quarter.

![Timing section](docs/screenshots/timing.png)

<table>
  <tr>
    <td width="64%"><strong>Dark mode</strong><br><img src="docs/screenshots/dark-mode.png" alt="Dashboard in dark mode"></td>
    <td width="18%"><strong>Mobile</strong><br><img src="docs/screenshots/mobile.png" alt="Dashboard on a phone"></td>
    <td width="18%"><strong>Mobile filters</strong><br><img src="docs/screenshots/mobile-filters.png" alt="Filter drawer on a phone"></td>
  </tr>
</table>

**About page.** Findings, method and known limits.

![About page](docs/screenshots/about.png)

## Streamlit Dashboard

The interactive Streamlit dashboard includes:

- **6 KPI Cards** — Total Revenue, Orders, Customers, AOV, MoM Growth, Repeat Rate
- **8 Dynamic Charts** — Monthly/Quarterly revenue, RFM donut, segment revenue, top products, top countries, hourly & daily patterns
- **3 Cross-Filters** — Date range, Country, Customer Segment (all three apply to every KPI and chart)
- **Real-Time Updates** — All charts react to filter changes

## How to Run

### Prerequisites
Download the dataset from [UCI Machine Learning Repository](https://archive.ics.uci.edu/ml/datasets/Online+Retail+II) and place the Excel file in `data/raw/`.

### Setup
```bash
pip install -r requirements.txt
```

### Run the Pipeline
```bash
# Step 1: Clean raw data
python scripts/data_cleaning.py

# Step 2: Generate KPI analysis & charts
python scripts/kpi_analysis.py

# Step 3: Run advanced analytics (K-Means, CLV)
python scripts/advanced_analytics.py
```

### Launch Dashboard
```bash
streamlit run app.py
```

## Methodology

### RFM Segmentation
Each customer scored on **Recency** (days since last purchase), **Frequency** (order count), and **Monetary** (total spend) using quintile-based scoring (1–5), then mapped to 7 segments: Champions, Loyal Customers, Big Spenders, New Customers, Need Attention, At Risk, Hibernating.

### K-Means Clustering
Applied log-transformation and StandardScaler normalization to RFM features, then used the Elbow Method to determine optimal k=4 clusters. Resulting segments: High-Value, Mid-Value, Occasional, and Dormant customers.

### Customer Lifetime Value
Estimated using: `CLV = AOV × Monthly Purchase Frequency × Average Customer Lifespan`, where monthly frequency is total orders ÷ total active customer-months (≈ £3.3K per customer).

## Known Limitations

- December 2011 only runs to the 9th; it is treated as a partial month and excluded from month-on-month growth.
- Cleaning drops cancellation lines but keeps the original orders they reversed, so two large, immediately cancelled orders (~£245K) remain in revenue. Fixing this needs the raw Excel file.
- Postage, manual adjustments and fees (~£306K) count in revenue but are excluded from product rankings in the web dashboard.
- RFM scores and clusters use each customer's full history, whatever period is filtered.

## License

This project uses the [UCI Online Retail II](https://archive.ics.uci.edu/ml/datasets/Online+Retail+II) dataset, which is publicly available for research and educational purposes.
