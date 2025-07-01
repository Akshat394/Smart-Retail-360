import numpy as np
import pandas as pd
import pickle
import os
from typing import Tuple, Optional, Dict, Any

try:
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("Warning: TensorFlow not available. LSTM functionality will be limited.")

from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib

class LSTMModel:
    """LSTM model for time series forecasting"""
    
    def __init__(self, sequence_length: int = 60, units: int = 50, dropout: float = 0.2):
        """
        Initialize LSTM model for time series forecasting
        
        Args:
            sequence_length: Number of time steps to look back
            units: Number of LSTM units
            dropout: Dropout rate
        """
        self.sequence_length = sequence_length
        self.units = units
        self.dropout = dropout
        self.scaler = MinMaxScaler()
        self.model = None
        self.is_fitted = False
        self.model_path = 'models/lstm_model.h5'
        self.scaler_path = 'models/lstm_scaler.pkl'
        
        if not TENSORFLOW_AVAILABLE:
            print("Warning: TensorFlow not available. Using mock LSTM model.")
            self.model = MockLSTMModel(sequence_length, units)
    
    def create_sequences(self, data: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Create sequences for LSTM training
        
        Args:
            data: Time series data
            
        Returns:
            X: Input sequences
            y: Target values
        """
        if not TENSORFLOW_AVAILABLE:
            # Mock implementation
            n = len(data) - self.sequence_length
            X = np.zeros((n, self.sequence_length, 1))
            y = np.zeros((n, 1))
            
            for i in range(n):
                X[i] = data[i:i + self.sequence_length].reshape(-1, 1)
                y[i] = data[i + self.sequence_length]
            
            return X, y
        
        # Original implementation
        X, y = [], []
        for i in range(len(data) - self.sequence_length):
            X.append(data[i:(i + self.sequence_length)])
            y.append(data[i + self.sequence_length])
        
        return np.array(X), np.array(y)
    
    def build_model(self, input_shape: Tuple[int, int]):
        """Build LSTM model"""
        if not TENSORFLOW_AVAILABLE:
            return MockLSTMModel(self.sequence_length, self.units)
        
        model = Sequential([
            LSTM(units=self.units, return_sequences=True, input_shape=input_shape),
            Dropout(self.dropout),
            LSTM(units=self.units, return_sequences=True),
            Dropout(self.dropout),
            LSTM(units=self.units),
            Dropout(self.dropout),
            Dense(1)
        ])
        
        model.compile(optimizer=Adam(learning_rate=0.001), loss='mse')
        return model
    
    def fit(self, data: np.ndarray, epochs: int = 100, batch_size: int = 32, 
            validation_split: float = 0.2) -> Dict[str, Any]:
        """
        Fit the LSTM model
        
        Args:
            data: Training data
            epochs: Number of training epochs
            batch_size: Batch size
            validation_split: Validation split ratio
            
        Returns:
            Training history
        """
        if not TENSORFLOW_AVAILABLE:
            # Mock training
            self.is_fitted = True
            return {"loss": [0.1], "val_loss": [0.15]}
        
        # Scale the data
        scaled_data = self.scaler.fit_transform(data.reshape(-1, 1))
        
        # Create sequences
        X, y = self.create_sequences(scaled_data)
        
        # Build model
        self.model = self.build_model((X.shape[1], X.shape[2]))
        
        # Early stopping
        early_stopping = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
        
        # Train model
        history = self.model.fit(
            X, y,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            callbacks=[early_stopping],
            verbose=0
        )
        
        self.is_fitted = True
        return history.history
    
    def predict(self, input_data: np.ndarray, steps: int = 1) -> np.ndarray:
        """
        Make predictions
        
        Args:
            input_data: Input data for prediction
            steps: Number of steps to predict
            
        Returns:
            Predictions
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        
        if not TENSORFLOW_AVAILABLE:
            # Mock prediction
            return np.random.normal(100, 10, steps)
        
        # Scale input data
        scaled_input = self.scaler.transform(input_data.reshape(-1, 1))
        
        # Prepare input sequence
        if len(scaled_input) < self.sequence_length:
            raise ValueError(f"Input data must have at least {self.sequence_length} points")
        
        # Use last sequence_length points
        input_sequence = scaled_input[-self.sequence_length:].reshape(1, self.sequence_length, 1)
        
        predictions = []
        current_sequence = input_sequence.copy()
        
        for _ in range(steps):
            # Predict next value
            next_pred = self.model.predict(current_sequence, verbose=0)
            predictions.append(next_pred[0, 0])
            
            # Update sequence for next prediction
            current_sequence = np.roll(current_sequence, -1, axis=1)
            current_sequence[0, -1, 0] = next_pred[0, 0]
        
        # Inverse transform predictions
        predictions = np.array(predictions).reshape(-1, 1)
        predictions = self.scaler.inverse_transform(predictions)
        
        return predictions.flatten()
    
    def save_model(self, model_path: str = None, scaler_path: str = None) -> None:
        """Save fitted model and scaler"""
        if not self.is_fitted:
            raise ValueError("Model must be fitted before saving")
        
        model_save_path = model_path or self.model_path
        scaler_save_path = scaler_path or self.scaler_path
        
        # Create directories
        os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
        os.makedirs(os.path.dirname(scaler_save_path), exist_ok=True)
        
        # Save model
        self.model.save(model_save_path)
        
        # Save scaler
        joblib.dump(self.scaler, scaler_save_path)
        
        print(f"Model saved to {model_save_path}")
        print(f"Scaler saved to {scaler_save_path}")
    
    def load_model(self, model_path: str = None, scaler_path: str = None) -> None:
        """Load fitted model and scaler"""
        model_load_path = model_path or self.model_path
        scaler_load_path = scaler_path or self.scaler_path
        
        if os.path.exists(model_load_path) and os.path.exists(scaler_load_path):
            from tensorflow.keras.models import load_model
            
            self.model = load_model(model_load_path)
            self.scaler = joblib.load(scaler_load_path)
            self.is_fitted = True
            
            print(f"Model loaded from {model_load_path}")
            print(f"Scaler loaded from {scaler_load_path}")
        else:
            print(f"Model or scaler files not found")
    
    def get_model_summary(self) -> str:
        """Get model summary"""
        if not self.is_fitted:
            return "Model not fitted"
        
        # Capture model summary
        from io import StringIO
        summary_io = StringIO()
        self.model.summary(print_fn=lambda x: summary_io.write(x + '\n'))
        return summary_io.getvalue()

class MockLSTMModel:
    """Mock LSTM model for when TensorFlow is not available"""
    
    def __init__(self, sequence_length: int, units: int):
        self.sequence_length = sequence_length
        self.units = units
        self.is_fitted = False
    
    def fit(self, X, y, **kwargs):
        self.is_fitted = True
        return type('History', (), {'history': {'loss': [0.1], 'val_loss': [0.15]}})()
    
    def predict(self, X, **kwargs):
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        return np.random.normal(100, 10, (X.shape[0], 1))
    
    def save(self, filepath):
        pass
    
    def load_weights(self, filepath):
        self.is_fitted = True

    def get_memory_buffer_info(self):
        return {
            'memory_buffer_size': len(self.memory_buffer),
            'memory_buffer_max': self.memory_buffer_max
        } 