from fastapi import FastAPI, Body, HTTPException, BackgroundTasks, Request, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Literal, Optional
import joblib
import os
import numpy as np
import pandas as pd
from scipy.optimize import linprog
import heapq
import logging
import asyncio
from datetime import datetime, timedelta
import base64
import json
from fastapi.websockets import WebSocketDisconnect

# Import our advanced models
from models.forecasting import ARIMAModel, LSTMModel, TransformerModel, EnsembleModel

# Import vision components
from vision import VideoProcessor
from vision.video_streamer import stream_video_frames, stream_demo_sequence, get_available_demo_videos

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SmartRetail360 ML Service", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instances
ensemble_model = None
individual_models = {
    'arima': None,
    'lstm': None,
    'transformer': None
}

# Model configuration
MODEL_CONFIG = {
    'ensemble_method': 'weighted_average',
    'dynamic_weights': True,
    'sequence_length': 60,
    'prediction_steps': 30,
    'retrain_interval_hours': 24
}

# Pydantic models for API
class ForecastRequest(BaseModel):
    data: List[float]
    steps: Optional[int] = 30
    model_type: Optional[str] = 'ensemble'  # 'ensemble', 'arima', 'lstm', 'transformer'
    return_confidence: Optional[bool] = True

class ForecastResponse(BaseModel):
    predictions: List[float]
    confidence_intervals: Optional[Dict[str, List[float]]] = None
    model_performance: Optional[Dict[str, Any]] = None
    model_weights: Optional[Dict[str, float]] = None
    timestamp: str
    model_type: str

class ModelTrainingRequest(BaseModel):
    data: List[float]
    model_type: Optional[str] = 'ensemble'
    epochs: Optional[int] = 100
    batch_size: Optional[int] = 32

class ModelTrainingResponse(BaseModel):
    status: str
    message: str
    training_history: Optional[Dict[str, Any]] = None
    model_performance: Optional[Dict[str, Any]] = None
    timestamp: str

class PredictRequest(BaseModel):
    data: List[float]
    params: Dict[str, Any] = {}

class DeliveryModeRequest(BaseModel):
    distance: float
    priority: Literal['low', 'normal', 'high']
    package_size: Literal['small', 'medium', 'large']

class DeliveryModeResponse(BaseModel):
    mode: str
    reason: str

class RouteNode(BaseModel):
    id: str
    neighbors: Dict[str, float]  # neighbor_id -> cost

class RouteRequest(BaseModel):
    graph: Dict[str, Dict[str, float]]  # node_id -> {neighbor_id: cost}
    start: str
    end: str

class RouteResponse(BaseModel):
    path: List[str]
    total_cost: float

class StockOptimizationRequest(BaseModel):
    supply: List[float]
    demand: List[float]
    cost_matrix: List[List[float]]  # cost[i][j]: cost from supply i to demand j

class StockOptimizationResponse(BaseModel):
    allocation: List[List[float]]
    total_cost: float

# Vision-related Pydantic models
class VisionAnalysisRequest(BaseModel):
    image_data: Optional[str] = None  # Base64 encoded image
    video_source: Optional[str] = None  # Video source (file path, camera index, or 'demo')

class VisionAnalysisResponse(BaseModel):
    detections: List[Dict[str, Any]]
    inventory_analysis: Dict[str, Any]
    anomalies: List[Dict[str, Any]]
    annotated_frame: Optional[str] = None  # Base64 encoded annotated frame
    timestamp: str

class VideoStreamRequest(BaseModel):
    action: Literal['start', 'stop', 'status']  # 'start', 'stop', 'status'
    video_source: Optional[str] = None

class VideoStreamResponse(BaseModel):
    status: str
    message: str
    is_processing: bool
    timestamp: str

# Load models at startup
ARIMA_PATH = 'arima_model.pkl'
ANOMALY_PATH = 'anomaly_model.pkl'
arima_model = joblib.load(ARIMA_PATH) if os.path.exists(ARIMA_PATH) else None
anomaly_model = joblib.load(ANOMALY_PATH) if os.path.exists(ANOMALY_PATH) else None

# Initialize video processor
video_processor = None

