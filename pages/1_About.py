import streamlit as st

st.set_page_config(
    page_title="About - E-Commerce Sales Intelligence",
    page_icon="ℹ️",
    layout="wide"
)

# Hide sidebar navigation completely & adjust top padding
st.markdown("""
<style>
    [data-testid="stSidebarNav"] {display: none;}
    .block-container {padding-top: 2rem;}
</style>
""", unsafe_allow_html=True)

# Top Navbar
col_nav1, col_nav2, col_nav3 = st.columns([1.5, 1.5, 7])
with col_nav1:
    st.page_link("app.py", label="Dashboard", icon="📊", use_container_width=True)
with col_nav2:
    st.page_link("pages/1_About.py", label="About the Project", icon="ℹ️", use_container_width=True)

st.markdown("---")

# Main About Content
st.title("About the Project")
st.markdown("##### E-Commerce Sales Intelligence Dashboard")

st.info("An end-to-end analytics project analyzing 800K+ retail transactions across 41 countries, featuring interactive visualizations, customer segmentation, and strategic business insights.")

st.header("Overview")
st.markdown("""
This project transforms raw transactional data from the [UCI Online Retail II](https://archive.ics.uci.edu/ml/datasets/Online+Retail+II) dataset into actionable business intelligence through:

- **Interactive Dashboard** — Real-time Streamlit dashboard with cross-filtering by date, country, and customer segment.
- **RFM Customer Segmentation** — Recency, Frequency, Monetary scoring to classify 5,800+ customers into 7 behavioral segments.
- **K-Means Clustering** — Unsupervised learning to discover 4 natural customer groups with CLV estimation.
- **16 Publication-Quality Visualizations** — Monthly trends, cohort retention, geographic analysis, and more.
""")

st.header("Tech Stack")
st.markdown("""
| Component | Technology |
|-----------|-----------|
| **Language** | Python 3.9+ |
| **Data Processing** | Pandas, NumPy |
| **Visualization** | Matplotlib, Seaborn |
| **Machine Learning** | scikit-learn (K-Means, StandardScaler) |
| **Dashboard** | Streamlit |
| **Dataset** | UCI Online Retail II (800K+ rows) |
""")

col_a, col_b = st.columns(2)
with col_a:
    st.header("Methodology")
    with st.expander("1. Data Cleaning & Feature Engineering", expanded=True):
        st.markdown("""
        - Handled missing values (Customer ID, Description)
        - Removed duplicate and cancelled orders
        - Engineered new temporal features (YearMonth, DayOfWeek, Hour)
        - Calculated total revenue per transaction
        """)
        
    with st.expander("2. RFM Segmentation", expanded=True):
        st.markdown("""
        Each customer was scored on **Recency**, **Frequency**, and **Monetary** using quintile-based scoring (1–5), then mapped to 7 segments:  
        *Champions, Loyal Customers, Big Spenders, New Customers, Need Attention, At Risk, Hibernating.*
        """)
        
    with st.expander("3. K-Means Clustering", expanded=True):
        st.markdown("""
        Applied log-transformation and StandardScaler normalization to RFM features, then used the Elbow Method to determine optimal *k=4* clusters.  
        Resulting segments: *High-Value, Mid-Value, Occasional, and Dormant customers.*
        """)
        
    with st.expander("4. Customer Lifetime Value (CLV)", expanded=True):
        st.markdown("`CLV = AOV × Monthly Purchase Frequency × Average Customer Lifespan`")

with col_b:
    st.header("Key Findings")
    st.success("**Revenue**: £17.4M total across 36,900+ orders")
    st.warning("**Customer Concentration**: 18% of customers (Champions) drive ~40% of revenue")
    st.error("**Geographic Risk**: 83% of revenue from the UK alone")
    st.info("**Retention**: 70% customer churn at Month 1 — significant re-engagement opportunity")
    st.success("**Seasonality**: Q4 (Oct–Dec) generates peak revenue driven by holiday demand")

st.markdown("---")
st.caption("Built by adapting full-scale data science methodologies for e-commerce analytics.")
