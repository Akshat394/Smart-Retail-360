import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
from typing import Tuple, List, Dict, Any
import joblib
import os

class ARIMAModel:
    """ARIMA model for time series forecasting"""
    
    def __init__(self, order: Tuple[int, int, int] = (1, 1, 1)):
        self.order = order
        self.model = None
        self.is_fitted = False
        self.model_path = 'models/arima_model.pkl'
        
    def check_stationarity(self, data: np.ndarray) -> Dict[str, Any]:
        """Check if time series is stationary"""
        result = adfuller(data)
        return {
            'adf_statistic': result[0],
            'p_value': result[1],
            'critical_values': result[4],
            'is_stationary': result[1] < 0.05
        }
    
    def fit(self, data: np.ndarray) -> None:
        """Fit ARIMA model to data"""
        try:
            # Check stationarity
            stationarity = self.check_stationarity(data)
            
            # If not stationary, difference the data
            if not stationarity['is_stationary']:
                data = np.diff(data)
            
            # Fit ARIMA model
            self.model = ARIMA(data, order=self.order)
            self.fitted_model = self.model.fit()
            self.is_fitted = True
            
            print(f"ARIMA{self.order} model fitted successfully")
            
        except Exception as e:
            print(f"Error fitting ARIMA model: {e}")
            raise
    
    def predict(self, steps: int = 14) -> Tuple[np.ndarray, np.ndarray]:
        """Make predictions"""
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        
        try:
            forecast = self.fitted_model.forecast(steps=steps)
            conf_int = self.fitted_model.get_forecast(steps=steps).conf_int()
            
            return forecast, conf_int.values
            
        except Exception as e:
            print(f"Error making predictions: {e}")
            raise
    
    def save_model(self, path: str = None) -> None:
        """Save fitted model"""
        if not self.is_fitted:
            raise ValueError("Model must be fitted before saving")
        
        save_path = path or self.model_path
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        
        joblib.dump(self.fitted_model, save_path)
        print(f"Model saved to {save_path}")
    
    def load_model(self, path: str = None) -> None:
        """Load fitted model"""
        load_path = path or self.model_path
        
        if os.path.exists(load_path):
            self.fitted_model = joblib.load(load_path)
            self.is_fitted = True
            print(f"Model loaded from {load_path}")
        else:
            print(f"Model file not found at {load_path}")
    
    def get_model_summary(self) -> str:
        """Get model summary"""
        if not self.is_fitted:
            return "Model not fitted"
        
        return str(self.fitted_model.summary())
    
    def get_aic_bic(self) -> Dict[str, float]:
        """Get AIC and BIC values"""
        if not self.is_fitted:
            return {"aic": None, "bic": None}
        
        return {
            "aic": self.fitted_model.aic,
            "bic": self.fitted_model.bic
        } 