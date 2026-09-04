# Fetches historical + forecast weather variables for Delhi from Open-Meteo.
import requests
import csv
from datetime import date, timedelta

# Delhi coordinates
LATITUDE = 28.6139
LONGITUDE = 77.2090
TIMEZONE = "Asia/Kolkata"

# Historical range: match the real load dataset's coverage
# (Kaggle Delhi SLDC data runs 2023-04-01 to 2026-01-12)
HISTORY_START_DATE = "2023-04-01"
HISTORY_END_DATE = "2026-01-12"

# How many forecast days to append after the historical range
FORECAST_DAYS = 7

# Open-Meteo variable names -> friendly output column names.
# Order here determines column order in weather.csv.
HOURLY_VARS = {
    "temperature_2m": "temperature",
    "relative_humidity_2m": "humidity",
    "apparent_temperature": "apparent_temperature",
    "precipitation": "precipitation",
    "wind_speed_10m": "wind_speed",
    "cloud_cover": "cloud_cover",
}
HOURLY_PARAM_STRING = ",".join(HOURLY_VARS.keys())


def fetch_historical():
    # Fetch hourly weather data for the fixed historical range above.
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        "start_date": HISTORY_START_DATE,
        "end_date": HISTORY_END_DATE,
        "hourly": HOURLY_PARAM_STRING,
        "timezone": TIMEZONE,
    }

    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()


def fetch_forecast():
    # Fetch next FORECAST_DAYS of hourly weather data (from today).
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        "forecast_days": FORECAST_DAYS,
        "hourly": HOURLY_PARAM_STRING,
        "timezone": TIMEZONE,
    }

    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()


def save_to_csv(historical_json, forecast_json, output_path="weather.csv"):
    # Combine historical + forecast data and write to a single CSV.
    rows = []
    output_columns = list(HOURLY_VARS.values())

    for data in (historical_json, forecast_json):
        hourly = data["hourly"]
        times = hourly["time"]

        # Pull each variable's list in the same order as output_columns,
        # falling back to None if a variable is missing from the response
        # (guards against a partial API response instead of crashing).
        var_lists = [hourly.get(var_name) for var_name in HOURLY_VARS.keys()]

        for i, t in enumerate(times):
            row = [t] + [
                (values[i] if values is not None else "")
                for values in var_lists
            ]
            rows.append(row)

    # Remove duplicate timestamps (in case history/forecast overlap by a day)
    seen = set()
    deduped_rows = []
    for row in rows:
        if row[0] not in seen:
            seen.add(row[0])
            deduped_rows.append(row)

    deduped_rows.sort(key=lambda r: r[0])

    with open(output_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp"] + output_columns)
        writer.writerows(deduped_rows)

    print(f"Saved {len(deduped_rows)} hourly weather records to {output_path}")
    print(f"Columns: timestamp, {', '.join(output_columns)}")


if __name__ == "__main__":
    print(f"Fetching historical weather ({HISTORY_START_DATE} to {HISTORY_END_DATE})...")
    historical = fetch_historical()

    print("Fetching forecast weather...")
    forecast = fetch_forecast()

    save_to_csv(historical, forecast)