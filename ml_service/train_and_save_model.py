#!/usr/bin/env python3
"""
Advanced ML Model Training Script for SmartRetail360
Demonstrates ensemble model training with ARIMA, LSTM, and Transformer models
"""

import numpy as np
import pandas as pd
import logging
import os
import sys
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import seaborn as sns

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.forecasting import ARIMAModel, LSTMModel, TransformerModel, EnsembleModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def generate_synthetic_retail_data(n_points: int = 1000, seasonality: bool = True, 
                                 trend: bool = True, noise: float = 0.1) -> np.ndarray:
    """
    Generate synthetic retail demand data with realistic patterns
    
    Args:
        n_points: Number of data points
        seasonality: Whether to add seasonal patterns
        trend: Whether to add trend
        noise: Noise level
        
    Returns:
        Synthetic demand data
    """
    logger.info(f"Generating synthetic retail data with {n_points} points")
    
    # Base time series
    t = np.arange(n_points)
    
    # Trend component
    if trend:
        trend_component = 0.001 * t + 100  # Linear trend
    else:
        trend_component = np.ones(n_points) * 100
    
    # Seasonal component (weekly and monthly patterns)
    if seasonality:
        weekly_pattern = 20 * np.sin(2 * np.pi * t / 7)  # Weekly seasonality
        monthly_pattern = 10 * np.sin(2 * np.pi * t / 30)  # Monthly seasonality
        seasonal_component = weekly_pattern + monthly_pattern
    else:
        seasonal_component = np.zeros(n_points)
    
    # Random noise
    noise_component = noise * np.random.normal(0, 1, n_points)
    
    # Combine components
    demand_data = trend_component + seasonal_component + noise_component
    
    # Ensure positive values
    demand_data = np.maximum(demand_data, 10)
    
    logger.info(f"Generated demand data: mean={np.mean(demand_data):.2f}, std={np.std(demand_data):.2f}")
    return demand_data

def train_individual_models(data: np.ndarray, sequence_length: int = 60) -> dict:
    """
    Train individual models and return their performance
    
    Args:
        data: Training data
        sequence_length: Sequence length for neural networks
        
    Returns:
        Dictionary with model performance
    """
    logger.info("Training individual models...")
    
    # Split data
    train_size = int(0.8 * len(data))
    train_data = data[:train_size]
    test_data = data[train_size:]
    
    models = {}
    performance = {}
    
    # Train ARIMA model
    logger.info("Training ARIMA model...")
    try:
        arima_model = ARIMAModel(order=(1, 1, 1))
        arima_model.fit(train_data)
        models['arima'] = arima_model
        
        # Evaluate ARIMA
        predictions, _ = arima_model.predict(steps=len(test_data))
        performance['arima'] = calculate_metrics(test_data, predictions)
        logger.info(f"ARIMA performance: {performance['arima']}")
        
    except Exception as e:
        logger.error(f"ARIMA training failed: {e}")
        performance['arima'] = {'error': str(e)}
    
    # Train LSTM model
    logger.info("Training LSTM model...")
    try:
        lstm_model = LSTMModel(
            sequence_length=sequence_length,
            units=128,
            dropout=0.2,
            learning_rate=0.001,
            bidirectional=True
        )
        lstm_history = lstm_model.fit(
            train_data,
            epochs=50,  # Reduced for demo
            batch_size=32,
            validation_split=0.2,
            verbose=0
        )
        models['lstm'] = lstm_model
        
        # Evaluate LSTM
        predictions = lstm_model.predict(test_data, steps=1)
        performance['lstm'] = calculate_metrics(test_data, predictions)
        logger.info(f"LSTM performance: {performance['lstm']}")
        
    except Exception as e:
        logger.error(f"LSTM training failed: {e}")
        performance['lstm'] = {'error': str(e)}
    
    # Train Transformer model
    logger.info("Training Transformer model...")
    try:
        transformer_model = TransformerModel(
            sequence_length=sequence_length,
            d_model=128,
            n_heads=8,
            n_layers=4,
            dff=512,
            dropout=0.1,
            learning_rate=0.001
        )
        transformer_history = transformer_model.fit(
            train_data,
            epochs=50,  # Reduced for demo
            batch_size=32,
            validation_split=0.2,
            verbose=0
        )
        models['transformer'] = transformer_model
        
        # Evaluate Transformer
        predictions = transformer_model.predict(test_data, steps=1)
        performance['transformer'] = calculate_metrics(test_data, predictions)
        logger.info(f"Transformer performance: {performance['transformer']}")
        
    except Exception as e:
        logger.error(f"Transformer training failed: {e}")
        performance['transformer'] = {'error': str(e)}
    
    return models, performance

