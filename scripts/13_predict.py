import pandas as pd
import numpy as np
import joblib
import os


# ============================================================
# PATHS
# ============================================================

DATA_PATH = "data/electricity_weather_5min.csv"

MODEL_1H_PATH = "model/demand_60min_model.pkl"
MODEL_24H_PATH = "model/day_ahead_demand_model.pkl"
MODEL_7D_PATH = "model/demand_7day_model.pkl"

OUTPUT_PATH = "predictions/latest_forecasts.csv"


# ============================================================
# 1. LOAD DATA
# ============================================================

print("\nLoading latest electricity data...")

df = pd.read_csv(DATA_PATH)

df["timestamp"] = pd.to_datetime(df["timestamp"])

df = df.sort_values("timestamp").reset_index(drop=True)

print("Total rows:", len(df))
print("Latest timestamp:", df["timestamp"].max())


# ============================================================
# 2. CREATE TIME FEATURES
# ============================================================

print("\nCreating time features...")

df["hour"] = df["timestamp"].dt.hour
df["minute"] = df["timestamp"].dt.minute
df["day_of_week"] = df["timestamp"].dt.dayofweek
df["day"] = df["timestamp"].dt.day
df["month"] = df["timestamp"].dt.month

df["is_weekend"] = (
    df["day_of_week"] >= 5
).astype(int)


# Cyclical features

df["hour_sin"] = np.sin(
    2 * np.pi * df["hour"] / 24
)

df["hour_cos"] = np.cos(
    2 * np.pi * df["hour"] / 24
)

df["dow_sin"] = np.sin(
    2 * np.pi * df["day_of_week"] / 7
)

df["dow_cos"] = np.cos(
    2 * np.pi * df["day_of_week"] / 7
)

df["month_sin"] = np.sin(
    2 * np.pi * df["month"] / 12
)

df["month_cos"] = np.cos(
    2 * np.pi * df["month"] / 12
)


# ============================================================
# 3. DEMAND LOOKUP
# ============================================================

print("Creating historical demand lookup...")

demand_lookup = (
    df.set_index("timestamp")["demand_kw"]
    .sort_index()
)


def get_lag(hours=0, days=0):

    target_times = (
        df["timestamp"]
        - pd.Timedelta(hours=hours)
        - pd.Timedelta(days=days)
    )

    return (
        demand_lookup
        .reindex(target_times)
        .to_numpy()
    )


# ============================================================
# 4. DEMAND LAGS
# ============================================================

print("Creating demand lag features...")

df["demand_lag_5min"] = get_lag(hours=0)

# Exact 5-minute lag
df["demand_lag_5min"] = (
    demand_lookup
    .reindex(
        df["timestamp"]
        - pd.Timedelta(minutes=5)
    )
    .to_numpy()
)

df["demand_lag_15min"] = (
    demand_lookup
    .reindex(
        df["timestamp"]
        - pd.Timedelta(minutes=15)
    )
    .to_numpy()
)

df["demand_lag_30min"] = (
    demand_lookup
    .reindex(
        df["timestamp"]
        - pd.Timedelta(minutes=30)
    )
    .to_numpy()
)

df["demand_lag_1hour"] = (
    demand_lookup
    .reindex(
        df["timestamp"]
        - pd.Timedelta(hours=1)
    )
    .to_numpy()
)

df["demand_lag_2hour"] = (
    demand_lookup
    .reindex(
        df["timestamp"]
        - pd.Timedelta(hours=2)
    )
    .to_numpy()
)

df["demand_lag_24hour"] = (
    demand_lookup
    .reindex(
        df["timestamp"]
        - pd.Timedelta(hours=24)
    )
    .to_numpy()
)

df["demand_lag_48hour"] = (
    demand_lookup
    .reindex(
        df["timestamp"]
        - pd.Timedelta(hours=48)
    )
    .to_numpy()
)

df["demand_lag_7day"] = (
    demand_lookup
    .reindex(
        df["timestamp"]
        - pd.Timedelta(days=7)
    )
    .to_numpy()
)

