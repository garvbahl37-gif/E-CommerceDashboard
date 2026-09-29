"""
E-Commerce Sales Intelligence Dashboard
Web export: compact JSON for the Next.js frontend (web/)
========================================================
The cleaned CSV is ~100MB — far too large to ship to a browser. This script
reduces it to invoice-level rows (one per order) plus product aggregates, so
the frontend can recompute every KPI and chart for any date / country /
segment filter entirely client-side.

Run after data_cleaning.py and advanced_analytics.py:
    python scripts/export_web_data.py
"""

import json
import os
import re

import pandas as pd

BASE_DIR = os.path.dirname(__file__)
CLEANED_PATH = os.path.join(BASE_DIR, '..', 'data', 'cleaned', 'retail_cleaned.csv')
RFM_PATH = os.path.join(BASE_DIR, '..', 'data', 'cleaned', 'rfm_data.csv')
OUT_PATH = os.path.join(BASE_DIR, '..', 'web', 'public', 'data', 'dashboard.json')

TOP_PRODUCTS = 300  # products shipped to the browser, ranked by all-time revenue
# Postage, manual adjustments, fees and test lines are not merchandise; keep them
# in revenue totals but out of the product ranking.
NON_PRODUCT_CODES = {'M', 'POST', 'C2', 'DOT', 'ADJUST', 'ADJUST2', 'BANK CHARGES',
                     'D', 'TEST001', 'TEST002', 'PADS', 'AMAZONFEE', 'CRUK', 'S', 'B'}
EPOCH = pd.Timestamp('2009-12-01')


def strip_emoji(label: str) -> str:
    return re.sub(r'[^\w\s\-]', '', label).strip()


def main():
    print("Loading cleaned data...")
    df = pd.read_csv(CLEANED_PATH, parse_dates=['InvoiceDate'], dtype={'StockCode': str})
    rfm = pd.read_csv(RFM_PATH)

    countries = df.groupby('Country')['Revenue'].sum().sort_values(ascending=False).index.tolist()
    country_idx = {c: i for i, c in enumerate(countries)}

    segments = ['Champions', 'Loyal Customers', 'Big Spenders', 'New Customers',
                'Need Attention', 'At Risk', 'Hibernating']
    assert set(rfm['Segment']) <= set(segments), set(rfm['Segment']) - set(segments)
    seg_idx = {s: i for i, s in enumerate(segments)}

    clusters = ['High-Value', 'Mid-Value', 'Occasional', 'Dormant']
    rfm['ClusterName'] = rfm['ClusterLabel'].map(strip_emoji)
    assert set(rfm['ClusterName']) <= set(clusters), set(rfm['ClusterName'])
    cluster_idx = {c: i for i, c in enumerate(clusters)}

    # ── Customers (index into these arrays is the customer key) ──
    rfm = rfm.sort_values('CustomerID').reset_index(drop=True)
    cust_idx = {cid: i for i, cid in enumerate(rfm['CustomerID'])}
    customers = {
        'id': rfm['CustomerID'].astype(int).tolist(),
        'segment': rfm['Segment'].map(seg_idx).tolist(),
        'cluster': rfm['ClusterName'].map(cluster_idx).tolist(),
        'recency': rfm['Recency'].astype(int).tolist(),
        'frequency': rfm['Frequency'].astype(int).tolist(),
        'monetary': rfm['Monetary'].round(2).tolist(),
    }

    # ── Invoices: one row per order ──
    # A handful of invoices span two timestamps; take the first.
    inv = (df.groupby('Invoice')
             .agg(date=('InvoiceDate', 'min'), country=('Country', 'first'),
                  customer=('Customer ID', 'first'), revenue=('Revenue', 'sum'),
                  units=('Quantity', 'sum'))
             .sort_values('date'))
    invoices = {
        'day': (inv['date'].dt.normalize() - EPOCH).dt.days.astype(int).tolist(),
        'hour': inv['date'].dt.hour.astype(int).tolist(),
        'country': inv['country'].map(country_idx).tolist(),
        'customer': inv['customer'].map(cust_idx).astype(int).tolist(),
        'revenue': inv['revenue'].round(2).tolist(),
        'units': inv['units'].astype(int).tolist(),
    }

    # ── Products: top N by revenue, aggregated per month × country × segment ──
    merch = df[~df['StockCode'].isin(NON_PRODUCT_CODES)]
    top = merch.groupby('Description')['Revenue'].sum().sort_values(ascending=False).head(TOP_PRODUCTS).index.tolist()
    prod_idx = {p: i for i, p in enumerate(top)}
    months = sorted(df['YearMonth'].unique())
    month_idx = {m: i for i, m in enumerate(months)}
    seg_of_cust = dict(zip(rfm['CustomerID'], rfm['Segment']))

    dp = merch[merch['Description'].isin(prod_idx)].copy()
    dp['Segment'] = dp['Customer ID'].map(seg_of_cust)
    agg = (dp.groupby(['Description', 'YearMonth', 'Country', 'Segment'])
             .agg(revenue=('Revenue', 'sum'), units=('Quantity', 'sum'))
             .reset_index())
    product_rows = {
        'product': agg['Description'].map(prod_idx).tolist(),
        'month': agg['YearMonth'].map(month_idx).tolist(),
        'country': agg['Country'].map(country_idx).tolist(),
        'segment': agg['Segment'].map(seg_idx).tolist(),
        'revenue': agg['revenue'].round(2).tolist(),
        'units': agg['units'].astype(int).tolist(),
    }

    out = {
        'meta': {
            'epoch': EPOCH.strftime('%Y-%m-%d'),
            'firstDate': df['InvoiceDate'].min().strftime('%Y-%m-%d'),
            'lastDate': df['InvoiceDate'].max().strftime('%Y-%m-%d'),
            'lines': int(len(df)),
            'topProducts': TOP_PRODUCTS,
            'totalProducts': int(merch['Description'].nunique()),
        },
        'countries': countries,
        'segments': segments,
        'clusters': clusters,
        'months': months,
        'products': [p.strip() for p in top],
        'customers': customers,
        'invoices': invoices,
        'productRows': product_rows,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    size_kb = os.path.getsize(OUT_PATH) / 1024
    print(f"  → {len(inv):,} invoices, {len(rfm):,} customers, {len(agg):,} product rows")
    print(f"  → Saved {OUT_PATH} ({size_kb:,.0f} KB)")


if __name__ == '__main__':
    main()
