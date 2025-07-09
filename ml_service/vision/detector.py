"""
YOLO Object Detector for SmartRetail360
Handles real-time object detection for inventory tracking
"""

import cv2
import numpy as np
from ultralytics import YOLO
from typing import List, Dict, Any, Tuple, Optional
import logging
from datetime import datetime
import json
import os

logger = logging.getLogger(__name__)

class YOLODetector:
    """
    YOLO-based object detector optimized for retail inventory tracking
    """
    
    def __init__(self, model_path: str = "yolov8n.pt", confidence_threshold: float = 0.5):
        """
        Initialize YOLO detector
        
        Args:
            model_path: Path to YOLO model file
            confidence_threshold: Minimum confidence for detections
        """
        self.confidence_threshold = confidence_threshold
        self.model = None
        self.class_names = []
        self.inventory_classes = {
            'person': 'staff',
            'bottle': 'beverage',
            'cup': 'beverage', 
            'bowl': 'container',
            'banana': 'fruit',
            'apple': 'fruit',
            'orange': 'fruit',
            'carrot': 'vegetable',
            'broccoli': 'vegetable',
            'pizza': 'food',
            'sandwich': 'food',
            'hot dog': 'food',
            'cake': 'dessert',
            'donut': 'dessert',
            'chair': 'furniture',
            'couch': 'furniture',
            'bed': 'furniture',
            'dining table': 'furniture',
            'tv': 'electronics',
            'laptop': 'electronics',
            'cell phone': 'electronics',
            'remote': 'electronics',
            'keyboard': 'electronics',
            'mouse': 'electronics',
            'book': 'stationery',
            'clock': 'accessories',
            'vase': 'decor',
            'scissors': 'tools',
            'teddy bear': 'toys',
            'hair drier': 'appliances',
            'toothbrush': 'hygiene'
        }
        
        self.load_model(model_path)
    
    def load_model(self, model_path: str):
        """Load YOLO model"""
        try:
            logger.info(f"Loading YOLO model from {model_path}")
            self.model = YOLO(model_path)
            
            # Get class names
            if hasattr(self.model, 'names'):
                self.class_names = list(self.model.names.values())
            else:
                # Fallback class names for COCO dataset
                self.class_names = [
                    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
                    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
                    'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
                    'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
                    'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
                    'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
                    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
                    'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
                    'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
                    'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
                ]
            
            logger.info(f"YOLO model loaded successfully with {len(self.class_names)} classes")
            
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            raise
    
    def detect(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Perform object detection on image
        
        Args:
            image: Input image as numpy array (BGR format)
            
        Returns:
            List of detection dictionaries with bbox, confidence, class info
        """
        if self.model is None:
            raise RuntimeError("YOLO model not loaded")
        
        try:
            # Run inference
            results = self.model(image, conf=self.confidence_threshold, verbose=False)
            
            detections = []
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Get box coordinates
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        
                        # Get confidence and class
                        confidence = float(box.conf[0].cpu().numpy())
                        class_id = int(box.cls[0].cpu().numpy())
                        class_name = self.class_names[class_id] if class_id < len(self.class_names) else f"class_{class_id}"
                        
                        # Map to inventory category
                        inventory_category = self.inventory_classes.get(class_name, 'misc')
                        
                        detection = {
                            'bbox': [int(x1), int(y1), int(x2), int(y2)],
                            'confidence': confidence,
                            'class_id': class_id,
                            'class_name': class_name,
                            'inventory_category': inventory_category,
                            'timestamp': datetime.now().isoformat()
                        }
                        
                        detections.append(detection)
            
            return detections
            
        except Exception as e:
            logger.error(f"Detection failed: {e}")
            return []
    
    def detect_inventory_items(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Specialized detection for inventory items with enhanced analytics
        
        Args:
            image: Input image as numpy array
            
        Returns:
            Dictionary with inventory analysis results
        """
        detections = self.detect(image)
        
        # Group by inventory category
        category_counts = {}
        item_details = {}
        
        for detection in detections:
            category = detection['inventory_category']
            class_name = detection['class_name']
            
            # Count by category
            if category not in category_counts:
                category_counts[category] = 0
            category_counts[category] += 1
            
            # Track individual items
            if class_name not in item_details:
                item_details[class_name] = {
                    'count': 0,
                    'avg_confidence': 0.0,
                    'locations': []
                }
            
            item_details[class_name]['count'] += 1
            item_details[class_name]['avg_confidence'] += detection['confidence']
            item_details[class_name]['locations'].append(detection['bbox'])
        
        # Calculate averages
        for item_name, details in item_details.items():
            if details['count'] > 0:
                details['avg_confidence'] /= details['count']
        
        return {
            'total_items': len(detections),
            'category_breakdown': category_counts,
            'item_details': item_details,
            'detections': detections,
            'timestamp': datetime.now().isoformat()
        }
    
    def draw_detections(self, image: np.ndarray, detections: List[Dict[str, Any]]) -> np.ndarray:
        """
        Draw detection boxes and labels on image
        
        Args:
            image: Input image
            detections: List of detection dictionaries
            
        Returns:
            Image with detection overlays
        """
        result_image = image.copy()
        
        for detection in detections:
            x1, y1, x2, y2 = detection['bbox']
            confidence = detection['confidence']
            class_name = detection['class_name']
            category = detection['inventory_category']
            
            # Draw bounding box
            color = self._get_category_color(category)
            cv2.rectangle(result_image, (x1, y1), (x2, y2), color, 2)
            
            # Draw label
            label = f"{class_name} ({confidence:.2f})"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            
            # Draw label background
            cv2.rectangle(result_image, 
                         (x1, y1 - label_size[1] - 10), 
                         (x1 + label_size[0], y1), 
                         color, -1)
            
            # Draw label text
            cv2.putText(result_image, label, (x1, y1 - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
        
        return result_image
    
    def _get_category_color(self, category: str) -> Tuple[int, int, int]:
        """Get color for inventory category"""
        colors = {
            'staff': (0, 255, 0),      # Green
            'beverage': (255, 0, 0),   # Blue
            'container': (0, 0, 255),  # Red
            'fruit': (255, 165, 0),    # Orange
            'vegetable': (0, 255, 0),  # Green
            'food': (255, 0, 255),     # Magenta
            'dessert': (255, 255, 0),  # Yellow
            'furniture': (128, 0, 128), # Purple
            'electronics': (0, 255, 255), # Cyan
            'stationery': (165, 42, 42), # Brown
            'accessories': (255, 192, 203), # Pink
            'decor': (255, 215, 0),    # Gold
            'tools': (128, 128, 128),  # Gray
            'toys': (255, 20, 147),    # Deep Pink
            'appliances': (0, 128, 128), # Teal
            'hygiene': (240, 230, 140), # Khaki
            'misc': (169, 169, 169)    # Dark Gray
        }
        return colors.get(category, (128, 128, 128)) 