df["demand_lag_14day"] = (
    demand_lookup
    .reindex(
        df["timestamp"]
        - pd.Timedelta(days=14)
    )
    .to_numpy()
)


# ============================================================
# 5. ROLLING FEATURES
# ============================================================

print("Creating rolling demand statistics...")

past_demand = df["demand_kw"].shift(1)

df["rolling_mean_1hour"] = (
    past_demand
    .rolling(
        window=12,
        min_periods=6
    )
    .mean()
)

df["rolling_mean_3hour"] = (
    past_demand
    .rolling(
        window=36,
        min_periods=18
    )
    .mean()
)

df["rolling_mean_24hour"] = (
    past_demand
    .rolling(
        window=288,
        min_periods=144
    )
    .mean()
)

df["rolling_std_24hour"] = (
    past_demand
    .rolling(
        window=288,
        min_periods=144
    )
    .std()
)

df["rolling_min_24hour"] = (
    past_demand
    .rolling(
        window=288,
        min_periods=144
    )
    .min()
)

df["rolling_max_24hour"] = (
    past_demand
    .rolling(
        window=288,
        min_periods=144
    )
    .max()
)

df["rolling_mean_7day"] = (
    past_demand
    .rolling(
        window=2016,
        min_periods=1008
    )
    .mean()
)


# ============================================================
# 6. FIND LATEST COMPLETE OBSERVATION
# ============================================================

print("\nFinding latest observation with complete features...")

# Features required by all three models
required_features = [

    # Weather
    "temperature",
    "dew_point",
    "humidity",
    "wind_direction",
    "wind_speed",
    "pressure",

    # Time
    "hour",
    "minute",
    "day_of_week",
    "day",
    "month",
    "is_weekend",

    # Cyclical
    "hour_sin",
    "hour_cos",
    "dow_sin",
    "dow_cos",
    "month_sin",
    "month_cos",

    # Demand lags
    "demand_lag_5min",
    "demand_lag_15min",
    "demand_lag_30min",
    "demand_lag_1hour",
    "demand_lag_2hour",
    "demand_lag_24hour",
    "demand_lag_48hour",
    "demand_lag_7day",
    "demand_lag_14day",

    # Rolling statistics
    "rolling_mean_1hour",
    "rolling_mean_3hour",
    "rolling_mean_24hour",
    "rolling_std_24hour",
    "rolling_min_24hour",
    "rolling_max_24hour",
    "rolling_mean_7day"
]


# Find rows where every required feature is available
complete_rows = df.dropna(
    subset=required_features
)

if len(complete_rows) == 0:
    raise ValueError(
        "No complete observation was found for forecasting."
    )


# Use the most recent complete row
latest = complete_rows.iloc[-1].copy()

forecast_time = latest["timestamp"]

print("\nLatest complete observation")
print("----------------------------")
print("Timestamp :", forecast_time)
print(
    f"Demand    : {latest['demand_kw']:.2f} kW"
)
print(
    f"Temperature : {latest['temperature']:.2f} °C"
)

print(
    "Rows skipped because of missing features:",
    len(df) - len(complete_rows)
)


# ============================================================
# 7. LOAD MODELS
# ============================================================

print("\nLoading trained models...")

model_1h = joblib.load(MODEL_1H_PATH)
model_24h = joblib.load(MODEL_24H_PATH)
model_7d = joblib.load(MODEL_7D_PATH)

print("All models loaded successfully.")


# ============================================================
# 8. 1-HOUR FEATURES
# ============================================================

features_1h = [

    "temperature",
    "dew_point",
    "humidity",
    "wind_direction",
    "wind_speed",
    "pressure",

    "hour",
    "minute",
    "day_of_week",
    "is_weekend",

    "demand_lag_5min",
    "demand_lag_15min",
    "demand_lag_30min",
    "demand_lag_1hour",
    "demand_lag_2hour",
    "demand_lag_24hour",
    "demand_lag_7day"
]


X_1h = pd.DataFrame(
    [latest[features_1h].values],
    columns=features_1h
)


# ============================================================
# 9. 24-HOUR FEATURES
# ============================================================

