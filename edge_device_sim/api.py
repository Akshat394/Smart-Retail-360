from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from iot_edge_service import (
    get_all_devices_status, get_device_status, get_edge_analytics, get_cluster_status,
    get_emergency_events, create_iot_device, trigger_emergency_coordination
)

app = FastAPI()

class DeviceCreateRequest(BaseModel):
    deviceId: str
    deviceType: str
    location: str

class EmergencyCoordinationRequest(BaseModel):
    clusterId: str
    emergencyType: str
    details: Dict[str, Any]

@app.get("/devices")
def devices():
    return get_all_devices_status()

@app.get("/devices/{device_id}")
def device(device_id: str):
    status = get_device_status(device_id)
    if status is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return status

@app.get("/analytics")
def analytics():
    return get_edge_analytics()

@app.get("/clusters/{cluster_id}")
def cluster(cluster_id: str):
    return get_cluster_status(cluster_id)

@app.get("/emergencies")
def emergencies():
    return get_emergency_events()

@app.post("/devices")
def create_device(req: DeviceCreateRequest):
    device = create_iot_device(req.deviceId, req.deviceType, req.location)
    return device.get_status()

@app.post("/emergency-coordination")
def emergency_coordination(req: EmergencyCoordinationRequest):
    return trigger_emergency_coordination(req.clusterId, req.emergencyType, req.details) 