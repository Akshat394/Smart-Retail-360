import cv2
import os
import time
import base64
import json
from ultralytics import YOLO
import numpy as np
from typing import Generator, Dict, Any, List

# Load YOLO model
model = YOLO('yolov8n.pt')  # Make sure yolov8n.pt is present or let it download

DEMO_VIDEO_DIR = os.path.join(os.path.dirname(__file__), '../demo_videos')

def get_demo_video_path(video_source: str) -> str:
    """Get the full path to a demo video file"""
    # Handle different video source formats
    if video_source.endswith('.mp4'):
        return os.path.join(DEMO_VIDEO_DIR, video_source)
    else:
        return os.path.join(DEMO_VIDEO_DIR, f"{video_source}.mp4")

def get_available_demo_videos() -> List[Dict[str, str]]:
    """Get list of available demo videos"""
    videos = []
    if os.path.exists(DEMO_VIDEO_DIR):
        for file in os.listdir(DEMO_VIDEO_DIR):
            if file.lower().endswith('.mp4'):
                video_name = os.path.splitext(file)[0]
                videos.append({
                    'name': video_name,
                    'path': os.path.join(DEMO_VIDEO_DIR, file),
                    'label': video_name.replace('_', ' ').replace('-', ' ').title()
                })
    return videos

