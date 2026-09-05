import pandas as pd
import numpy as np
import joblib

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)


# ==========================================
# 1. LOAD DATA
# ==========================================

print("Loading dataset...")

df = pd.read_csv(
    "data/electricity_weather_5min.csv",
    parse_dates=["timestamp"]
)

df = df.sort_values("timestamp").reset_index(drop=True)


# ==========================================
# 2. CREATE TIME FEATURES
# ==========================================

df["hour"] = df["timestamp"].dt.hour
df["minute"] = df["timestamp"].dt.minute
df["day_of_week"] = df["timestamp"].dt.dayofweek

df["is_weekend"] = (
    df["day_of_week"] >= 5
).astype(int)


# ==========================================
# 3. CREATE TIME-AWARE LAGS
# ==========================================

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
# 4. REMOVE MISSING LAGS
# ==========================================

lag_columns = [
    "demand_lag_5min",
    "demand_lag_1hour",
    "demand_lag_24hour",
    "demand_lag_7day"
]

df = df.dropna(
    subset=lag_columns
).reset_index(drop=True)


# ==========================================
# 5. SAME TRAIN/TEST SPLIT
# ==========================================

split_index = int(len(df) * 0.80)

test = df.iloc[split_index:].copy()


# ==========================================
# 6. BASELINE PREDICTION
# ==========================================

# Simplest possible forecast:
#
# next demand = demand 5 minutes ago

baseline_predictions = test[
    "demand_lag_5min"
]


actual = test[
    "demand_kw"
]


# ==========================================
# 7. BASELINE METRICS
# ==========================================

baseline_mae = mean_absolute_error(
    actual,
    baseline_predictions
)

baseline_rmse = np.sqrt(
    mean_squared_error(
        actual,
        baseline_predictions
    )
)

baseline_r2 = r2_score(
    actual,
    baseline_predictions
)


# ==========================================
# 8. LOAD OUR AI MODEL
# ==========================================

model = joblib.load(
    "model/demand_model.pkl"
)


# ==========================================
# 9. CREATE MODEL FEATURES
# ==========================================

features = [
    "temperature",
    "dew_point",
    "humidity",
    "wind_direction",
    "wind_speed",
    "pressure",

    "year",
    "month",
    "day",
    "hour",
    "minute",
    "day_of_week",
    "is_weekend",

    "demand_lag_5min",
    "demand_lag_1hour",
    "demand_lag_24hour",
    "demand_lag_7day"
]


X_test = test[features]


# ==========================================
# 10. AI PREDICTIONS
# ==========================================

ai_predictions = model.predict(
    X_test
)


# ==========================================
# 11. AI METRICS
# ==========================================

ai_mae = mean_absolute_error(
    actual,
    ai_predictions
)

ai_rmse = np.sqrt(
    mean_squared_error(
        actual,
        ai_predictions
    )
)

ai_r2 = r2_score(
    actual,
    ai_predictions
)


# ==========================================
# 12. DISPLAY COMPARISON
# ==========================================

print("\n==========================================")
print("BASELINE vs AI MODEL")
print("==========================================")

print("\nBASELINE")
print("-----------------------------")
print(f"MAE  : {baseline_mae:.2f} kW")
print(f"RMSE : {baseline_rmse:.2f} kW")
print(f"R²   : {baseline_r2:.4f}")


print("\nAI MODEL")
print("-----------------------------")
print(f"MAE  : {ai_mae:.2f} kW")
print(f"RMSE : {ai_rmse:.2f} kW")
print(f"R²   : {ai_r2:.4f}")


# ==========================================
# 13. IMPROVEMENT
# ==========================================

mae_improvement = (
    (baseline_mae - ai_mae)
    / baseline_mae
) * 100

rmse_improvement = (
    (baseline_rmse - ai_rmse)
    / baseline_rmse
) * 100


print("\n==========================================")
print("AI IMPROVEMENT")
print("==========================================")

print(
    f"MAE improvement : "
    f"{mae_improvement:.2f}%"
)

print(
    f"RMSE improvement: "
    f"{rmse_improvement:.2f}%"
)

print("==========================================")