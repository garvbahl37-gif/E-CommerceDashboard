# TODO

_Last updated: 29 Sep 2026_

## Done

### Web frontend (`web/`)
- [x] Next.js 16 dashboard with period / country / customer-segment filters that apply to every number on the page
- [x] Compact data export (`scripts/export_web_data.py`): 100 MB CSV → ~460 KB gzipped invoice-level JSON
- [x] Charts: monthly trend, RFM share dumbbell, cohort retention heatmap, K-Means cluster small multiples, top products, top countries, weekday × hour heatmap, quarterly revenue
- [x] Hover + keyboard tooltips and a table view on every chart; light/dark mode; responsive to phone width
- [x] About page with corrected findings, method and known limits
- [x] Deployed to Vercel: https://ecommerce-dashboard-umber-five.vercel.app
- [x] GitHub repo connected to Vercel (Root Directory = `web`); pushes to `main` auto-deploy

### Bug fixes (Python / Streamlit)
- [x] `requirements.txt` was missing `streamlit` (Streamlit Cloud deploy would fail)
- [x] `extract_kpis.py` used hardcoded Windows paths
- [x] Segment filter only affected two charts; now filters every KPI and chart
- [x] "Revenue by Segment" ignored the date/country filters (used all-time Monetary)
- [x] Picking a single date silently showed all data
- [x] "Latest MoM Growth" compared partial Dec 2011 against Nov (showed −55%); now uses last complete months
- [x] `set_xticklabels` without `set_xticks` (matplotlib warning / misaligned ticks)
- [x] Deprecated `use_container_width` on `st.page_link`
- [x] CLV formula inflated by customers with very short lifespans (£5.4K → £3.3K)
- [x] K-Means labels "Occasional" and "Dormant" were swapped (Dormant had 103-day recency); labelling logic fixed and `rfm_data.csv` relabelled
- [x] Wrong figures in README, About page and reports (Champions 18%/40% → 22%/68%, churn 70% → ~79%, orders 22K → 36,969, AOV £790 → £470, customers 4,300 → 5,878)

## Next
- [ ] Re-run cleaning from the raw Excel file to drop orders that were immediately cancelled (~£245K, e.g. PAPER CRAFT, LITTLE BIRDIE on 9 Dec 2011)
- [ ] RFM frequency scoring: `rank(method='first')` splits ties arbitrarily (447 one-order customers get F=2); switch to tie-aware bins and regenerate `rfm_data.csv`
- [ ] Keep filter state in the URL so filtered views can be shared
- [ ] Deploy the Streamlit app to Streamlit Cloud and link it from the web About page
- [ ] Regenerate `outputs/figures/` after the cluster-label and CLV fixes
