import pandas as pd
import numpy as np
import joblib
import os

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ============================================================
# 1. PATHS
# ============================================================

DATA_PATH = "data/electricity_weather_5min.csv"
MODEL_PATH = "model/demand_7day_model.pkl"
PREDICTION_PATH = "predictions/7day_predictions.csv"


# ============================================================
# 2. LOAD DATA
# ============================================================

print("\nLoading dataset...")

df = pd.read_csv(DATA_PATH)

df["timestamp"] = pd.to_datetime(df["timestamp"])

df = df.sort_values("timestamp").reset_index(drop=True)

print("Rows:", len(df))
print("Start:", df["timestamp"].min())
print("End:", df["timestamp"].max())


# ============================================================
# 3. CREATE TIME FEATURES
# ============================================================

print("\nCreating time features...")

df["hour"] = df["timestamp"].dt.hour
df["minute"] = df["timestamp"].dt.minute
df["day_of_week"] = df["timestamp"].dt.dayofweek
df["day"] = df["timestamp"].dt.day
df["month"] = df["timestamp"].dt.month

df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)


# Cyclical time features

df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)

df["dow_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
df["dow_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7)

df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)


# ============================================================
# 4. CREATE TIMESTAMP-BASED DEMAND LOOKUP
# ============================================================

print("\nCreating historical demand features...")

demand_lookup = (
    df.set_index("timestamp")["demand_kw"]
    .sort_index()
)


# ============================================================
# 5. HISTORICAL DEMAND LAGS
# ============================================================

print("Creating demand lag features...")


# Same time previous day
previous_day_time = (
    df["timestamp"] - pd.Timedelta(hours=24)
)

df["demand_lag_24hour"] = (
    demand_lookup
    .reindex(previous_day_time)
    .to_numpy()
)


# Same time 2 days ago
two_days_time = (
    df["timestamp"] - pd.Timedelta(hours=48)
)

df["demand_lag_48hour"] = (
    demand_lookup
    .reindex(two_days_time)
    .to_numpy()
)


# Same time previous week
previous_week_time = (
    df["timestamp"] - pd.Timedelta(days=7)
)

df["demand_lag_7day"] = (
    demand_lookup
    .reindex(previous_week_time)
    .to_numpy()
)


# Same time two weeks ago
two_weeks_time = (
    df["timestamp"] - pd.Timedelta(days=14)
)

df["demand_lag_14day"] = (
    demand_lookup
    .reindex(two_weeks_time)
    .to_numpy()
)

print("Demand lag features created successfully.")

# ============================================================
# 6. HISTORICAL ROLLING STATISTICS
# ============================================================

print("Creating rolling demand statistics...")

# Shift by one row so current/future demand is never included.
past_demand = df["demand_kw"].shift(1)

df["rolling_mean_24hour"] = (
    past_demand
    .rolling(window=288, min_periods=144)
    .mean()
)

df["rolling_std_24hour"] = (
    past_demand
    .rolling(window=288, min_periods=144)
    .std()
)

df["rolling_min_24hour"] = (
    past_demand
    .rolling(window=288, min_periods=144)
    .min()
)

df["rolling_max_24hour"] = (
    past_demand
    .rolling(window=288, min_periods=144)
    .max()
)


# 7-day rolling mean
df["rolling_mean_7day"] = (
    past_demand
    .rolling(window=2016, min_periods=1008)
    .mean()
)


# ============================================================
# 7. CREATE 7-DAY FUTURE TARGET
# ============================================================

print("\nCreating 7-day future target...")

future_lookup = (
    df.set_index("timestamp")["demand_kw"]
    .copy()
)

future_lookup.index = (
    future_lookup.index
    - pd.Timedelta(days=7)
)

df["target_7day"] = df["timestamp"].map(future_lookup)


# ============================================================
# 8. SELECT FEATURES
# ============================================================

features = [

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

    # Historical demand
    "demand_lag_24hour",
    "demand_lag_48hour",
    "demand_lag_7day",
    "demand_lag_14day",

    # Rolling statistics
    "rolling_mean_24hour",
    "rolling_std_24hour",
    "rolling_min_24hour",
    "rolling_max_24hour",
    "rolling_mean_7day"
]


# ============================================================
# 9. REMOVE MISSING VALUES
# ============================================================

print("\nPreparing training data...")

required_columns = features + ["target_7day"]

before = len(df)

df_model = df.dropna(subset=required_columns).copy()

removed = before - len(df_model)

print("Rows removed:", removed)
print("Rows remaining:", len(df_model))


# ============================================================
# 10. CHRONOLOGICAL TRAIN/TEST SPLIT
# ============================================================

print("\nCreating chronological train/test split...")

split_index = int(len(df_model) * 0.80)

train = df_model.iloc[:split_index]
test = df_model.iloc[split_index:]

X_train = train[features]
y_train = train["target_7day"]

X_test = test[features]
y_test = test["target_7day"]

print("Training rows:", len(train))
print("Testing rows:", len(test))


# ============================================================
# 11. BASELINE
# ============================================================

print("\nCalculating 7-day persistence baseline...")

baseline_predictions = test["demand_lag_7day"]

baseline_mae = mean_absolute_error(
    y_test,
    baseline_predictions
)

baseline_rmse = np.sqrt(
    mean_squared_error(
        y_test,
        baseline_predictions
    )
)

baseline_r2 = r2_score(
    y_test,
    baseline_predictions
)


# ============================================================
# 12. TRAIN RANDOM FOREST
# ============================================================

print("\nTraining Random Forest...")

model = RandomForestRegressor(
    n_estimators=100,
    max_depth=20,
    random_state=42,
    n_jobs=-1
)

model.fit(
    X_train,
    y_train
)


# ============================================================
# 13. PREDICTIONS
# ============================================================

print("\nGenerating predictions...")

predictions = model.predict(X_test)


# ============================================================
# 14. EVALUATION
# ============================================================

mae = mean_absolute_error(
    y_test,
    predictions
)

rmse = np.sqrt(
    mean_squared_error(
        y_test,
        predictions
    )
)

r2 = r2_score(
    y_test,
    predictions
)


mae_improvement = (
    (baseline_mae - mae)
    / baseline_mae
    * 100
)

rmse_improvement = (
    (baseline_rmse - rmse)
    / baseline_rmse
    * 100
)


# ============================================================
# 15. PRINT RESULTS
# ============================================================

print("\n" + "=" * 60)
print("7-DAY FORECAST RESULTS")
print("=" * 60)

print("\nBASELINE — 7-DAY PERSISTENCE")
print("--------------------------------")
print(f"MAE  : {baseline_mae:.2f} kW")
print(f"RMSE : {baseline_rmse:.2f} kW")
print(f"R²   : {baseline_r2:.4f}")

print("\nAI MODEL — RANDOM FOREST")
print("--------------------------------")
print(f"MAE  : {mae:.2f} kW")
print(f"RMSE : {rmse:.2f} kW")
print(f"R²   : {r2:.4f}")

print("\nIMPROVEMENT")
print("--------------------------------")
print(f"MAE improvement  : {mae_improvement:.2f}%")
print(f"RMSE improvement : {rmse_improvement:.2f}%")

print("=" * 60)


# ============================================================
# 16. FEATURE IMPORTANCE
# ============================================================

importance = pd.DataFrame({
    "feature": features,
    "importance": model.feature_importances_
})

importance = importance.sort_values(
    "importance",
    ascending=False
)

print("\nTOP 15 FEATURES")
print("=" * 60)

print(
    importance.head(15).to_string(index=False)
)


# ============================================================
# 17. SAVE MODEL
# ============================================================

os.makedirs("model", exist_ok=True)
os.makedirs("predictions", exist_ok=True)

joblib.dump(
    model,
    MODEL_PATH
)

print("\nModel saved to:")
print(MODEL_PATH)


# ============================================================
# 18. SAVE PREDICTIONS
# ============================================================

prediction_output = test[
    [
        "timestamp",
        "demand_kw",
        "demand_lag_7day",
        "target_7day"
    ]
].copy()

prediction_output["predicted_demand"] = predictions

prediction_output["error"] = (
    prediction_output["target_7day"]
    - prediction_output["predicted_demand"]
)

prediction_output.to_csv(
    PREDICTION_PATH,
    index=False
)

print("\nPredictions saved to:")
print(PREDICTION_PATH)


# ============================================================
# 19. SAMPLE PREDICTIONS
# ============================================================

print("\nSAMPLE 7-DAY PREDICTIONS")
print("=" * 80)

print(
    prediction_output.head(10).to_string(index=False)
)

print("\n7-day forecasting completed successfully!")