# E-Commerce Sales Intelligence Dashboard

An end-to-end analytics project analyzing 800K+ retail transactions across 41 countries, featuring interactive visualizations, customer segmentation, and strategic business insights.

![Python](https://img.shields.io/badge/Python-3.9+-blue)
![Streamlit](https://img.shields.io/badge/Streamlit-1.x-red)
![Pandas](https://img.shields.io/badge/Pandas-2.x-green)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.x-orange)

## Overview

This project transforms raw transactional data from the [UCI Online Retail II](https://archive.ics.uci.edu/ml/datasets/Online+Retail+II) dataset into actionable business intelligence through:

- **Interactive Dashboard** — Real-time Streamlit dashboard with cross-filtering by date, country, and customer segment
- **RFM Customer Segmentation** — Recency, Frequency, Monetary scoring to classify 5,800+ customers into 7 behavioral segments
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
| Dataset | UCI Online Retail II (800K+ rows) |

## Project Structure

```
├── app.py                          # Streamlit dashboard
├── scripts/
│   ├── data_cleaning.py            # Phase 2: Data cleaning & feature engineering
│   ├── kpi_analysis.py             # Phase 3: KPI analysis & 12 visualizations
│   ├── advanced_analytics.py       # Phase 4: K-Means clustering & CLV estimation
│   └── extract_kpis.py             # KPI extraction utility
├── outputs/
│   ├── figures/                    # 16 saved chart images
│   └── reports/
│       ├── executive_summary.md    # 1-page executive summary
│       ├── strategic_recommendations.md
│       ├── dashboard_guide.md
│       └── resume_bullets.md
├── data/
│   ├── raw/                        # Original Excel file (not tracked)
│   └── cleaned/                    # Processed CSVs (not tracked)
├── requirements.txt
└── README.md
```

## Key Findings

- **Revenue**: £17.4M total across 36,900+ orders
- **Customer Concentration**: 18% of customers (Champions) drive ~40% of revenue
- **Geographic Risk**: 83% of revenue from the UK alone
- **Retention**: 70% customer churn at Month 1 — significant re-engagement opportunity
- **Seasonality**: Q4 (Oct–Dec) generates peak revenue driven by holiday demand

## Dashboard Features

The interactive Streamlit dashboard includes:

- **6 KPI Cards** — Total Revenue, Orders, Customers, AOV, MoM Growth, Repeat Rate
- **8 Dynamic Charts** — Monthly/Quarterly revenue, RFM donut, segment revenue, top products, top countries, hourly & daily patterns
- **3 Cross-Filters** — Date range, Country, Customer Segment
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
Estimated using: `CLV = AOV × Monthly Purchase Frequency × Average Customer Lifespan`

## License

This project uses the [UCI Online Retail II](https://archive.ics.uci.edu/ml/datasets/Online+Retail+II) dataset, which is publicly available for research and educational purposes.
