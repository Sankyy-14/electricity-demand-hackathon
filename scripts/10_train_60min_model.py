import pandas as pd
import numpy as np
import os
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ==========================================
# 1. LOAD DATA
# ==========================================

print("Loading dataset...")

df = pd.read_csv(
    "data/electricity_weather_5min.csv",
    parse_dates=["timestamp"]
)

df = df.sort_values(
    "timestamp"
).reset_index(drop=True)

print("Rows:", len(df))


# ==========================================
# 2. CREATE TIME FEATURES
# ==========================================

print("\nCreating time features...")

df["hour"] = df["timestamp"].dt.hour

df["minute"] = df["timestamp"].dt.minute

df["day_of_week"] = (
    df["timestamp"].dt.dayofweek
)

df["is_weekend"] = (
    df["day_of_week"] >= 5
).astype(int)


# ==========================================
# 3. TIME-AWARE HISTORICAL DEMAND
# ==========================================

print("Creating historical demand features...")

demand_lookup = df.set_index(
    "timestamp"
)["demand_kw"]


# 5 minutes ago
df["demand_lag_5min"] = (
    df["timestamp"]
    - pd.Timedelta(minutes=5)
).map(demand_lookup)


# 15 minutes ago
df["demand_lag_15min"] = (
    df["timestamp"]
    - pd.Timedelta(minutes=15)
).map(demand_lookup)


# 30 minutes ago
df["demand_lag_30min"] = (
    df["timestamp"]
    - pd.Timedelta(minutes=30)
).map(demand_lookup)


# 1 hour ago
df["demand_lag_1hour"] = (
    df["timestamp"]
    - pd.Timedelta(hours=1)
).map(demand_lookup)


# 2 hours ago
df["demand_lag_2hour"] = (
    df["timestamp"]
    - pd.Timedelta(hours=2)
).map(demand_lookup)


# 24 hours ago
df["demand_lag_24hour"] = (
    df["timestamp"]
    - pd.Timedelta(hours=24)
).map(demand_lookup)


# 7 days ago
df["demand_lag_7day"] = (
    df["timestamp"]
    - pd.Timedelta(days=7)
).map(demand_lookup)


# ==========================================
# 4. CREATE FUTURE TARGET
# ==========================================

print("\nCreating 60-minute future target...")

future_lookup = demand_lookup


df["future_demand_60min"] = (
    df["timestamp"]
    + pd.Timedelta(minutes=60)
).map(future_lookup)


# ==========================================
# 5. REMOVE MISSING VALUES
# ==========================================

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
    "is_weekend",

    # Historical demand
    "demand_lag_5min",
    "demand_lag_15min",
    "demand_lag_30min",
    "demand_lag_1hour",
    "demand_lag_2hour",
    "demand_lag_24hour",
    "demand_lag_7day"
]

target = "future_demand_60min"


before = len(df)

df = df.dropna(
    subset=features + [target]
).reset_index(drop=True)

after = len(df)

print(
    "Rows removed:",
    before - after
)

print(
    "Rows remaining:",
    after
)


# ==========================================
# 6. TRAIN / TEST SPLIT
# ==========================================

print("\nSplitting dataset...")

split_index = int(
    len(df) * 0.80
)

X_train = df[
    features
].iloc[:split_index]

X_test = df[
    features
].iloc[split_index:]

y_train = df[
    target
].iloc[:split_index]

y_test = df[
    target
].iloc[split_index:]


print(
    "Training rows:",
    len(X_train)
)

print(
    "Testing rows:",
    len(X_test)
)


# ==========================================
# 7. TRAIN RANDOM FOREST
# ==========================================

print("\nTraining 60-minute Random Forest...")

model = RandomForestRegressor(

    n_estimators=100,

    max_depth=18,

    random_state=42,

    n_jobs=-1
)

model.fit(
    X_train,
    y_train
)

print("✅ Model training complete!")


# ==========================================
# 8. PREDICT
# ==========================================

print("\nMaking 60-minute predictions...")

predictions = model.predict(
    X_test
)


# ==========================================
# 9. EVALUATE AI MODEL
# ==========================================

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


# ==========================================
# 10. PERSISTENCE BASELINE
# ==========================================

# For the baseline:
#
# Future demand = current demand

baseline = df[
    "demand_kw"
].iloc[split_index:]


baseline_mae = mean_absolute_error(
    y_test,
    baseline
)

baseline_rmse = np.sqrt(
    mean_squared_error(
        y_test,
        baseline
    )
)

baseline_r2 = r2_score(
    y_test,
    baseline
)


# ==========================================
# 11. DISPLAY RESULTS
# ==========================================

print("\n==========================================")
print("60-MINUTE FORECAST")
print("==========================================")

print("\nBASELINE")
print("------------------------------------------")

print(
    f"MAE  : {baseline_mae:.2f} kW"
)

print(
    f"RMSE : {baseline_rmse:.2f} kW"
)

print(
    f"R²   : {baseline_r2:.4f}"
)


print("\nAI MODEL")
print("------------------------------------------")

print(
    f"MAE  : {mae:.2f} kW"
)

print(
    f"RMSE : {rmse:.2f} kW"
)

print(
    f"R²   : {r2:.4f}"
)


# ==========================================
# 12. IMPROVEMENT
# ==========================================

mae_improvement = (

    (baseline_mae - mae)
    / baseline_mae

) * 100


rmse_improvement = (

    (baseline_rmse - rmse)
    / baseline_rmse

) * 100


print("\n==========================================")
print("IMPROVEMENT")
print("==========================================")

print(
    f"MAE improvement : "
    f"{mae_improvement:.2f}%"
)

print(
    f"RMSE improvement: "
    f"{rmse_improvement:.2f}%"
)


# ==========================================
# 13. SAVE MODEL
# ==========================================

os.makedirs(
    "model",
    exist_ok=True
)

model_path = (
    "model/demand_60min_model.pkl"
)

joblib.dump(
    model,
    model_path
)

print("\n✅ Model saved:")
print(model_path)


# ==========================================
# 14. SAVE PREDICTIONS
# ==========================================

os.makedirs(
    "predictions",
    exist_ok=True
)

results = df.iloc[
    split_index:
].copy()

results[
    "predicted_demand_60min"
] = predictions


results[
    "prediction_error_kw"
] = (

    results[
        "future_demand_60min"
    ]

    -

    results[
        "predicted_demand_60min"
    ]
)


results[
    [
        "timestamp",
        "demand_kw",
        "future_demand_60min",
        "predicted_demand_60min",
        "prediction_error_kw"
    ]
].to_csv(
    "predictions/60min_predictions.csv",
    index=False
)


print("\n✅ Predictions saved:")
print(
    "predictions/60min_predictions.csv"
)


# ==========================================
# 15. FEATURE IMPORTANCE
# ==========================================

importance = pd.DataFrame({

    "feature":
        features,

    "importance":
        model.feature_importances_

})


importance = importance.sort_values(
    "importance",
    ascending=False
)


print("\n==========================================")
print("TOP FEATURES")
print("==========================================")

print(
    importance.head(10)
    .to_string(index=False)
)