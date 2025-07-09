import numpy as np
import pandas as pd
import pickle
import os
from typing import Tuple, Optional, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from tensorflow.keras.models import Sequential, load_model
    from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
    from tensorflow.keras.regularizers import l2
    TENSORFLOW_AVAILABLE = True
except ImportError as e:
    logger.error(f"TensorFlow import failed: {e}")
    TENSORFLOW_AVAILABLE = False
    raise ImportError("TensorFlow is required for LSTM functionality. Please install tensorflow.")

from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, mean_absolute_percentage_error
import joblib

class LSTMModel:
    """Advanced LSTM model for time series forecasting with real TensorFlow implementation"""
    
    def __init__(self, sequence_length: int = 60, units: int = 128, dropout: float = 0.2, 
                 learning_rate: float = 0.001, bidirectional: bool = True):
        """
        Initialize advanced LSTM model for time series forecasting
        
        Args:
            sequence_length: Number of time steps to look back
            units: Number of LSTM units
            dropout: Dropout rate
            learning_rate: Learning rate for optimizer
            bidirectional: Whether to use bidirectional LSTM
        """
        self.sequence_length = sequence_length
        self.units = units
        self.dropout = dropout
        self.learning_rate = learning_rate
        self.bidirectional = bidirectional
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.model = None
        self.is_fitted = False
        self.model_path = 'models/lstm_model.h5'
        self.scaler_path = 'models/lstm_scaler.pkl'
        self.history = None
        
        # Validate TensorFlow availability
        if not TENSORFLOW_AVAILABLE:
            raise ImportError("TensorFlow is required for LSTM functionality")
        
        logger.info(f"LSTM Model initialized: sequence_length={sequence_length}, units={units}, bidirectional={bidirectional}")
    
    def create_sequences(self, data: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Create sequences for LSTM training with proper validation
        
        Args:
            data: Time series data
            
        Returns:
            X: Input sequences
            y: Target values
        """
        if len(data) < self.sequence_length + 1:
            raise ValueError(f"Data length ({len(data)}) must be at least sequence_length + 1 ({self.sequence_length + 1})")
        
        X, y = [], []
        for i in range(len(data) - self.sequence_length):
            X.append(data[i:(i + self.sequence_length)])
            y.append(data[i + self.sequence_length])
        
        X = np.array(X)
        y = np.array(y)
        
        # Reshape for LSTM: (samples, time_steps, features)
        X = X.reshape((X.shape[0], X.shape[1], 1))
        
        logger.info(f"Created sequences: X shape={X.shape}, y shape={y.shape}")
        return X, y
    
    def build_model(self, input_shape: Tuple[int, int]) -> Sequential:
        """Build advanced LSTM model with multiple layers and regularization"""
        model = Sequential()
        
        # First LSTM layer
        if self.bidirectional:
            model.add(Bidirectional(
                LSTM(units=self.units, return_sequences=True, 
                     kernel_regularizer=l2(0.01), recurrent_regularizer=l2(0.01)),
                input_shape=input_shape
            ))
        else:
            model.add(LSTM(units=self.units, return_sequences=True, 
                          kernel_regularizer=l2(0.01), recurrent_regularizer=l2(0.01),
                          input_shape=input_shape))
        
        model.add(Dropout(self.dropout))
        
        # Second LSTM layer
        if self.bidirectional:
            model.add(Bidirectional(
                LSTM(units=self.units // 2, return_sequences=True,
                     kernel_regularizer=l2(0.01), recurrent_regularizer=l2(0.01))
            ))
        else:
            model.add(LSTM(units=self.units // 2, return_sequences=True,
                          kernel_regularizer=l2(0.01), recurrent_regularizer=l2(0.01)))
        
        model.add(Dropout(self.dropout))
        
        # Third LSTM layer
        if self.bidirectional:
            model.add(Bidirectional(
                LSTM(units=self.units // 4, return_sequences=False,
                     kernel_regularizer=l2(0.01), recurrent_regularizer=l2(0.01))
            ))
        else:
            model.add(LSTM(units=self.units // 4, return_sequences=False,
                          kernel_regularizer=l2(0.01), recurrent_regularizer=l2(0.01)))
        
        model.add(Dropout(self.dropout))
        
        # Dense layers
        model.add(Dense(units=50, activation='relu', kernel_regularizer=l2(0.01)))
        model.add(Dropout(self.dropout / 2))
        model.add(Dense(units=1, activation='linear'))
        
        # Compile model
        optimizer = Adam(learning_rate=self.learning_rate)
        model.compile(optimizer=optimizer, loss='mse', metrics=['mae'])
        
        logger.info("Advanced LSTM model built successfully")
        return model
    
    def fit(self, data: np.ndarray, epochs: int = 100, batch_size: int = 32, 
            validation_split: float = 0.2, verbose: int = 1) -> Dict[str, Any]:
        """
        Fit the LSTM model with advanced training features
        
        Args:
            data: Training data
            epochs: Number of training epochs
            batch_size: Batch size
            validation_split: Validation split ratio
            verbose: Verbosity level
            
        Returns:
            Training history
        """
        logger.info(f"Starting LSTM model training with {len(data)} data points")
        
        # Scale the data
        scaled_data = self.scaler.fit_transform(data.reshape(-1, 1))
        
        # Create sequences
        X, y = self.create_sequences(scaled_data)
        
        # Build model
        self.model = self.build_model((X.shape[1], X.shape[2]))
        
        # Callbacks
        callbacks = [
            EarlyStopping(
                monitor='val_loss',
                patience=15,
                restore_best_weights=True,
                verbose=1
            ),
            ModelCheckpoint(
                filepath=self.model_path,
                monitor='val_loss',
                save_best_only=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.5,
                patience=10,
                min_lr=1e-7,
                verbose=1
            )
        ]
        
        # Train model
        logger.info("Training LSTM model...")
        history = self.model.fit(
            X, y,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            callbacks=callbacks,
            verbose=verbose,
            shuffle=True
        )
        
        self.is_fitted = True
        self.history = history.history
        
        # Log training results
        final_loss = history.history['loss'][-1]
        final_val_loss = history.history['val_loss'][-1]
        logger.info(f"Training completed - Final loss: {final_loss:.6f}, Val loss: {final_val_loss:.6f}")
        
        return history.history
    
    def predict(self, input_data: np.ndarray, steps: int = 1, return_confidence: bool = False) -> np.ndarray:
        """
        Make predictions with confidence intervals
        
        Args:
            input_data: Input data for prediction
            steps: Number of steps to predict
            return_confidence: Whether to return confidence intervals
            
        Returns:
            Predictions (and confidence intervals if requested)
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        
        if len(input_data) < self.sequence_length:
            raise ValueError(f"Input data must have at least {self.sequence_length} points")
        
        # Scale input data
        scaled_input = self.scaler.transform(input_data.reshape(-1, 1))
        
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
        
        if return_confidence:
            # Calculate confidence intervals using Monte Carlo dropout
            confidence_intervals = self._calculate_confidence_intervals(input_sequence, steps)
            return predictions.flatten(), confidence_intervals
        
        return predictions.flatten()
    
    def _calculate_confidence_intervals(self, input_sequence: np.ndarray, steps: int, 
                                      n_samples: int = 100) -> Tuple[np.ndarray, np.ndarray]:
        """Calculate confidence intervals using Monte Carlo dropout"""
        predictions_samples = []
        
        for _ in range(n_samples):
            pred = self.model.predict(input_sequence, verbose=0)
            predictions_samples.append(pred[0, 0])
        
        predictions_samples = np.array(predictions_samples)
        mean_pred = np.mean(predictions_samples)
        std_pred = np.std(predictions_samples)
        
        # 95% confidence interval
        lower_bound = mean_pred - 1.96 * std_pred
        upper_bound = mean_pred + 1.96 * std_pred
        
        return np.array([lower_bound, upper_bound])
    
    def evaluate(self, test_data: np.ndarray) -> Dict[str, float]:
        """Evaluate model performance with multiple metrics"""
        if not self.is_fitted:
            raise ValueError("Model must be fitted before evaluation")
        
        # Create test sequences
        X_test, y_test = self.create_sequences(test_data)
        
        # Make predictions
        y_pred = self.predict(X_test[:, -self.sequence_length:], steps=1)
        
        # Calculate metrics
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        mape = mean_absolute_percentage_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        
        metrics = {
            'mse': mse,
            'mae': mae,
            'mape': mape,
            'rmse': rmse
        }
        
        logger.info(f"Model evaluation - MSE: {mse:.6f}, MAE: {mae:.6f}, MAPE: {mape:.6f}")
        return metrics
    
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
        
        logger.info(f"Model saved to {model_save_path}")
        logger.info(f"Scaler saved to {scaler_save_path}")
    
    def load_model(self, model_path: str = None, scaler_path: str = None) -> None:
        """Load fitted model and scaler"""
        model_load_path = model_path or self.model_path
        scaler_load_path = scaler_path or self.scaler_path
        
        if os.path.exists(model_load_path) and os.path.exists(scaler_load_path):
            self.model = load_model(model_load_path)
            self.scaler = joblib.load(scaler_load_path)
            self.is_fitted = True
            
            logger.info(f"Model loaded from {model_load_path}")
            logger.info(f"Scaler loaded from {scaler_load_path}")
        else:
            raise FileNotFoundError(f"Model or scaler files not found at {model_load_path} or {scaler_load_path}")
    
    def get_model_summary(self) -> str:
        """Get model summary"""
        if not self.is_fitted:
            return "Model not fitted"
        
        # Capture model summary
        from io import StringIO
        summary_io = StringIO()
        self.model.summary(print_fn=lambda x: summary_io.write(x + '\n'))
        return summary_io.getvalue()
    
    def get_training_history(self) -> Dict[str, Any]:
        """Get training history"""
        if not self.is_fitted or self.history is None:
            return {}
        
        return self.history
    
    def plot_training_history(self, save_path: str = None) -> None:
        """Plot training history"""
        if not self.is_fitted or self.history is None:
            logger.warning("No training history available for plotting")
            return
        
        try:
            import matplotlib.pyplot as plt
            
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))
            
            # Plot loss
            ax1.plot(self.history['loss'], label='Training Loss')
            ax1.plot(self.history['val_loss'], label='Validation Loss')
            ax1.set_title('Model Loss')
            ax1.set_xlabel('Epoch')
            ax1.set_ylabel('Loss')
            ax1.legend()
            ax1.grid(True)
            
            # Plot MAE
            if 'mae' in self.history:
                ax2.plot(self.history['mae'], label='Training MAE')
                ax2.plot(self.history['val_mae'], label='Validation MAE')
                ax2.set_title('Model MAE')
                ax2.set_xlabel('Epoch')
                ax2.set_ylabel('MAE')
                ax2.legend()
                ax2.grid(True)
            
            plt.tight_layout()
            
            if save_path:
                plt.savefig(save_path, dpi=300, bbox_inches='tight')
                logger.info(f"Training history plot saved to {save_path}")
            else:
                plt.show()
                
        except ImportError:
            logger.warning("Matplotlib not available for plotting") 