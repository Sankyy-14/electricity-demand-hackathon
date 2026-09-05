import pandas as pd

# ==========================================
# LOAD DATA
# ==========================================

df = pd.read_csv(
    "data/electricity_weather_5min.csv",
    parse_dates=["timestamp"]
)

df = df.sort_values("timestamp").reset_index(drop=True)


# ==========================================
# CALCULATE TIME DIFFERENCE
# ==========================================

df["time_difference"] = (
    df["timestamp"].diff()
)


# ==========================================
# SHOW DIFFERENCE COUNTS
# ==========================================

print("==========================================")
print("TIME INTERVAL ANALYSIS")
print("==========================================")

print("\nMost common time intervals:")

print(
    df["time_difference"]
    .value_counts()
    .head(10)
)


# ==========================================
# EXPECTED INTERVAL
# ==========================================

expected = pd.Timedelta(minutes=5)

wrong_intervals = df[
    df["time_difference"] != expected
]


print("\n==========================================")
print("INCORRECT TIME INTERVALS")
print("==========================================")

print(
    "Number of incorrect intervals:",
    len(wrong_intervals)
)


# ==========================================
# SHOW EXAMPLES
# ==========================================

print("\nFirst 20 incorrect intervals:")

print(
    wrong_intervals[
        [
            "timestamp",
            "time_difference"
        ]
    ].head(20).to_string(index=False)
)


# ==========================================
# LARGEST GAPS
# ==========================================

print("\n==========================================")
print("LARGEST TIME GAPS")
print("==========================================")

largest_gaps = (
    df.sort_values(
        "time_difference",
        ascending=False
    )
    .head(20)
)

print(
    largest_gaps[
        [
            "timestamp",
            "time_difference"
        ]
    ].to_string(index=False)
)