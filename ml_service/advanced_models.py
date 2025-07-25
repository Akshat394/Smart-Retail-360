import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
import joblib
import json
from datetime import datetime, timedelta
import requests
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')

# Mock imports for demonstration (in real implementation, these would be actual libraries)
class MockTransformer:
    """Mock Transformer model for demand forecasting"""
    def __init__(self, sequence_length: int = 30, prediction_length: int = 7):
        self.sequence_length = sequence_length
        self.prediction_length = prediction_length
        self.scaler = StandardScaler()
        self.is_fitted = False
        
    def fit(self, data: np.ndarray):
        """Fit the transformer model"""
        # Mock fitting process
        self.scaler.fit(data.reshape(-1, 1))
        self.is_fitted = True
        return self
        
    def predict(self, data: np.ndarray) -> np.ndarray:
        """Predict future demand"""
        if not self.is_fitted:
            raise ValueError("Model must be fitted before prediction")
        
        # Mock transformer prediction with attention mechanism simulation
        scaled_data = self.scaler.transform(data.reshape(-1, 1))
        
        # Simulate transformer attention and prediction
        # In real implementation, this would use actual transformer architecture
        attention_weights = np.softmax(np.random.randn(self.sequence_length, self.sequence_length), axis=1)
        context_vector = np.dot(attention_weights, scaled_data.flatten())
        
        # Generate predictions with trend and seasonality
        predictions = []
        for i in range(self.prediction_length):
            # Add trend component
            trend = 0.1 * (i + 1)
            # Add seasonality (weekly pattern)
            seasonality = 0.2 * np.sin(2 * np.pi * (i % 7) / 7)
            # Add noise
            noise = np.random.normal(0, 0.05)
            
            pred = context_vector[-1] + trend + seasonality + noise
            predictions.append(pred)
            
        # Inverse transform
        predictions = np.array(predictions).reshape(-1, 1)
        return self.scaler.inverse_transform(predictions).flatten()

