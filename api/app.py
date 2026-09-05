"""
Minimal Flask API that runs the existing prediction pipeline and serves
the forecast as JSON for the React frontend to consume.
"""

import subprocess
import sys
import pandas as pd
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

FORECAST_CSV = "predictions/latest_forecasts.csv"


@app.route("/api/forecast")
def get_forecast():
    try:
        subprocess.run(
            [sys.executable, "scripts/13_predict.py"],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as e:
        return jsonify({"error": "Prediction script failed", "details": e.stderr}), 500
    except FileNotFoundError:
        return jsonify({"error": "scripts/13_predict.py not found. Run this from the repo root."}), 500

    try:
        df = pd.read_csv(FORECAST_CSV)
    except FileNotFoundError:
        return jsonify({"error": f"{FORECAST_CSV} not found after running prediction script"}), 500

    result = {}
    for _, row in df.iterrows():
        result[row["horizon"]] = {
            "forecast_for": row["forecast_for"],
            "predicted_demand_kw": round(row["predicted_demand_kw"], 2),
            "current_demand_kw": round(row["current_demand_kw"], 2),
            "temperature_c": round(row["temperature_c"], 2),
        }

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