def train_ensemble_model(data: np.ndarray, individual_models: dict, 
                        sequence_length: int = 60) -> EnsembleModel:
    """
    Train ensemble model using pre-trained individual models
    
    Args:
        data: Training data
        individual_models: Dictionary of trained individual models
        sequence_length: Sequence length for neural networks
        
    Returns:
        Trained ensemble model
    """
    logger.info("Training ensemble model...")
    
    # Initialize ensemble model
    ensemble_model = EnsembleModel(
        ensemble_method='weighted_average',
        dynamic_weights=True
    )
    
    # Set pre-trained models
    if 'arima' in individual_models:
        ensemble_model.arima_model = individual_models['arima']
        ensemble_model.arima_model.is_fitted = True
    
    if 'lstm' in individual_models:
        ensemble_model.lstm_model = individual_models['lstm']
        ensemble_model.lstm_model.is_fitted = True
    
    if 'transformer' in individual_models:
        ensemble_model.transformer_model = individual_models['transformer']
        ensemble_model.transformer_model.is_fitted = True
    
    # Update models dictionary
    ensemble_model.models = {
        'arima': ensemble_model.arima_model,
        'lstm': ensemble_model.lstm_model,
        'transformer': ensemble_model.transformer_model
    }
    
    # Train ensemble (this will evaluate individual models and update weights)
    train_size = int(0.8 * len(data))
    train_data = data[:train_size]
    val_data = data[train_size:]
    
    if len(val_data) > 0:
        ensemble_model._evaluate_individual_models(val_data)
        if ensemble_model.dynamic_weights:
            ensemble_model._update_weights_dynamically()
    
    ensemble_model.is_fitted = True
    
    logger.info(f"Ensemble model trained with weights: {ensemble_model.get_ensemble_weights()}")
    return ensemble_model

def calculate_metrics(actual: np.ndarray, predicted: np.ndarray) -> dict:
    """
    Calculate performance metrics
    
    Args:
        actual: Actual values
        predicted: Predicted values
        
    Returns:
        Dictionary of metrics
    """
    from sklearn.metrics import mean_squared_error, mean_absolute_error, mean_absolute_percentage_error
    
    # Ensure same length
    min_len = min(len(actual), len(predicted))
    actual = actual[:min_len]
    predicted = predicted[:min_len]
    
    mse = mean_squared_error(actual, predicted)
    mae = mean_absolute_error(actual, predicted)
    mape = mean_absolute_percentage_error(actual, predicted)
    rmse = np.sqrt(mse)
    
    return {
        'mse': mse,
        'mae': mae,
        'mape': mape,
        'rmse': rmse
    }

def save_models(models: dict, ensemble_model: EnsembleModel, base_path: str = 'models'):
    """
    Save all trained models
    
    Args:
        models: Dictionary of individual models
        ensemble_model: Trained ensemble model
        base_path: Base path for saving models
    """
    logger.info(f"Saving models to {base_path}")
    
    # Create base directory
    os.makedirs(base_path, exist_ok=True)
    
    # Save individual models
    for name, model in models.items():
        if model and hasattr(model, 'save_model'):
            model_save_path = os.path.join(base_path, f'{name}_model')
            os.makedirs(model_save_path, exist_ok=True)
            
            try:
                model.save_model(
                    model_path=os.path.join(model_save_path, f'{name}.h5'),
                    scaler_path=os.path.join(model_save_path, f'{name}_scaler.pkl')
                )
                logger.info(f"Saved {name} model")
            except Exception as e:
                logger.error(f"Failed to save {name} model: {e}")
    
    # Save ensemble model
    if ensemble_model:
        try:
            ensemble_model.save_ensemble(os.path.join(base_path, 'ensemble'))
            logger.info("Saved ensemble model")
        except Exception as e:
            logger.error(f"Failed to save ensemble model: {e}")

