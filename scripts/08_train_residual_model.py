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

df = df.sort_values("timestamp").reset_index(drop=True)

print("Rows:", len(df))


# ==========================================
# 2. TIME FEATURES
# ==========================================

print("\nCreating time features...")

df["hour"] = df["timestamp"].dt.hour
df["minute"] = df["timestamp"].dt.minute
df["day_of_week"] = df["timestamp"].dt.dayofweek

df["is_weekend"] = (
    df["day_of_week"] >= 5
).astype(int)


# ==========================================
# 3. TIME-AWARE DEMAND LAGS
# ==========================================

print("Creating demand lags...")

demand_lookup = df.set_index(
    "timestamp"
)["demand_kw"]


df["demand_lag_5min"] = (
    df["timestamp"]
    - pd.Timedelta(minutes=5)
).map(demand_lookup)


df["demand_lag_1hour"] = (
    df["timestamp"]
    - pd.Timedelta(hours=1)
).map(demand_lookup)


df["demand_lag_24hour"] = (
    df["timestamp"]
    - pd.Timedelta(hours=24)
).map(demand_lookup)


df["demand_lag_7day"] = (
    df["timestamp"]
    - pd.Timedelta(days=7)
).map(demand_lookup)


# ==========================================
# 4. CREATE TARGET CHANGE
# ==========================================

# Instead of predicting demand directly:
#
# demand_kw
#
# we predict:
#
# future demand - previous demand

df["demand_change"] = (
    df["demand_kw"]
    - df["demand_lag_5min"]
)


# ==========================================
# 5. REMOVE MISSING VALUES
# ==========================================

required = [
    "demand_lag_5min",
    "demand_lag_1hour",
    "demand_lag_24hour",
    "demand_lag_7day",
    "demand_change"
]

df = df.dropna(
    subset=required
).reset_index(drop=True)

print("Rows remaining:", len(df))


# ==========================================
# 6. FEATURES
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
    "year",
    "month",
    "day",
    "hour",
    "minute",
    "day_of_week",
    "is_weekend",

    # Historical demand
    "demand_lag_5min",
    "demand_lag_1hour",
    "demand_lag_24hour",
    "demand_lag_7day"
]


X = df[features]

# NEW TARGET
y = df["demand_change"]


# ==========================================
# 7. TIME-BASED SPLIT
# ==========================================

split_index = int(
    len(df) * 0.80
)

X_train = X.iloc[:split_index]
X_test = X.iloc[split_index:]

y_train = y.iloc[:split_index]
y_test = y.iloc[split_index:]


print("\nTraining rows:", len(X_train))
print("Testing rows:", len(X_test))


# ==========================================
# 8. TRAIN MODEL
# ==========================================

print("\nTraining residual Random Forest...")

model = RandomForestRegressor(
    n_estimators=100,
    max_depth=15,
    random_state=42,
    n_jobs=-1
)

model.fit(
    X_train,
    y_train
)

print("✅ Training complete!")


# ==========================================
# 9. PREDICT CHANGE
# ==========================================

predicted_change = model.predict(
    X_test
)


# ==========================================
# 10. CONVERT CHANGE TO DEMAND
# ==========================================

previous_demand = (
    df.iloc[split_index:]["demand_lag_5min"]
    .values
)

actual_demand = (
    df.iloc[split_index:]["demand_kw"]
    .values
)


predicted_demand = (
    previous_demand
    + predicted_change
)


# ==========================================
# 11. METRICS
# ==========================================

mae = mean_absolute_error(
    actual_demand,
    predicted_demand
)

rmse = np.sqrt(
    mean_squared_error(
        actual_demand,
        predicted_demand
    )
)

r2 = r2_score(
    actual_demand,
    predicted_demand
)


# ==========================================
# 12. BASELINE
# ==========================================

baseline_prediction = previous_demand


baseline_mae = mean_absolute_error(
    actual_demand,
    baseline_prediction
)

baseline_rmse = np.sqrt(
    mean_squared_error(
        actual_demand,
        baseline_prediction
    )
)

baseline_r2 = r2_score(
    actual_demand,
    baseline_prediction
)


# ==========================================
# 13. RESULTS
# ==========================================

print("\n==========================================")
print("BASELINE")
print("==========================================")

print(f"MAE  : {baseline_mae:.2f} kW")
print(f"RMSE : {baseline_rmse:.2f} kW")
print(f"R²   : {baseline_r2:.4f}")


print("\n==========================================")
print("RESIDUAL AI MODEL")
print("==========================================")

print(f"MAE  : {mae:.2f} kW")
print(f"RMSE : {rmse:.2f} kW")
print(f"R²   : {r2:.4f}")


# ==========================================
# 14. IMPROVEMENT
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
# 15. SAVE MODEL
# ==========================================

os.makedirs(
    "model",
    exist_ok=True
)

joblib.dump(
    model,
    "model/residual_demand_model.pkl"
)

print("\n✅ Model saved:")
print(
    "model/residual_demand_model.pkl"
)


# ==========================================
# 16. SAVE PREDICTIONS
# ==========================================

os.makedirs(
    "predictions",
    exist_ok=True
)

results = df.iloc[
    split_index:
].copy()

results["predicted_demand_kw"] = (
    predicted_demand
)

results["prediction_error_kw"] = (
    results["demand_kw"]
    - results["predicted_demand_kw"]
)

results[
    [
        "timestamp",
        "demand_kw",
        "demand_lag_5min",
        "predicted_demand_kw",
        "prediction_error_kw"
    ]
].to_csv(
    "predictions/residual_predictions.csv",
    index=False
)

print("\n✅ Predictions saved:")
print(
    "predictions/residual_predictions.csv"
)