class MockYOLO:
    """Mock YOLO model for warehouse vision monitoring"""
    def __init__(self, model_size: str = 'nano'):
        self.model_size = model_size
        self.classes = ['robot', 'shelf', 'product', 'obstacle', 'person']
        self.confidence_threshold = 0.5
        
    def detect(self, image_data: np.ndarray) -> List[Dict[str, Any]]:
        """Detect objects in warehouse image"""
        # Mock YOLO detection
        detections = []
        
        # Simulate robot detection
        if np.random.random() > 0.3:
            detections.append({
                'class': 'robot',
                'confidence': 0.95,
                'bbox': [100, 150, 200, 250],
                'status': 'active' if np.random.random() > 0.2 else 'idle'
            })
            
        # Simulate shelf detection
        for i in range(np.random.randint(3, 8)):
            detections.append({
                'class': 'shelf',
                'confidence': 0.88 + np.random.random() * 0.1,
                'bbox': [50 + i*100, 100, 150 + i*100, 300],
                'occupancy': np.random.random() * 100
            })
            
        # Simulate obstacle detection
        if np.random.random() > 0.7:
            detections.append({
                'class': 'obstacle',
                'confidence': 0.82,
                'bbox': [300, 200, 350, 250],
                'severity': 'high' if np.random.random() > 0.5 else 'medium'
            })
            
        return [d for d in detections if d['confidence'] > self.confidence_threshold]
    
    def analyze_congestion(self, detections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze warehouse congestion from detections"""
        robots = [d for d in detections if d['class'] == 'robot']
        obstacles = [d for d in detections if d['class'] == 'obstacle']
        shelves = [d for d in detections if d['class'] == 'shelf']
        
        congestion_score = 0.0
        issues = []
        
        # Calculate congestion based on robot density
        if len(robots) > 2:
            congestion_score += 0.3
            issues.append("High robot density detected")
            
        # Check for obstacles
        if obstacles:
            congestion_score += 0.4
            issues.append(f"{len(obstacles)} obstacles detected")
            
        # Check shelf occupancy
        avg_occupancy = np.mean([s['occupancy'] for s in shelves]) if shelves else 0
        if avg_occupancy > 80:
            congestion_score += 0.3
            issues.append("High shelf occupancy")
            
        return {
            'congestion_score': min(congestion_score, 1.0),
            'issues': issues,
            'robot_count': len(robots),
            'obstacle_count': len(obstacles),
            'avg_shelf_occupancy': avg_occupancy
        }

class MockDQN:
    """Mock Deep Q-Network for route optimization"""
    def __init__(self, state_size: int, action_size: int):
        self.state_size = state_size
        self.action_size = action_size
        self.epsilon = 0.1  # Exploration rate
        self.learning_rate = 0.001
        self.memory = []
        self.max_memory = 10000
        
    def get_action(self, state: np.ndarray) -> int:
        """Get action using epsilon-greedy policy"""
        if np.random.random() < self.epsilon:
            return np.random.randint(0, self.action_size)
        else:
            # Mock Q-value prediction
            q_values = np.random.randn(self.action_size)
            return np.argmax(q_values)
    
    def remember(self, state: np.ndarray, action: int, reward: float, next_state: np.ndarray, done: bool):
        """Store experience in replay memory"""
        self.memory.append((state, action, reward, next_state, done))
        if len(self.memory) > self.max_memory:
            self.memory.pop(0)
    
    def train(self, batch_size: int = 32):
        """Train the DQN model"""
        if len(self.memory) < batch_size:
            return
            
        # Sample batch from memory
        batch = np.random.choice(len(self.memory), batch_size, replace=False)
        
        # Mock training process
        for idx in batch:
            state, action, reward, next_state, done = self.memory[idx]
            # In real implementation, this would update Q-values using neural network
            
        # Decay epsilon
        self.epsilon = max(0.01, self.epsilon * 0.995)
    
    def calculate_reward(self, route_info: Dict[str, Any]) -> float:
        """Calculate reward for route optimization"""
        # Reward based on multiple factors
        time_factor = 1.0 / (route_info.get('time', 1) + 1)
        cost_factor = 1.0 / (route_info.get('cost', 1) + 1)
        co2_factor = 1.0 / (route_info.get('co2', 1) + 1)
        priority_factor = route_info.get('priority', 1)
        
        reward = (time_factor * 0.3 + cost_factor * 0.3 + co2_factor * 0.2 + priority_factor * 0.2)
        return reward

class MockSentimentAnalyzer:
    """Mock NLP sentiment analysis for customer feedback"""
    def __init__(self):
        self.sentiment_model = None
        self.keywords = {
            'positive': ['great', 'excellent', 'fast', 'good', 'satisfied', 'happy', 'love'],
            'negative': ['bad', 'slow', 'terrible', 'awful', 'disappointed', 'hate', 'worst'],
            'neutral': ['okay', 'fine', 'average', 'normal', 'standard']
        }
        
    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of customer feedback"""
        text_lower = text.lower()
        
        # Count keyword occurrences
        positive_count = sum(1 for word in self.keywords['positive'] if word in text_lower)
        negative_count = sum(1 for word in self.keywords['negative'] if word in text_lower)
        neutral_count = sum(1 for word in self.keywords['neutral'] if word in text_lower)
        
        # Calculate sentiment score
        total_words = len(text.split())
        if total_words == 0:
            return {'sentiment': 'neutral', 'score': 0.5, 'confidence': 0.0}
            
        positive_score = positive_count / total_words
        negative_score = negative_count / total_words
        neutral_score = neutral_count / total_words
        
        # Determine sentiment
        if positive_score > negative_score and positive_score > neutral_score:
            sentiment = 'positive'
            score = positive_score
        elif negative_score > positive_score and negative_score > neutral_score:
            sentiment = 'negative'
            score = negative_score
        else:
            sentiment = 'neutral'
            score = neutral_score
            
        # Calculate confidence
        confidence = max(positive_score, negative_score, neutral_score)
        
        # Extract key topics
        topics = self.extract_topics(text)
        
        return {
            'sentiment': sentiment,
            'score': score,
            'confidence': confidence,
            'topics': topics,
            'word_counts': {
                'positive': positive_count,
                'negative': negative_count,
                'neutral': neutral_count
            }
        }
    
    def extract_topics(self, text: str) -> List[str]:
        """Extract key topics from feedback"""
        topics = []
        text_lower = text.lower()
        
        # Topic keywords
        topic_keywords = {
            'delivery': ['delivery', 'shipping', 'arrived', 'package'],
            'service': ['service', 'support', 'help', 'assistant'],
            'quality': ['quality', 'product', 'item', 'goods'],
            'price': ['price', 'cost', 'expensive', 'cheap', 'value'],
            'speed': ['fast', 'slow', 'quick', 'delay', 'time']
        }
        
        for topic, keywords in topic_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                topics.append(topic)
                
        return topics

class AdvancedMLService:
    """Main service class for advanced ML models"""
    
    def __init__(self):
        self.demand_forecaster = MockTransformer(sequence_length=30, prediction_length=7)
        self.vision_model = MockYOLO(model_size='nano')
        self.route_optimizer = MockDQN(state_size=10, action_size=5)
        self.sentiment_analyzer = MockSentimentAnalyzer()
        
        # Load or initialize models
        self.initialize_models()
    
    def initialize_models(self):
        """Initialize all ML models"""
        try:
            # Load pre-trained models if available
            self.demand_forecaster = joblib.load('models/demand_forecaster.pkl')
        except:
            # Train new model if not available
            self.train_demand_forecaster()
    
    def train_demand_forecaster(self):
        """Train the demand forecasting model"""
        # Generate synthetic demand data
        dates = pd.date_range(start='2023-01-01', end='2024-01-01', freq='D')
        np.random.seed(42)
        
        # Create realistic demand patterns with trend, seasonality, and noise
        trend = np.linspace(100, 150, len(dates))
        seasonality = 20 * np.sin(2 * np.pi * np.arange(len(dates)) / 365)  # Annual seasonality
        weekly_pattern = 10 * np.sin(2 * np.pi * np.arange(len(dates)) / 7)  # Weekly pattern
        noise = np.random.normal(0, 5, len(dates))
        
        demand = trend + seasonality + weekly_pattern + noise
        demand = np.maximum(demand, 0)  # Ensure non-negative demand
        
        # Prepare sequences for training
        sequence_length = 30
        X, y = [], []
        
        for i in range(sequence_length, len(demand) - 7):
            X.append(demand[i-sequence_length:i])
            y.append(demand[i:i+7])
        
        X = np.array(X)
        y = np.array(y)
        
        # Train the model
        self.demand_forecaster.fit(X)
        
        # Save the model
        joblib.dump(self.demand_forecaster, 'models/demand_forecaster.pkl')
    
    def forecast_demand(self, historical_data: np.ndarray, product_id: str = None) -> Dict[str, Any]:
        """Forecast demand using transformer model"""
        try:
            # Ensure data is in correct format
            if len(historical_data) < 30:
                raise ValueError("Need at least 30 days of historical data")
            
            # Get the last 30 days for prediction
            recent_data = historical_data[-30:]
            
            # Make prediction
            predictions = self.demand_forecaster.predict(recent_data)
            
            # Calculate confidence intervals (mock)
            confidence_lower = predictions * 0.9
            confidence_upper = predictions * 1.1
            
            return {
                'predictions': predictions.tolist(),
                'confidence_lower': confidence_lower.tolist(),
                'confidence_upper': confidence_upper.tolist(),
                'model_type': 'transformer',
                'product_id': product_id,
                'forecast_date': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'error': str(e),
                'predictions': [],
                'model_type': 'transformer'
            }
    
    def analyze_warehouse_vision(self, image_data: np.ndarray) -> Dict[str, Any]:
        """Analyze warehouse vision using YOLO model"""
        try:
            # Detect objects in the image
            detections = self.vision_model.detect(image_data)
            
            # Analyze congestion
            congestion_analysis = self.vision_model.analyze_congestion(detections)
            
            # Generate recommendations
            recommendations = []
            if congestion_analysis['congestion_score'] > 0.7:
                recommendations.append("High congestion detected - consider route optimization")
            if congestion_analysis['obstacle_count'] > 0:
                recommendations.append(f"Remove {congestion_analysis['obstacle_count']} obstacles")
            if congestion_analysis['avg_shelf_occupancy'] > 80:
                recommendations.append("High shelf occupancy - consider restocking")
            
            return {
                'detections': detections,
                'congestion_analysis': congestion_analysis,
                'recommendations': recommendations,
                'model_type': 'yolo',
                'analysis_date': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'error': str(e),
                'detections': [],
                'model_type': 'yolo'
            }
    
    def optimize_route_rl(self, route_state: np.ndarray, route_info: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize route using reinforcement learning"""
        try:
            # Get action from DQN
            action = self.route_optimizer.get_action(route_state)
            
            # Calculate reward for current state
            current_reward = self.route_optimizer.calculate_reward(route_info)
            
            # Simulate next state (in real implementation, this would be the actual next state)
            next_state = route_state + np.random.normal(0, 0.1, route_state.shape)
            
            # Store experience
            self.route_optimizer.remember(route_state, action, current_reward, next_state, False)
            
            # Train the model
            self.route_optimizer.train(batch_size=32)
            
            # Generate route optimization recommendations
            recommendations = []
            if route_info.get('time', 0) > 120:  # More than 2 hours
                recommendations.append("Route time too long - consider alternative paths")
            if route_info.get('cost', 0) > 50:  # More than $50
                recommendations.append("Route cost high - optimize for cost efficiency")
            if route_info.get('co2', 0) > 20:  # More than 20kg CO2
                recommendations.append("High CO2 emissions - consider green delivery options")
            
            return {
                'action': int(action),
                'reward': float(current_reward),
                'recommendations': recommendations,
                'model_type': 'dqn',
                'epsilon': float(self.route_optimizer.epsilon),
                'optimization_date': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'error': str(e),
                'action': 0,
                'model_type': 'dqn'
            }
    
    def analyze_customer_sentiment(self, feedback_text: str) -> Dict[str, Any]:
        """Analyze customer sentiment using NLP"""
        try:
            # Analyze sentiment
            sentiment_result = self.sentiment_analyzer.analyze_sentiment(feedback_text)
            
            # Generate insights
            insights = []
            if sentiment_result['sentiment'] == 'negative':
                insights.append("Negative feedback detected - immediate attention required")
            elif sentiment_result['sentiment'] == 'positive':
                insights.append("Positive feedback - consider customer loyalty program")
            
            # Add topic-specific insights
            for topic in sentiment_result.get('topics', []):
                if topic == 'delivery' and sentiment_result['sentiment'] == 'negative':
                    insights.append("Delivery issues identified - review logistics")
                elif topic == 'service' and sentiment_result['sentiment'] == 'negative':
                    insights.append("Service quality concerns - staff training needed")
            
            return {
                'sentiment_analysis': sentiment_result,
                'insights': insights,
                'model_type': 'nlp',
                'analysis_date': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'error': str(e),
                'sentiment_analysis': {},
                'model_type': 'nlp'
            }
    
    def get_model_status(self) -> Dict[str, Any]:
        """Get status of all ML models"""
        return {
            'demand_forecaster': {
                'status': 'active',
                'type': 'transformer',
                'last_trained': datetime.now().isoformat()
            },
            'vision_model': {
                'status': 'active',
                'type': 'yolo',
                'classes': self.vision_model.classes
            },
            'route_optimizer': {
                'status': 'active',
                'type': 'dqn',
                'epsilon': self.route_optimizer.epsilon
            },
            'sentiment_analyzer': {
                'status': 'active',
                'type': 'nlp',
                'keywords_loaded': len(self.sentiment_analyzer.keywords)
            }
        }

# Global instance
advanced_ml_service = AdvancedMLService()

# API endpoints for FastAPI integration
def get_demand_forecast(historical_data: List[float], product_id: str = None) -> Dict[str, Any]:
    """API endpoint for demand forecasting"""
    return advanced_ml_service.forecast_demand(np.array(historical_data), product_id)

def get_warehouse_analysis(image_data: List[List[float]]) -> Dict[str, Any]:
    """API endpoint for warehouse vision analysis"""
    return advanced_ml_service.analyze_warehouse_vision(np.array(image_data))

def get_route_optimization(route_state: List[float], route_info: Dict[str, Any]) -> Dict[str, Any]:
    """API endpoint for route optimization"""
    return advanced_ml_service.optimize_route_rl(np.array(route_state), route_info)

def get_sentiment_analysis(feedback_text: str) -> Dict[str, Any]:
    """API endpoint for sentiment analysis"""
    return advanced_ml_service.analyze_customer_sentiment(feedback_text)

def get_model_status() -> Dict[str, Any]:
    """API endpoint for model status"""
    return advanced_ml_service.get_model_status()