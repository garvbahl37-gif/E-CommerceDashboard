# Dashboard Conversion Guide

## Option A: Streamlit Dashboard (Python-Native)

### Why Streamlit?
- Fast to prototype (hours, not days)
- Python-native — reuses your existing analysis code
- Free deployment via Streamlit Community Cloud
- Fully interactive: filters, charts, tables

### Architecture

```
app.py
├── Sidebar: Date range filter, Country filter, Segment filter
├── Row 1: KPI Cards (Total Revenue, AOV, Customers, Growth Rate)
├── Row 2: Monthly Revenue Line Chart | Quarterly Bar Chart
├── Row 3: Cohort Retention Heatmap | RFM Segment Pie
├── Row 4: Top Products Bar | Geographic Map/Bar
└── Row 5: Cluster Scatter | CLV by Segment Bar
```

### Key Streamlit Components

```python
import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt

st.set_page_config(page_title="E-Commerce Intelligence", layout="wide")

# Load data
@st.cache_data
def load_data():
    return pd.read_csv("data/cleaned/retail_cleaned.csv", parse_dates=['InvoiceDate'])

df = load_data()

# Sidebar filters
st.sidebar.header("🔍 Filters")
countries = st.sidebar.multiselect("Country", df['Country'].unique(), default=['United Kingdom'])
date_range = st.sidebar.date_input("Date Range", [df['InvoiceDate'].min(), df['InvoiceDate'].max()])

# KPI Cards
col1, col2, col3, col4 = st.columns(4)
col1.metric("Total Revenue", f"£{filtered_df['Revenue'].sum():,.0f}")
col2.metric("Orders", f"{filtered_df['Invoice'].nunique():,}")
col3.metric("AOV", f"£{aov:,.2f}")
col4.metric("Customers", f"{filtered_df['Customer ID'].nunique():,}")

# Charts
st.plotly_chart(fig)  # or st.pyplot(fig)
```

### Deployment
```bash
# Install
pip install streamlit plotly

# Run locally
streamlit run app.py

# Deploy to Streamlit Cloud
# 1. Push to GitHub
# 2. Go to share.streamlit.io
# 3. Connect your repo → Deploy
```

---

## Option B: Power BI Dashboard

### Data Connection
1. Open Power BI Desktop → **Get Data** → **Text/CSV** → select `retail_cleaned.csv`
2. Open Power Query Editor → verify column types → Close & Apply

### Recommended Dashboard Pages

| Page | Content |
|------|---------|
| **Overview** | KPI cards + Monthly revenue trend + YoY comparison |
| **Customer Intelligence** | RFM segment breakdown + Cohort heatmap + CLV by segment |
| **Product Performance** | Top products bar + Product category treemap |
| **Geographic Analysis** | Map visual + Country revenue table |

### Key DAX Measures
```
Total Revenue = SUM(retail_cleaned[Revenue])
AOV = DIVIDE([Total Revenue], DISTINCTCOUNT(retail_cleaned[Invoice]))
MoM Growth = 
    VAR CurrentMonth = [Total Revenue]
    VAR PreviousMonth = CALCULATE([Total Revenue], DATEADD(retail_cleaned[InvoiceDate], -1, MONTH))
    RETURN DIVIDE(CurrentMonth - PreviousMonth, PreviousMonth)
Repeat Rate = 
    DIVIDE(
        COUNTROWS(FILTER(VALUES(retail_cleaned[Customer ID]), 
            CALCULATE(DISTINCTCOUNT(retail_cleaned[Invoice])) > 1)),
        DISTINCTCOUNT(retail_cleaned[Customer ID])
    )
```

### Slicers to Add
- Date Range slicer
- Country slicer
- RFM Segment slicer (from rfm_data.csv)
- Cluster slicer (from rfm_data.csv)

---

## Design Tips for Both Platforms

1. **Lead with KPIs** — put headline numbers at the top
2. **Use consistent colors** — match your segment colors across all charts
3. **Add context** — include benchmark lines, targets, and annotations
4. **Keep it scannable** — a senior executive should understand the story in 10 seconds
5. **Interactive filtering** — let the user drill into country, time, and segment