features_24h = [

    "temperature",
    "dew_point",
    "humidity",
    "wind_direction",
    "wind_speed",
    "pressure",

    "hour",
    "minute",
    "day_of_week",
    "day",
    "month",
    "is_weekend",

    "hour_sin",
    "hour_cos",
    "dow_sin",
    "dow_cos",

    "demand_lag_5min",
    "demand_lag_15min",
    "demand_lag_30min",
    "demand_lag_1hour",
    "demand_lag_2hour",
    "demand_lag_24hour",
    "demand_lag_7day",

    "rolling_mean_1hour",
    "rolling_mean_3hour",
    "rolling_mean_24hour"
]


X_24h = pd.DataFrame(
    [latest[features_24h].values],
    columns=features_24h
)


# ============================================================
# 10. 7-DAY FEATURES
# ============================================================

features_7d = [

    "temperature",
    "dew_point",
    "humidity",
    "wind_direction",
    "wind_speed",
    "pressure",

    "hour",
    "minute",
    "day_of_week",
    "day",
    "month",
    "is_weekend",

    "hour_sin",
    "hour_cos",
    "dow_sin",
    "dow_cos",
    "month_sin",
    "month_cos",

    "demand_lag_24hour",
    "demand_lag_48hour",
    "demand_lag_7day",
    "demand_lag_14day",

    "rolling_mean_24hour",
    "rolling_std_24hour",
    "rolling_min_24hour",
    "rolling_max_24hour",
    "rolling_mean_7day"
]


X_7d = pd.DataFrame(
    [latest[features_7d].values],
    columns=features_7d
)


# ============================================================
# 12. GENERATE FORECASTS
# ============================================================

print("\nGenerating forecasts...")

forecast_1h = model_1h.predict(X_1h)[0]

forecast_24h = model_24h.predict(X_24h)[0]

forecast_7d = model_7d.predict(X_7d)[0]


# ============================================================
# 13. FUTURE TIMESTAMPS
# ============================================================

time_1h = (
    forecast_time
    + pd.Timedelta(hours=1)
)

time_24h = (
    forecast_time
    + pd.Timedelta(hours=24)
)

time_7d = (
    forecast_time
    + pd.Timedelta(days=7)
)


# ============================================================
# 14. DISPLAY RESULTS
# ============================================================

print("\n")
print("=" * 65)
print("ELECTRICITY DEMAND FORECAST")
print("=" * 65)

print(
    f"\nCurrent demand : {latest['demand_kw']:.2f} kW"
)

print("\n1-HOUR FORECAST")
print("----------------------------")
print("Target time :", time_1h)
print(
    f"Predicted demand : {forecast_1h:.2f} kW"
)

print("\n24-HOUR FORECAST")
print("----------------------------")
print("Target time :", time_24h)
print(
    f"Predicted demand : {forecast_24h:.2f} kW"
)

print("\n7-DAY FORECAST")
print("----------------------------")
print("Target time :", time_7d)
print(
    f"Predicted demand : {forecast_7d:.2f} kW"
)

print("\n" + "=" * 65)


# ============================================================
# 15. SAVE FORECASTS
# ============================================================

forecast_output = pd.DataFrame({

    "forecast_generated_at": [
        forecast_time,
        forecast_time,
        forecast_time
    ],

    "forecast_for": [
        time_1h,
        time_24h,
        time_7d
    ],

    "horizon": [
        "1 hour",
        "24 hours",
        "7 days"
    ],

    "predicted_demand_kw": [
        forecast_1h,
        forecast_24h,
        forecast_7d
    ],

    "current_demand_kw": [
        latest["demand_kw"],
        latest["demand_kw"],
        latest["demand_kw"]
    ],

    "temperature_c": [
        latest["temperature"],
        latest["temperature"],
        latest["temperature"]
    ]
})


os.makedirs(
    "predictions",
    exist_ok=True
)

forecast_output.to_csv(
    OUTPUT_PATH,
    index=False
)

print("\nForecasts saved to:")
print(OUTPUT_PATH)

print("\nPrediction pipeline completed successfully!")