import pandas as pd
import matplotlib.pyplot as plt
import os

# ==========================================
# LOAD PREDICTIONS
# ==========================================

df = pd.read_csv(
    "predictions/predictions.csv",
    parse_dates=["timestamp"]
)

print("Predictions loaded!")
print("Rows:", len(df))


# ==========================================
# TAKE LAST 24 HOURS
# ==========================================

# 5-minute data
# 24 hours = 288 observations

plot_data = df.tail(288)


# ==========================================
# CREATE PLOT
# ==========================================

plt.figure(figsize=(14, 6))

plt.plot(
    plot_data["timestamp"],
    plot_data["demand_kw"],
    label="Actual Demand"
)

plt.plot(
    plot_data["timestamp"],
    plot_data["predicted_demand_kw"],
    label="Predicted Demand"
)

plt.xlabel("Time")
plt.ylabel("Electricity Demand (kW)")

plt.title(
    "Actual vs Predicted Electricity Demand - Last 24 Hours"
)

plt.legend()

plt.xticks(rotation=45)

plt.tight_layout()


# ==========================================
# SAVE GRAPH
# ==========================================

os.makedirs("predictions", exist_ok=True)

output_file = "predictions/actual_vs_predicted.png"

plt.savefig(
    output_file,
    dpi=150
)

plt.show()

print("\n✅ Graph saved:")
print(output_file)