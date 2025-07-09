import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Tuple, Any, Optional
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, mean_absolute_error, mean_absolute_percentage_error

from .arima_model import ARIMAModel
from .lstm_model import LSTMModel
from .transformer_model import TransformerModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnsembleModel:
    """Advanced ensemble model that combines ARIMA, LSTM, and Transformer predictions"""
    
    def __init__(self, 
                 arima_order: Tuple[int, int, int] = (1, 1, 1),
                 lstm_params: Dict[str, Any] = None,
                 transformer_params: Dict[str, Any] = None,
                 ensemble_method: str = 'weighted_average',
                 dynamic_weights: bool = True):
        """
        Initialize ensemble model
        
        Args:
            arima_order: ARIMA model order (p, d, q)
            lstm_params: LSTM model parameters
            transformer_params: Transformer model parameters
            ensemble_method: 'weighted_average', 'linear_regression', or 'voting'
            dynamic_weights: Whether to use dynamic weight adjustment
        """
        self.ensemble_method = ensemble_method
        self.dynamic_weights = dynamic_weights
        self.is_fitted = False
        
        # Initialize individual models
        self.arima_model = ARIMAModel(order=arima_order)
        
        # Default LSTM parameters
        if lstm_params is None:
            lstm_params = {
                'sequence_length': 60,
                'units': 128,
                'dropout': 0.2,
                'learning_rate': 0.001,
                'bidirectional': True
            }
        self.lstm_model = LSTMModel(**lstm_params)
        
        # Default Transformer parameters
        if transformer_params is None:
            transformer_params = {
                'sequence_length': 60,
                'd_model': 128,
                'n_heads': 8,
                'n_layers': 4,
                'dff': 512,
                'dropout': 0.1,
                'learning_rate': 0.001
            }
        self.transformer_model = TransformerModel(**transformer_params)
        
        # Ensemble components
        self.models = {
            'arima': self.arima_model,
            'lstm': self.lstm_model,
            'transformer': self.transformer_model
        }
        
        # Weights for weighted averaging
        self.weights = {'arima': 0.3, 'lstm': 0.35, 'transformer': 0.35}
        
        # Linear regression for ensemble (if method is linear_regression)
        self.ensemble_regressor = None
        
        # Performance tracking
        self.model_performance = {}
        self.history = {}
        
        logger.info(f"Ensemble Model initialized with method: {ensemble_method}")
    
    def fit(self, data: np.ndarray, validation_split: float = 0.2, 
            epochs: int = 100, batch_size: int = 32) -> Dict[str, Any]:
        """
        Fit all individual models and the ensemble
        
        Args:
            data: Training data
            validation_split: Validation split for neural networks
            epochs: Number of epochs for neural networks
            batch_size: Batch size for neural networks
            
        Returns:
            Training history for all models
        """
        logger.info(f"Starting ensemble model training with {len(data)} data points")
        
        # Split data for validation
        split_idx = int(len(data) * (1 - validation_split))
        train_data = data[:split_idx]
        val_data = data[split_idx:]
        
        # Fit ARIMA model
        logger.info("Training ARIMA model...")
        try:
            self.arima_model.fit(train_data)
            arima_history = {'status': 'success'}
        except Exception as e:
            logger.error(f"ARIMA training failed: {e}")
            arima_history = {'status': 'failed', 'error': str(e)}
        
        # Fit LSTM model
        logger.info("Training LSTM model...")
        try:
            lstm_history = self.lstm_model.fit(
                train_data, 
                epochs=epochs, 
                batch_size=batch_size,
                validation_split=validation_split,
                verbose=0
            )
        except Exception as e:
            logger.error(f"LSTM training failed: {e}")
            lstm_history = {'status': 'failed', 'error': str(e)}
        
        # Fit Transformer model
        logger.info("Training Transformer model...")
        try:
            transformer_history = self.transformer_model.fit(
                train_data,
                epochs=epochs,
                batch_size=batch_size,
                validation_split=validation_split,
                verbose=0
            )
        except Exception as e:
            logger.error(f"Transformer training failed: {e}")
            transformer_history = {'status': 'failed', 'error': str(e)}
        
        # Evaluate individual models on validation data
        if len(val_data) > 0:
            self._evaluate_individual_models(val_data)
        
        # Fit ensemble method
        if self.ensemble_method == 'linear_regression':
            self._fit_linear_regression(train_data)
        elif self.ensemble_method == 'weighted_average' and self.dynamic_weights:
            self._update_weights_dynamically()
        
        self.is_fitted = True
        
        # Compile history
        self.history = {
            'arima': arima_history,
            'lstm': lstm_history,
            'transformer': transformer_history,
            'ensemble_method': self.ensemble_method,
            'weights': self.weights
        }
        
        logger.info("Ensemble model training completed")
        return self.history
    
    def _evaluate_individual_models(self, test_data: np.ndarray) -> None:
        """Evaluate individual models and update performance metrics"""
        logger.info("Evaluating individual models...")
        
        for name, model in self.models.items():
            try:
                if model.is_fitted:
                    # Make predictions
                    if name == 'arima':
                        predictions, _ = model.predict(steps=len(test_data))
                    else:
                        predictions = model.predict(test_data, steps=1)
                        # For neural networks, we need to predict step by step
                        all_predictions = []
                        for i in range(len(test_data)):
                            if i >= model.sequence_length:
                                input_seq = test_data[i-model.sequence_length:i]
                                pred = model.predict(input_seq, steps=1)
                                all_predictions.append(pred[0])
                            else:
                                all_predictions.append(test_data[i])
                        predictions = np.array(all_predictions)
                    
                    # Calculate metrics
                    mse = mean_squared_error(test_data, predictions)
                    mae = mean_absolute_error(test_data, predictions)
                    mape = mean_absolute_percentage_error(test_data, predictions)
                    
                    self.model_performance[name] = {
                        'mse': mse,
                        'mae': mae,
                        'mape': mape,
                        'rmse': np.sqrt(mse)
                    }
                    
                    logger.info(f"{name.upper()} - MSE: {mse:.6f}, MAE: {mae:.6f}, MAPE: {mape:.6f}")
                    
            except Exception as e:
                logger.error(f"Error evaluating {name} model: {e}")
                self.model_performance[name] = {'error': str(e)}
    
    def _update_weights_dynamically(self) -> None:
        """Update ensemble weights based on individual model performance"""
        if not self.model_performance:
            return
        
        # Calculate weights based on inverse MAPE (lower MAPE = higher weight)
        total_inverse_mape = 0
        weights = {}
        
        for name, perf in self.model_performance.items():
            if 'mape' in perf and not np.isnan(perf['mape']):
                inverse_mape = 1 / (perf['mape'] + 1e-8)  # Add small epsilon to avoid division by zero
                weights[name] = inverse_mape
                total_inverse_mape += inverse_mape
        
        # Normalize weights
        if total_inverse_mape > 0:
            for name in weights:
                weights[name] /= total_inverse_mape
                self.weights[name] = weights[name]
        
        logger.info(f"Updated ensemble weights: {self.weights}")
    
    def _fit_linear_regression(self, data: np.ndarray) -> None:
        """Fit linear regression ensemble"""
        logger.info("Fitting linear regression ensemble...")
        
        # Generate predictions from all models for training
        predictions = {}
        
        for name, model in self.models.items():
            if model.is_fitted:
                try:
                    if name == 'arima':
                        pred, _ = model.predict(steps=len(data))
                    else:
                        # For neural networks, predict step by step
                        pred = []
                        for i in range(len(data)):
                            if i >= model.sequence_length:
                                input_seq = data[i-model.sequence_length:i]
                                p = model.predict(input_seq, steps=1)
                                pred.append(p[0])
                            else:
                                pred.append(data[i])
                        pred = np.array(pred)
                    
                    predictions[name] = pred
                    
                except Exception as e:
                    logger.error(f"Error getting predictions from {name}: {e}")
        
        if len(predictions) >= 2:
            # Prepare training data for ensemble
            X = np.column_stack(list(predictions.values()))
            y = data
            
            # Fit linear regression
            self.ensemble_regressor = LinearRegression()
            self.ensemble_regressor.fit(X, y)
            
            logger.info("Linear regression ensemble fitted successfully")
        else:
            logger.warning("Not enough models available for linear regression ensemble")
    
    def predict(self, input_data: np.ndarray, steps: int = 1, 
                return_confidence: bool = False) -> np.ndarray:
        """
        Make ensemble predictions
        
        Args:
            input_data: Input data for prediction
            steps: Number of steps to predict
            return_confidence: Whether to return confidence intervals
            
        Returns:
            Ensemble predictions (and confidence intervals if requested)
        """
        if not self.is_fitted:
            raise ValueError("Ensemble model must be fitted before making predictions")
        
        # Get predictions from individual models
        model_predictions = {}
        
        for name, model in self.models.items():
            if model.is_fitted:
                try:
                    if name == 'arima':
                        pred, _ = model.predict(steps=steps)
                    else:
                        pred = model.predict(input_data, steps=steps)
                    
                    model_predictions[name] = pred
                    
                except Exception as e:
                    logger.error(f"Error getting predictions from {name}: {e}")
        
        if not model_predictions:
            raise ValueError("No models available for prediction")
        
        # Combine predictions based on ensemble method
        if self.ensemble_method == 'weighted_average':
            ensemble_pred = self._weighted_average_predictions(model_predictions)
        elif self.ensemble_method == 'linear_regression':
            ensemble_pred = self._linear_regression_predictions(model_predictions)
        elif self.ensemble_method == 'voting':
            ensemble_pred = self._voting_predictions(model_predictions)
        else:
            raise ValueError(f"Unknown ensemble method: {self.ensemble_method}")
        
        if return_confidence:
            confidence_intervals = self._calculate_confidence_intervals(model_predictions)
            return ensemble_pred, confidence_intervals
        
        return ensemble_pred
    
    def _weighted_average_predictions(self, model_predictions: Dict[str, np.ndarray]) -> np.ndarray:
        """Combine predictions using weighted averaging"""
        ensemble_pred = np.zeros_like(list(model_predictions.values())[0])
        
        for name, pred in model_predictions.items():
            weight = self.weights.get(name, 1.0 / len(model_predictions))
            ensemble_pred += weight * pred
        
        return ensemble_pred
    
    def _linear_regression_predictions(self, model_predictions: Dict[str, np.ndarray]) -> np.ndarray:
        """Combine predictions using linear regression"""
        if self.ensemble_regressor is None:
            # Fallback to weighted average
            return self._weighted_average_predictions(model_predictions)
        
        # Prepare input for regression
        X = np.column_stack(list(model_predictions.values()))
        
        # Make prediction
        ensemble_pred = self.ensemble_regressor.predict(X)
        
        return ensemble_pred
    
    def _voting_predictions(self, model_predictions: Dict[str, np.ndarray]) -> np.ndarray:
        """Combine predictions using voting (median)"""
        predictions_array = np.array(list(model_predictions.values()))
        ensemble_pred = np.median(predictions_array, axis=0)
        
        return ensemble_pred
    
    def _calculate_confidence_intervals(self, model_predictions: Dict[str, np.ndarray], 
                                      confidence_level: float = 0.95) -> Tuple[np.ndarray, np.ndarray]:
        """Calculate confidence intervals for ensemble predictions"""
        predictions_array = np.array(list(model_predictions.values()))
        
        # Calculate percentiles
        alpha = 1 - confidence_level
        lower_percentile = (alpha / 2) * 100
        upper_percentile = (1 - alpha / 2) * 100
        
        lower_bound = np.percentile(predictions_array, lower_percentile, axis=0)
        upper_bound = np.percentile(predictions_array, upper_percentile, axis=0)
        
        return lower_bound, upper_bound
    
    def evaluate(self, test_data: np.ndarray) -> Dict[str, float]:
        """Evaluate ensemble model performance"""
        if not self.is_fitted:
            raise ValueError("Ensemble model must be fitted before evaluation")
        
        # Make ensemble predictions
        predictions = self.predict(test_data, steps=1)
        
        # Calculate metrics
        mse = mean_squared_error(test_data, predictions)
        mae = mean_absolute_error(test_data, predictions)
        mape = mean_absolute_percentage_error(test_data, predictions)
        rmse = np.sqrt(mse)
        
        metrics = {
            'mse': mse,
            'mae': mae,
            'mape': mape,
            'rmse': rmse
        }
        
        logger.info(f"Ensemble evaluation - MSE: {mse:.6f}, MAE: {mae:.6f}, MAPE: {mape:.6f}")
        return metrics
    
    def get_model_performance(self) -> Dict[str, Dict[str, float]]:
        """Get performance metrics for all individual models"""
        return self.model_performance
    
    def get_ensemble_weights(self) -> Dict[str, float]:
        """Get current ensemble weights"""
        return self.weights.copy()
    
    def save_ensemble(self, base_path: str = 'models/ensemble') -> None:
        """Save ensemble model and all individual models"""
        import os
        os.makedirs(base_path, exist_ok=True)
        
        # Save individual models
        for name, model in self.models.items():
            if model.is_fitted:
                model_save_path = os.path.join(base_path, f'{name}_model')
                os.makedirs(model_save_path, exist_ok=True)
                
                if hasattr(model, 'save_model'):
                    model.save_model(
                        model_path=os.path.join(model_save_path, f'{name}.h5'),
                        scaler_path=os.path.join(model_save_path, f'{name}_scaler.pkl')
                    )
        
        # Save ensemble configuration
        import joblib
        ensemble_config = {
            'ensemble_method': self.ensemble_method,
            'weights': self.weights,
            'model_performance': self.model_performance,
            'history': self.history
        }
        
        joblib.dump(ensemble_config, os.path.join(base_path, 'ensemble_config.pkl'))
        
        logger.info(f"Ensemble model saved to {base_path}")
    
    def load_ensemble(self, base_path: str = 'models/ensemble') -> None:
        """Load ensemble model and all individual models"""
        import os
        import joblib
        
        # Load ensemble configuration
        config_path = os.path.join(base_path, 'ensemble_config.pkl')
        if os.path.exists(config_path):
            ensemble_config = joblib.load(config_path)
            self.ensemble_method = ensemble_config['ensemble_method']
            self.weights = ensemble_config['weights']
            self.model_performance = ensemble_config['model_performance']
            self.history = ensemble_config['history']
        
        # Load individual models
        for name, model in self.models.items():
            model_save_path = os.path.join(base_path, f'{name}_model')
            if os.path.exists(model_save_path):
                try:
                    if hasattr(model, 'load_model'):
                        model.load_model(
                            model_path=os.path.join(model_save_path, f'{name}.h5'),
                            scaler_path=os.path.join(model_save_path, f'{name}_scaler.pkl')
                        )
                except Exception as e:
                    logger.error(f"Error loading {name} model: {e}")
        
        self.is_fitted = True
        logger.info(f"Ensemble model loaded from {base_path}")
    
    def plot_model_comparison(self, save_path: str = None) -> None:
        """Plot comparison of individual model performances"""
        if not self.model_performance:
            logger.warning("No model performance data available for plotting")
            return
        
        try:
            import matplotlib.pyplot as plt
            
            # Prepare data for plotting
            models = list(self.model_performance.keys())
            metrics = ['mse', 'mae', 'mape']
            
            fig, axes = plt.subplots(1, 3, figsize=(15, 5))
            
            for i, metric in enumerate(metrics):
                values = []
                labels = []
                
                for model in models:
                    if metric in self.model_performance[model] and not np.isnan(self.model_performance[model][metric]):
                        values.append(self.model_performance[model][metric])
                        labels.append(model.upper())
                
                if values:
                    axes[i].bar(labels, values)
                    axes[i].set_title(f'{metric.upper()} Comparison')
                    axes[i].set_ylabel(metric.upper())
                    axes[i].tick_params(axis='x', rotation=45)
            
            plt.tight_layout()
            
            if save_path:
                plt.savefig(save_path, dpi=300, bbox_inches='tight')
                logger.info(f"Model comparison plot saved to {save_path}")
            else:
                plt.show()
                
        except ImportError:
            logger.warning("Matplotlib not available for plotting") 