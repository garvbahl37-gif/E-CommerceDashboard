"""
E-Commerce Sales Intelligence Dashboard
Phase 4: Advanced Analytics — K-Means Clustering & CLV Estimation
=================================================================
Business Context: Going beyond RFM labels to data-driven customer
segmentation using unsupervised learning. This is what separates a
data analyst from a strategic analytics consultant.
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
import os
import warnings
warnings.filterwarnings('ignore')

# ─── CONFIGURATION ──────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(__file__)
CLEANED_PATH = os.path.join(BASE_DIR, '..', 'data', 'cleaned', 'retail_cleaned.csv')
RFM_PATH = os.path.join(BASE_DIR, '..', 'data', 'cleaned', 'rfm_data.csv')
FIG_DIR = os.path.join(BASE_DIR, '..', 'outputs', 'figures')

PALETTE = ['#2E86AB', '#A23B72', '#F18F01', '#C73E1D', '#3B1F2B',
           '#44BBA4', '#E94F37', '#393E41', '#D4A373', '#6A994E']

plt.rcParams.update({
    'figure.dpi': 150, 'font.size': 11, 'axes.titlesize': 14,
    'axes.titleweight': 'bold', 'axes.spines.top': False,
    'axes.spines.right': False, 'figure.facecolor': 'white',
    'axes.facecolor': '#FAFAFA', 'axes.grid': True, 'grid.alpha': 0.3
})


def savefig(name: str):
    path = os.path.join(FIG_DIR, f"{name}.png")
    plt.savefig(path, bbox_inches='tight', facecolor='white')
    plt.close()
    print(f"  📊 Saved → outputs/figures/{name}.png")


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS 12: K-Means Customer Clustering
# ═══════════════════════════════════════════════════════════════════════════
def kmeans_clustering(rfm: pd.DataFrame) -> pd.DataFrame:
    """
    BUSINESS QUESTION: Can we identify natural, data-driven customer groups?
    STRATEGIC VALUE: Unsupervised clustering reveals hidden segments that
    manual RFM scoring may miss — enabling precision-targeted campaigns.
    """
    print("\n─── Analysis 12: K-Means Customer Clustering ───")
    
    features = rfm[['Recency', 'Frequency', 'Monetary']].copy()
    
    # Log-transform monetary to handle skew
    features['Monetary'] = np.log1p(features['Monetary'])
    features['Frequency'] = np.log1p(features['Frequency'])
    
    # Standardize
    scaler = StandardScaler()
    scaled = scaler.fit_transform(features)
    
    # ── Elbow Method ──
    inertias = []
    K_range = range(2, 11)
    for k in K_range:
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        km.fit(scaled)
        inertias.append(km.inertia_)
    
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.plot(K_range, inertias, 'bo-', linewidth=2, markersize=8)
    ax.axvline(x=4, color=PALETTE[3], linestyle='--', linewidth=1.5, label='Chosen k=4')
    ax.set_title('Elbow Method — Optimal Number of Clusters', fontsize=16, pad=15)
    ax.set_xlabel('Number of Clusters (k)')
    ax.set_ylabel('Inertia (Within-Cluster Sum of Squares)')
    ax.legend(fontsize=12)
    plt.tight_layout()
    savefig('13_elbow_method')
    
    # ── Fit final model with k=4 ──
    km_final = KMeans(n_clusters=4, random_state=42, n_init=10)
    rfm['Cluster'] = km_final.fit_predict(scaled)
    
    # ── Cluster Profile ──
    cluster_profile = rfm.groupby('Cluster').agg({
        'Recency': 'mean',
        'Frequency': 'mean',
        'Monetary': ['mean', 'sum', 'count']
    }).round(1)
    cluster_profile.columns = ['Avg_Recency', 'Avg_Frequency', 'Avg_Monetary', 'Total_Revenue', 'Count']
    
    # Label clusters by business meaning
    cluster_profile = cluster_profile.sort_values('Avg_Monetary', ascending=False)
    labels = ['💎 High-Value', '⭐ Mid-Value', '🔄 Occasional', '❄️ Dormant']
    label_map = {cluster_profile.index[i]: labels[i] for i in range(len(labels))}
    rfm['ClusterLabel'] = rfm['Cluster'].map(label_map)
    
    print("\n  Cluster Profiles:")
    for cluster_id, row in cluster_profile.iterrows():
        print(f"    {label_map[cluster_id]:15} | "
              f"Recency: {row['Avg_Recency']:>6.0f}d | "
              f"Freq: {row['Avg_Frequency']:>5.1f} | "
              f"Avg £: {row['Avg_Monetary']:>8,.0f} | "
              f"Count: {row['Count']:>5,.0f}")
    
    # ── Visualization: 2D Scatter ──
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 7))
    
    for cluster_id in sorted(rfm['Cluster'].unique()):
        mask = rfm['Cluster'] == cluster_id
        label = label_map[cluster_id]
        ax1.scatter(rfm.loc[mask, 'Recency'], rfm.loc[mask, 'Monetary'],
                    alpha=0.5, s=30, label=label, color=PALETTE[cluster_id])
    ax1.set_xlabel('Recency (days)')
    ax1.set_ylabel('Monetary (£)')
    ax1.set_title('Recency vs Monetary by Cluster')
    ax1.legend(fontsize=10)
    ax1.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
    
    for cluster_id in sorted(rfm['Cluster'].unique()):
        mask = rfm['Cluster'] == cluster_id
        label = label_map[cluster_id]
        ax2.scatter(rfm.loc[mask, 'Frequency'], rfm.loc[mask, 'Monetary'],
                    alpha=0.5, s=30, label=label, color=PALETTE[cluster_id])
    ax2.set_xlabel('Frequency (orders)')
    ax2.set_ylabel('Monetary (£)')
    ax2.set_title('Frequency vs Monetary by Cluster')
    ax2.legend(fontsize=10)
    ax2.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
    
    plt.suptitle('K-Means Customer Clusters (k=4)', fontsize=16, fontweight='bold', y=1.02)
    plt.tight_layout()
    savefig('14_kmeans_clusters')
    
    # ── Revenue share pie ──
    cluster_rev = rfm.groupby('ClusterLabel')['Monetary'].sum().sort_values(ascending=False)
    fig, ax = plt.subplots(figsize=(9, 9))
    wedges, texts, autotexts = ax.pie(cluster_rev, labels=cluster_rev.index, autopct='%1.1f%%',
                                       colors=PALETTE[:4], startangle=90, pctdistance=0.8,
                                       textprops={'fontsize': 11})
    for t in autotexts:
        t.set_fontweight('bold')
    ax.set_title('Revenue Share by Customer Cluster', fontsize=16, pad=15)
    plt.tight_layout()
    savefig('15_cluster_revenue_share')
    
    print(f"\n  💡 Interpretation: High-Value cluster drives the majority of revenue despite being a small segment.")
    print(f"  📌 Recommendation: Create differentiated strategies per cluster — VIP for High-Value, nurture for Mid-Value,")
    print(f"     re-engagement for Occasional, and win-back campaigns for Dormant customers.")
    
    return rfm


# ═══════════════════════════════════════════════════════════════════════════
# ANALYSIS 13: Customer Lifetime Value Estimation
# ═══════════════════════════════════════════════════════════════════════════
def clv_estimation(df: pd.DataFrame, rfm: pd.DataFrame):
    """
    BUSINESS QUESTION: What is the projected lifetime value of each customer segment?
    STRATEGIC VALUE: CLV determines the max Customer Acquisition Cost (CAC) you can
    afford — and whether your current marketing spend is sustainable.
    """
    print("\n─── Analysis 13: Customer Lifetime Value (CLV) Estimation ───")
    
    # Calculate per-customer metrics
    customer_metrics = df.groupby('Customer ID').agg(
        total_revenue=('Revenue', 'sum'),
        order_count=('Invoice', 'nunique'),
        first_purchase=('InvoiceDate', 'min'),
        last_purchase=('InvoiceDate', 'max')
    ).reset_index()
    
    customer_metrics['lifespan_days'] = (customer_metrics['last_purchase'] - customer_metrics['first_purchase']).dt.days
    customer_metrics['lifespan_months'] = customer_metrics['lifespan_days'] / 30.44
    customer_metrics['aov'] = customer_metrics['total_revenue'] / customer_metrics['order_count']
    
    # Purchase frequency per month (for customers with lifespan > 0)
    active = customer_metrics[customer_metrics['lifespan_days'] > 0].copy()
    active['monthly_frequency'] = active['order_count'] / active['lifespan_months']
    
    # CLV = AOV × Monthly Purchase Frequency × Avg Active Lifespan (months)
    avg_aov = active['aov'].mean()
    avg_freq = active['monthly_frequency'].mean()
    avg_lifespan = active['lifespan_months'].mean()
    
    clv = avg_aov * avg_freq * avg_lifespan
    
    print(f"\n  CLV Components:")
    print(f"    Average Order Value:          £{avg_aov:,.2f}")
    print(f"    Avg Monthly Purchase Freq:    {avg_freq:.2f}")
    print(f"    Avg Customer Lifespan:        {avg_lifespan:.1f} months")
    print(f"    ─────────────────────────────────────")
    print(f"    Estimated CLV:                £{clv:,.2f}")
    
    # CLV by cluster
    if 'ClusterLabel' in rfm.columns:
        merged = customer_metrics.merge(rfm[['CustomerID', 'ClusterLabel']], 
                                         left_on='Customer ID', right_on='CustomerID', how='left')
        merged = merged[merged['lifespan_days'] > 0]
        
        cluster_clv = merged.groupby('ClusterLabel').agg(
            avg_aov=('aov', 'mean'),
            avg_orders=('order_count', 'mean'),
            avg_lifespan_m=('lifespan_months', 'mean'),
            avg_revenue=('total_revenue', 'mean'),
            count=('Customer ID', 'count')
        ).round(2)
        cluster_clv['est_clv'] = cluster_clv['avg_aov'] * cluster_clv['avg_orders']
        cluster_clv = cluster_clv.sort_values('est_clv', ascending=False)
        
        fig, ax = plt.subplots(figsize=(10, 6))
        bars = ax.barh(cluster_clv.index, cluster_clv['est_clv'],
                        color=PALETTE[:len(cluster_clv)], edgecolor='white')
        for bar, val in zip(bars, cluster_clv['est_clv']):
            ax.text(bar.get_width() + cluster_clv['est_clv'].max()*0.02,
                    bar.get_y() + bar.get_height()/2,
                    f'£{val:,.0f}', ha='left', va='center', fontsize=11, fontweight='bold')
        
        ax.set_title('Estimated CLV by Customer Cluster', fontsize=16, pad=15)
        ax.set_xlabel('Customer Lifetime Value (£)')
        ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f'£{x:,.0f}'))
        plt.tight_layout()
        savefig('16_clv_by_cluster')
        
        print(f"\n  CLV by Cluster:")
        for label, row in cluster_clv.iterrows():
            print(f"    {label:15} | CLV: £{row['est_clv']:>8,.0f} | Customers: {row['count']:>5,.0f}")
    
    print(f"\n  💡 Interpretation: High-Value customers have CLV significantly above average — they are the profit engine.")
    print(f"  📌 Recommendation: For High-Value, the max CAC can be up to 30% of CLV. For Dormant, minimize spend.")
    
    return clv


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════
def main():
    print("=" * 60)
    print("PHASE 4: ADVANCED ANALYTICS")
    print("=" * 60)
    
    df = pd.read_csv(CLEANED_PATH, parse_dates=['InvoiceDate'])
    rfm = pd.read_csv(RFM_PATH)
    
    print(f"Loaded {len(df):,} transactions | {len(rfm):,} customer RFM records")
    
    rfm = kmeans_clustering(rfm)
    clv = clv_estimation(df, rfm)
    
    # Save enriched RFM with clusters
    rfm.to_csv(RFM_PATH, index=False)
    print(f"\n✅ Enriched RFM saved with cluster labels → data/cleaned/rfm_data.csv")
    print("✅ Phase 4 complete!")


if __name__ == '__main__':
    main()
