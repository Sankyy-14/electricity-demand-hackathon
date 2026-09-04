"""
resample_load.py

Resamples 5-minute Delhi SLDC load data (Kaggle dataset) to hourly averages
and renames columns to match merge_data.py's expected schema:
    timestamp, load_mw

Usage:
    python resample_load.py load_data.csv
    (writes real_load_hourly.csv in the same folder)

Input CSV format expected:
    timestamp,load_MW
    2023-04-01 00:00:00,2247.59
    2023-04-01 00:05:00,2242.49
    ...

Output CSV format:
    timestamp,load_mw
    2023-04-01T00:00,2189.35
    2023-04-01T01:00,2071.22
    ...

Note: timestamps are written as YYYY-MM-DDTHH:MM (no seconds) to match the
normalization merge_data.py already applies to the weather data, avoiding
the earlier 0-match bug caused by inconsistent timestamp formats.
"""

import csv
import sys
from collections import defaultdict
from datetime import datetime


def resample(input_path: str, output_path: str) -> None:
    # hour_key -> list of load values in that hour
    hourly_values = defaultdict(list)

    with open(input_path, newline="") as f:
        reader = csv.DictReader(f)

        # Handle either "load_MW" or "load_mw" column naming just in case
        fieldnames = reader.fieldnames or []
        load_col = None
        for candidate in ("load_MW", "load_mw", "Load_MW", "LOAD_MW"):
            if candidate in fieldnames:
                load_col = candidate
                break
        if load_col is None:
            raise ValueError(
                f"Could not find a load column in {fieldnames}. "
                "Expected something like 'load_MW'."
            )

        for row in reader:
            ts_raw = row["timestamp"].strip()
            load_raw = row[load_col].strip()

            if not ts_raw or not load_raw:
                continue  # skip missing/blank rows

            try:
                load_val = float(load_raw)
            except ValueError:
                continue  # skip corrupt rows

            # Parse "2023-04-01 00:05:00" -> datetime, then floor to the hour
            dt = datetime.strptime(ts_raw, "%Y-%m-%d %H:%M:%S")
            hour_key = dt.strftime("%Y-%m-%dT%H:00")

            hourly_values[hour_key].append(load_val)

    # Average each hour's readings, write out sorted by timestamp
    rows_out = []
    for hour_key, values in hourly_values.items():
        avg_load = sum(values) / len(values)
        rows_out.append((hour_key, round(avg_load, 2)))

    rows_out.sort(key=lambda r: r[0])

    with open(output_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "load_mw"])
        writer.writerows(rows_out)

    print(f"Read {sum(len(v) for v in hourly_values.values())} 5-min readings")
    print(f"Wrote {len(rows_out)} hourly rows -> {output_path}")
    if rows_out:
        print(f"Range: {rows_out[0][0]} to {rows_out[-1][0]}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python resample_load.py <input_csv>")
        sys.exit(1)

    input_csv = sys.argv[1]
    output_csv = "real_load_hourly.csv"
    resample(input_csv, output_csv)