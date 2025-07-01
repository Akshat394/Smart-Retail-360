#!/usr/bin/env python3
"""
ML Model Tests for SmartRetail360
Tests for forecasting, anomaly detection, and other ML models
"""

import unittest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import tempfile
import os
import sys
import pytest
from unittest.mock import Mock, patch

# Add the ml_service directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'ml_service'))

# Now import the models
from models.forecasting.arima_model import ARIMAModel
from models.forecasting.lstm_model import LSTMModel
from models.forecasting.transformer_model import TransformerModel

class TestARIMAModel(unittest.TestCase):
    """Test ARIMA forecasting model"""
    
    def setUp(self):
        """Set up test data"""
        # Generate synthetic time series data
        np.random.seed(42)
        dates = pd.date_range(start='2023-01-01', end='2023-12-31', freq='D')
        trend = np.linspace(100, 150, len(dates))
        seasonal = 10 * np.sin(2 * np.pi * np.arange(len(dates)) / 365)
        noise = np.random.normal(0, 5, len(dates))
        self.test_data = trend + seasonal + noise
        
        self.model = ARIMAModel(order=(1, 1, 1))
    
    def test_model_initialization(self):
        """Test model initialization"""
        self.assertEqual(self.model.order, (1, 1, 1))
        self.assertFalse(self.model.is_fitted)
        self.assertIsNone(self.model.model)
    
    def test_stationarity_check(self):
        """Test stationarity checking"""
        result = self.model.check_stationarity(self.test_data)
        
        self.assertIn('adf_statistic', result)
        self.assertIn('p_value', result)
        self.assertIn('critical_values', result)
        self.assertIn('is_stationary', result)
        self.assertIsInstance(result['is_stationary'], bool)
    
    def test_model_fitting(self):
        """Test model fitting"""
        self.model.fit(self.test_data)
        
        self.assertTrue(self.model.is_fitted)
        self.assertIsNotNone(self.model.fitted_model)
    
    def test_prediction(self):
        """Test model prediction"""
        self.model.fit(self.test_data)
        forecast, conf_int = self.model.predict(steps=14)
        
        self.assertEqual(len(forecast), 14)
        self.assertEqual(len(conf_int), 14)
        self.assertIsInstance(forecast, np.ndarray)
        self.assertIsInstance(conf_int, np.ndarray)
    
    def test_model_saving_and_loading(self):
        """Test model saving and loading"""
        self.model.fit(self.test_data)
        
        with tempfile.TemporaryDirectory() as temp_dir:
            model_path = os.path.join(temp_dir, 'test_arima_model.pkl')
            
            # Save model
            self.model.save_model(model_path)
            self.assertTrue(os.path.exists(model_path))
            
            # Load model
            new_model = ARIMAModel()
            new_model.load_model(model_path)
            
            self.assertTrue(new_model.is_fitted)
            self.assertIsNotNone(new_model.fitted_model)
    
    def test_model_summary(self):
        """Test model summary generation"""
        self.model.fit(self.test_data)
        summary = self.model.get_model_summary()
        
        self.assertIsInstance(summary, str)
        self.assertGreater(len(summary), 0)
    
    def test_aic_bic_values(self):
        """Test AIC and BIC values"""
        self.model.fit(self.test_data)
        metrics = self.model.get_aic_bic()
        
        self.assertIn('aic', metrics)
        self.assertIn('bic', metrics)
        self.assertIsInstance(metrics['aic'], float)
        self.assertIsInstance(metrics['bic'], float)

