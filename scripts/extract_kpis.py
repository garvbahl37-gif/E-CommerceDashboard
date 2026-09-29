import pandas as pd
import numpy as np
import os

BASE_DIR = os.path.dirname(__file__)
df = pd.read_csv(os.path.join(BASE_DIR, '..', 'data', 'cleaned', 'retail_cleaned.csv'), parse_dates=['InvoiceDate'])
rfm = pd.read_csv(os.path.join(BASE_DIR, '..', 'data', 'cleaned', 'rfm_data.csv'))

total_rev = df['Revenue'].sum()
total_orders = df['Invoice'].nunique()
total_custs = df['Customer ID'].nunique()
aov = total_rev / total_orders
countries = df['Country'].nunique()

monthly = df.groupby('YearMonth')['Revenue'].sum().sort_index()
growth_rates = monthly.pct_change().dropna() * 100
avg_growth = growth_rates.mean()

# Data ends mid-month (e.g. 9 Dec 2011) -> exclude a partial final month from growth figures
data_end = df['InvoiceDate'].max()
last_month_partial = data_end.normalize() < pd.Period(monthly.index[-1], 'M').end_time.normalize()
monthly_full = monthly.iloc[:-1] if last_month_partial else monthly
avg_growth_full = (monthly_full.pct_change().dropna() * 100).mean()

pc =df.groupby('Customer ID')['Invoice'].nunique()
repeat = (pc > 1).sum() / len(pc) * 100

df_yoy = df[df['Year'].isin([2010, 2011])]
m_yoy = df_yoy.groupby('Year')['Revenue'].sum()
yoy_growth = (m_yoy.get(2011, 0) - m_yoy.get(2010, 0)) / m_yoy.get(2010, 1) * 100

# Like-for-like YoY: same calendar window (1 Jan -> data end day) in both years
doy_mask = (df_yoy['InvoiceDate'].dt.month < data_end.month) | \
           ((df_yoy['InvoiceDate'].dt.month == data_end.month) & (df_yoy['InvoiceDate'].dt.day <= data_end.day))
m_yoy_lfl = df_yoy[doy_mask].groupby('Year')['Revenue'].sum()
yoy_growth_lfl = (m_yoy_lfl.get(2011, 0) - m_yoy_lfl.get(2010, 0)) / m_yoy_lfl.get(2010, 1) * 100

champs = rfm[rfm['Segment'] == 'Champions']
champ_pct = len(champs) / len(rfm) * 100
champ_rev_pct = champs['Monetary'].sum() / rfm['Monetary'].sum() * 100

at_risk = rfm[rfm['Segment'] == 'At Risk']
at_risk_pct = len(at_risk) / len(rfm) * 100
at_risk_rev = at_risk['Monetary'].sum()

tp = df.groupby('Description')['Revenue'].sum().sort_values(ascending=False).head(5)

uk_rev = df[df['Country'] == 'United Kingdom']['Revenue'].sum()
uk_pct = uk_rev / total_rev * 100

# Cohort retention
df_c = df.copy()
df_c['InvoiceMonth'] = df_c['InvoiceDate'].dt.to_period('M')
df_c['CohortMonth'] = df_c.groupby('Customer ID')['InvoiceMonth'].transform('min')
df_c['CohortIndex'] = (df_c['InvoiceMonth'].dt.year - df_c['CohortMonth'].dt.year)*12 + (df_c['InvoiceMonth'].dt.month - df_c['CohortMonth'].dt.month)
cohort_data = df_c.groupby(['CohortMonth', 'CohortIndex'])['Customer ID'].nunique().reset_index()
cohort_pivot = cohort_data.pivot(index='CohortMonth', columns='CohortIndex', values='Customer ID')
cohort_sizes = cohort_pivot.iloc[:, 0]
retention = cohort_pivot.divide(cohort_sizes, axis=0) * 100
avg_m1 = retention.iloc[:, 1].mean() if retention.shape[1] > 1 else 0
# Same basis as the heatmap in kpi_analysis.py (first 12 cohorts only)
avg_m1_12 = retention.iloc[:12, 1].mean() if retention.shape[1] > 1 else 0

# Peak month
peak_month = monthly.idxmax()
peak_rev = monthly.max()

print(f'TOTAL_REVENUE: {total_rev:.2f}')
print(f'TOTAL_ORDERS: {total_orders}')
print(f'TOTAL_CUSTOMERS: {total_custs}')
print(f'AOV: {aov:.2f}')
print(f'COUNTRIES: {countries}')
print(f'DATA_END: {data_end}')
print(f'AVG_MONTHLY_GROWTH: {avg_growth:.1f}')
print(f'AVG_MONTHLY_GROWTH_EXCL_PARTIAL_MONTH: {avg_growth_full:.1f}')
print(f'REPEAT_RATE: {repeat:.1f}')
print(f'YOY_GROWTH: {yoy_growth:.1f}')
print(f'YOY_GROWTH_LIKE_FOR_LIKE: {yoy_growth_lfl:.1f}')
print(f'CHAMP_PCT: {champ_pct:.1f}')
print(f'CHAMP_REV_PCT: {champ_rev_pct:.1f}')
print(f'AT_RISK_PCT: {at_risk_pct:.1f}')
print(f'AT_RISK_REV: {at_risk_rev:.0f}')
print(f'UK_PCT: {uk_pct:.1f}')
print(f'AVG_M1_RETENTION: {avg_m1:.1f}')
print(f'AVG_M1_RETENTION_FIRST_12_COHORTS: {avg_m1_12:.1f}')
print(f'PEAK_MONTH: {peak_month}')
print(f'PEAK_REV: {peak_rev:.0f}')
print()
print('TOP 5 PRODUCTS:')
for desc, rev in tp.items():
    print(f'  {desc}: {rev:.0f}')
