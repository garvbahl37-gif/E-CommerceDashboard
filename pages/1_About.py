import streamlit as st

st.set_page_config(
    page_title="About - E-Commerce Sales Intelligence",
    layout="wide"
)

# Hide sidebar navigation completely & adjust top padding
st.markdown("""
<style>
    [data-testid="stSidebarNav"] {display: none;}
    .block-container {padding-top: 4rem;}
    
    /* Custom Typography and Colors */
    h1, h2, h3 {
        font-family: 'Inter', sans-serif;
    }
    .main-title {
        background: -webkit-linear-gradient(45deg, #4F46E5, #0ea5e9);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 3.5rem;
        font-weight: 800;
        margin-bottom: 0rem;
        padding-bottom: 0;
    }
    .subtitle {
        color: #64748b;
        font-size: 1.25rem;
        font-weight: 500;
        margin-top: 0;
        margin-bottom: 2rem;
    }
    .feature-card {
        background-color: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 16px;
        height: 100%;
        transition: transform 0.2s ease-in-out, box-shadow 0.2s;
    }
    .feature-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        border-color: #475569;
    }
    .feature-number {
        color: #0ea5e9;
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 8px;
    }
    .feature-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #f8fafc;
        margin-bottom: 8px;
    }
    .feature-desc {
        color: #94a3b8;
        font-size: 0.95rem;
        line-height: 1.5;
    }
    .tech-pill {
        display: inline-block;
        background-color: #334155;
        color: #e2e8f0;
        padding: 6px 16px;
        border-radius: 9999px;
        font-size: 0.85rem;
        font-weight: 500;
        margin: 4px;
        border: 1px solid #475569;
    }
    
    /* Restyle the st.info to be more elegant */
    div[data-testid="stMarkdownContainer"] > div[role="alert"] {
        background-color: rgba(14, 165, 233, 0.1);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.2);
        border-radius: 8px;
    }
</style>
""", unsafe_allow_html=True)

# Top Navbar
col_spacer1, col_nav1, col_nav2, col_spacer2 = st.columns([3, 2, 2, 3])
with col_nav1:
    st.page_link("app.py", label="Dashboard", use_container_width=True)
with col_nav2:
    st.page_link("pages/1_About.py", label="About the Project", use_container_width=True)

st.markdown("---")

# Hero Section
col_hero, col_empty = st.columns([8, 2])
with col_hero:
    st.markdown('<h1 class="main-title">E-Commerce Intelligence</h1>', unsafe_allow_html=True)
    st.markdown('<p class="subtitle">Turning 800K+ raw transactions into strategic business insights</p>', unsafe_allow_html=True)
    st.info("This end-to-end analytics project analyzes retail transactions across 41 countries, featuring interactive visualizations, RFM customer segmentation, and unsupervised learning algorithms.")

st.markdown("<br>", unsafe_allow_html=True)

# Three pillars / features
col1, col2, col3 = st.columns(3)

with col1:
    st.markdown("""
    <div class="feature-card">
        <div class="feature-number">01</div>
        <div class="feature-title">Interactive Analytics</div>
        <div class="feature-desc">Real-time Streamlit dashboard with cross-filtering by date, country, and segment. Includes 16 publication-quality dynamic charts.</div>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="feature-card">
        <div class="feature-number">02</div>
        <div class="feature-title">RFM Segmentation</div>
        <div class="feature-desc">Recency, Frequency, and Monetary scoring algorithms to robustly classify 5,800+ customers into 7 distinct behavioral segments.</div>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown("""
    <div class="feature-card">
        <div class="feature-number">03</div>
        <div class="feature-title">Machine Learning</div>
        <div class="feature-desc">K-Means clustering (unsupervised learning) to discover 4 natural customer groups, complete with Customer Lifetime Value (CLV) estimation.</div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# Two column layout for bottom half
col_left, col_right = st.columns([1, 1])

with col_left:
    st.subheader("Methodology")
    with st.expander("1. Data Cleaning & Feature Engineering", expanded=True):
        st.markdown("""
        - Handled missing values (Customer ID, Description)
        - Removed duplicate and cancelled orders
        - Engineered new temporal features (YearMonth, DayOfWeek, Hour)
        """)
        
    with st.expander("2. Value Modeling", expanded=True):
        st.markdown("""
        Applied log-transformation and **StandardScaler** normalization to RFM features, then used the **Elbow Method** to determine optimal k=4 clusters.  
        `CLV = AOV × Monthly PF × Lifespan`
        """)

with col_right:
    st.subheader("Key Business Findings")
    st.markdown("""
    <div style="background: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
        <div style="margin-bottom: 12px;"><strong style="color: #f8fafc; font-size: 1.05rem;">17.4M Revenue</strong><br><span style="color:#94a3b8; font-size:0.9em;">GBP total generated across 36,900+ verified orders.</span></div>
        <div style="margin-bottom: 12px;"><strong style="color: #f8fafc; font-size: 1.05rem;">Pareto Principle Active</strong><br><span style="color:#94a3b8; font-size:0.9em;">Just 18% of customers (Champions) drive approx. 40% of total revenue.</span></div>
        <div style="margin-bottom: 12px;"><strong style="color: #f8fafc; font-size: 1.05rem;">Geographic Risk</strong><br><span style="color:#94a3b8; font-size:0.9em;">83% of all revenue is concentrated in the UK alone.</span></div>
        <div style="margin-bottom: 12px;"><strong style="color: #f8fafc; font-size: 1.05rem;">High Initial Churn</strong><br><span style="color:#94a3b8; font-size:0.9em;">70% customer churn at Month 1 presents a significant re-engagement opportunity.</span></div>
        <div><strong style="color: #f8fafc; font-size: 1.05rem;">Q4 Seasonality</strong><br><span style="color:#94a3b8; font-size:0.9em;">October to December generates peak revenue driven by holiday demand.</span></div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br><br>", unsafe_allow_html=True)

st.subheader("Technology Stack")
st.markdown("""
<div>
    <span class="tech-pill">Python 3.9+</span>
    <span class="tech-pill">Pandas</span>
    <span class="tech-pill">NumPy</span>
    <span class="tech-pill">scikit-learn</span>
    <span class="tech-pill">Matplotlib</span>
    <span class="tech-pill">Seaborn</span>
    <span class="tech-pill">Streamlit</span>
</div>
""", unsafe_allow_html=True)

st.markdown("---")
st.markdown("<div style='text-align: center; color: #64748b; font-size: 0.85rem;'>Built by adapting full-scale data science methodologies for e-commerce analytics.</div>", unsafe_allow_html=True)
