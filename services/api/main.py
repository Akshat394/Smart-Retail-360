from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import os
from datetime import datetime, timedelta
import json
import random

app = FastAPI(title="SmartRetail360 API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock data for demo purposes
@app.get("/")
async def root():
    return {"message": "SmartRetail360 API", "status": "running", "version": "1.0.0"}

@app.get("/metrics/forecast_accuracy")
async def get_forecast_accuracy():
    """Get forecast accuracy metrics"""
    return {
        "overall_mape": round(random.uniform(5.0, 8.0), 2),
        "models": {
            "arima": {"mape": 8.4, "rmse": 142.3, "r2": 0.89},
            "lstm": {"mape": 6.2, "rmse": 128.9, "r2": 0.92},
            "ensemble": {"mape": 5.8, "rmse": 118.6, "r2": 0.94}
        },
        "last_updated": datetime.now().isoformat()
    }

@app.get("/routes/{delivery_id}")
async def get_route(delivery_id: str, mode: str = "balanced"):
    """Get optimized route for delivery"""
    return {
        "delivery_id": delivery_id,
        "mode": mode,
        "route": {
            "distance": f"{random.uniform(20, 60):.1f} km",
            "estimated_time": f"{random.randint(30, 90)} min",
            "fuel_cost": f"${random.uniform(10, 30):.2f}",
            "co2_emission": f"{random.uniform(5, 15):.1f} kg",
            "optimization_savings": f"{random.randint(15, 35)}%"
        },
        "waypoints": [
            {"lat": 40.7128, "lng": -74.0060, "address": "Warehouse A"},
            {"lat": 40.7589, "lng": -73.9851, "address": "Stop 1"},
            {"lat": 40.6782, "lng": -73.9442, "address": "Stop 2"},
            {"lat": 40.6892, "lng": -74.0445, "address": "Destination"}
        ]
    }

@app.get("/events/recent")
async def get_recent_events():
    """Get recent supply chain events"""
    events = []
    event_types = ["order_placed", "shipment_dispatched", "delivery_completed", "inventory_updated", "anomaly_detected"]
    
    for i in range(20):
        events.append({
            "id": f"EVT-{1000 + i}",
            "type": random.choice(event_types),
            "timestamp": (datetime.now() - timedelta(minutes=random.randint(1, 1440))).isoformat(),
            "description": f"Event {i+1} description",
            "severity": random.choice(["low", "medium", "high"]),
            "location": random.choice(["Warehouse A", "Distribution Center", "Store 123", "Route NE-42"])
        })
    
    return {"events": events}

@app.get("/inventory/status")
async def get_inventory_status():
    """Get current inventory status"""
    return {
        "total_skus": 15847,
        "in_stock": 68,
        "low_stock": 22,
        "out_of_stock": 7,
        "overstock": 3,
        "reorder_alerts": 156,
        "last_updated": datetime.now().isoformat()
    }

@app.get("/analytics/demand_forecast")
async def get_demand_forecast():
    """Get demand forecast data"""
    forecast_data = []
    base_date = datetime.now()
    
    for i in range(30):
        date = base_date + timedelta(days=i)
        actual = random.randint(1000, 1600) if i < 7 else None
        predicted = random.randint(1000, 1600)
        
        forecast_data.append({
            "date": date.strftime("%Y-%m-%d"),
            "actual": actual,
            "predicted": predicted,
            "confidence": random.randint(85, 98)
        })
    
    return {"forecast": forecast_data}

@app.get("/system/health")
async def get_system_health():
    """Get system health status"""
    services = [
        {"name": "Hadoop HDFS", "status": "healthy", "uptime": "99.9%"},
        {"name": "Apache Kafka", "status": "healthy", "uptime": "99.8%"},
        {"name": "HBase", "status": "healthy", "uptime": "99.7%"},
        {"name": "MongoDB", "status": "healthy", "uptime": "99.9%"},
        {"name": "Spark Cluster", "status": "warning", "uptime": "98.2%"},
        {"name": "Redis Cache", "status": "healthy", "uptime": "99.9%"}
    ]
    
    return {"services": services, "overall_status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)