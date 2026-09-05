import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os

print("==========================================")
print("DAY-AHEAD ELECTRICITY DEMAND FORECAST")
print("==========================================")

# --------------------------------------------------
# 1. LOAD DATA
# --------------------------------------------------

print("\nLoading dataset...")

df = pd.read_csv("data/electricity_weather_5min.csv")

df["timestamp"] = pd.to_datetime(df["timestamp"])

df = df.sort_values("timestamp").reset_index(drop=True)

print("Rows:", len(df))

# --------------------------------------------------
# 2. TIME FEATURES
# --------------------------------------------------

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

# --------------------------------------------------
# 3. HISTORICAL DEMAND FEATURES
# --------------------------------------------------

print("\nCreating historical demand features...")

# Exact timestamp lookup is used.
# This avoids problems caused by missing intervals.

demand_lookup = df.set_index("timestamp")["demand_kw"]

df["demand_lag_5min"] = (
    df["timestamp"].map(
        demand_lookup.shift(freq="5min")
    )
)

df["demand_lag_15min"] = (
    df["timestamp"].map(
        demand_lookup.shift(freq="15min")
    )
)

df["demand_lag_30min"] = (
    df["timestamp"].map(
        demand_lookup.shift(freq="30min")
    )
)

df["demand_lag_1hour"] = (
    df["timestamp"].map(
        demand_lookup.shift(freq="1h")
    )
)

df["demand_lag_2hour"] = (
    df["timestamp"].map(
        demand_lookup.shift(freq="2h")
    )
)

df["demand_lag_24hour"] = (
    df["timestamp"].map(
        demand_lookup.shift(freq="24h")
    )
)

df["demand_lag_7day"] = (
    df["timestamp"].map(
        demand_lookup.shift(freq="7D")
    )
)

# --------------------------------------------------
# 4. ROLLING DEMAND FEATURES
# --------------------------------------------------

print("\nCreating rolling demand features...")

# These are calculated from historical demand only.

df["rolling_mean_1hour"] = (
    df["demand_kw"]
    .shift(1)
    .rolling(12)
    .mean()
)

df["rolling_mean_3hour"] = (
    df["demand_kw"]
    .shift(1)
    .rolling(36)
    .mean()
)

df["rolling_mean_24hour"] = (
    df["demand_kw"]
    .shift(1)
    .rolling(288)
    .mean()
)

# --------------------------------------------------
# 5. CREATE DAY-AHEAD TARGET
# --------------------------------------------------

print("\nCreating 24-hour future target...")

future_demand = df.set_index("timestamp")["demand_kw"]

df["target_24hour"] = (
    df["timestamp"].map(
        future_demand.shift(freq="-24h")
    )
)

# --------------------------------------------------
# 6. SELECT FEATURES
# --------------------------------------------------

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

    # Cyclical time
    "hour_sin",
    "hour_cos",
    "dow_sin",
    "dow_cos",

    # Historical demand
    "demand_lag_5min",
    "demand_lag_15min",
    "demand_lag_30min",
    "demand_lag_1hour",
    "demand_lag_2hour",
    "demand_lag_24hour",
    "demand_lag_7day",

    # Rolling demand
    "rolling_mean_1hour",
    "rolling_mean_3hour",
    "rolling_mean_24hour"
]

target = "target_24hour"

# --------------------------------------------------
# 7. CLEAN DATA
# --------------------------------------------------

print("\nCleaning training data...")

required_columns = features + [target]

before = len(df)

df_model = df.dropna(subset=required_columns).copy()

removed = before - len(df_model)

print("Rows removed:", removed)
print("Rows remaining:", len(df_model))

# --------------------------------------------------
# 8. CHRONOLOGICAL TRAIN/TEST SPLIT
# --------------------------------------------------

print("\nSplitting dataset chronologically...")

split_index = int(len(df_model) * 0.80)

train = df_model.iloc[:split_index]
test = df_model.iloc[split_index:]

X_train = train[features]
y_train = train[target]

X_test = test[features]
y_test = test[target]

print("Training rows:", len(train))
print("Testing rows:", len(test))

# --------------------------------------------------
# 9. BASELINE
# --------------------------------------------------

print("\nCalculating day-ahead baseline...")

# Persistence baseline:
# Predict tomorrow's demand using today's demand
# at the same time.

baseline_predictions = test["demand_lag_24hour"]

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

# --------------------------------------------------
# 10. TRAIN RANDOM FOREST
# --------------------------------------------------

print("\nTraining day-ahead Random Forest...")

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

print("✅ Model training complete!")

# --------------------------------------------------
# 11. PREDICTIONS
# --------------------------------------------------

print("\nMaking day-ahead predictions...")

predictions = model.predict(X_test)

# --------------------------------------------------
# 12. EVALUATION
# --------------------------------------------------

ai_mae = mean_absolute_error(
    y_test,
    predictions
)

ai_rmse = np.sqrt(
    mean_squared_error(
        y_test,
        predictions
    )
)

ai_r2 = r2_score(
    y_test,
    predictions
)

mae_improvement = (
    (baseline_mae - ai_mae)
    / baseline_mae
) * 100

rmse_improvement = (
    (baseline_rmse - ai_rmse)
    / baseline_rmse
) * 100

# --------------------------------------------------
# 13. PRINT RESULTS
# --------------------------------------------------

print("\n==========================================")
print("24-HOUR / DAY-AHEAD FORECAST")
print("==========================================")

print("\nBASELINE")
print("------------------------------------------")
print(f"MAE  : {baseline_mae:.2f} kW")
print(f"RMSE : {baseline_rmse:.2f} kW")
print(f"R²   : {baseline_r2:.4f}")

print("\nAI MODEL")
print("------------------------------------------")
print(f"MAE  : {ai_mae:.2f} kW")
print(f"RMSE : {ai_rmse:.2f} kW")
print(f"R²   : {ai_r2:.4f}")

print("\n==========================================")
print("IMPROVEMENT")
print("==========================================")

print(f"MAE improvement : {mae_improvement:.2f}%")
print(f"RMSE improvement: {rmse_improvement:.2f}%")

# --------------------------------------------------
# 14. FEATURE IMPORTANCE
# --------------------------------------------------

importance = pd.DataFrame({
    "feature": features,
    "importance": model.feature_importances_
})

importance = importance.sort_values(
    "importance",
    ascending=False
)

print("\n==========================================")
print("TOP FEATURES")
print("==========================================")

print(
    importance.head(15).to_string(index=False)
)

# --------------------------------------------------
# 15. SAVE MODEL
# --------------------------------------------------

os.makedirs("model", exist_ok=True)

model_path = "model/day_ahead_demand_model.pkl"

joblib.dump(
    model,
    model_path
)

print("\n✅ Model saved:")
print(model_path)

# --------------------------------------------------
# 16. SAVE PREDICTIONS
# --------------------------------------------------

os.makedirs("predictions", exist_ok=True)

results = pd.DataFrame({
    "timestamp": test["timestamp"].values,
    "actual_demand_kw": y_test.values,
    "baseline_prediction_kw": baseline_predictions.values,
    "ai_prediction_kw": predictions
})

results["ai_error_kw"] = (
    results["actual_demand_kw"]
    - results["ai_prediction_kw"]
)

results["absolute_error_kw"] = (
    results["ai_error_kw"].abs()
)

prediction_path = "predictions/day_ahead_predictions.csv"

results.to_csv(
    prediction_path,
    index=False
)

print("\n✅ Predictions saved:")
print(prediction_path)

print("\n==========================================")
print("DAY-AHEAD MODEL COMPLETE")
print("==========================================")