def plot_results(data: np.ndarray, models: dict, ensemble_model: EnsembleModel, 
                performance: dict, save_path: str = 'training_results.png'):
    """
    Plot training results and model comparisons
    
    Args:
        data: Original data
        models: Dictionary of trained models
        ensemble_model: Trained ensemble model
        performance: Model performance metrics
        save_path: Path to save the plot
    """
    logger.info("Creating visualization plots...")
    
    try:
        # Create subplots
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # Plot 1: Original data
        axes[0, 0].plot(data, label='Original Data', alpha=0.7)
        axes[0, 0].set_title('Synthetic Retail Demand Data')
        axes[0, 0].set_xlabel('Time')
        axes[0, 0].set_ylabel('Demand')
        axes[0, 0].legend()
        axes[0, 0].grid(True, alpha=0.3)
        
        # Plot 2: Model predictions comparison
        test_size = int(0.2 * len(data))
        test_data = data[-test_size:]
        
        axes[0, 1].plot(test_data, label='Actual', linewidth=2)
        
        colors = ['red', 'blue', 'green', 'orange']
        for i, (name, model) in enumerate(models.items()):
            if model and model.is_fitted:
                try:
                    if name == 'arima':
                        pred, _ = model.predict(steps=len(test_data))
                    else:
                        pred = model.predict(test_data, steps=1)
                    
                    axes[0, 1].plot(pred, label=f'{name.upper()} Prediction', 
                                   color=colors[i], alpha=0.7)
                except Exception as e:
                    logger.warning(f"Could not plot {name} predictions: {e}")
        
        # Add ensemble prediction
        if ensemble_model and ensemble_model.is_fitted:
            try:
                ensemble_pred = ensemble_model.predict(test_data, steps=1)
                axes[0, 1].plot(ensemble_pred, label='Ensemble Prediction', 
                               color='purple', linewidth=2)
            except Exception as e:
                logger.warning(f"Could not plot ensemble predictions: {e}")
        
        axes[0, 1].set_title('Model Predictions Comparison')
        axes[0, 1].set_xlabel('Time')
        axes[0, 1].set_ylabel('Demand')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)
        
        # Plot 3: Model performance comparison (MAPE)
        model_names = []
        mape_values = []
        
        for name, perf in performance.items():
            if 'mape' in perf and not isinstance(perf['mape'], str):
                model_names.append(name.upper())
                mape_values.append(perf['mape'])
        
        if mape_values:
            bars = axes[1, 0].bar(model_names, mape_values, color=colors[:len(model_names)])
            axes[1, 0].set_title('Model Performance Comparison (MAPE)')
            axes[1, 0].set_ylabel('MAPE (Lower is Better)')
            axes[1, 0].grid(True, alpha=0.3)
            
            # Add value labels on bars
            for bar, value in zip(bars, mape_values):
                axes[1, 0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.001,
                               f'{value:.4f}', ha='center', va='bottom')
        
        # Plot 4: Ensemble weights
        if ensemble_model and ensemble_model.is_fitted:
            weights = ensemble_model.get_ensemble_weights()
            if weights:
                weight_names = list(weights.keys())
                weight_values = list(weights.values())
                
                bars = axes[1, 1].bar(weight_names, weight_values, color=colors[:len(weight_names)])
                axes[1, 1].set_title('Ensemble Model Weights')
                axes[1, 1].set_ylabel('Weight')
                axes[1, 1].grid(True, alpha=0.3)
                
                # Add value labels on bars
                for bar, value in zip(bars, weight_values):
                    axes[1, 1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                                   f'{value:.3f}', ha='center', va='bottom')
        
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        logger.info(f"Training results plot saved to {save_path}")
        
    except Exception as e:
        logger.error(f"Error creating plots: {e}")

def main():
    """Main training function"""
    logger.info("Starting SmartRetail360 ML Model Training")
    
    # Configuration
    n_points = 1000
    sequence_length = 60
    
    # Generate synthetic data
    data = generate_synthetic_retail_data(
        n_points=n_points,
        seasonality=True,
        trend=True,
        noise=0.1
    )
    
    # Train individual models
    models, performance = train_individual_models(data, sequence_length)
    
    # Train ensemble model
    ensemble_model = train_ensemble_model(data, models, sequence_length)
    
    # Save models
    save_models(models, ensemble_model)
    
    # Create visualizations
    plot_results(data, models, ensemble_model, performance)
    
    # Print summary
    logger.info("\n" + "="*50)
    logger.info("TRAINING SUMMARY")
    logger.info("="*50)
    
    for name, perf in performance.items():
        if 'error' not in perf:
            logger.info(f"{name.upper()}: MAPE={perf['mape']:.4f}, RMSE={perf['rmse']:.4f}")
        else:
            logger.info(f"{name.upper()}: {perf['error']}")
    
    if ensemble_model and ensemble_model.is_fitted:
        weights = ensemble_model.get_ensemble_weights()
        logger.info(f"Ensemble Weights: {weights}")
    
    logger.info("Training completed successfully!")

if __name__ == "__main__":
    main() 