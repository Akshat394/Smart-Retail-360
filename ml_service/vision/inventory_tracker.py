"""
Inventory Tracker for SmartRetail360
Tracks inventory items over time and detects changes
"""

import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import logging
from datetime import datetime, timedelta
import json
from collections import defaultdict, deque
import math

logger = logging.getLogger(__name__)

class InventoryTracker:
    """
    Tracks inventory items over time and detects changes
    """
    
    def __init__(self, max_history: int = 100, change_threshold: float = 0.3):
        """
        Initialize inventory tracker
        
        Args:
            max_history: Maximum number of historical frames to keep
            change_threshold: Threshold for detecting significant changes
        """
        self.max_history = max_history
        self.change_threshold = change_threshold
        
        # Historical data
        self.item_history = defaultdict(lambda: deque(maxlen=max_history))
        self.category_history = defaultdict(lambda: deque(maxlen=max_history))
        
        # Current state
        self.current_inventory = {}
        self.previous_inventory = {}
        
        # Analytics
        self.analytics = {
            'total_detections': 0,
            'unique_items_seen': set(),
            'category_changes': [],
            'stockout_events': [],
            'restock_events': [],
            'anomaly_events': []
        }
        
        # Expected inventory levels (for demo)
        self.expected_levels = {
            'beverage': 50,
            'food': 30,
            'fruit': 25,
            'vegetable': 20,
            'electronics': 15,
            'furniture': 10,
            'stationery': 40,
            'toys': 20,
            'hygiene': 35
        }
    
    def update_inventory(self, detection_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update inventory state with new detection results
        
        Args:
            detection_results: Results from YOLO detector
            
        Returns:
            Dictionary with inventory changes and analytics
        """
        timestamp = datetime.now()
        self.previous_inventory = self.current_inventory.copy()
        
        # Update current inventory
        self.current_inventory = {}
        category_counts = detection_results.get('category_breakdown', {})
        
        for category, count in category_counts.items():
            self.current_inventory[category] = count
            
            # Add to history
            self.category_history[category].append({
                'count': count,
                'timestamp': timestamp.isoformat()
            })
        
        # Track individual items
        item_details = detection_results.get('item_details', {})
        for item_name, details in item_details.items():
            self.analytics['unique_items_seen'].add(item_name)
            
            # Add to item history
            self.item_history[item_name].append({
                'count': details['count'],
                'avg_confidence': details['avg_confidence'],
                'timestamp': timestamp.isoformat()
            })
        
        self.analytics['total_detections'] += detection_results.get('total_items', 0)
        
        # Analyze changes
        changes = self._analyze_changes()
        alerts = self._generate_alerts()
        
        return {
            'current_inventory': self.current_inventory,
            'changes': changes,
            'alerts': alerts,
            'analytics': self._get_analytics_summary(),
            'timestamp': timestamp.isoformat()
        }
    
    def _analyze_changes(self) -> Dict[str, Any]:
        """Analyze changes in inventory levels"""
        changes = {
            'category_changes': {},
            'stockout_detected': [],
            'restock_detected': [],
            'significant_changes': []
        }
        
        for category, current_count in self.current_inventory.items():
            previous_count = self.previous_inventory.get(category, 0)
            change = current_count - previous_count
            change_percentage = (change / max(previous_count, 1)) * 100
            
            changes['category_changes'][category] = {
                'previous': previous_count,
                'current': current_count,
                'change': change,
                'change_percentage': change_percentage
            }
            
            # Detect significant changes
            if abs(change_percentage) > 20:  # 20% change threshold
                changes['significant_changes'].append({
                    'category': category,
                    'change': change,
                    'change_percentage': change_percentage,
                    'type': 'increase' if change > 0 else 'decrease'
                })
            
            # Detect stockout
            if previous_count > 0 and current_count == 0:
                changes['stockout_detected'].append(category)
                self.analytics['stockout_events'].append({
                    'category': category,
                    'timestamp': datetime.now().isoformat()
                })
            
            # Detect restock
            if previous_count == 0 and current_count > 0:
                changes['restock_detected'].append(category)
                self.analytics['restock_events'].append({
                    'category': category,
                    'timestamp': datetime.now().isoformat()
                })
        
        return changes
    
    def _generate_alerts(self) -> List[Dict[str, Any]]:
        """Generate alerts based on inventory state"""
        alerts = []
        timestamp = datetime.now().isoformat()
        
        for category, current_count in self.current_inventory.items():
            expected_level = self.expected_levels.get(category, 20)
            
            # Low stock alert
            if current_count < expected_level * 0.3:
                alerts.append({
                    'type': 'low_stock',
                    'category': category,
                    'current': current_count,
                    'expected': expected_level,
                    'severity': 'high',
                    'message': f'Low stock alert: {category} has {current_count} items (expected {expected_level})',
                    'timestamp': timestamp
                })
            
            # Stockout alert
            elif current_count == 0:
                alerts.append({
                    'type': 'stockout',
                    'category': category,
                    'current': current_count,
                    'expected': expected_level,
                    'severity': 'critical',
                    'message': f'Stockout alert: {category} is completely out of stock',
                    'timestamp': timestamp
                })
            
            # Overstock alert
            elif current_count > expected_level * 1.5:
                alerts.append({
                    'type': 'overstock',
                    'category': category,
                    'current': current_count,
                    'expected': expected_level,
                    'severity': 'medium',
                    'message': f'Overstock alert: {category} has {current_count} items (expected {expected_level})',
                    'timestamp': timestamp
                })
        
        return alerts
    
    def _get_analytics_summary(self) -> Dict[str, Any]:
        """Get summary of analytics data"""
        return {
            'total_detections': self.analytics['total_detections'],
            'unique_items_seen': len(self.analytics['unique_items_seen']),
            'stockout_events_count': len(self.analytics['stockout_events']),
            'restock_events_count': len(self.analytics['restock_events']),
            'anomaly_events_count': len(self.analytics['anomaly_events']),
            'recent_stockouts': self.analytics['stockout_events'][-5:],  # Last 5
            'recent_restocks': self.analytics['restock_events'][-5:],    # Last 5
            'category_trends': self._get_category_trends()
        }
    
    def _get_category_trends(self) -> Dict[str, Any]:
        """Get trends for each category"""
        trends = {}
        
        for category, history in self.category_history.items():
            if len(history) >= 2:
                recent_counts = [entry['count'] for entry in list(history)[-10:]]  # Last 10 entries
                
                if len(recent_counts) >= 2:
                    # Calculate trend (positive = increasing, negative = decreasing)
                    trend = (recent_counts[-1] - recent_counts[0]) / len(recent_counts)
                    
                    trends[category] = {
                        'current_count': recent_counts[-1],
                        'trend': trend,
                        'trend_direction': 'increasing' if trend > 0 else 'decreasing' if trend < 0 else 'stable',
                        'volatility': np.std(recent_counts) if len(recent_counts) > 1 else 0
                    }
        
        return trends
    
    def get_inventory_summary(self) -> Dict[str, Any]:
        """Get comprehensive inventory summary"""
        return {
            'current_state': self.current_inventory,
            'expected_levels': self.expected_levels,
            'compliance': self._calculate_compliance(),
            'trends': self._get_category_trends(),
            'alerts': self._generate_alerts(),
            'analytics': self._get_analytics_summary(),
            'timestamp': datetime.now().isoformat()
        }
    
    def _calculate_compliance(self) -> Dict[str, float]:
        """Calculate compliance with expected inventory levels"""
        compliance = {}
        
        for category, current_count in self.current_inventory.items():
            expected_level = self.expected_levels.get(category, 20)
            
            if expected_level > 0:
                compliance[category] = min(100.0, (current_count / expected_level) * 100)
            else:
                compliance[category] = 100.0 if current_count == 0 else 0.0
        
        return compliance
    
    def detect_anomalies(self) -> List[Dict[str, Any]]:
        """Detect anomalous patterns in inventory"""
        anomalies = []
        timestamp = datetime.now().isoformat()
        
        for category, history in self.category_history.items():
            if len(history) >= 10:
                counts = [entry['count'] for entry in list(history)[-20:]]  # Last 20 entries
                
                if len(counts) >= 10:
                    mean_count = np.mean(counts)
                    std_count = np.std(counts)
                    
                    if std_count > 0:
                        current_count = counts[-1]
                        z_score = abs(current_count - mean_count) / std_count
                        
                        # Detect statistical anomalies (z-score > 2)
                        if z_score > 2:
                            anomalies.append({
                                'type': 'statistical_anomaly',
                                'category': category,
                                'current_count': current_count,
                                'expected_range': [mean_count - 2*std_count, mean_count + 2*std_count],
                                'z_score': z_score,
                                'severity': 'high' if z_score > 3 else 'medium',
                                'message': f'Anomalous inventory level detected for {category}',
                                'timestamp': timestamp
                            })
                            
                            self.analytics['anomaly_events'].append({
                                'category': category,
                                'z_score': z_score,
                                'timestamp': timestamp
                            })
        
        return anomalies
    
    def reset(self):
        """Reset tracker state"""
        self.current_inventory = {}
        self.previous_inventory = {}
        self.item_history.clear()
        self.category_history.clear()
        self.analytics = {
            'total_detections': 0,
            'unique_items_seen': set(),
            'category_changes': [],
            'stockout_events': [],
            'restock_events': [],
            'anomaly_events': []
        } 