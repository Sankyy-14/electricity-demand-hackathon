# GridPulse — AI-Based Electricity Demand Prediction for Delhi

Delhi's peak power demand keeps hitting record highs every summer (8,000+ MW), and discoms/SLDC must predict demand accurately in advance to avoid outages and balance load across feeders. GridPulse is a short-term demand forecasting tool that combines weather data with historical load data to predict next-day/next-week electricity demand, flag when forecasts approach grid capacity, and give discoms a feeder-wise view for load balancing.

Built for **PS-1** at **ORIGIN**.

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
| Electricity load | [Delhi SLDC historical load data (5-min resolution), sourced via Kaggle](https://www.kaggle.com/datasets/prash4nt/delhi-sldc-load-data-5-min-resolution), resampled to hourly | **Historical (real)** |

> **Disclosure:** Weather data is fetched live via the Open-Meteo API. Electricity load data is real historical data from Delhi SLDC (via Kaggle), resampled from 5-minute to hourly resolution to align with the weather data.

---

## Architecture

```
backend/          → Data pipeline: fetches weather, prepares load data,
                     merges both into a single feature-engineered dataset
scripts/           → ML pipeline: Kaggle data validation, dataset prep,
                     model training (60-min, day-ahead, and 7-day horizon
                     models + a residual model), baseline comparison,
                     error analysis, time-gap checks, prediction plotting,
                     and the final predict.py used by the dashboard
predictions/       → Trained models / saved forecast outputs
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
- **Modeling:** scikit-learn
- **Dashboard:** Streamlit