def draw_detections_on_frame(frame: np.ndarray, detections: List[Dict[str, Any]]) -> np.ndarray:
    """Draw detection bounding boxes and labels on frame"""
    annotated_frame = frame.copy()
    
    for detection in detections:
        bbox = detection['bbox']
        confidence = detection['confidence']
        class_name = detection['class_name']
        
        # Extract coordinates
        x1, y1, x2, y2 = map(int, bbox)
        
        # Draw bounding box
        color = (0, 255, 0) if confidence > 0.7 else (0, 255, 255) if confidence > 0.5 else (0, 0, 255)
        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
        
        # Draw label with confidence
        label = f"{class_name}: {confidence:.2f}"
        label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
        
        # Draw label background
        cv2.rectangle(annotated_frame, 
                     (x1, y1 - label_size[1] - 10), 
                     (x1 + label_size[0], y1), 
                     color, -1)
        
        # Draw label text
        cv2.putText(annotated_frame, label, (x1, y1 - 5), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
    
    return annotated_frame

def stream_video_frames(video_source: str, loop: bool = True, fps: float = 24.0) -> Generator[Dict[str, Any], None, None]:
    """
    Stream video frames with real-time YOLO detection.
    If requested FPS > source FPS, repeat the last frame as needed (no blending/interpolation).
    """
    video_path = get_demo_video_path(video_source)
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Demo video {video_path} not found.")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video file: {video_path}")
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    frame_delay = 1.0 / fps if fps > 0 else 1.0 / 24.0
    print(f"Streaming video: {video_source}")
    print(f"Total frames: {total_frames}, Video FPS: {video_fps}, Target FPS: {fps}")
    frame_count = 0
    start_time = time.time()
    last_annotated = None
    last_detections = None
    last_frame_info = None
    try:
        while True:
            if fps > video_fps:
                # For each real frame, repeat it as needed to match requested FPS
                ret, frame = cap.read()
                if not ret:
                    if loop:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        frame_count = 0
                        start_time = time.time()
                        last_annotated = None
                        last_detections = None
                        last_frame_info = None
                        continue
                    else:
                        break
                # YOLOv8 inference for the real frame
                results = model(frame, conf=0.5, verbose=False)
                detections = []
                for r in results:
                    if r.boxes is not None:
                        for box in r.boxes:
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                            confidence = float(box.conf[0].cpu().numpy())
                            class_id = int(box.cls[0].cpu().numpy())
                            class_name = model.names[class_id] if class_id < len(model.names) else f"class_{class_id}"
                            detections.append({
                                'bbox': [int(x1), int(y1), int(x2), int(y2)],
                                'confidence': confidence,
                                'class_id': class_id,
                                'class_name': class_name,
                                'timestamp': time.time()
                            })
                annotated_frame = draw_detections_on_frame(frame, detections)
                info_text = f"Video: {video_source} | Frame: {frame_count}/{total_frames} | FPS: {fps:.1f} (repeat)"
                cv2.putText(annotated_frame, info_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                detection_text = f"Detections: {len(detections)}"
                cv2.putText(annotated_frame, detection_text, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                _, jpeg = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                frame_bytes = jpeg.tobytes()
                frame_b64 = base64.b64encode(frame_bytes).decode('utf-8')
                processing_time = time.time() - start_time
                last_annotated = frame_b64
                last_detections = detections
                last_frame_info = {
                    "detections": detections,
                    "frame": frame_b64,
                    "frame_count": frame_count,
                    "total_frames": total_frames,
                    "video_source": video_source,
                    "processing_time": processing_time,
                    "fps": fps,
                    "timestamp": time.time(),
                    "repeated": False,
                    "warning": f"Requested FPS ({fps}) > source FPS ({video_fps}). Frames are repeated for smoothness."
                }
                # Repeat this frame as needed
                repeat_count = int(fps // video_fps)
                for i in range(repeat_count):
                    yield {
                        **last_frame_info,
                        "repeated": i > 0
                    }
                    time.sleep(frame_delay)
                frame_count += 1
            else:
                # Normal playback, no repeats
                ret, frame = cap.read()
                if not ret:
                    if loop:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        frame_count = 0
                        start_time = time.time()
                        continue
                    else:
                        break
                results = model(frame, conf=0.5, verbose=False)
                detections = []
                for r in results:
                    if r.boxes is not None:
                        for box in r.boxes:
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                            confidence = float(box.conf[0].cpu().numpy())
                            class_id = int(box.cls[0].cpu().numpy())
                            class_name = model.names[class_id] if class_id < len(model.names) else f"class_{class_id}"
                            detections.append({
                                'bbox': [int(x1), int(y1), int(x2), int(y2)],
                                'confidence': confidence,
                                'class_id': class_id,
                                'class_name': class_name,
                                'timestamp': time.time()
                            })
                annotated_frame = draw_detections_on_frame(frame, detections)
                info_text = f"Video: {video_source} | Frame: {frame_count}/{total_frames} | FPS: {fps:.1f}"
                cv2.putText(annotated_frame, info_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                detection_text = f"Detections: {len(detections)}"
                cv2.putText(annotated_frame, detection_text, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                _, jpeg = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                frame_bytes = jpeg.tobytes()
                frame_b64 = base64.b64encode(frame_bytes).decode('utf-8')
                processing_time = time.time() - start_time
                yield {
                    "detections": detections,
                    "frame": frame_b64,
                    "frame_count": frame_count,
                    "total_frames": total_frames,
                    "video_source": video_source,
                    "processing_time": processing_time,
                    "fps": fps,
                    "timestamp": time.time(),
                    "repeated": False
                }
                frame_count += 1
                time.sleep(frame_delay)
    finally:
        cap.release() 
        print(f"Finished streaming video: {video_source}")

def stream_demo_sequence(loop: bool = True, fps: float = 24.0) -> Generator[Dict[str, Any], None, None]:
    """
    Stream all demo videos in sequence
    
    Args:
        loop: Whether to loop the sequence
        fps: Target frames per second
    
    Yields:
        Dictionary with detections and frame data
    """
    videos = get_available_demo_videos()
    
    if not videos:
        raise RuntimeError("No demo videos found")
    
    print(f"Found {len(videos)} demo videos")
    
    while True:
        for video in videos:
            try:
                for result in stream_video_frames(video['name'], loop=False, fps=fps):
                    yield result
            except Exception as e:
                print(f"Error streaming video {video['name']}: {e}")
                continue
        
        if not loop:
            break 