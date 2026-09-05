import pandas as pd
import numpy as np

# Load predictions
df = pd.read_csv(
    "predictions/predictions.csv",
    parse_dates=["timestamp"]
)

# Calculate error
df["error_kw"] = (
    df["demand_kw"]
    - df["predicted_demand_kw"]
)

df["absolute_error_kw"] = (
    df["error_kw"].abs()
)

df["percentage_error"] = (
    df["absolute_error_kw"]
    / df["demand_kw"]
) * 100


print("==========================================")
print("ERROR ANALYSIS")
print("==========================================")

print(
    f"Average absolute error: "
    f"{df['absolute_error_kw'].mean():.2f} kW"
)

print(
    f"Maximum absolute error: "
    f"{df['absolute_error_kw'].max():.2f} kW"
)

print(
    f"Average percentage error: "
    f"{df['percentage_error'].mean():.2f}%"
)

print(
    f"Median percentage error: "
    f"{df['percentage_error'].median():.2f}%"
)


# ==========================================
# WORST 10 PREDICTIONS
# ==========================================

print("\n==========================================")
print("10 WORST PREDICTIONS")
print("==========================================")

worst = df.sort_values(
    "absolute_error_kw",
    ascending=False
).head(10)

print(
    worst[
        [
            "timestamp",
            "demand_kw",
            "predicted_demand_kw",
            "absolute_error_kw",
            "percentage_error"
        ]
    ].to_string(index=False)
)


# ==========================================
# SAVE ERROR ANALYSIS
# ==========================================

df.to_csv(
    "predictions/predictions_with_errors.csv",
    index=False
)

print("\n✅ Error analysis saved.")