@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    global ensemble_model, individual_models
    
    logger.info("Initializing SmartRetail360 ML Service...")
    
    try:
        # Initialize ensemble model
        ensemble_model = EnsembleModel(
            ensemble_method=MODEL_CONFIG['ensemble_method'],
            dynamic_weights=MODEL_CONFIG['dynamic_weights']
        )
        
        # Initialize individual models
        individual_models['arima'] = ARIMAModel()
        individual_models['lstm'] = LSTMModel(
            sequence_length=MODEL_CONFIG['sequence_length']
        )
        individual_models['transformer'] = TransformerModel(
            sequence_length=MODEL_CONFIG['sequence_length']
        )
        
        # Try to load pre-trained models
        await load_pretrained_models()
        
        # Initialize video processor
        global video_processor
        try:
            video_processor = VideoProcessor()
            logger.info("Video processor initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize video processor: {e}")
            video_processor = None
        
        logger.info("ML Service initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing ML Service: {e}")
        raise

async def load_pretrained_models():
    """Load pre-trained models if available"""
    global ensemble_model, individual_models
    
    try:
        # Try to load ensemble model
        if os.path.exists('models/ensemble/ensemble_config.pkl'):
            ensemble_model.load_ensemble('models/ensemble')
            logger.info("Loaded pre-trained ensemble model")
        
        # Try to load individual models
        for name, model in individual_models.items():
            model_path = f'models/{name}_model/{name}.h5'
            scaler_path = f'models/{name}_model/{name}_scaler.pkl'
            
            if os.path.exists(model_path) and os.path.exists(scaler_path):
                try:
                    model.load_model(model_path, scaler_path)
                    logger.info(f"Loaded pre-trained {name} model")
                except Exception as e:
                    logger.warning(f"Failed to load {name} model: {e}")
                    
    except Exception as e:
        logger.warning(f"Failed to load pre-trained models: {e}")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "SmartRetail360 ML Service",
        "version": "2.0.0",
        "status": "running",
        "models_available": {
            "ensemble": ensemble_model.is_fitted if ensemble_model else False,
            "arima": individual_models['arima'].is_fitted if individual_models['arima'] else False,
            "lstm": individual_models['lstm'].is_fitted if individual_models['lstm'] else False,
            "transformer": individual_models['transformer'].is_fitted if individual_models['transformer'] else False
        }
    }

@app.post("/forecast", response_model=ForecastResponse)
async def forecast_demand(request: ForecastRequest):
    """Generate demand forecast using advanced ML models"""
    try:
        data = np.array(request.data)
        
        if len(data) < MODEL_CONFIG['sequence_length']:
            raise HTTPException(
                status_code=400, 
                detail=f"Data must have at least {MODEL_CONFIG['sequence_length']} points"
            )
        
        # Select model based on request
        if request.model_type == 'ensemble':
            if not ensemble_model or not ensemble_model.is_fitted:
                raise HTTPException(
                    status_code=400, 
                    detail="Ensemble model not trained. Please train the model first."
                )
            
            # Make ensemble prediction
            if request.return_confidence:
                predictions, confidence_intervals = ensemble_model.predict(
                    data, steps=request.steps, return_confidence=True
                )
                confidence_dict = {
                    'lower_bound': confidence_intervals[0].tolist(),
                    'upper_bound': confidence_intervals[1].tolist()
                }
            else:
                predictions = ensemble_model.predict(data, steps=request.steps)
                confidence_dict = None
            
            # Get model performance and weights
            model_performance = ensemble_model.get_model_performance()
            model_weights = ensemble_model.get_ensemble_weights()
            
        else:
            # Use individual model
            model = individual_models.get(request.model_type)
            if not model or not model.is_fitted:
                raise HTTPException(
                    status_code=400, 
                    detail=f"{request.model_type} model not trained. Please train the model first."
                )
            
            # Make prediction
            if request.model_type == 'arima':
                predictions, _ = model.predict(steps=request.steps)
            else:
                predictions = model.predict(data, steps=request.steps)
            
            confidence_dict = None
            model_performance = None
            model_weights = None
        
        return ForecastResponse(
            predictions=predictions.tolist(),
            confidence_intervals=confidence_dict,
            model_performance=model_performance,
            model_weights=model_weights,
            timestamp=datetime.now().isoformat(),
            model_type=request.model_type
        )
        
    except Exception as e:
        logger.error(f"Error in forecast: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train", response_model=ModelTrainingResponse)
