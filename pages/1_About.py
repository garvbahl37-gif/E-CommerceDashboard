import streamlit as st

st.set_page_config(
    page_title="About - E-Commerce Sales Intelligence",
    page_icon="ℹ️",
    layout="wide"
)

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
    
    .about-header {
        text-align: center; padding: 20px 0 10px 0;
        font-size: 32px; font-weight: 700;
        color: #1f2937;
    }
    .about-subheader {
        text-align: center; padding: 0 0 30px 0;
        font-size: 16px; opacity: 0.7;
    }
    .section-title {
        font-size: 22px; font-weight: 600;
        margin: 30px 0 15px 0; padding-bottom: 8px;
        border-bottom: 2px solid rgba(128,128,128,0.2);
        color: #111827;
    }
    .highlight-card {
        background-color: #f8fafc;
        border-left: 4px solid #3b82f6;
        padding: 15px 20px;
        border-radius: 4px;
        margin: 15px 0;
        color: #334155;
    }
</style>
""", unsafe_allow_html=True)

st.markdown('<div class="about-header">About the Project</div>', unsafe_allow_html=True)
st.markdown('<div class="about-subheader">E-Commerce Sales Intelligence Dashboard</div>', unsafe_allow_html=True)

st.markdown("""
<div class="highlight-card">
An end-to-end analytics project analyzing 800K+ retail transactions across 41 countries, featuring interactive visualizations, customer segmentation, and strategic business insights.
</div>

<div class="section-title">Overview</div>

This project transforms raw transactional data from the [UCI Online Retail II](https://archive.ics.uci.edu/ml/datasets/Online+Retail+II) dataset into actionable business intelligence through:

- **Interactive Dashboard** — Real-time Streamlit dashboard with cross-filtering by date, country, and customer segment.
- **RFM Customer Segmentation** — Recency, Frequency, Monetary scoring to classify 5,800+ customers into 7 behavioral segments.
- **K-Means Clustering** — Unsupervised learning to discover 4 natural customer groups with CLV estimation.
- **16 Publication-Quality Visualizations** — Monthly trends, cohort retention, geographic analysis, and more.

<div class="section-title">Tech Stack</div>

| Component | Technology |
|-----------|-----------|
| **Language** | Python 3.9+ |
| **Data Processing** | Pandas, NumPy |
| **Visualization** | Matplotlib, Seaborn |
| **Machine Learning** | scikit-learn (K-Means, StandardScaler) |
| **Dashboard** | Streamlit |
| **Dataset** | UCI Online Retail II (800K+ rows) |

<div class="section-title">Methodology</div>

**1. Data Cleaning & Feature Engineering**
- Handled missing values (Customer ID, Description)
- Removed duplicate and cancelled orders
- Engineered new temporal features (YearMonth, DayOfWeek, Hour)
- Calculated total revenue per transaction

**2. RFM Segmentation**
Each customer was scored on **Recency** (days since last purchase), **Frequency** (order count), and **Monetary** (total spend) using quintile-based scoring (1–5), then mapped to 7 segments:  
*Champions, Loyal Customers, Big Spenders, New Customers, Need Attention, At Risk, Hibernating.*

**3. K-Means Clustering**
Applied log-transformation and StandardScaler normalization to RFM features, then used the Elbow Method to determine optimal *k=4* clusters.  
Resulting segments: *High-Value, Mid-Value, Occasional, and Dormant customers.*

**4. Customer Lifetime Value (CLV)**
Estimated using: `CLV = AOV × Monthly Purchase Frequency × Average Customer Lifespan`

<div class="section-title">Key Findings</div>

- **Revenue**: £17.4M total across 36,900+ orders
- **Customer Concentration**: 18% of customers (Champions) drive ~40% of revenue
- **Geographic Risk**: 83% of revenue from the UK alone
- **Retention**: 70% customer churn at Month 1 — significant re-engagement opportunity
- **Seasonality**: Q4 (Oct–Dec) generates peak revenue driven by holiday demand

---
*Built by adapting full-scale data science methodologies for e-commerce analytics.*
""", unsafe_allow_html=True)
