from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any
import joblib
import os
import numpy as np

app = FastAPI()

class PredictRequest(BaseModel):
    data: List[float]
    params: Dict[str, Any] = {}

# Try to load the model at startup
MODEL_PATH = 'model.pkl'
model = None
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)

@app.post('/predict')
def predict(req: PredictRequest):
    if model:
        X = np.array(req.data).reshape(-1, 1)
        preds = model.predict(X)
        return {"predictions": preds.tolist()}
    else:
        # Dummy logic: sum of input data
        return {"predictions": [sum(req.data)]}

@app.post('/detect-anomalies')
def detect_anomalies(req: PredictRequest):
    # Dummy logic: flag values > 100 as anomalies
    anomalies = [i for i, v in enumerate(req.data) if v > 100]
    return {"anomalies": anomalies}

@app.post('/explain')
def explain(req: PredictRequest):
    # Dummy feature importance
    return {
        "feature_importance": [
            {"feature": "x", "importance": 1.0}
        ]
    } 