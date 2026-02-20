"""
E-Commerce Sales Intelligence Dashboard
Phase 2: Data Cleaning & Feature Engineering
============================================
Business Context: Raw transactional data contains noise — missing customer IDs,
cancelled orders, and negative quantities. A clean dataset is the foundation
of every reliable business insight.
"""

import pandas as pd
import numpy as np
import os
import warnings
warnings.filterwarnings('ignore')

# ─── CONFIGURATION ──────────────────────────────────────────────────────────
RAW_DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw', 'online_retail_II.xlsx')
CLEANED_DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'cleaned', 'retail_cleaned.csv')


def load_raw_data(path: str) -> pd.DataFrame:
    """Load both sheets of the Online Retail II dataset and concatenate."""
    print("=" * 60)
    print("PHASE 2: DATA CLEANING & FEATURE ENGINEERING")
    print("=" * 60)
    
    print("\n[1/7] Loading raw data (two Excel sheets)...")
    df1 = pd.read_excel(path, sheet_name='Year 2009-2010')
    df2 = pd.read_excel(path, sheet_name='Year 2010-2011')
    df = pd.concat([df1, df2], ignore_index=True)
    
    print(f"  → Raw dataset shape: {df.shape[0]:,} rows × {df.shape[1]} columns")
    print(f"  → Date range: {df['InvoiceDate'].min()} to {df['InvoiceDate'].max()}")
    print(f"  → Columns: {list(df.columns)}")
    return df


def explore_data(df: pd.DataFrame) -> None:
    """Initial data quality report."""
    print("\n[2/7] Data Quality Report:")
    print(f"  → Total records:       {df.shape[0]:>10,}")
    print(f"  → Unique invoices:     {df['Invoice'].nunique():>10,}")
    print(f"  → Unique customers:    {df['Customer ID'].nunique():>10,}")
    print(f"  → Unique products:     {df['StockCode'].nunique():>10,}")
    print(f"  → Countries:           {df['Country'].nunique():>10,}")
    
    null_pct = (df.isnull().sum() / len(df) * 100).round(2)
    print("\n  Missing values (%):")
    for col, pct in null_pct.items():
        flag = " ⚠️" if pct > 0 else ""
        print(f"    {col:<20} {pct:>6}%{flag}")


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Apply business-standard cleaning rules."""
    initial_count = len(df)
    
    # Step 1: Drop rows with missing Customer ID
    print("\n[3/7] Removing rows with missing Customer ID...")
    df = df.dropna(subset=['Customer ID'])
    print(f"  → Removed {initial_count - len(df):,} rows ({(initial_count - len(df))/initial_count*100:.1f}%)")
    
    # Step 2: Remove cancelled orders (invoices starting with 'C')
    print("\n[4/7] Removing cancelled orders (Invoice starts with 'C')...")
    before = len(df)
    df['Invoice'] = df['Invoice'].astype(str)
    df = df[~df['Invoice'].str.startswith('C')]
    print(f"  → Removed {before - len(df):,} cancelled transactions")
    
    # Step 3: Remove invalid quantities and prices
    print("\n[5/7] Removing invalid quantities (≤0) and prices (≤0)...")
    before = len(df)
    df = df[(df['Quantity'] > 0) & (df['Price'] > 0)]
    print(f"  → Removed {before - len(df):,} rows with non-positive values")
    
    # Step 4: Remove exact duplicates
    before = len(df)
    df = df.drop_duplicates()
    print(f"  → Removed {before - len(df):,} exact duplicate rows")
    
    # Convert Customer ID to integer
    df['Customer ID'] = df['Customer ID'].astype(int)
    
    print(f"\n  ✅ Clean dataset: {len(df):,} rows ({len(df)/initial_count*100:.1f}% of original)")
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create business-relevant derived columns."""
    print("\n[6/7] Feature Engineering...")
    
    # Revenue
    df['Revenue'] = df['Quantity'] * df['Price']
    
    # Time dimensions
    df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])
    df['Year'] = df['InvoiceDate'].dt.year
    df['Month'] = df['InvoiceDate'].dt.month
    df['YearMonth'] = df['InvoiceDate'].dt.to_period('M').astype(str)
    df['Quarter'] = df['InvoiceDate'].dt.to_period('Q').astype(str)
    df['DayOfWeek'] = df['InvoiceDate'].dt.day_name()
    df['Hour'] = df['InvoiceDate'].dt.hour
    
    print(f"  → Added columns: Revenue, Year, Month, YearMonth, Quarter, DayOfWeek, Hour")
    
    # Headline stats
    total_rev = df['Revenue'].sum()
    aov = total_rev / df['Invoice'].nunique()
    print(f"\n  📊 Headline Metrics:")
    print(f"     Total Revenue:        £{total_rev:>12,.2f}")
    print(f"     Avg Order Value:      £{aov:>12,.2f}")
    print(f"     Unique Customers:     {df['Customer ID'].nunique():>12,}")
    print(f"     Unique Products:      {df['StockCode'].nunique():>12,}")
    print(f"     Total Transactions:   {df['Invoice'].nunique():>12,}")
    
    return df


def save_cleaned_data(df: pd.DataFrame, path: str) -> None:
    """Save the cleaned and feature-engineered dataset."""
    print(f"\n[7/7] Saving cleaned dataset → {path}")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df.to_csv(path, index=False)
    size_mb = os.path.getsize(path) / (1024 * 1024)
    print(f"  → File size: {size_mb:.1f} MB")
    print("\n" + "=" * 60)
    print("DATA CLEANING COMPLETE ✅")
    print("=" * 60)


def main():
    df = load_raw_data(RAW_DATA_PATH)
    explore_data(df)
    df = clean_data(df)
    df = engineer_features(df)
    save_cleaned_data(df, CLEANED_DATA_PATH)
    return df


if __name__ == '__main__':
    main()