class TestLSTMModel(unittest.TestCase):
    """Test LSTM forecasting model"""
    
    def setUp(self):
        """Set up test data"""
        # Generate synthetic time series data
        np.random.seed(42)
        dates = pd.date_range(start='2023-01-01', end='2023-12-31', freq='D')
        trend = np.linspace(100, 150, len(dates))
        seasonal = 10 * np.sin(2 * np.pi * np.arange(len(dates)) / 365)
        noise = np.random.normal(0, 5, len(dates))
        self.test_data = trend + seasonal + noise
        
        self.model = LSTMModel(sequence_length=60, units=50)
    
    def test_model_initialization(self):
        """Test model initialization"""
        self.assertEqual(self.model.sequence_length, 60)
        self.assertEqual(self.model.units, 50)
        self.assertFalse(self.model.is_fitted)
        self.assertIsNone(self.model.model)
    
    def test_sequence_creation(self):
        """Test sequence creation for LSTM"""
        X, y = self.model.create_sequences(self.test_data)
        
        self.assertEqual(X.shape[0], y.shape[0])
        self.assertEqual(X.shape[1], self.model.sequence_length)
        self.assertEqual(X.shape[2], 1)
        self.assertEqual(y.shape[1], 1)
    
    def test_model_fitting(self):
        """Test model fitting"""
        # Use smaller dataset and fewer epochs for testing
        test_data_small = self.test_data[:200]
        self.model.fit(test_data_small, epochs=5, batch_size=16)
        
        self.assertTrue(self.model.is_fitted)
        self.assertIsNotNone(self.model.model)
    
    def test_prediction(self):
        """Test model prediction"""
        # Use smaller dataset for testing
        test_data_small = self.test_data[:200]
        self.model.fit(test_data_small, epochs=5, batch_size=16)
        
        # Use last 60 points for prediction
        input_data = test_data_small[-60:]
        predictions = self.model.predict(input_data, steps=14)
        
        self.assertEqual(len(predictions), 14)
        self.assertIsInstance(predictions, np.ndarray)
    
    def test_model_saving_and_loading(self):
        """Test model saving and loading"""
        test_data_small = self.test_data[:200]
        self.model.fit(test_data_small, epochs=5, batch_size=16)
        
        with tempfile.TemporaryDirectory() as temp_dir:
            model_path = os.path.join(temp_dir, 'test_lstm_model.h5')
            scaler_path = os.path.join(temp_dir, 'test_lstm_scaler.pkl')
            
            # Save model
            self.model.save_model(model_path, scaler_path)
            self.assertTrue(os.path.exists(model_path))
            self.assertTrue(os.path.exists(scaler_path))
            
            # Load model
            new_model = LSTMModel()
            new_model.load_model(model_path, scaler_path)
            
            self.assertTrue(new_model.is_fitted)
            self.assertIsNotNone(new_model.model)
    
    def test_buffer_status(self):
        """Test buffer status"""
        status = self.model.get_buffer_status()
        
        self.assertIn('memory_buffer_size', status)
        self.assertIn('memory_buffer_max', status)
        self.assertIsInstance(status['memory_buffer_size'], int)
        self.assertIsInstance(status['memory_buffer_max'], int)

class TestTransformerModel(unittest.TestCase):
    """Test Transformer forecasting model"""
    
    def setUp(self):
        """Set up test data"""
        # Generate synthetic time series data
        np.random.seed(42)
        dates = pd.date_range(start='2023-01-01', end='2023-12-31', freq='D')
        trend = np.linspace(100, 150, len(dates))
        seasonal = 10 * np.sin(2 * np.pi * np.arange(len(dates)) / 365)
        noise = np.random.normal(0, 5, len(dates))
        self.test_data = trend + seasonal + noise
        
        self.model = TransformerModel(sequence_length=60, d_model=128)
    
    def test_model_initialization(self):
        """Test model initialization"""
        self.assertEqual(self.model.sequence_length, 60)
        self.assertEqual(self.model.d_model, 128)
        self.assertFalse(self.model.is_fitted)
        self.assertIsNone(self.model.model)
    
    def test_model_fitting(self):
        """Test model fitting"""
        # Use smaller dataset and fewer epochs for testing
        test_data_small = self.test_data[:200]
        self.model.fit(test_data_small, epochs=5, batch_size=16)
        
        self.assertTrue(self.model.is_fitted)
        self.assertIsNotNone(self.model.model)
    
    def test_prediction(self):
        """Test model prediction"""
        # Use smaller dataset for testing
        test_data_small = self.test_data[:200]
        self.model.fit(test_data_small, epochs=5, batch_size=16)
        
        # Use last 60 points for prediction
        input_data = test_data_small[-60:]
        predictions = self.model.predict(input_data, steps=14)
        
        self.assertEqual(len(predictions), 14)
        self.assertIsInstance(predictions, np.ndarray)
    
    def test_model_saving_and_loading(self):
        """Test model saving and loading"""
        test_data_small = self.test_data[:200]
        self.model.fit(test_data_small, epochs=5, batch_size=16)
        
        with tempfile.TemporaryDirectory() as temp_dir:
            model_path = os.path.join(temp_dir, 'test_transformer_model.pth')
            scaler_path = os.path.join(temp_dir, 'test_transformer_scaler.pkl')
            
            # Save model
            self.model.save_model(model_path, scaler_path)
            self.assertTrue(os.path.exists(model_path))
            self.assertTrue(os.path.exists(scaler_path))
            
            # Load model
            new_model = TransformerModel()
            new_model.load_model(model_path, scaler_path)
            
            self.assertTrue(new_model.is_fitted)
            self.assertIsNotNone(new_model.model)

class TestAnomalyDetection(unittest.TestCase):
    """Test anomaly detection functionality"""
    
    def setUp(self):
        """Set up test data"""
        np.random.seed(42)
        # Generate normal data
        self.normal_data = np.random.normal(100, 10, 1000)
        
        # Add some anomalies
        self.anomaly_data = self.normal_data.copy()
        self.anomaly_data[500] = 200  # Spike anomaly
        self.anomaly_data[750] = 50   # Drop anomaly
    
    def test_anomaly_detection_basic(self):
        """Test basic anomaly detection"""
        from ml_service.advanced_models import detect_anomalies
        
        anomalies = detect_anomalies(self.anomaly_data)
        
        self.assertIsInstance(anomalies, list)
        self.assertGreater(len(anomalies), 0)
        
        # Check if known anomalies are detected
        detected_indices = [anomaly['index'] for anomaly in anomalies]
        self.assertIn(500, detected_indices)
        self.assertIn(750, detected_indices)
    
    def test_anomaly_detection_threshold(self):
        """Test anomaly detection with different thresholds"""
        from ml_service.advanced_models import detect_anomalies
        
        # Test with different thresholds
        anomalies_low = detect_anomalies(self.anomaly_data, threshold=2.0)
        anomalies_high = detect_anomalies(self.anomaly_data, threshold=4.0)
        
        # Lower threshold should detect more anomalies
        self.assertGreaterEqual(len(anomalies_low), len(anomalies_high))

