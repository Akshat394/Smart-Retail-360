"""
Video Processor for SmartRetail360
Handles video streams, frame processing, and coordinates vision components
"""

import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Generator, Tuple
import logging
from datetime import datetime
import asyncio
import json
import base64
from io import BytesIO
from PIL import Image
import threading
import time
import os

from .detector import YOLODetector
from .inventory_tracker import InventoryTracker
from .anomaly_detector import AnomalyDetector

logger = logging.getLogger(__name__)

class VideoProcessor:
    """
    Main video processing class that coordinates all vision components
    """
    
    def __init__(self, model_path: str = "yolov8n.pt", confidence_threshold: float = 0.5):
        """
        Initialize video processor
        
        Args:
            model_path: Path to YOLO model
            confidence_threshold: Detection confidence threshold
        """
        self.detector = YOLODetector(model_path, confidence_threshold)
        self.inventory_tracker = InventoryTracker()
        self.anomaly_detector = AnomalyDetector()
        
        # Processing state
        self.is_processing = False
        self.current_frame = None
        self.frame_count = 0
        self.fps = 0
        self.last_fps_update = time.time()
        
        # Results storage
        self.latest_results = {
            'detections': [],
            'inventory_analysis': {},
            'anomalies': [],
            'frame_info': {},
            'timestamp': None
        }
        
        # Callbacks for real-time updates
        self.callbacks = []
        
        # Demo video generation
        self.demo_mode = True
        self.demo_frame_generator = None
    
    def start_processing(self, video_source: Optional[str] = None):
        """
        Start video processing
        
        Args:
            video_source: Video source (file path, camera index, or None for demo)
        """
        if self.is_processing:
            logger.warning("Video processing already running")
            return
        
        self.is_processing = True
        
        # Always use demo video sequence for demo mode
        self._start_demo_videos_sequence()
    
    def stop_processing(self):
        """Stop video processing"""
        self.is_processing = False
        logger.info("Video processing stopped")
    
    def _start_demo_videos_sequence(self):
        """Process all demo videos in sequence, looping through them as warehouse 1-4"""
        def demo_sequence_loop():
            demo_dir = os.path.join(os.path.dirname(__file__), '../demo_videos')
            video_files = [f for f in os.listdir(demo_dir) if f.lower().endswith('.mp4')]
            video_files.sort()  # Ensure consistent order
            warehouse_names = [f"Warehouse {i+1}" for i in range(len(video_files))]
            idx = 0
            while self.is_processing and video_files:
                video_path = os.path.join(demo_dir, video_files[idx])
                warehouse_name = warehouse_names[idx]
                cap = cv2.VideoCapture(video_path)
                frame_count = 0
                while self.is_processing and cap.isOpened():
                    ret, frame = cap.read()
                    if not ret:
                        break
                    # Overlay warehouse name for sliding animation effect
                    overlay = frame.copy()
                    cv2.rectangle(overlay, (0, 0), (frame.shape[1], 60), (30, 30, 30), -1)
                    cv2.putText(overlay, warehouse_name, (30, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 3)
                    alpha = min(1.0, frame_count / 30.0)  # Fade in for first 30 frames
                    frame = cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0)
                    # Process frame with YOLO and update analytics
                    results = self.process_frame(frame)
                    self.latest_results = results
                    self._notify_callbacks(results)
                    frame_count += 1
                    time.sleep(1/24)  # ~24 FPS
                cap.release()
                # Sliding animation: fade out warehouse name
                for fade in range(30):
                    if not self.is_processing:
                        break
                    blank = np.zeros_like(frame)
                    alpha = 1.0 - (fade / 30.0)
                    slide_frame = cv2.addWeighted(frame, alpha, blank, 1 - alpha, 0)
                    results = self.process_frame(slide_frame)
                    self.latest_results = results
                    self._notify_callbacks(results)
                    time.sleep(1/24)
                idx = (idx + 1) % len(video_files)  # Loop to next video
        demo_thread = threading.Thread(target=demo_sequence_loop, daemon=True)
        demo_thread.start()
        logger.info("Demo video sequence processing started")
    
    def _generate_demo_frame(self) -> np.ndarray:
        """Generate demo frame with simulated inventory items"""
        # Create a 640x480 frame
        frame = np.ones((480, 640, 3), dtype=np.uint8) * 240  # Light gray background
        
        # Add some simulated inventory items
        items = [
            {'name': 'bottle', 'pos': (100, 150), 'size': (60, 120)},
            {'name': 'cup', 'pos': (200, 200), 'size': (50, 80)},
            {'name': 'apple', 'pos': (300, 180), 'size': (40, 40)},
            {'name': 'laptop', 'pos': (400, 250), 'size': (80, 60)},
            {'name': 'person', 'pos': (320, 350), 'size': (40, 80)},
            {'name': 'chair', 'pos': (150, 300), 'size': (70, 100)},
            {'name': 'book', 'pos': (500, 200), 'size': (30, 40)},
            {'name': 'tv', 'pos': (50, 100), 'size': (100, 60)}
        ]
        
        # Add some randomness to make it more realistic
        import random
        random.seed(int(time.time()) % 1000)
        
        for item in items:
            # Add some random variation
            x, y = item['pos']
            x += random.randint(-20, 20)
            y += random.randint(-20, 20)
            
            w, h = item['size']
            color = self._get_item_color(item['name'])
            
            # Draw rectangle for item
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, -1)
            
            # Add text label
            cv2.putText(frame, item['name'], (x, y - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 2)
        
        # Add some noise to make it more realistic
        noise = np.random.normal(0, 10, frame.shape).astype(np.uint8)
        frame = cv2.add(frame, noise)
        
        return frame
    
    def _get_item_color(self, item_name: str) -> Tuple[int, int, int]:
        """Get color for demo item"""
        colors = {
            'bottle': (255, 0, 0),    # Blue
            'cup': (0, 255, 0),       # Green
            'apple': (0, 0, 255),     # Red
            'laptop': (128, 128, 128), # Gray
            'person': (255, 255, 0),  # Cyan
            'chair': (255, 0, 255),   # Magenta
            'book': (0, 255, 255),    # Yellow
            'tv': (128, 0, 128)       # Purple
        }
        return colors.get(item_name, (128, 128, 128))
    
    def process_frame(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Process a single frame
        
        Args:
            frame: Input frame as numpy array
            
        Returns:
            Dictionary with processing results
        """
        start_time = time.time()
        
        # Update frame info
        self.frame_count += 1
        current_time = datetime.now()
        
        # Calculate FPS
        if time.time() - self.last_fps_update > 1.0:
            self.fps = self.frame_count / (time.time() - self.last_fps_update + 1)
            self.frame_count = 0
            self.last_fps_update = time.time()
        
        # Run object detection
        detections = self.detector.detect(frame)
        
        # Get inventory analysis
        inventory_analysis = self.detector.detect_inventory_items(frame)
        
        # Update inventory tracker
        inventory_update = self.inventory_tracker.update_inventory(inventory_analysis)
        
        # Detect anomalies
        frame_info = {
            'frame_number': self.frame_count,
            'fps': self.fps,
            'timestamp': current_time.isoformat()
        }
        anomalies = self.anomaly_detector.detect_anomalies(detections, frame_info)
        
        # Draw detections on frame
        annotated_frame = self.detector.draw_detections(frame, detections)
        
        # Convert frame to base64 for API response
        frame_base64 = self._frame_to_base64(annotated_frame)
        
        processing_time = time.time() - start_time
        
        results = {
            'detections': detections,
            'inventory_analysis': inventory_analysis,
            'inventory_update': inventory_update,
            'anomalies': anomalies,
            'frame_info': {
                **frame_info,
                'processing_time': processing_time,
                'frame_size': frame.shape
            },
            'annotated_frame': frame_base64,
            'timestamp': current_time.isoformat()
        }
        
        return results
    
    def _frame_to_base64(self, frame: np.ndarray) -> str:
        """Convert frame to base64 string"""
        try:
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Convert to PIL Image
            pil_image = Image.fromarray(frame_rgb)
            
            # Convert to base64
            buffer = BytesIO()
            pil_image.save(buffer, format='JPEG', quality=85)
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return img_str
        except Exception as e:
            logger.error(f"Failed to convert frame to base64: {e}")
            return ""
    
    def get_latest_results(self) -> Dict[str, Any]:
        """Get latest processing results"""
        return self.latest_results
    
    def get_inventory_summary(self) -> Dict[str, Any]:
        """Get inventory summary"""
        return self.inventory_tracker.get_inventory_summary()
    
    def get_anomaly_summary(self) -> Dict[str, Any]:
        """Get anomaly summary"""
        return self.anomaly_detector.get_anomaly_summary()
    
    def add_callback(self, callback):
        """Add callback for real-time updates"""
        self.callbacks.append(callback)
    
    def remove_callback(self, callback):
        """Remove callback"""
        if callback in self.callbacks:
            self.callbacks.remove(callback)
    
    def _notify_callbacks(self, results: Dict[str, Any]):
        """Notify all callbacks with results"""
        for callback in self.callbacks:
            try:
                callback(results)
            except Exception as e:
                logger.error(f"Callback error: {e}")
    
    def process_image(self, image_data: bytes) -> Dict[str, Any]:
        """
        Process a single image from bytes
        
        Args:
            image_data: Image data as bytes
            
        Returns:
            Processing results
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                raise ValueError("Failed to decode image")
            
            # Process frame
            return self.process_frame(frame)
            
        except Exception as e:
            logger.error(f"Image processing error: {e}")
            return {
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def reset(self):
        """Reset all components"""
        self.inventory_tracker.reset()
        self.anomaly_detector.reset()
        self.latest_results = {
            'detections': [],
            'inventory_analysis': {},
            'anomalies': [],
            'frame_info': {},
            'timestamp': None
        }
        logger.info("Video processor reset") 