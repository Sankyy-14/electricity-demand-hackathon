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

print("Dataset loaded!")
print("Rows:", len(df))


# ==========================================
# 2. CREATE TIME FEATURES
# ==========================================

print("\nCreating time features...")

df["hour"] = df["timestamp"].dt.hour
df["minute"] = df["timestamp"].dt.minute
df["day_of_week"] = df["timestamp"].dt.dayofweek

df["is_weekend"] = (
    df["day_of_week"] >= 5
).astype(int)


# ==========================================
# 3. CREATE TIME-AWARE LAG FEATURES
# ==========================================

print("Creating time-aware lag features...")

# Create lookup table:
# timestamp -> demand

demand_lookup = df.set_index(
    "timestamp"
)["demand_kw"]


# ------------------------------------------
# 5 MINUTES AGO
# ------------------------------------------

df["demand_lag_5min"] = (
    df["timestamp"] - pd.Timedelta(minutes=5)
).map(demand_lookup)


# ------------------------------------------
# 1 HOUR AGO
# ------------------------------------------

df["demand_lag_1hour"] = (
    df["timestamp"] - pd.Timedelta(hours=1)
).map(demand_lookup)


# ------------------------------------------
# 24 HOURS AGO
# ------------------------------------------

df["demand_lag_24hour"] = (
    df["timestamp"] - pd.Timedelta(hours=24)
).map(demand_lookup)


# ------------------------------------------
# 7 DAYS AGO
# ------------------------------------------

df["demand_lag_7day"] = (
    df["timestamp"] - pd.Timedelta(days=7)
).map(demand_lookup)


# ==========================================
# 4. CHECK MISSING LAGS
# ==========================================

print("\nMissing lag values:")

print(
    df[
        [
            "demand_lag_5min",
            "demand_lag_1hour",
            "demand_lag_24hour",
            "demand_lag_7day"
        ]
    ].isnull().sum()
)


# ==========================================
# 5. REMOVE ROWS WITHOUT REQUIRED HISTORY
# ==========================================

lag_columns = [
    "demand_lag_5min",
    "demand_lag_1hour",
    "demand_lag_24hour",
    "demand_lag_7day"
]

before = len(df)

df = df.dropna(
    subset=lag_columns
).reset_index(drop=True)

after = len(df)

print("\nRows removed because required history was missing:")
print(before - after)

print("Rows remaining:", after)


# ==========================================
# 6. SELECT FEATURES
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

target = "demand_kw"


X = df[features]
y = df[target]


# ==========================================
# 7. TIME-BASED TRAIN/TEST SPLIT
# ==========================================

print("\nSplitting dataset...")

# IMPORTANT:
# Do NOT shuffle time-series data.

split_index = int(len(df) * 0.80)

X_train = X.iloc[:split_index]
X_test = X.iloc[split_index:]

y_train = y.iloc[:split_index]
y_test = y.iloc[split_index:]


print("Training rows:", len(X_train))
print("Testing rows:", len(X_test))


# ==========================================
# 8. TRAIN RANDOM FOREST
# ==========================================

print("\nTraining Random Forest...")
print("This may take some time.")

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

print("✅ Model training complete!")


# ==========================================
# 9. MAKE PREDICTIONS
# ==========================================

print("\nMaking predictions...")

predictions = model.predict(X_test)


# ==========================================
# 10. MODEL PERFORMANCE
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


print("\n==========================================")
print("MODEL PERFORMANCE")
print("==========================================")

print(f"MAE  : {mae:.2f} kW")
print(f"RMSE : {rmse:.2f} kW")
print(f"R²   : {r2:.4f}")

print("==========================================")


# ==========================================
# 11. SAVE MODEL
# ==========================================

os.makedirs(
    "model",
    exist_ok=True
)

model_path = "model/demand_model.pkl"

joblib.dump(
    model,
    model_path
)

print("\n✅ Model saved:")
print(model_path)


# ==========================================
# 12. SAVE PREDICTIONS
# ==========================================

os.makedirs(
    "predictions",
    exist_ok=True
)

results = df.iloc[split_index:].copy()

results["predicted_demand_kw"] = predictions

results = results[
    [
        "timestamp",
        "demand_kw",
        "predicted_demand_kw",
        "temperature",
        "humidity"
    ]
]

prediction_file = (
    "predictions/predictions.csv"
)

results.to_csv(
    prediction_file,
    index=False
)

print("\n✅ Predictions saved:")
print(prediction_file)


# ==========================================
# 13. FEATURE IMPORTANCE
# ==========================================

importance = pd.DataFrame({
    "feature": features,
    "importance": model.feature_importances_
})

importance = importance.sort_values(
    "importance",
    ascending=False
)

print("\n==========================================")
print("TOP IMPORTANT FEATURES")
print("==========================================")

print(
    importance.head(10)
    .to_string(index=False)
)