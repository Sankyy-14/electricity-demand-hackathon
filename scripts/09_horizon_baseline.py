import pandas as pd
import numpy as np
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
# 2. CREATE TIME-BASED FUTURE DEMAND
# ==========================================

demand_lookup = df.set_index(
    "timestamp"
)["demand_kw"]


# ==========================================
# 3. DEFINE FORECAST HORIZONS
# ==========================================

horizons = {
    "5 minutes": 5,
    "15 minutes": 15,
    "30 minutes": 30,
    "45 minutes": 45,
    "60 minutes": 60
}


# ==========================================
# 4. TEST EACH HORIZON
# ==========================================

print("\n==========================================")
print("PERSISTENCE BASELINE BY HORIZON")
print("==========================================")


for name, minutes in horizons.items():

    # Future actual demand
    future_demand = (
        df["timestamp"]
        + pd.Timedelta(minutes=minutes)
    ).map(demand_lookup)

    # Baseline:
    # future demand = current demand

    current_demand = df["demand_kw"]

    valid = future_demand.notna()

    actual = future_demand[valid]

    predicted = current_demand[valid]


    # Metrics
    mae = mean_absolute_error(
        actual,
        predicted
    )

    rmse = np.sqrt(
        mean_squared_error(
            actual,
            predicted
        )
    )

    r2 = r2_score(
        actual,
        predicted
    )


    print(f"\n{name}")
    print("-----------------------------")
    print(f"MAE  : {mae:.2f} kW")
    print(f"RMSE : {rmse:.2f} kW")
    print(f"R²   : {r2:.4f}")


print("\n==========================================")
print("DONE")
print("==========================================")