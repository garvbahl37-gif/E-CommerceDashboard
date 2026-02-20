"""
E-Commerce Sales Intelligence Dashboard
Phase 3: KPI Analysis & Insight-Driven Visualizations
======================================================
Every analysis follows a consulting framework:
  1. Business Question
  2. Python Code
  3. Visualization
  4. Strategic Interpretation
  5. Actionable Recommendation
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns
import os
import warnings
warnings.filterwarnings('ignore')

# ─── STYLE CONFIGURATION ────────────────────────────────────────────────────
plt.rcParams.update({
    'figure.figsize': (12, 6),
    'figure.dpi': 150,
    'font.family': 'sans-serif',
    'font.size': 11,
    'axes.titlesize': 14,
    'axes.titleweight': 'bold',
    'axes.labelsize': 12,
    'axes.spines.top': False,
    'axes.spines.right': False,
    'figure.facecolor': 'white',
    'axes.facecolor': '#FAFAFA',
    'axes.grid': True,
    'grid.alpha': 0.3,
})

PALETTE = ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#3B1F2B',
           '#44BBA4', '#E94F37', '#393E41', '#D4A373', '#6A994E']

BASE_DIR = os.path.dirname(__file__)
DATA_PATH = os.path.join(BASE_DIR, '..', 'data', 'cleaned', 'retail_cleaned.csv')
FIG_DIR = os.path.join(BASE_DIR, '..', 'outputs', 'figures')
os.makedirs(FIG_DIR, exist_ok=True)


def load_data() -> pd.DataFrame:
    """Load the cleaned dataset."""
    print("=" * 60)
    print("PHASE 3: KPI ANALYSIS & VISUALIZATIONS")
    print("=" * 60)
    df = pd.read_csv(DATA_PATH, parse_dates=['InvoiceDate'])
    print(f"\nLoaded {len(df):,} rows | {df['Customer ID'].nunique():,} customers | {df['Invoice'].nunique():,} orders")
    return df


def savefig(name: str):
    """Save current figure to outputs/figures/."""
    path = os.path.join(FIG_DIR, f"{name}.png")
    plt.savefig(path, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f"  📊 Saved → outputs/figures/{name}.png")


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS 1: Monthly Revenue Trend
# ═══════════════════════════════════════════════════════════════════════════
def analysis_monthly_revenue(df: pd.DataFrame):
    """
    BUSINESS QUESTION: Is revenue growing or declining month-over-month?
    STRATEGIC VALUE: Identifies momentum, seasonality, and inflection points.
    """
    print("\n─── Analysis 1: Monthly Revenue Trend ───")
    
    monthly = df.groupby('YearMonth')['Revenue'].sum().reset_index()
    monthly = monthly.sort_values('YearMonth')
    
    fig, ax = plt.subplots(figsize=(14, 6))
    ax.fill_between(range(len(monthly)), monthly['Revenue'], alpha=0.15, color=PALETTE[0])
    ax.plot(range(len(monthly)), monthly['Revenue'], color=PALETTE[0], linewidth=2.5, marker='o', markersize=5)
    
    # Annotate peak
    peak_idx = monthly['Revenue'].idxmax()
    peak_val = monthly.loc[peak_idx, 'Revenue']
    peak_month = monthly.loc[peak_idx, 'YearMonth']
    ax.annotate(f'Peak: £{peak_val:,.0f}\n({peak_month})', 
                xy=(monthly.index.get_loc(peak_idx), peak_val),
                xytext=(0, 20), textcoords='offset points',
                fontsize=10, fontweight='bold', color=PALETTE[3],
                arrowprops=dict(arrowstyle='->', color=PALETTE[3]))
    
    ax.set_xticks(range(len(monthly)))
    ax.set_xticklabels(monthly['YearMonth'], rotation=45, ha='right', fontsize=9)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
    ax.set_title('Monthly Revenue Trend', fontsize=16, pad=15)
    ax.set_xlabel('Month')
    ax.set_ylabel('Total Revenue (£)')
    plt.tight_layout()
    savefig('01_monthly_revenue_trend')
    
    print(f"  💡 Interpretation: Peak revenue month is {peak_month} (£{peak_val:,.0f}).")
    print(f"  📌 Recommendation: Allocate extra marketing budget 2 months before peak season.")


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS 2: Quarterly Revenue
# ═══════════════════════════════════════════════════════════════════════════
def analysis_quarterly_revenue(df: pd.DataFrame):
    """
    BUSINESS QUESTION: Which quarters drive the most revenue?
    STRATEGIC VALUE: Aligns inventory planning and promotional calendars.
    """
    print("\n─── Analysis 2: Quarterly Revenue ───")
    
    quarterly = df.groupby('Quarter')['Revenue'].sum().reset_index().sort_values('Quarter')
    
    fig, ax = plt.subplots(figsize=(12, 6))
    colors = [PALETTE[0] if v < quarterly['Revenue'].max() else PALETTE[3] for v in quarterly['Revenue']]
    bars = ax.bar(quarterly['Quarter'], quarterly['Revenue'], color=colors, width=0.6, edgecolor='white')
    
    for bar, val in zip(bars, quarterly['Revenue']):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + quarterly['Revenue'].max()*0.01,
                f'£{val:,.0f}', ha='center', va='bottom', fontsize=9, fontweight='bold')
    
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
    ax.set_title('Revenue by Quarter', fontsize=16, pad=15)
    ax.set_xlabel('Quarter')
    ax.set_ylabel('Total Revenue (£)')
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    savefig('02_quarterly_revenue')
    
    top_q = quarterly.loc[quarterly['Revenue'].idxmax(), 'Quarter']
    print(f"  💡 Interpretation: {top_q} is the highest-grossing quarter.")
    print(f"  📌 Recommendation: Front-load inventory and staffing for Q4 holiday demand.")


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS 3: Year-over-Year Comparison
# ═══════════════════════════════════════════════════════════════════════════
def analysis_yoy_comparison(df: pd.DataFrame):
    """
    BUSINESS QUESTION: How does 2011 compare to 2010?
    STRATEGIC VALUE: Measures overall business trajectory.
    """
    print("\n─── Analysis 3: Year-over-Year Revenue Comparison ───")
    
    df_yoy = df[df['Year'].isin([2010, 2011])].copy()
    df_yoy['MonthNum'] = df_yoy['InvoiceDate'].dt.month
    monthly_yoy = df_yoy.groupby(['Year', 'MonthNum'])['Revenue'].sum().reset_index()
    
    fig, ax = plt.subplots(figsize=(12, 6))
    for i, year in enumerate([2010, 2011]):
        data = monthly_yoy[monthly_yoy['Year'] == year]
        ax.plot(data['MonthNum'], data['Revenue'], color=PALETTE[i], linewidth=2.5,
                marker='o', markersize=6, label=str(year))
    
    ax.set_xticks(range(1, 13))
    ax.set_xticklabels(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
    ax.set_title('Year-over-Year Revenue: 2010 vs 2011', fontsize=16, pad=15)
    ax.set_xlabel('Month')
    ax.set_ylabel('Monthly Revenue (£)')
    ax.legend(fontsize=12, frameon=True, fancybox=True, shadow=True)
    plt.tight_layout()
    savefig('03_yoy_comparison')
    
    rev_2010 = monthly_yoy[monthly_yoy['Year'] == 2010]['Revenue'].sum()
    rev_2011 = monthly_yoy[monthly_yoy['Year'] == 2011]['Revenue'].sum()
    growth = (rev_2011 - rev_2010) / rev_2010 * 100
    print(f"  💡 Interpretation: 2010 → £{rev_2010:,.0f} | 2011 → £{rev_2011:,.0f} | YoY Growth: {growth:+.1f}%")
    print(f"  📌 Recommendation: If growth > 20%, invest in scaling operations; if flat, revisit acquisition channels.")


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS 4: Monthly Growth Rate
# ═══════════════════════════════════════════════════════════════════════════
def analysis_monthly_growth_rate(df: pd.DataFrame):
    """
    BUSINESS QUESTION: What is the revenue growth momentum month-over-month?
    STRATEGIC VALUE: Detects acceleration, deceleration, or contraction early.
    """
    print("\n─── Analysis 4: Monthly Revenue Growth Rate ───")
    
    monthly = df.groupby('YearMonth')['Revenue'].sum().reset_index().sort_values('YearMonth')
    monthly['GrowthRate'] = monthly['Revenue'].pct_change() * 100
    monthly = monthly.dropna()
    
    fig, ax = plt.subplots(figsize=(14, 6))
    colors = [PALETTE[0] if v >= 0 else PALETTE[3] for v in monthly['GrowthRate']]
    ax.bar(range(len(monthly)), monthly['GrowthRate'], color=colors, width=0.7, edgecolor='white')
    ax.axhline(y=0, color='black', linewidth=0.8)
    
    avg_growth = monthly['GrowthRate'].mean()
    ax.axhline(y=avg_growth, color=PALETTE[1], linewidth=1.5, linestyle='--',
               label=f'Avg Growth: {avg_growth:.1f}%')
    
    ax.set_xticks(range(len(monthly)))
    ax.set_xticklabels(monthly['YearMonth'], rotation=45, ha='right', fontsize=9)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'{x:+.0f}%'))
    ax.set_title('Month-over-Month Revenue Growth Rate', fontsize=16, pad=15)
    ax.set_xlabel('Month')
    ax.set_ylabel('Growth Rate (%)')
    ax.legend(fontsize=11)
    plt.tight_layout()
    savefig('04_monthly_growth_rate')
    
    neg_months = (monthly['GrowthRate'] < 0).sum()
    print(f"  💡 Interpretation: Avg monthly growth = {avg_growth:.1f}%. {neg_months} months showed contraction.")
    print(f"  📌 Recommendation: Investigate the contraction months for causes (seasonality vs. operational issues).")


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS 5: Cohort Retention Analysis (Customer Retention & Churn)
# ═══════════════════════════════════════════════════════════════════════════
def analysis_cohort_retention(df: pd.DataFrame):
    """
    BUSINESS QUESTION: Are we retaining customers over time?
    STRATEGIC VALUE: Retention is 5–25x cheaper than acquisition. Cohort analysis
    reveals whether product-market fit is improving.
    """
    print("\n─── Analysis 5: Cohort Retention Analysis ───")
    
    df_cohort = df.copy()
    df_cohort['InvoiceMonth'] = df_cohort['InvoiceDate'].dt.to_period('M')
    
    # First purchase month per customer
    df_cohort['CohortMonth'] = df_cohort.groupby('Customer ID')['InvoiceMonth'].transform('min')
    
    # Cohort index (months since first purchase)
    df_cohort['CohortIndex'] = (df_cohort['InvoiceMonth'].dt.year - df_cohort['CohortMonth'].dt.year) * 12 + \
                                (df_cohort['InvoiceMonth'].dt.month - df_cohort['CohortMonth'].dt.month)
    
    # Cohort table
    cohort_data = df_cohort.groupby(['CohortMonth', 'CohortIndex'])['Customer ID'].nunique().reset_index()
    cohort_pivot = cohort_data.pivot(index='CohortMonth', columns='CohortIndex', values='Customer ID')
    
    # Retention percentages
    cohort_sizes = cohort_pivot.iloc[:, 0]
    retention = cohort_pivot.divide(cohort_sizes, axis=0) * 100
    
    # Limit to first 13 months and meaningful cohorts
    retention = retention.iloc[:12, :13]
    
    fig, ax = plt.subplots(figsize=(14, 8))
    sns.heatmap(retention, annot=True, fmt='.0f', cmap='YlOrRd_r', linewidths=0.5,
                ax=ax, cbar_kws={'label': 'Retention %', 'shrink': 0.8},
                vmin=0, vmax=100)
    ax.set_title('Customer Cohort Retention Heatmap (%)', fontsize=16, pad=15)
    ax.set_xlabel('Months Since First Purchase', fontsize=12)
    ax.set_ylabel('Cohort (First Purchase Month)', fontsize=12)
    plt.tight_layout()
    savefig('05_cohort_retention_heatmap')
    
    # Calculate overall retention rates
    avg_m1 = retention.iloc[:, 1].mean() if retention.shape[1] > 1 else 0
    avg_m3 = retention.iloc[:, 3].mean() if retention.shape[1] > 3 else 0
    avg_m6 = retention.iloc[:, 6].mean() if retention.shape[1] > 6 else 0
    
    print(f"  💡 Interpretation: Avg retention → Month 1: {avg_m1:.1f}% | Month 3: {avg_m3:.1f}% | Month 6: {avg_m6:.1f}%")
    print(f"     Implied churn rate at Month 1: {100 - avg_m1:.1f}%")
    print(f"  📌 Recommendation: Target churned-at-Month-1 customers with re-engagement campaigns (email, discounts).")


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS 6: RFM Analysis
# ═══════════════════════════════════════════════════════════════════════════
def analysis_rfm(df: pd.DataFrame) -> pd.DataFrame:
    """
    BUSINESS QUESTION: How can we segment customers by value and engagement?
    STRATEGIC VALUE: RFM is the gold-standard for customer segmentation in
    e-commerce. It directly maps to marketing spend allocation.
    """
    print("\n─── Analysis 6: RFM Analysis ───")
    
    snapshot_date = df['InvoiceDate'].max() + pd.Timedelta(days=1)
    
    rfm = df.groupby('Customer ID').agg({
        'InvoiceDate': lambda x: (snapshot_date - x.max()).days,  # Recency
        'Invoice': 'nunique',                                      # Frequency
        'Revenue': 'sum'                                           # Monetary
    }).reset_index()
    rfm.columns = ['CustomerID', 'Recency', 'Frequency', 'Monetary']
    
    # Score each dimension 1–5 (quintiles)
    rfm['R_Score'] = pd.qcut(rfm['Recency'], 5, labels=[5, 4, 3, 2, 1]).astype(int)
    rfm['F_Score'] = pd.qcut(rfm['Frequency'].rank(method='first'), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    rfm['M_Score'] = pd.qcut(rfm['Monetary'].rank(method='first'), 5, labels=[1, 2, 3, 4, 5]).astype(int)
    rfm['RFM_Score'] = rfm['R_Score'].astype(str) + rfm['F_Score'].astype(str) + rfm['M_Score'].astype(str)
    
    # Segment mapping
    def rfm_segment(row):
        if row['R_Score'] >= 4 and row['F_Score'] >= 4 and row['M_Score'] >= 4:
            return 'Champions'
        elif row['R_Score'] >= 3 and row['F_Score'] >= 3:
            return 'Loyal Customers'
        elif row['R_Score'] >= 4 and row['F_Score'] <= 2:
            return 'New Customers'
        elif row['R_Score'] <= 2 and row['F_Score'] >= 3:
            return 'At Risk'
        elif row['R_Score'] <= 2 and row['F_Score'] <= 2 and row['M_Score'] <= 2:
            return 'Hibernating'
        elif row['R_Score'] >= 3 and row['M_Score'] >= 4:
            return 'Big Spenders'
        else:
            return 'Need Attention'
    
    rfm['Segment'] = rfm.apply(rfm_segment, axis=1)
    
    # ── Visualization 1: Segment Distribution ──
    seg_counts = rfm['Segment'].value_counts()
    seg_revenue = rfm.groupby('Segment')['Monetary'].sum().reindex(seg_counts.index)
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 7))
    
    # Pie: Customer count by segment
    colors_pie = PALETTE[:len(seg_counts)]
    wedges, texts, autotexts = ax1.pie(seg_counts, labels=seg_counts.index, autopct='%1.1f%%',
                                        colors=colors_pie, startangle=90, pctdistance=0.85)
    for text in autotexts:
        text.set_fontsize(9)
        text.set_fontweight('bold')
    ax1.set_title('Customer Segments (Count)', fontsize=14, pad=15)
    
    # Bar: Revenue by segment
    ax2.barh(seg_revenue.index, seg_revenue.values, color=colors_pie, edgecolor='white')
    ax2.set_xlabel('Total Revenue (£)')
    ax2.set_title('Revenue Contribution by Segment', fontsize=14, pad=15)
    ax2.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
    
    plt.suptitle('RFM Customer Segmentation', fontsize=16, fontweight='bold', y=1.02)
    plt.tight_layout()
    savefig('06_rfm_segmentation')
    
    # ── Visualization 2: RFM Scatter ──
    fig, ax = plt.subplots(figsize=(12, 8))
    scatter = ax.scatter(rfm['Recency'], rfm['Frequency'], c=rfm['Monetary'],
                         cmap='YlOrRd', s=rfm['Monetary'].clip(upper=rfm['Monetary'].quantile(0.95))/10,
                         alpha=0.5, edgecolors='none')
    plt.colorbar(scatter, ax=ax, label='Monetary Value (£)', shrink=0.8)
    ax.set_title('RFM Scatter: Recency vs Frequency (size & color = Monetary)', fontsize=14, pad=15)
    ax.set_xlabel('Recency (days since last purchase)')
    ax.set_ylabel('Frequency (number of orders)')
    plt.tight_layout()
    savefig('07_rfm_scatter')
    
    # Print summary
    champs = rfm[rfm['Segment'] == 'Champions']
    at_risk = rfm[rfm['Segment'] == 'At Risk']
    print(f"  Champions: {len(champs)} customers ({len(champs)/len(rfm)*100:.1f}%) → £{champs['Monetary'].sum():,.0f} revenue")
    print(f"  At Risk:   {len(at_risk)} customers ({len(at_risk)/len(rfm)*100:.1f}%) → £{at_risk['Monetary'].sum():,.0f} revenue")
    print(f"  💡 Interpretation: Champions are the core profit engine. At-Risk customers need immediate attention.")
    print(f"  📌 Recommendation: Launch VIP loyalty program for Champions; trigger win-back emails for At-Risk.")
    
    return rfm


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS 7: Top 10 Products by Revenue
# ═══════════════════════════════════════════════════════════════════════════
def analysis_top_products(df: pd.DataFrame):
    """
    BUSINESS QUESTION: Which products should we double-down on?
    STRATEGIC VALUE: Informs inventory allocation and promotional strategy.
    """
    print("\n─── Analysis 7: Top 10 Products by Revenue ───")
    
    products = df.groupby(['StockCode', 'Description']).agg(
        TotalRevenue=('Revenue', 'sum'),
        UnitsSold=('Quantity', 'sum'),
        OrderCount=('Invoice', 'nunique')
    ).reset_index().sort_values('TotalRevenue', ascending=False).head(10)
    
    # Truncate long descriptions
    products['ShortDesc'] = products['Description'].str[:35]
    
    fig, ax = plt.subplots(figsize=(12, 7))
    bars = ax.barh(products['ShortDesc'][::-1], products['TotalRevenue'][::-1],
                   color=PALETTE[0], edgecolor='white')
    
    for bar, val in zip(bars, products['TotalRevenue'][::-1]):
        ax.text(bar.get_width() + products['TotalRevenue'].max()*0.01, bar.get_y() + bar.get_height()/2,
                f'£{val:,.0f}', ha='left', va='center', fontsize=10, fontweight='bold')
    
    ax.set_title('Top 10 Products by Revenue', fontsize=16, pad=15)
    ax.set_xlabel('Total Revenue (£)')
    ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
    plt.tight_layout()
    savefig('08_top_products')
    
    top_prod = products.iloc[0]
    print(f"  #1 Product: {top_prod['Description']} → £{top_prod['TotalRevenue']:,.0f}")
    print(f"  💡 Interpretation: Top 10 products disproportionately drive revenue.")
    print(f"  📌 Recommendation: Ensure top 10 products are never out of stock; bundle with slower-moving items.")


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS 8: Top 10 Countries by Revenue
# ═══════════════════════════════════════════════════════════════════════════
def analysis_top_countries(df: pd.DataFrame):
    """
    BUSINESS QUESTION: Where are our strongest markets?
    STRATEGIC VALUE: Prioritizes geographic expansion and localization investment.
    """
    print("\n─── Analysis 8: Top 10 Countries by Revenue ───")
    
    countries = df.groupby('Country').agg(
        TotalRevenue=('Revenue', 'sum'),
        Customers=('Customer ID', 'nunique'),
        Orders=('Invoice', 'nunique')
    ).reset_index().sort_values('TotalRevenue', ascending=False)
    
    # Separate UK from rest for context
    uk_rev = countries[countries['Country'] == 'United Kingdom']['TotalRevenue'].values[0]
    total_rev = countries['TotalRevenue'].sum()
    print(f"  UK share: £{uk_rev:,.0f} ({uk_rev/total_rev*100:.1f}% of total)")
    
    # Plot top 10 (excluding UK for better scale on bar chart) + UK annotation
    top10 = countries.head(10)
    
    fig, ax = plt.subplots(figsize=(12, 7))
    colors = [PALETTE[3] if c == 'United Kingdom' else PALETTE[0] for c in top10['Country']]
    bars = ax.barh(top10['Country'][::-1], top10['TotalRevenue'][::-1],
                   color=colors[::-1], edgecolor='white')
    
    for bar, val in zip(bars, top10['TotalRevenue'][::-1]):
        ax.text(bar.get_width() + total_rev*0.005, bar.get_y() + bar.get_height()/2,
                f'£{val:,.0f}', ha='left', va='center', fontsize=10, fontweight='bold')
    
    ax.set_title('Top 10 Countries by Revenue', fontsize=16, pad=15)
    ax.set_xlabel('Total Revenue (£)')
    ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
    plt.tight_layout()
    savefig('09_top_countries')
    
    non_uk = countries[countries['Country'] != 'United Kingdom'].head(3)
    print(f"  Top non-UK markets: {', '.join(non_uk['Country'].tolist())}")
    print(f"  💡 Interpretation: Revenue is heavily concentrated in the UK.")
    print(f"  📌 Recommendation: Diversify into top 3 non-UK markets with localized marketing campaigns.")


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS 9: Revenue by Hour of Day
# ═══════════════════════════════════════════════════════════════════════════
def analysis_revenue_by_hour(df: pd.DataFrame):
    """
    BUSINESS QUESTION: When do customers buy the most?
    STRATEGIC VALUE: Optimizes ad scheduling, email send times, and server capacity.
    """
    print("\n─── Analysis 9: Revenue by Hour of Day ───")
    
    hourly = df.groupby('Hour')['Revenue'].sum().reset_index()
    
    fig, ax = plt.subplots(figsize=(12, 6))
    colors = [PALETTE[3] if h in hourly.nlargest(3, 'Revenue')['Hour'].values else PALETTE[0] for h in hourly['Hour']]
    ax.bar(hourly['Hour'], hourly['Revenue'], color=colors, width=0.7, edgecolor='white')
    
    ax.set_xticks(range(0, 24))
    ax.set_xticklabels([f'{h}:00' for h in range(24)], rotation=45, ha='right', fontsize=9)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
    ax.set_title('Revenue Distribution by Hour of Day', fontsize=16, pad=15)
    ax.set_xlabel('Hour of Day')
    ax.set_ylabel('Total Revenue (£)')
    plt.tight_layout()
    savefig('10_revenue_by_hour')
    
    peak_hours = hourly.nlargest(3, 'Revenue')['Hour'].tolist()
    print(f"  💡 Interpretation: Peak buying hours: {peak_hours}")
    print(f"  📌 Recommendation: Schedule email campaigns and flash sales during peak hours.")


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS 10: Average Order Value Trend
# ═══════════════════════════════════════════════════════════════════════════
def analysis_aov_trend(df: pd.DataFrame):
    """
    BUSINESS QUESTION: Is the average basket size improving?
    STRATEGIC VALUE: AOV growth without acquisition growth = higher profitability.
    """
    print("\n─── Analysis 10: Average Order Value (AOV) Trend ───")
    
    order_rev = df.groupby(['YearMonth', 'Invoice'])['Revenue'].sum().reset_index()
    aov = order_rev.groupby('YearMonth')['Revenue'].mean().reset_index()
    aov.columns = ['YearMonth', 'AOV']
    aov = aov.sort_values('YearMonth')
    
    fig, ax = plt.subplots(figsize=(14, 6))
    ax.plot(range(len(aov)), aov['AOV'], color=PALETTE[1], linewidth=2.5, marker='s', markersize=5)
    ax.fill_between(range(len(aov)), aov['AOV'], alpha=0.1, color=PALETTE[1])
    
    overall_aov = aov['AOV'].mean()
    ax.axhline(y=overall_aov, color=PALETTE[0], linewidth=1.5, linestyle='--',
               label=f'Overall Avg: £{overall_aov:.2f}')
    
    ax.set_xticks(range(len(aov)))
    ax.set_xticklabels(aov['YearMonth'], rotation=45, ha='right', fontsize=9)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
    ax.set_title('Average Order Value (AOV) Trend', fontsize=16, pad=15)
    ax.set_xlabel('Month')
    ax.set_ylabel('Average Order Value (£)')
    ax.legend(fontsize=11)
    plt.tight_layout()
    savefig('11_aov_trend')
    
    print(f"  💡 Interpretation: Overall AOV = £{overall_aov:,.2f}")
    print(f"  📌 Recommendation: Implement cross-sell bundles and free-shipping thresholds to boost AOV.")


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS 11: Day-of-Week Revenue Pattern
# ═══════════════════════════════════════════════════════════════════════════
def analysis_day_of_week(df: pd.DataFrame):
    """
    BUSINESS QUESTION: Which days generate the most revenue?
    STRATEGIC VALUE: Optimizes staffing, ad spend, and operational readiness.
    """
    print("\n─── Analysis 11: Revenue by Day of Week ───")
    
    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    daily = df.groupby('DayOfWeek')['Revenue'].sum().reindex(day_order).reset_index()
    
    fig, ax = plt.subplots(figsize=(10, 6))
    colors = [PALETTE[3] if v == daily['Revenue'].max() else PALETTE[0] for v in daily['Revenue']]
    bars = ax.bar(daily['DayOfWeek'], daily['Revenue'], color=colors, width=0.6, edgecolor='white')
    
    for bar, val in zip(bars, daily['Revenue']):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + daily['Revenue'].max()*0.01,
                f'£{val:,.0f}', ha='center', va='bottom', fontsize=9, fontweight='bold')
    
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
    ax.set_title('Revenue by Day of Week', fontsize=16, pad=15)
    ax.set_ylabel('Total Revenue (£)')
    plt.tight_layout()
    savefig('12_day_of_week_revenue')
    
    best_day = daily.loc[daily['Revenue'].idxmax(), 'DayOfWeek']
    print(f"  💡 Interpretation: {best_day} is the highest-revenue day.")
    print(f"  📌 Recommendation: Launch weekly promotions on the slowest day to balance demand.")


# ═══════════════════════════════════════════════════════════════════════════
# KPI SUMMARY TABLE
# ═══════════════════════════════════════════════════════════════════════════
def generate_kpi_summary(df: pd.DataFrame, rfm: pd.DataFrame):
    """Generate a summary of all headline KPIs."""
    print("\n" + "=" * 60)
    print("📊 HEADLINE KPI SUMMARY")
    print("=" * 60)
    
    total_revenue = df['Revenue'].sum()
    total_orders = df['Invoice'].nunique()
    total_customers = df['Customer ID'].nunique()
    aov = total_revenue / total_orders
    avg_items_per_order = df.groupby('Invoice')['Quantity'].sum().mean()
    
    # Monthly growth
    monthly = df.groupby('YearMonth')['Revenue'].sum().sort_index()
    growth_rates = monthly.pct_change().dropna() * 100
    avg_growth = growth_rates.mean()
    
    # Repeat customer rate
    purchase_counts = df.groupby('Customer ID')['Invoice'].nunique()
    repeat_rate = (purchase_counts > 1).sum() / len(purchase_counts) * 100
    
    # Champions share
    champs = rfm[rfm['Segment'] == 'Champions']
    champ_rev_share = champs['Monetary'].sum() / rfm['Monetary'].sum() * 100
    
    kpis = {
        'Total Revenue': f'£{total_revenue:,.2f}',
        'Total Orders': f'{total_orders:,}',
        'Total Customers': f'{total_customers:,}',
        'Average Order Value': f'£{aov:,.2f}',
        'Avg Items per Order': f'{avg_items_per_order:.1f}',
        'Avg Monthly Growth': f'{avg_growth:+.1f}%',
        'Repeat Customer Rate': f'{repeat_rate:.1f}%',
        'Champions (% of customers)': f'{len(champs)/len(rfm)*100:.1f}%',
        'Champions Revenue Share': f'{champ_rev_share:.1f}%',
        'Countries Served': f'{df["Country"].nunique()}',
    }
    
    for kpi, val in kpis.items():
        print(f"  {kpi:<30} {val:>15}")
    
    print("=" * 60)
    return kpis


# ═══════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════
def main():
    df = load_data()
    
    analysis_monthly_revenue(df)
    analysis_quarterly_revenue(df)
    analysis_yoy_comparison(df)
    analysis_monthly_growth_rate(df)
    analysis_cohort_retention(df)
    rfm = analysis_rfm(df)
    analysis_top_products(df)
    analysis_top_countries(df)
    analysis_revenue_by_hour(df)
    analysis_aov_trend(df)
    analysis_day_of_week(df)
    
    kpis = generate_kpi_summary(df, rfm)
    
    # Save RFM data for advanced analytics
    rfm_path = os.path.join(BASE_DIR, '..', 'data', 'cleaned', 'rfm_data.csv')
    rfm.to_csv(rfm_path, index=False)
    print(f"\nRFM data saved → data/cleaned/rfm_data.csv")
    
    print("\n✅ All 12 charts saved to outputs/figures/")
    print("✅ Phase 3 complete!")
    return df, rfm, kpis


if __name__ == '__main__':
    main()
