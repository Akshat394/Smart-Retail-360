import numpy as np
import pandas as pd
import pickle
import os
from typing import Tuple, Optional, Dict, Any

try:
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import Dense, Dropout, LayerNormalization, MultiHeadAttention, Input
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping
    from tensorflow.keras import Model
    TENSORFLOW_AVAILABLE = True
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("Warning: TensorFlow not available. Transformer functionality will be limited.")

from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib


class TransformerModel:
    """Transformer model for time series forecasting"""
    
    def __init__(self, sequence_length: int = 60, d_model: int = 128, n_heads: int = 8, 
                 n_layers: int = 4, dropout: float = 0.1):
        """
        Initialize Transformer model for time series forecasting
        
        Args:
            sequence_length: Number of time steps to look back
            d_model: Model dimension
            n_heads: Number of attention heads
            n_layers: Number of transformer layers
            dropout: Dropout rate
        """
        self.sequence_length = sequence_length
        self.d_model = d_model
        self.n_heads = n_heads
        self.n_layers = n_layers
        self.dropout = dropout
        self.scaler = MinMaxScaler()
        self.model = None
        self.is_fitted = False
        
        if not TENSORFLOW_AVAILABLE:
            print("Warning: TensorFlow not available. Using mock Transformer model.")
            self.model = MockTransformerModel(sequence_length, d_model)
    
    def create_sequences(self, data: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Create sequences for Transformer training
        
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
        """Build Transformer model"""
        if not TENSORFLOW_AVAILABLE:
            return MockTransformerModel(self.sequence_length, self.d_model)
        
        inputs = Input(shape=input_shape)
        
        # Project to d_model dimensions
        x = Dense(self.d_model)(inputs)
        x = LayerNormalization()(x)
        
        # Transformer layers
        for _ in range(self.n_layers):
            # Multi-head attention
            attn_output = MultiHeadAttention(
                num_heads=self.n_heads, 
                key_dim=self.d_model // self.n_heads
            )(x, x)
            x = LayerNormalization()(x + attn_output)
            x = Dropout(self.dropout)(x)
            
            # Feed forward
            ff_output = Dense(self.d_model * 4, activation='relu')(x)
            ff_output = Dense(self.d_model)(ff_output)
            x = LayerNormalization()(x + ff_output)
            x = Dropout(self.dropout)(x)
        
        # Global average pooling and output
        x = Dense(1)(x)
        outputs = Dense(1)(x[:, -1, :])  # Take last time step
        
        model = Model(inputs=inputs, outputs=outputs)
        model.compile(optimizer=Adam(learning_rate=0.001), loss='mse')
        
        return model
    
    def fit(self, data: np.ndarray, epochs: int = 100, batch_size: int = 32, 
            validation_split: float = 0.2) -> Dict[str, Any]:
        """
        Fit the Transformer model
        
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
        """Save model and scaler"""
        if model_path is None:
            model_path = 'models/transformer_model.h5'
        if scaler_path is None:
            scaler_path = 'models/transformer_scaler.pkl'
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        if TENSORFLOW_AVAILABLE and self.model is not None:
            self.model.save(model_path)
        
        # Save scaler
        with open(scaler_path, 'wb') as f:
            pickle.dump(self.scaler, f)
    
    def load_model(self, model_path: str = None, scaler_path: str = None) -> None:
        """Load model and scaler"""
        if model_path is None:
            model_path = 'models/transformer_model.h5'
        if scaler_path is None:
            scaler_path = 'models/transformer_scaler.pkl'
        
        if TENSORFLOW_AVAILABLE:
            from tensorflow.keras.models import load_model
            self.model = load_model(model_path)
        
        # Load scaler
        with open(scaler_path, 'rb') as f:
            self.scaler = pickle.load(f)
        
        self.is_fitted = True
    
    def get_model_summary(self) -> str:
        """Get model summary"""
        if not TENSORFLOW_AVAILABLE or self.model is None:
            return "Mock Transformer Model (TensorFlow not available)"
        
        from io import StringIO
        summary_io = StringIO()
        self.model.summary(print_fn=lambda x: summary_io.write(x + '\n'))
        return summary_io.getvalue()
    
    def evaluate(self, test_data: np.ndarray) -> Dict[str, float]:
        """Evaluate model performance"""
        if not self.is_fitted:
            raise ValueError("Model must be fitted before evaluation")
        
        # Create test sequences
        X_test, y_test = self.create_sequences(test_data)
        
        # Make predictions
        y_pred = self.predict(X_test[:, -self.sequence_length:], steps=1)
        
        # Calculate metrics
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        
        return {
            'mse': mse,
            'mae': mae,
            'rmse': rmse
        }


class MockTransformerModel:
    """Mock Transformer model for when TensorFlow is not available"""
    
    def __init__(self, sequence_length: int, d_model: int):
        self.sequence_length = sequence_length
        self.d_model = d_model
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