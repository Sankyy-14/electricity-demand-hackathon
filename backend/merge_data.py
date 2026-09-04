"""
Merges weather.csv (from fetch_weather.py) with a load CSV
(mock_load.csv, or a real dataset renamed to have 'timestamp' and 'load_mw'
columns) into a single merged_dataset.csv, aligned by hourly timestamp.

Timestamps are normalized before matching, since different sources format
them differently (e.g. Open-Meteo omits seconds: "2026-06-06T00:00",
while other sources may include them: "2026-06-06T00:00:00").

Weather columns are carried over dynamically (whatever columns weather.csv
has besides 'timestamp'), so adding new weather variables to
fetch_weather.py doesn't require changing this script.

Usage:
    python3 merge_data.py                      # uses mock_load.csv by default
    python3 merge_data.py real_load.csv         # uses a different load file
"""

import csv
import sys
from datetime import datetime


def normalize_timestamp(ts):
    """
    Parse a timestamp string in whatever reasonable format it comes in,
    and return it in a consistent 'YYYY-MM-DDTHH:MM' form so different
    sources can be matched against each other.
    """
    ts = ts.strip()
    # Try formats from most to least specific
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            parsed = datetime.strptime(ts, fmt)
            return parsed.strftime("%Y-%m-%dT%H:%M")
        except ValueError:
            continue
    raise ValueError(f"Could not parse timestamp: {ts}")


def load_csv_as_dict(path, key_col):
    """Read a CSV into a dict keyed by the normalized timestamp column."""
    data = {}
    fieldnames = []
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        for row in reader:
            key = normalize_timestamp(row[key_col])
            data[key] = row
    return data, fieldnames


def merge(weather_path, load_path, output_path="merged_dataset.csv"):
    weather, weather_fields = load_csv_as_dict(weather_path, "timestamp")
    load, _ = load_csv_as_dict(load_path, "timestamp")

    # Carry over every weather column except timestamp, in the order
    # weather.csv defines them - this adapts automatically if new
    # weather variables (apparent_temperature, precipitation, etc.)
    # are added to fetch_weather.py later.
    weather_value_cols = [c for c in weather_fields if c != "timestamp"]

    common_timestamps = sorted(set(weather.keys()) & set(load.keys()))
    missing_in_weather = set(load.keys()) - set(weather.keys())
    missing_in_load = set(weather.keys()) - set(load.keys())

    with open(output_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp"] + weather_value_cols + ["load_mw"])
        for ts in common_timestamps:
            row = [ts] + [weather[ts][col] for col in weather_value_cols] + [load[ts]["load_mw"]]
            writer.writerow(row)

    print(f"Merged {len(common_timestamps)} rows into {output_path}")
    print(f"Columns: timestamp, {', '.join(weather_value_cols)}, load_mw")
    if missing_in_weather:
        print(f"  Note: {len(missing_in_weather)} load timestamps had no matching weather data (skipped)")
    if missing_in_load:
        print(f"  Note: {len(missing_in_load)} weather timestamps had no matching load data (skipped)")


if __name__ == "__main__":
    load_file = sys.argv[1] if len(sys.argv) > 1 else "mock_load.csv"
    merge("weather.csv", load_file)