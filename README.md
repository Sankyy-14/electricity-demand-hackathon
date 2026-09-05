# GridPulse — AI-Based Electricity Demand Prediction for Delhi

Delhi's peak power demand keeps hitting record highs every summer (8,000+ MW), and discoms/SLDC must predict demand accurately in advance to avoid outages and balance load across feeders. GridPulse is a short-term demand forecasting tool that combines weather data with historical load data to predict next-day/next-week electricity demand, flag when forecasts approach grid capacity, and give discoms a feeder-wise view for load balancing.

Built for **PS-1** at [Hackathon Name].

---

## What It Does

- Forecasts short-term electricity demand using historical load + weather data (temperature is the biggest driver of Delhi's demand)
- Dashboard showing predicted vs. actual demand
- Alerts when forecasted demand nears grid capacity
- Area/feeder-wise breakdown for load balancing planning

---

## Data Sources

| Data | Source | Status |
|---|---|---|
| Weather (temperature, humidity) | [Open-Meteo](https://open-meteo.com) — free API, no key required | **Live** |
| Electricity load | Delhi SLDC historical data (via Kaggle) / synthetic data mirroring Delhi's seasonal load pattern | **[Real historical data / Synthetic — update based on what's actually wired into the demo]** |

> **Disclosure:** Weather data is fetched live via the Open-Meteo API. Load data is [historical Delhi SLDC data / synthetic data generated to mirror Delhi's known seasonal and daily demand patterns, used due to hackathon time constraints — update this line to reflect what's actually in the final demo].

---

## Architecture

```
backend/          → Data pipeline: fetches weather, prepares load data,
                     merges both into a single feature-engineered dataset
scripts/           → [Describe: supporting scripts for the ML pipeline]
predictions/       → ML model training + forecasting logic
frontend/          → Streamlit dashboard: predicted vs. actual demand,
                     feeder breakdown, capacity alerts
```

```
Weather API + Load Data
        │
        ▼
   backend/ (fetch, clean, merge, feature-engineer)
        │
        ▼
   predictions/ (model training + forecast)
        │
        ▼
   frontend/ (dashboard: charts, alerts, feeder view)
```

---

## Team

| Member | Role |
|---|---|
| Member 1 | ML Lead — forecasting model, feature engineering |
| Member 2 | Data Pipeline Engineer — weather + load data, merging |
| Member 3 | Data Wrangler — historical load data sourcing |
| Member 4 | Dashboard — Streamlit frontend |

---

## Running It Locally

```bash
git clone https://github.com/Sankyy-14/electricity-demand-hackathon.git
cd electricity-demand-hackathon
pip install -r requirements.txt
```

Generate/refresh the data pipeline:
```bash
python backend/fetch_weather.py
python backend/generate_mock_load.py   # or supply a real load CSV
python backend/merge_data.py
```

Launch the dashboard:
```bash
streamlit run frontend/app.py
```

---

## Tech Stack

- **Data pipeline:** Python, Open-Meteo API
- **Modeling:** [scikit-learn / Prophet / XGBoost — confirm which was used]
- **Dashboard:** Streamlit
