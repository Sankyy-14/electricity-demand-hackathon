"""
add_features.py

Enriches merged_dataset.csv (timestamp, temperature, humidity, load_mw)
with calendar, holiday, and lag/rolling-average features that materially
help electricity load forecasting models.

Usage:
    python add_features.py merged_dataset.csv
    (writes merged_dataset_featured.csv in the same folder)

New columns added:
    hour              - 0-23
    day_of_week       - 0=Monday ... 6=Sunday
    month             - 1-12
    is_weekend        - 1 if Sat/Sun else 0
    is_holiday        - 1 if a major Indian public holiday, else 0
    load_lag_24h      - load_mw from exactly 24 hours earlier
    load_lag_168h     - load_mw from exactly 168 hours (1 week) earlier
    rolling_mean_24h  - mean load_mw over the trailing 24 hours
    rolling_mean_168h - mean load_mw over the trailing 168 hours (1 week)

Notes:
- Rows at the very start of the dataset won't have enough history for the
  lag/rolling columns (they'll be blank/NaN). This is normal - most models
  either drop these rows or the ML lead can decide how to handle them.
- The holiday list below covers major fixed-date national holidays plus
  Diwali/Holi dates for 2023-2026 (these move each year on the lunar
  calendar). Double-check these dates before the demo if exact accuracy
  matters - approximate dates are used here from general knowledge.
"""

import sys
import pandas as pd

# Major Indian public holidays likely to affect Delhi electricity demand.
# Fixed-date national holidays + approximate movable festival dates.
# NOTE: verify festival dates against an authoritative calendar before
# relying on this for a real demo - movable festival dates can shift by
# a day depending on the lunar calendar and regional observance.
HOLIDAYS = [
    # Fixed national holidays
    "2023-01-26", "2024-01-26", "2025-01-26", "2026-01-26",  # Republic Day
    "2023-08-15", "2024-08-15", "2025-08-15", "2026-08-15",  # Independence Day
    "2023-10-02", "2024-10-02", "2025-10-02", "2026-10-02",  # Gandhi Jayanti
    "2023-12-25", "2024-12-25", "2025-12-25", "2026-12-25",  # Christmas
    # Diwali (approximate - movable)
    "2023-11-12", "2024-10-31", "2025-10-20",
    # Holi (approximate - movable)
    "2023-03-08", "2024-03-25", "2025-03-14", "2026-03-04",
]
HOLIDAY_SET = set(HOLIDAYS)


def add_features(input_path: str, output_path: str) -> None:
    df = pd.read_csv(input_path, parse_dates=["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)

    # --- Calendar features ---
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek  # 0=Mon
    df["month"] = df["timestamp"].dt.month
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["is_holiday"] = df["timestamp"].dt.strftime("%Y-%m-%d").isin(HOLIDAY_SET).astype(int)

    # --- Lag features (assumes hourly, gap-free timestamps) ---
    df["load_lag_24h"] = df["load_mw"].shift(24)
    df["load_lag_168h"] = df["load_mw"].shift(168)

    # --- Rolling averages (trailing window, not centered) ---
    df["rolling_mean_24h"] = df["load_mw"].rolling(window=24, min_periods=1).mean()
    df["rolling_mean_168h"] = df["load_mw"].rolling(window=168, min_periods=1).mean()

    df.to_csv(output_path, index=False)

    n_missing_lag = df["load_lag_168h"].isna().sum()
    print(f"Wrote {len(df)} rows with added features -> {output_path}")
    print(f"Columns: {list(df.columns)}")
    print(f"Note: first {n_missing_lag} rows lack a full 168h lag (not enough history yet)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python add_features.py <merged_dataset.csv>")
        sys.exit(1)

    input_csv = sys.argv[1]
    output_csv = "merged_dataset_featured.csv"
    add_features(input_csv, output_csv)