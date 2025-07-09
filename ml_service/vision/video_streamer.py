import cv2
import os
import time
from ultralytics import YOLO

model = YOLO('yolov8n.pt')  # Make sure yolov8n.pt is present or let it download

DEMO_VIDEO_DIR = os.path.join(os.path.dirname(__file__), '../demo_videos')

def get_demo_video_path(video_source):
    return os.path.join(DEMO_VIDEO_DIR, f"{video_source}.mp4")

def stream_video_frames(video_source):
    video_path = get_demo_video_path(video_source)
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Demo video {video_path} not found.")
    cap = cv2.VideoCapture(video_path)
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        # YOLOv8 inference
        results = model(frame)
        detections = []
        for r in results:
            for box in r.boxes:
                detections.append({
                    'bbox': box.xyxy[0].tolist(),
                    'confidence': float(box.conf[0]),
                    'class_id': int(box.cls[0]),
                    'class_name': model.names[int(box.cls[0])]
                })
        _, jpeg = cv2.imencode('.jpg', frame)
        frame_bytes = jpeg.tobytes()
        yield {
            "detections": detections,
            "frame": frame_bytes
        }
        time.sleep(0.1)
    cap.release() 