class TestDemandForecasting(unittest.TestCase):
    """Test demand forecasting functionality"""
    
    def setUp(self):
        """Set up test data"""
        np.random.seed(42)
        dates = pd.date_range(start='2023-01-01', end='2023-12-31', freq='D')
        trend = np.linspace(100, 150, len(dates))
        seasonal = 20 * np.sin(2 * np.pi * np.arange(len(dates)) / 365)
        noise = np.random.normal(0, 10, len(dates))
        self.demand_data = trend + seasonal + noise
    
    def test_arima_forecasting(self):
        """Test ARIMA demand forecasting"""
        model = ARIMAModel(order=(1, 1, 1))
        model.fit(self.demand_data)
        forecast, conf_int = model.predict(steps=30)
        
        self.assertEqual(len(forecast), 30)
        self.assertEqual(len(conf_int), 30)
        
        # Check if forecast values are reasonable
        self.assertTrue(np.all(forecast > 0))
        self.assertTrue(np.all(forecast < 200))
    
    def test_lstm_forecasting(self):
        """Test LSTM demand forecasting"""
        model = LSTMModel(sequence_length=60, units=50)
        model.fit(self.demand_data[:200], epochs=5, batch_size=16)
        
        input_data = self.demand_data[140:200]  # Last 60 points
        forecast = model.predict(input_data, steps=30)
        
        self.assertEqual(len(forecast), 30)
        self.assertTrue(np.all(forecast > 0))
    
    def test_transformer_forecasting(self):
        """Test Transformer demand forecasting"""
        model = TransformerModel(sequence_length=60, d_model=128)
        model.fit(self.demand_data[:200], epochs=5, batch_size=16)
        
        input_data = self.demand_data[140:200]  # Last 60 points
        forecast = model.predict(input_data, steps=30)
        
        self.assertEqual(len(forecast), 30)
        self.assertTrue(np.all(forecast > 0))

class TestModelPerformance(unittest.TestCase):
    """Test model performance metrics"""
    
    def setUp(self):
        """Set up test data"""
        np.random.seed(42)
        self.test_data = np.random.normal(100, 10, 1000)
    
    def test_arima_performance(self):
        """Test ARIMA model performance"""
        model = ARIMAModel(order=(1, 1, 1))
        model.fit(self.test_data)
        
        metrics = model.get_aic_bic()
        
        self.assertIsInstance(metrics['aic'], float)
        self.assertIsInstance(metrics['bic'], float)
        self.assertGreater(metrics['aic'], 0)
        self.assertGreater(metrics['bic'], 0)
    
    def test_model_comparison(self):
        """Test comparison between different models"""
        # Test data
        test_data = self.test_data[:200]
        
        # ARIMA model
        arima_model = ARIMAModel(order=(1, 1, 1))
        arima_model.fit(test_data)
        arima_metrics = arima_model.get_aic_bic()
        
        # LSTM model (simplified for testing)
        lstm_model = LSTMModel(sequence_length=30, units=20)
        lstm_model.fit(test_data, epochs=3, batch_size=16)
        
        # Both models should be fitted
        self.assertTrue(arima_model.is_fitted)
        self.assertTrue(lstm_model.is_fitted)
        
        # ARIMA should have AIC/BIC metrics
        self.assertIn('aic', arima_metrics)
        self.assertIn('bic', arima_metrics)

class TestDataPreprocessing(unittest.TestCase):
    """Test data preprocessing functionality"""
    
    def setUp(self):
        """Set up test data"""
        np.random.seed(42)
        self.raw_data = np.random.normal(100, 10, 1000)
    
    def test_data_scaling(self):
        """Test data scaling"""
        from sklearn.preprocessing import MinMaxScaler
        
        scaler = MinMaxScaler()
        scaled_data = scaler.fit_transform(self.raw_data.reshape(-1, 1))
        
        self.assertEqual(scaled_data.shape, (1000, 1))
        self.assertTrue(np.all(scaled_data >= 0))
        self.assertTrue(np.all(scaled_data <= 1))
    
    def test_data_normalization(self):
        """Test data normalization"""
        from sklearn.preprocessing import StandardScaler
        
        scaler = StandardScaler()
        normalized_data = scaler.fit_transform(self.raw_data.reshape(-1, 1))
        
        self.assertEqual(normalized_data.shape, (1000, 1))
        self.assertAlmostEqual(np.mean(normalized_data), 0, places=1)
        self.assertAlmostEqual(np.std(normalized_data), 1, places=1)

if __name__ == '__main__':
    # Run tests
    unittest.main(verbosity=2) 