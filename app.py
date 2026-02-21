"""
E-Commerce Sales Intelligence Dashboard — Streamlit App
========================================================
Interactive dashboard with KPI cards, filterable charts, and segment explorer.
Run: streamlit run app.py
"""

import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns
import os

# ─── PAGE CONFIG ─────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="E-Commerce Sales Intelligence",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Hide default sidebar navigation & reduce top padding
st.markdown("""
<style>
    [data-testid="stSidebarNav"] {display: none;}
    .block-container {padding-top: 4rem;}
</style>
""", unsafe_allow_html=True)

# Top Navbar
col_spacer1, col_nav1, col_nav2, col_spacer2 = st.columns([3, 2, 2, 3])
with col_nav1:
    st.page_link("app.py", label="Dashboard", use_container_width=True)
with col_nav2:
    st.page_link("pages/1_About.py", label="About the Project", use_container_width=True)

# ─── CUSTOM CSS ─────────────────────────────────────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

    .dashboard-title {
        text-align: center; padding: 10px 0 5px 0;
        font-size: 30px; font-weight: 700;
    }
    .dashboard-subtitle {
        text-align: center; padding: 0 0 15px 0;
        font-size: 14px; opacity: 0.6;
    }

    .metric-row {
        display: flex; gap: 14px; justify-content: center;
        flex-wrap: wrap; margin-bottom: 20px;
    }
    .metric-card {
        border: 1px solid rgba(128,128,128,0.2);
        border-radius: 12px;
        padding: 18px 12px;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        transition: transform 0.2s;
        flex: 1 1 0;
        min-width: 120px;
    }
    .metric-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
    .metric-label { opacity: 0.55; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .metric-value { font-size: 24px; font-weight: 700; }
    .metric-delta { font-size: 12px; margin-top: 5px; }
    .positive { color: #2a9d5c; }
    .negative { color: #d32f2f; }

    .section-header {
        font-size: 20px; font-weight: 600;
        margin: 30px 0 15px 0; padding-bottom: 8px;
        border-bottom: 2px solid rgba(128,128,128,0.2);
    }
</style>
""", unsafe_allow_html=True)

PALETTE = ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#44BBA4',
           '#6A994E', '#E94F37', '#393E41', '#D4A373', '#3B1F2B']


# ─── DATA LOADING ────────────────────────────────────────────────────────────
@st.cache_data
def load_data():
    base = os.path.dirname(__file__)
    df = pd.read_csv(os.path.join(base, 'data', 'cleaned', 'retail_cleaned.csv'), parse_dates=['InvoiceDate'])
    rfm = pd.read_csv(os.path.join(base, 'data', 'cleaned', 'rfm_data.csv'))
    return df, rfm

df_full, rfm_full = load_data()


# ─── SIDEBAR FILTERS ────────────────────────────────────────────────────────
st.sidebar.markdown("# Filters")
st.sidebar.markdown("---")

# Date range filter
min_date = df_full['InvoiceDate'].min().date()
max_date = df_full['InvoiceDate'].max().date()
date_range = st.sidebar.date_input(
    "Date Range",
    value=(min_date, max_date),
    min_value=min_date,
    max_value=max_date
)

# Country filter
all_countries = sorted(df_full['Country'].unique())
selected_countries = st.sidebar.multiselect(
    "Countries",
    all_countries,
    default=all_countries
)

# Segment filter
all_segments = []
selected_segments = []
if 'Segment' in rfm_full.columns:
    all_segments = sorted(rfm_full['Segment'].unique())
    selected_segments = st.sidebar.multiselect(
        "Customer Segments",
        all_segments,
        default=all_segments
    )

st.sidebar.markdown("---")
st.sidebar.markdown("*Built with Python, Pandas & Streamlit*")

# ─── APPLY FILTERS ──────────────────────────────────────────────────────────
if len(date_range) == 2:
    df = df_full[(df_full['InvoiceDate'].dt.date >= date_range[0]) &
                  (df_full['InvoiceDate'].dt.date <= date_range[1])]
else:
    df = df_full.copy()

df = df[df['Country'].isin(selected_countries)]


# ─── HEADER ────────────────────────────────────────────────────────────────
st.markdown('<div class="dashboard-title">E-Commerce Sales Intelligence Dashboard</div>', unsafe_allow_html=True)
st.markdown('<div class="dashboard-subtitle">UCI Online Retail II | {start} to {end} | {countries} countries</div>'.format(
    start=df['InvoiceDate'].min().strftime('%b %Y') if len(df) > 0 else 'N/A',
    end=df['InvoiceDate'].max().strftime('%b %Y') if len(df) > 0 else 'N/A',
    countries=df['Country'].nunique()
), unsafe_allow_html=True)


# ─── KPI CARDS ───────────────────────────────────────────────────────────────
if len(df) > 0:
    total_revenue = df['Revenue'].sum()
    total_orders = df['Invoice'].nunique()
    total_customers = df['Customer ID'].nunique()
    aov = total_revenue / total_orders if total_orders > 0 else 0
    
    monthly_rev = df.groupby('YearMonth')['Revenue'].sum().sort_index()
    latest_growth = (monthly_rev.iloc[-1] - monthly_rev.iloc[-2]) / monthly_rev.iloc[-2] * 100 if len(monthly_rev) >= 2 else 0
    
    purchase_counts = df.groupby('Customer ID')['Invoice'].nunique()
    repeat_rate = (purchase_counts > 1).sum() / len(purchase_counts) * 100

    delta_class = 'positive' if latest_growth >= 0 else 'negative'
    delta_arrow = '↑' if latest_growth >= 0 else '↓'

    st.markdown(f"""
    <div class="metric-row">
        <div class="metric-card">
            <div class="metric-label">Total Revenue</div>
            <div class="metric-value">£{total_revenue:,.0f}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Total Orders</div>
            <div class="metric-value">{total_orders:,}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Customers</div>
            <div class="metric-value">{total_customers:,}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Avg Order Value</div>
            <div class="metric-value">£{aov:,.0f}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Latest MoM Growth</div>
            <div class="metric-value">{latest_growth:+.1f}%</div>
            <div class="metric-delta {delta_class}">{delta_arrow} vs prev month</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Repeat Rate</div>
            <div class="metric-value">{repeat_rate:.1f}%</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # ─── CHART HELPER ───────────────────────────────────────────────────────
    CHART_H = 5          # standard chart height for line/bar rows
    CHART_H_BARH = 5.5   # standard chart height for horizontal-bar rows

    def style_ax(ax, title, grid_axis='y'):
        ax.set_title(title, fontsize=14, pad=10)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['bottom'].set_color('#ddd')
        ax.spines['left'].set_color('#ddd')
        ax.tick_params(colors='#333')
        ax.grid(alpha=0.15, color='#999', axis=grid_axis)

    # ─── ROW 1: Revenue Trends ──────────────────────────────────────────────
    st.markdown('<div class="section-header">Revenue Trends</div>', unsafe_allow_html=True)

    col_left, col_right = st.columns(2)

    with col_left:
        monthly = df.groupby('YearMonth')['Revenue'].sum().reset_index().sort_values('YearMonth')
        fig, ax = plt.subplots(figsize=(10, CHART_H))
        fig.patch.set_facecolor('white'); ax.set_facecolor('#FAFAFA')
        if len(monthly) > 0:
            ax.fill_between(range(len(monthly)), monthly['Revenue'], alpha=0.2, color='#2E86AB')
            ax.plot(range(len(monthly)), monthly['Revenue'], color='#2E86AB', linewidth=2.5, marker='o', markersize=4)
            ax.set_xticks(range(len(monthly)))
            ax.set_xticklabels(monthly['YearMonth'], rotation=45, ha='right', fontsize=8, color='#555')
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        style_ax(ax, 'Monthly Revenue', 'both')
        plt.tight_layout(); st.pyplot(fig); plt.close()

    with col_right:
        quarterly = df.groupby('Quarter')['Revenue'].sum().reset_index().sort_values('Quarter')
        fig, ax = plt.subplots(figsize=(10, CHART_H))
        fig.patch.set_facecolor('white'); ax.set_facecolor('#FAFAFA')
        if len(quarterly) > 0:
            ax.bar(quarterly['Quarter'], quarterly['Revenue'], color='#A23B72', width=0.5, edgecolor='none')
            ax.set_xticklabels(quarterly['Quarter'], rotation=45, ha='right', fontsize=8, color='#555')
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        style_ax(ax, 'Quarterly Revenue')
        plt.tight_layout(); st.pyplot(fig); plt.close()

    # ─── ROW 2: Customer Intelligence ───────────────────────────────────────
    st.markdown('<div class="section-header">Customer Intelligence</div>', unsafe_allow_html=True)

    # Compute rfm_filtered ONCE for both charts in this row
    filtered_customers = df['Customer ID'].unique()
    rfm_filtered = rfm_full[rfm_full['CustomerID'].isin(filtered_customers)]
    if selected_segments:
        rfm_filtered = rfm_filtered[rfm_filtered['Segment'].isin(selected_segments)]
    
    # Show info if some selected segments have no customers
    if selected_segments:
        available = set(rfm_full[rfm_full['CustomerID'].isin(filtered_customers)]['Segment'].unique())
        missing = set(selected_segments) - available
        if missing:
            st.info(f"No customers found for: {', '.join(sorted(missing))} in the selected countries.")

    col_left, col_right = st.columns(2)

    with col_left:
        seg_counts = rfm_filtered['Segment'].value_counts()
        fig, ax = plt.subplots(figsize=(10, CHART_H_BARH))
        fig.patch.set_facecolor('white')
        if len(seg_counts) > 0:
            colors_seg = ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#44BBA4', '#6A994E', '#E94F37']
            wedges, texts, autotexts = ax.pie(
                seg_counts, labels=seg_counts.index, autopct='%1.1f%%',
                colors=colors_seg[:len(seg_counts)], startangle=140,
                pctdistance=0.75, labeldistance=1.18,
                wedgeprops={'linewidth': 1.5, 'edgecolor': 'white'},
                textprops={'fontsize': 9, 'color': '#333'})
            for t in autotexts:
                t.set_fontweight('bold'); t.set_fontsize(8); t.set_color('white')
            ax.add_artist(plt.Circle((0, 0), 0.45, fc='white'))
        else:
            ax.text(0.5, 0.5, 'No segment data', ha='center', va='center', fontsize=14, color='#999', transform=ax.transAxes)
        ax.set_title('RFM Customer Segments', fontsize=14, pad=15)
        plt.tight_layout(); st.pyplot(fig); plt.close()

    with col_right:
        seg_revenue = rfm_filtered.groupby('Segment')['Monetary'].sum().sort_values(ascending=True)
        fig, ax = plt.subplots(figsize=(10, CHART_H_BARH))
        fig.patch.set_facecolor('white'); ax.set_facecolor('#FAFAFA')
        if len(seg_revenue) > 0:
            ax.barh(seg_revenue.index, seg_revenue.values, color='#A23B72', edgecolor='none', height=0.5)
        ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        style_ax(ax, 'Revenue by Segment', 'x')
        plt.tight_layout(); st.pyplot(fig); plt.close()

    # ─── ROW 3: Product & Geographic ────────────────────────────────────────
    st.markdown('<div class="section-header">Products & Markets</div>', unsafe_allow_html=True)

    col_left, col_right = st.columns(2)

    with col_left:
        top_products = df.groupby('Description')['Revenue'].sum().sort_values(ascending=False).head(10)
        top_products = top_products.sort_values(ascending=True)
        fig, ax = plt.subplots(figsize=(10, CHART_H_BARH))
        fig.patch.set_facecolor('white'); ax.set_facecolor('#FAFAFA')
        if len(top_products) > 0:
            labels = [d[:30] for d in top_products.index]
            ax.barh(labels, top_products.values, color='#F18F01', edgecolor='none', height=0.5)
        ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        style_ax(ax, 'Top 10 Products by Revenue', 'x')
        plt.tight_layout(); st.pyplot(fig); plt.close()

    with col_right:
        top_countries = df.groupby('Country')['Revenue'].sum().sort_values(ascending=False).head(10)
        top_countries = top_countries.sort_values(ascending=True)
        fig, ax = plt.subplots(figsize=(10, CHART_H_BARH))
        fig.patch.set_facecolor('white'); ax.set_facecolor('#FAFAFA')
        if len(top_countries) > 0:
            colors_c = ['#C73E1D' if c == 'United Kingdom' else '#2E86AB' for c in top_countries.index]
            ax.barh(top_countries.index, top_countries.values, color=colors_c, edgecolor='none', height=0.5)
        ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        style_ax(ax, 'Top 10 Countries by Revenue', 'x')
        plt.tight_layout(); st.pyplot(fig); plt.close()

    # ─── ROW 4: Hourly & Day of Week ────────────────────────────────────────
    st.markdown('<div class="section-header">Temporal Patterns</div>', unsafe_allow_html=True)

    col_left, col_right = st.columns(2)

    with col_left:
        hourly = df.groupby('Hour')['Revenue'].sum().reset_index()
        fig, ax = plt.subplots(figsize=(10, CHART_H))
        fig.patch.set_facecolor('white'); ax.set_facecolor('#FAFAFA')
        if len(hourly) > 0:
            ax.bar(hourly['Hour'], hourly['Revenue'], color='#44BBA4', width=0.7, edgecolor='none')
        ax.set_xticks(range(0, 24))
        ax.set_xticklabels([f'{h}' for h in range(24)], fontsize=8, color='#555')
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        ax.set_xlabel('Hour', color='#555')
        style_ax(ax, 'Revenue by Hour')
        plt.tight_layout(); st.pyplot(fig); plt.close()

    with col_right:
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        daily = df.groupby('DayOfWeek')['Revenue'].sum().reindex(day_order).fillna(0).reset_index()
        daily.columns = ['Day', 'Revenue']
        fig, ax = plt.subplots(figsize=(10, CHART_H))
        fig.patch.set_facecolor('white'); ax.set_facecolor('#FAFAFA')
        ax.bar(daily['Day'], daily['Revenue'], color='#E94F37', width=0.5, edgecolor='none')
        ax.set_xticklabels(daily['Day'], rotation=30, ha='right', fontsize=9, color='#555')
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        style_ax(ax, 'Revenue by Day of Week')
        plt.tight_layout(); st.pyplot(fig); plt.close()

    # ─── FOOTER ─────────────────────────────────────────────────────────────
    st.markdown("---")
    st.markdown("""
    <div style='text-align: center; color: #777; font-size: 12px; padding: 20px;'>
        E-Commerce Sales Intelligence Dashboard | Data: UCI Online Retail II | 
        Built with Python, Pandas, Matplotlib & Streamlit
    </div>
    """, unsafe_allow_html=True)

else:
    st.warning("No data matches the selected filters. Please adjust the date range or country selection.")
