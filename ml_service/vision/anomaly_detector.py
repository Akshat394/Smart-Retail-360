"""
Anomaly Detector for SmartRetail360
Detects unusual patterns, safety violations, and suspicious activities
"""

import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import logging
from datetime import datetime, timedelta
from collections import defaultdict, deque
import math

logger = logging.getLogger(__name__)

class AnomalyDetector:
    """
    Detects anomalies in video feeds including safety violations and suspicious activities
    """
    
    def __init__(self, detection_threshold: float = 0.7, history_size: int = 50):
        """
        Initialize anomaly detector
        
        Args:
            detection_threshold: Threshold for anomaly detection
            history_size: Size of historical data to maintain
        """
        self.detection_threshold = detection_threshold
        self.history_size = history_size
        
        # Historical data for pattern analysis
        self.person_history = deque(maxlen=history_size)
        self.movement_history = deque(maxlen=history_size)
        self.object_interaction_history = deque(maxlen=history_size)
        
        # Anomaly patterns
        self.anomaly_patterns = {
            'crowding': {
                'threshold': 5,  # More than 5 people in frame
                'time_threshold': 30,  # For 30 seconds
                'severity': 'medium'
            },
            'loitering': {
                'threshold': 60,  # Person in same area for 60 seconds
                'severity': 'low'
            },
            'rapid_movement': {
                'threshold': 0.8,  # High movement velocity
                'severity': 'medium'
            },
            'unusual_hours': {
                'start_hour': 22,  # 10 PM
                'end_hour': 6,     # 6 AM
                'severity': 'high'
            },
            'suspicious_behavior': {
                'threshold': 0.6,  # Suspicious behavior score
                'severity': 'high'
            }
        }
        
        # Safety zones (for demo - in real app these would be configurable)
        self.safety_zones = {
            'restricted_area': [(100, 100), (300, 300)],
            'exit_zone': [(400, 200), (500, 400)],
            'storage_area': [(50, 350), (250, 500)]
        }
        
        # Alert history
        self.alert_history = []
        self.active_alerts = {}
    
    def detect_anomalies(self, detections: List[Dict[str, Any]], frame_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Detect anomalies in current frame
        
        Args:
            detections: List of YOLO detections
            frame_info: Additional frame information (timestamp, etc.)
            
        Returns:
            List of detected anomalies
        """
        anomalies = []
        timestamp = datetime.now()
        
        # Extract person detections
        people = [d for d in detections if d['class_name'] == 'person']
        
        # Update history
        self._update_history(people, frame_info)
        
        # Detect various types of anomalies
        anomalies.extend(self._detect_crowding(people, timestamp))
        anomalies.extend(self._detect_loitering(people, timestamp))
        anomalies.extend(self._detect_rapid_movement(people, timestamp))
        anomalies.extend(self._detect_safety_violations(people, timestamp))
        anomalies.extend(self._detect_unusual_hours(timestamp))
        anomalies.extend(self._detect_suspicious_behavior(people, detections, timestamp))
        
        # Update active alerts
        self._update_active_alerts(anomalies, timestamp)
        
        return anomalies
    
    def _update_history(self, people: List[Dict[str, Any]], frame_info: Dict[str, Any]):
        """Update historical data"""
        timestamp = frame_info.get('timestamp', datetime.now().isoformat())
        
        # Track person positions and movements
        person_data = {
            'count': len(people),
            'positions': [p['bbox'] for p in people],
            'timestamp': timestamp
        }
        
        self.person_history.append(person_data)
        
        # Calculate movement if we have previous data
        if len(self.person_history) >= 2:
            movement = self._calculate_movement(self.person_history[-2], person_data)
            self.movement_history.append({
                'movement_score': movement,
                'timestamp': timestamp
            })
    
    def _calculate_movement(self, prev_data: Dict[str, Any], curr_data: Dict[str, Any]) -> float:
        """Calculate movement score between frames"""
        if not prev_data['positions'] or not curr_data['positions']:
            return 0.0
        
        # Simple movement calculation based on position changes
        total_movement = 0.0
        count = 0
        
        for curr_pos in curr_data['positions']:
            min_distance = float('inf')
            for prev_pos in prev_data['positions']:
                distance = self._calculate_distance(curr_pos, prev_pos)
                min_distance = min(min_distance, distance)
            
            if min_distance != float('inf'):
                total_movement += min_distance
                count += 1
        
        return total_movement / max(count, 1)
    
    def _calculate_distance(self, pos1: List[int], pos2: List[int]) -> float:
        """Calculate Euclidean distance between two positions"""
        if len(pos1) >= 2 and len(pos2) >= 2:
            center1 = [(pos1[0] + pos1[2]) / 2, (pos1[1] + pos1[3]) / 2]
            center2 = [(pos2[0] + pos2[2]) / 2, (pos2[1] + pos2[3]) / 2]
            return math.sqrt((center1[0] - center2[0])**2 + (center1[1] - center2[1])**2)
        return 0.0
    
    def _detect_crowding(self, people: List[Dict[str, Any]], timestamp: datetime) -> List[Dict[str, Any]]:
        """Detect crowding anomalies"""
        anomalies = []
        
        if len(people) > self.anomaly_patterns['crowding']['threshold']:
            # Check if crowding has been sustained
            recent_crowding = sum(1 for data in list(self.person_history)[-30:] 
                                if data['count'] > self.anomaly_patterns['crowding']['threshold'])
            
            if recent_crowding >= 15:  # Crowding for at least 15 frames
                anomalies.append({
                    'type': 'crowding',
                    'severity': self.anomaly_patterns['crowding']['severity'],
                    'message': f'Crowding detected: {len(people)} people in frame',
                    'details': {
                        'person_count': len(people),
                        'threshold': self.anomaly_patterns['crowding']['threshold'],
                        'duration': recent_crowding
                    },
                    'timestamp': timestamp.isoformat()
                })
        
        return anomalies
    
    def _detect_loitering(self, people: List[Dict[str, Any]], timestamp: datetime) -> List[Dict[str, Any]]:
        """Detect loitering behavior"""
        anomalies = []
        
        # Simple loitering detection based on movement history
        if len(self.movement_history) >= 30:
            recent_movements = [m['movement_score'] for m in list(self.movement_history)[-30:]]
            avg_movement = np.mean(recent_movements)
            
            if avg_movement < 5.0 and len(people) > 0:  # Low movement threshold
                anomalies.append({
                    'type': 'loitering',
                    'severity': self.anomaly_patterns['loitering']['severity'],
                    'message': 'Potential loitering detected',
                    'details': {
                        'avg_movement': avg_movement,
                        'person_count': len(people),
                        'duration': 30
                    },
                    'timestamp': timestamp.isoformat()
                })
        
        return anomalies
    
    def _detect_rapid_movement(self, people: List[Dict[str, Any]], timestamp: datetime) -> List[Dict[str, Any]]:
        """Detect rapid or suspicious movement"""
        anomalies = []
        
        if len(self.movement_history) >= 5:
            recent_movements = [m['movement_score'] for m in list(self.movement_history)[-5:]]
            max_movement = max(recent_movements)
            
            if max_movement > 50.0:  # High movement threshold
                anomalies.append({
                    'type': 'rapid_movement',
                    'severity': self.anomaly_patterns['rapid_movement']['severity'],
                    'message': 'Rapid movement detected',
                    'details': {
                        'max_movement': max_movement,
                        'threshold': 50.0
                    },
                    'timestamp': timestamp.isoformat()
                })
        
        return anomalies
    
    def _detect_safety_violations(self, people: List[Dict[str, Any]], timestamp: datetime) -> List[Dict[str, Any]]:
        """Detect safety violations in restricted areas"""
        anomalies = []
        
        for person in people:
            person_center = [
                (person['bbox'][0] + person['bbox'][2]) / 2,
                (person['bbox'][1] + person['bbox'][3]) / 2
            ]
            
            # Check if person is in restricted areas
            for zone_name, zone_coords in self.safety_zones.items():
                if self._is_point_in_zone(person_center, zone_coords):
                    anomalies.append({
                        'type': 'safety_violation',
                        'severity': 'high',
                        'message': f'Person detected in {zone_name}',
                        'details': {
                            'zone': zone_name,
                            'person_position': person_center,
                            'zone_coords': zone_coords
                        },
                        'timestamp': timestamp.isoformat()
                    })
        
        return anomalies
    
    def _is_point_in_zone(self, point: List[float], zone: List[List[int]]) -> bool:
        """Check if point is within zone coordinates"""
        x, y = point
        x1, y1 = zone[0]
        x2, y2 = zone[1]
        
        return x1 <= x <= x2 and y1 <= y <= y2
    
    def _detect_unusual_hours(self, timestamp: datetime) -> List[Dict[str, Any]]:
        """Detect activity during unusual hours"""
        anomalies = []
        
        current_hour = timestamp.hour
        if (current_hour >= self.anomaly_patterns['unusual_hours']['start_hour'] or 
            current_hour <= self.anomaly_patterns['unusual_hours']['end_hour']):
            
            # Only alert if there are people detected
            if len(self.person_history) > 0 and self.person_history[-1]['count'] > 0:
                anomalies.append({
                    'type': 'unusual_hours',
                    'severity': self.anomaly_patterns['unusual_hours']['severity'],
                    'message': f'Activity detected during unusual hours ({current_hour}:00)',
                    'details': {
                        'current_hour': current_hour,
                        'person_count': self.person_history[-1]['count']
                    },
                    'timestamp': timestamp.isoformat()
                })
        
        return anomalies
    
    def _detect_suspicious_behavior(self, people: List[Dict[str, Any]], 
                                  all_detections: List[Dict[str, Any]], 
                                  timestamp: datetime) -> List[Dict[str, Any]]:
        """Detect suspicious behavior patterns"""
        anomalies = []
        
        # Example: Detect if someone is near electronics for too long
        electronics = [d for d in all_detections if d['inventory_category'] == 'electronics']
        
        if people and electronics:
            # Check if people are near electronics
            for person in people:
                person_center = [
                    (person['bbox'][0] + person['bbox'][2]) / 2,
                    (person['bbox'][1] + person['bbox'][3]) / 2
                ]
                
                for electronic in electronics:
                    electronic_center = [
                        (electronic['bbox'][0] + electronic['bbox'][2]) / 2,
                        (electronic['bbox'][1] + electronic['bbox'][3]) / 2
                    ]
                    
                    distance = self._calculate_distance(person['bbox'], electronic['bbox'])
                    
                    if distance < 100:  # Close proximity threshold
                        # Check if this interaction has been sustained
                        recent_interactions = sum(1 for data in list(self.object_interaction_history)[-20:]
                                               if data.get('type') == 'electronics_proximity')
                        
                        if recent_interactions >= 10:  # Sustained interaction
                            anomalies.append({
                                'type': 'suspicious_behavior',
                                'severity': self.anomaly_patterns['suspicious_behavior']['severity'],
                                'message': 'Suspicious behavior: Person near electronics for extended period',
                                'details': {
                                    'distance': distance,
                                    'duration': recent_interactions,
                                    'object_type': 'electronics'
                                },
                                'timestamp': timestamp.isoformat()
                            })
        
        # Track this interaction
        self.object_interaction_history.append({
            'type': 'electronics_proximity' if people and electronics else 'normal',
            'timestamp': timestamp.isoformat()
        })
        
        return anomalies
    
    def _update_active_alerts(self, anomalies: List[Dict[str, Any]], timestamp: datetime):
        """Update active alerts and clean up old ones"""
        # Add new anomalies to active alerts
        for anomaly in anomalies:
            alert_id = f"{anomaly['type']}_{timestamp.strftime('%Y%m%d_%H%M%S')}"
            self.active_alerts[alert_id] = {
                **anomaly,
                'alert_id': alert_id,
                'created_at': timestamp.isoformat(),
                'status': 'active'
            }
        
        # Clean up old alerts (older than 1 hour)
        cutoff_time = timestamp - timedelta(hours=1)
        expired_alerts = [
            alert_id for alert_id, alert in self.active_alerts.items()
            if datetime.fromisoformat(alert['created_at']) < cutoff_time
        ]
        
        for alert_id in expired_alerts:
            del self.active_alerts[alert_id]
    
    def get_anomaly_summary(self) -> Dict[str, Any]:
        """Get summary of anomaly detection results"""
        return {
            'active_alerts': len(self.active_alerts),
            'alert_history_count': len(self.alert_history),
            'recent_anomalies': list(self.active_alerts.values())[-10:],  # Last 10
            'anomaly_types': list(set(alert['type'] for alert in self.active_alerts.values())),
            'safety_zones': self.safety_zones,
            'detection_threshold': self.detection_threshold,
            'timestamp': datetime.now().isoformat()
        }
    
    def reset(self):
        """Reset anomaly detector state"""
        self.person_history.clear()
        self.movement_history.clear()
        self.object_interaction_history.clear()
        self.alert_history.clear()
        self.active_alerts.clear() 