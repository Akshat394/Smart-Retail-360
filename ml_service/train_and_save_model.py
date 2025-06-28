import numpy as np
import joblib
from sklearn.ensemble import IsolationForest
from statsmodels.tsa.arima.model import ARIMA
import pandas as pd

# Generate synthetic daily order volume data (realistic seasonality + noise)
days = 180
np.random.seed(42)
dates = pd.date_range('2023-01-01', periods=days)
trend = np.linspace(1000, 1200, days)
seasonal = 100 * np.sin(np.linspace(0, 3 * np.pi, days))
noise = np.random.normal(0, 40, days)
order_volume = trend + seasonal + noise

# Train ARIMA for forecasting
arima_model = ARIMA(order_volume, order=(2,1,2)).fit()
joblib.dump(arima_model, 'arima_model.pkl')

# Train IsolationForest for anomaly detection
X = order_volume.reshape(-1, 1)
iso_forest = IsolationForest(contamination=0.05, random_state=42)
iso_forest.fit(X)
joblib.dump(iso_forest, 'anomaly_model.pkl')

print('ARIMA and IsolationForest models trained and saved.') 