async def train_model(request: ModelTrainingRequest, background_tasks: BackgroundTasks):
    """Train ML models with advanced features"""
    try:
        data = np.array(request.data)
        
        if len(data) < MODEL_CONFIG['sequence_length'] * 2:
            raise HTTPException(
                status_code=400, 
                detail=f"Training data must have at least {MODEL_CONFIG['sequence_length'] * 2} points"
            )
        
        if request.model_type == 'ensemble':
            # Train ensemble model
            if not ensemble_model:
                raise HTTPException(status_code=500, detail="Ensemble model not initialized")
            
            # Train in background to avoid blocking
            background_tasks.add_task(
                train_ensemble_model, 
                data, 
                request.epochs, 
                request.batch_size
            )
            
            return ModelTrainingResponse(
                status="training_started",
                message="Ensemble model training started in background",
                timestamp=datetime.now().isoformat()
            )
            
        else:
            # Train individual model
            model = individual_models.get(request.model_type)
            if not model:
                raise HTTPException(status_code=400, detail=f"Unknown model type: {request.model_type}")
            
            # Train in background
            background_tasks.add_task(
                train_individual_model,
                model,
                request.model_type,
                data,
                request.epochs,
                request.batch_size
            )
            
            return ModelTrainingResponse(
                status="training_started",
                message=f"{request.model_type} model training started in background",
                timestamp=datetime.now().isoformat()
            )
            
    except Exception as e:
        logger.error(f"Error in train: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def train_ensemble_model(data: np.ndarray, epochs: int, batch_size: int):
    """Train ensemble model asynchronously"""
    global ensemble_model
    
    try:
        logger.info("Starting ensemble model training...")
        
        # Train ensemble model
        history = ensemble_model.fit(
            data=data,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2
        )
        
        # Save trained model
        ensemble_model.save_ensemble('models/ensemble')
        
        logger.info("Ensemble model training completed successfully")
        
    except Exception as e:
        logger.error(f"Error training ensemble model: {e}")

async def train_individual_model(model, model_type: str, data: np.ndarray, epochs: int, batch_size: int):
    """Train individual model asynchronously"""
    try:
        logger.info(f"Starting {model_type} model training...")
        
        if model_type == 'arima':
            # Train ARIMA model
            model.fit(data)
        else:
            # Train neural network models
            history = model.fit(
                data=data,
                epochs=epochs,
                batch_size=batch_size,
                validation_split=0.2,
                verbose=0
            )
        
        # Save trained model
        model_save_path = f'models/{model_type}_model'
        os.makedirs(model_save_path, exist_ok=True)
        model.save_model(
            model_path=f'{model_save_path}/{model_type}.h5',
            scaler_path=f'{model_save_path}/{model_type}_scaler.pkl'
        )
        
        logger.info(f"{model_type} model training completed successfully")
        
    except Exception as e:
        logger.error(f"Error training {model_type} model: {e}")

@app.get("/models/status")
async def get_model_status():
    """Get status of all models"""
    status = {}
    
    # Ensemble model status
    if ensemble_model:
        status['ensemble'] = {
            'is_fitted': ensemble_model.is_fitted,
            'method': ensemble_model.ensemble_method,
            'weights': ensemble_model.get_ensemble_weights() if ensemble_model.is_fitted else None,
            'performance': ensemble_model.get_model_performance() if ensemble_model.is_fitted else None
        }
    
    # Individual models status
    for name, model in individual_models.items():
        if model:
            status[name] = {
                'is_fitted': model.is_fitted,
                'model_type': type(model).__name__
            }
    
    return status

@app.get("/models/performance")
async def get_model_performance():
    """Get performance metrics for all models"""
    if not ensemble_model or not ensemble_model.is_fitted:
        raise HTTPException(status_code=400, detail="No trained models available")
    
    return {
        'ensemble_performance': ensemble_model.get_model_performance(),
        'ensemble_weights': ensemble_model.get_ensemble_weights(),
        'timestamp': datetime.now().isoformat()
    }

@app.post("/models/retrain")
async def retrain_models(background_tasks: BackgroundTasks):
    """Retrain all models with latest data"""
    # This would typically fetch latest data from database
    # For now, we'll use a placeholder
    logger.info("Retrain models endpoint called")
    
    return {
        "status": "retrain_scheduled",
        "message": "Model retraining scheduled",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "service": "SmartRetail360 ML Service",
        "version": "2.0.0",
        "models_loaded": {
            "ensemble": ensemble_model.is_fitted if ensemble_model else False,
            "arima": individual_models['arima'].is_fitted if individual_models['arima'] else False,
            "lstm": individual_models['lstm'].is_fitted if individual_models['lstm'] else False,
            "transformer": individual_models['transformer'].is_fitted if individual_models['transformer'] else False
        },
        "timestamp": datetime.now().isoformat()
    }

@app.post('/predict')
def predict(req: PredictRequest):
    # Forecast next N days using ARIMA
    n_periods = req.params.get('n_periods', 14)
    y = np.array(req.data)
    if arima_model:
        # Refit ARIMA if new data is provided
        model = arima_model.apply(y, refit=True) if len(y) > 30 else arima_model
        forecast_res = model.get_forecast(steps=n_periods)
        forecast = forecast_res.predicted_mean.tolist()
        conf_int = forecast_res.conf_int().values.tolist()
        return {"forecast": forecast, "conf_int": conf_int}
    else:
        return {"error": "ARIMA model not available"}

@app.post('/detect-anomalies')
def detect_anomalies(req: PredictRequest):
    # Use IsolationForest to flag anomalies
    y = np.array(req.data).reshape(-1, 1)
    if anomaly_model:
        preds = anomaly_model.predict(y)
        anomalies = [i for i, v in enumerate(preds) if v == -1]
        return {"anomalies": anomalies}
    else:
        return {"error": "Anomaly model not available"}

@app.post('/explain')
def explain(req: PredictRequest):
    # Feature importance is not meaningful for ARIMA, so return placeholder
    return {
        "feature_importance": [
            {"feature": "lagged_demand", "importance": 1.0}
        ]
    }

@app.post('/recommend_delivery_mode', response_model=DeliveryModeResponse)
def recommend_delivery_mode(req: DeliveryModeRequest):
    # Simple logic for demonstration
    if req.distance <= 5 and req.package_size == 'small':
        return {"mode": "drone", "reason": "Fastest and lowest CO2 for small packages under 5km."}
    if req.package_size == 'large':
        return {"mode": "truck", "reason": "Only trucks can handle large packages."}
    if req.priority == 'high':
        return {"mode": "autonomous_vehicle", "reason": "High priority orders get fastest available mode."}
    if req.distance <= 15:
        return {"mode": "mini_truck", "reason": "Efficient for medium distances and package sizes."}
    return {"mode": "truck", "reason": "Default: best for long distances or heavy loads."}

# A* search for shortest path
@app.post('/recommend/route', response_model=RouteResponse)
def recommend_route(req: RouteRequest):
    graph = req.graph
    start, end = req.start, req.end
    # Use Dijkstra (A* with zero heuristic)
    queue = [(0, start, [start])]
    visited = set()
    while queue:
        cost, node, path = heapq.heappop(queue)
        if node == end:
            return {"path": path, "total_cost": cost}
        if node in visited:
            continue
        visited.add(node)
        for neighbor, edge_cost in graph.get(node, {}).items():
            if neighbor not in visited:
                heapq.heappush(queue, (cost + edge_cost, neighbor, path + [neighbor]))
    return {"path": [], "total_cost": float('inf')}

# Linear programming for stock allocation
@app.post('/optimize/stock', response_model=StockOptimizationResponse)
def optimize_stock(req: StockOptimizationRequest):
    supply = req.supply
    demand = req.demand
    cost_matrix = np.array(req.cost_matrix)
    n_supply, n_demand = len(supply), len(demand)
    c = cost_matrix.flatten()
    A_eq = []
    b_eq = []
    # Supply constraints
    for i in range(n_supply):
        row = [0] * (n_supply * n_demand)
        for j in range(n_demand):
            row[i * n_demand + j] = 1
        A_eq.append(row)
        b_eq.append(supply[i])
    # Demand constraints
    for j in range(n_demand):
        row = [0] * (n_supply * n_demand)
        for i in range(n_supply):
            row[i * n_demand + j] = 1
        A_eq.append(row)
        b_eq.append(demand[j])
    bounds = [(0, None)] * (n_supply * n_demand)
    res = linprog(c, A_eq=A_eq, b_eq=b_eq, bounds=bounds, method='highs')
    allocation = np.array(res.x).reshape((n_supply, n_demand)).tolist() if res.success else []
    total_cost = float(res.fun) if res.success else float('inf')
    return {"allocation": allocation, "total_cost": total_cost}

# ============================================================================
# VISION ENDPOINTS
# ============================================================================

@app.post("/vision/analyze", response_model=VisionAnalysisResponse)
async def analyze_image(request: VisionAnalysisRequest):
    """Analyze a single image for object detection and inventory tracking"""
    if not video_processor:
        raise HTTPException(status_code=503, detail="Video processor not available")
    
    try:
        if request.image_data:
            # Decode base64 image
            image_bytes = base64.b64decode(request.image_data)
            results = video_processor.process_image(image_bytes)
        else:
            # Get latest results from video stream
            results = video_processor.get_latest_results()
        
        return VisionAnalysisResponse(
            detections=results.get('detections', []),
            inventory_analysis=results.get('inventory_analysis', {}),
            anomalies=results.get('anomalies', []),
            annotated_frame=results.get('annotated_frame'),
            timestamp=results.get('timestamp', datetime.now().isoformat())
        )
    
    except Exception as e:
        logger.error(f"Vision analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Vision analysis failed: {str(e)}")

@app.post("/vision/stream", response_model=VideoStreamResponse)
async def control_video_stream(request: VideoStreamRequest):
    """Control video stream processing"""
    if not video_processor:
        raise HTTPException(status_code=503, detail="Video processor not available")
    
    try:
        if request.action == 'start':
            video_processor.start_processing(request.video_source)
            return VideoStreamResponse(
                status="success",
                message="Video stream started",
                is_processing=True,
                timestamp=datetime.now().isoformat()
            )
        
        elif request.action == 'stop':
            video_processor.stop_processing()
            return VideoStreamResponse(
                status="success",
                message="Video stream stopped",
                is_processing=False,
                timestamp=datetime.now().isoformat()
            )
        
        elif request.action == 'status':
            return VideoStreamResponse(
                status="success",
                message="Video stream status retrieved",
                is_processing=video_processor.is_processing,
                timestamp=datetime.now().isoformat()
            )
    
    except Exception as e:
        logger.error(f"Video stream control error: {e}")
        raise HTTPException(status_code=500, detail=f"Video stream control failed: {str(e)}")

@app.get("/vision/latest")
async def get_latest_vision_results():
    """Get latest vision analysis results"""
    if not video_processor:
        raise HTTPException(status_code=503, detail="Video processor not available")
    
    try:
        results = video_processor.get_latest_results()
        return {
            "detections": results.get('detections', []),
            "inventory_analysis": results.get('inventory_analysis', {}),
            "inventory_update": results.get('inventory_update', {}),
            "anomalies": results.get('anomalies', []),
            "frame_info": results.get('frame_info', {}),
            "timestamp": results.get('timestamp', datetime.now().isoformat())
        }
    
    except Exception as e:
        logger.error(f"Get latest results error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get latest results: {str(e)}")

@app.get("/vision/inventory")
async def get_inventory_summary():
    """Get comprehensive inventory summary"""
    if not video_processor:
        raise HTTPException(status_code=503, detail="Video processor not available")
    
    try:
        return video_processor.get_inventory_summary()
    
    except Exception as e:
        logger.error(f"Get inventory summary error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get inventory summary: {str(e)}")

@app.get("/vision/anomalies")
async def get_anomaly_summary():
    """Get anomaly detection summary"""
    if not video_processor:
        raise HTTPException(status_code=503, detail="Video processor not available")
    
    try:
        return video_processor.get_anomaly_summary()
    
    except Exception as e:
        logger.error(f"Get anomaly summary error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get anomaly summary: {str(e)}")

@app.post("/vision/reset")
async def reset_vision_system():
    """Reset vision system state"""
    if not video_processor:
        raise HTTPException(status_code=503, detail="Video processor not available")
    
    try:
        video_processor.reset()
        return {
            "status": "success",
            "message": "Vision system reset successfully",
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Reset vision system error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset vision system: {str(e)}")

@app.websocket("/ws/vision")
async def websocket_vision(websocket: WebSocket):
    """WebSocket endpoint for real-time vision streaming"""
    await websocket.accept()
    try:
        while True:
            if video_processor and video_processor.is_processing:
                results = video_processor.get_latest_results()
                await websocket.send_text(json.dumps(results))
            await asyncio.sleep(0.1)  # 10 FPS
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket vision error: {e}")

@app.get("/vision/demo-videos")
def list_demo_videos():
    videos = get_available_demo_videos()
    # Return as list of {label, value} for frontend dropdown
    return JSONResponse([
        {"label": video['label'], "value": video['name']} for video in videos
    ])

@app.get("/vision/stream/demo")
async def vision_stream_demo_get(
    video_source: str = Query("4292301-uhd_3840_2160_25fps"),
    fps: float = Query(24.0),
    loop: bool = Query(True)
):
    """GET endpoint for demo video streaming - streams selected video"""
    def frame_generator():
        try:
            for result in stream_video_frames(video_source, loop=loop, fps=fps):
                yield f"data: {json.dumps(result)}\n\n"
        except Exception as e:
            logger.error(f"Error in demo sequence stream: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    return StreamingResponse(frame_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 