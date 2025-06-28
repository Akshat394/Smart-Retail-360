from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any
import joblib
import os
import numpy as np
import pandas as pd

app = FastAPI()

class PredictRequest(BaseModel):
    data: List[float]
    params: Dict[str, Any] = {}

# Load models at startup
ARIMA_PATH = 'arima_model.pkl'
ANOMALY_PATH = 'anomaly_model.pkl'
arima_model = joblib.load(ARIMA_PATH) if os.path.exists(ARIMA_PATH) else None
anomaly_model = joblib.load(ANOMALY_PATH) if os.path.exists(ANOMALY_PATH) else None

@app.post('/predict')
def predict(req: PredictRequest):
    # Forecast next N days using ARIMA
    n_periods = req.params.get('n_periods', 14)
    y = np.array(req.data)
    if arima_model:
        # Refit ARIMA if new data is provided
        model = arima_model.apply(y, refit=True) if len(y) > 30 else arima_model
        forecast_res = model.get_forecast(steps=n_periods)
        forecast = forecast_res.predicted_mean.tolist()
        conf_int = forecast_res.conf_int().values.tolist()
        return {"forecast": forecast, "conf_int": conf_int}
    else:
        return {"error": "ARIMA model not available"}

@app.post('/detect-anomalies')
def detect_anomalies(req: PredictRequest):
    # Use IsolationForest to flag anomalies
    y = np.array(req.data).reshape(-1, 1)
    if anomaly_model:
        preds = anomaly_model.predict(y)
        anomalies = [i for i, v in enumerate(preds) if v == -1]
        return {"anomalies": anomalies}
    else:
        return {"error": "Anomaly model not available"}

@app.post('/explain')
def explain(req: PredictRequest):
    # Feature importance is not meaningful for ARIMA, so return placeholder
    return {
        "feature_importance": [
            {"feature": "lagged_demand", "importance": 1.0}
        ]
    } 