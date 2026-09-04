# Generates a realistic mock hourly electricity load dataset for Delhi.
# Mirrors known patterns: summer peak in afternoon/evening, night dip,
# weekday vs weekend variation, and seasonal swing (higher in summer).
# Saves output to mock_load.csv with the same timestamp format as weather.csv.
import csv
import math
import random
from datetime import datetime, timedelta
HISTORY_DAYS = 90
BASE_LOAD_MW = 4500       # typical off-peak baseline
PEAK_LOAD_MW = 8200       # typical summer peak
RANDOM_NOISE_MW = 150     # small random variation per hour

def seasonal_factor(day_of_year):
    """Higher load in summer months (peaks around late May/June)."""
    # Roughly model summer peak around day 165 (mid-June)
    summer_peak_day = 165
    distance = abs(day_of_year - summer_peak_day)
    return max(0.6, 1.0 - distance / 300)

def hourly_factor(hour):
    """
    Daily load curve: low at night (2-5 AM), rising through morning,
    peaking in afternoon/evening (2 PM - 8 PM), tapering at night.
    """
    # Two humps: late morning and evening, night dip
    morning_peak = math.exp(-((hour - 11) ** 2) / (2 * 4 ** 2))
    evening_peak = math.exp(-((hour - 19) ** 2) / (2 * 3 ** 2))
    night_dip = 0.35 + 0.65 * max(morning_peak, evening_peak)
    return night_dip

def weekday_factor(weekday):
    """Slightly lower load on weekends (weekday: 0=Monday, 6=Sunday)."""
    return 0.95 if weekday >= 5 else 1.0

def generate_load(start_date, num_days):
    rows = []
    for day_offset in range(num_days):
        current_date = start_date + timedelta(days=day_offset)
        day_of_year = current_date.timetuple().tm_yday
        season_factor = seasonal_factor(day_of_year)
        week_factor = weekday_factor(current_date.weekday())

        for hour in range(24):
            hour_factor = hourly_factor(hour)
            load = BASE_LOAD_MW + (PEAK_LOAD_MW - BASE_LOAD_MW) * hour_factor * season_factor * week_factor
            noise = random.uniform(-RANDOM_NOISE_MW, RANDOM_NOISE_MW)
            load = round(load + noise, 1)

            timestamp = current_date.replace(hour=hour, minute=0, second=0).isoformat()
            rows.append((timestamp, load))

    return rows

def save_to_csv(rows, output_path="mock_load.csv"):
    with open(output_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "load_mw"])
        writer.writerows(rows)
    print(f"Saved {len(rows)} hourly load records to {output_path}")


if __name__ == "__main__":
    random.seed(42)  # reproducible mock data
    end_date = datetime.today().replace(hour=0, minute=0, second=0, microsecond=0)
    start_date = end_date - timedelta(days=HISTORY_DAYS)

    rows = generate_load(start_date, HISTORY_DAYS + 1)
    save_to_csv(rows)