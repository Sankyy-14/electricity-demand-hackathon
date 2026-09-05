import pandas as pd
import os

# ==========================================
# 1. LOAD KAGGLE DATASET
# ==========================================

input_file = "data/delhi_demand.csv"

print("Loading Kaggle dataset...")

df = pd.read_csv(input_file)

print("Dataset loaded!")
print("Rows:", len(df))


# ==========================================
# 2. REMOVE UNNECESSARY COLUMNS
# ==========================================

# Unnamed: 0 is only the old CSV index
if "Unnamed: 0" in df.columns:
    df = df.drop(columns=["Unnamed: 0"])

# We will create our own lag features later
if "moving_avg_3" in df.columns:
    df = df.drop(columns=["moving_avg_3"])


# ==========================================
# 3. RENAME COLUMNS
# ==========================================

df = df.rename(columns={
    "datetime": "timestamp",
    "Power demand": "demand_kw",
    "temp": "temperature",
    "dwpt": "dew_point",
    "rhum": "humidity",
    "wdir": "wind_direction",
    "wspd": "wind_speed",
    "pres": "pressure"
})


# ==========================================
# 4. CONVERT DATETIME
# ==========================================

df["timestamp"] = pd.to_datetime(df["timestamp"])


# ==========================================
# 5. SORT CHRONOLOGICALLY
# ==========================================

df = df.sort_values("timestamp")

df = df.reset_index(drop=True)


# ==========================================
# 6. REMOVE DUPLICATE TIMESTAMPS
# ==========================================

before = len(df)

df = df.drop_duplicates(subset=["timestamp"])

after = len(df)

print("Duplicate rows removed:", before - after)


# ==========================================
# 7. HANDLE MISSING VALUES
# ==========================================

numeric_columns = [
    "demand_kw",
    "temperature",
    "dew_point",
    "humidity",
    "wind_direction",
    "wind_speed",
    "pressure"
]

print("\nMissing values before cleaning:")
print(df[numeric_columns].isnull().sum())


# Interpolate missing weather values
df[numeric_columns] = df[numeric_columns].interpolate(
    method="linear"
)

# If anything is still missing at beginning/end
df[numeric_columns] = df[numeric_columns].ffill().bfill()


print("\nMissing values after cleaning:")
print(df[numeric_columns].isnull().sum())


# ==========================================
# 8. SELECT FINAL COLUMNS
# ==========================================

final_columns = [
    "timestamp",
    "demand_kw",
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
    "minute"
]

df = df[final_columns]


# ==========================================
# 9. SAVE CLEAN DATASET
# ==========================================

os.makedirs("data", exist_ok=True)

output_file = "data/electricity_weather_5min.csv"

df.to_csv(
    output_file,
    index=False
)


# ==========================================
# 10. DISPLAY RESULTS
# ==========================================

print("\n==========================================")
print("DATA PREPARATION COMPLETE")
print("==========================================")

print("\nRows:", len(df))

print("\nColumns:")
print(df.columns.tolist())

print("\nFirst 5 rows:")
print(df.head())

print("\nLast 5 rows:")
print(df.tail())

print("\nSaved file:")
print(output_file)