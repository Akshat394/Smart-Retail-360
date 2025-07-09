import numpy as np
import json
import time
import threading
import queue
import socket
import struct
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import random
import math
import asyncio
import websockets
from dataclasses import dataclass
from enum import Enum

class DeviceType(Enum):
    SENSOR = "sensor"
    GATEWAY = "gateway"
    CONTROLLER = "controller"
    CAMERA = "camera"
    ROBOT = "robot"
    DRONE = "drone"

class SensorType(Enum):
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"
    VIBRATION = "vibration"
    POWER = "power"
    PRESSURE = "pressure"
    LIGHT = "light"
    SOUND = "sound"
    MOTION = "motion"
    AIR_QUALITY = "air_quality"
    RFID = "rfid"

@dataclass
class SensorReading:
    sensor_type: SensorType
    value: float
    unit: str
    timestamp: datetime
    quality: float  # 0-1, data quality score

@dataclass
class DeviceStatus:
    device_id: str
    is_online: bool
    battery_level: float
    signal_strength: float
    last_heartbeat: datetime
    firmware_version: str
    location: str
    cluster_id: Optional[str] = None

class EdgeMLModel:
    """Lightweight ML model for edge inference"""
    
    def __init__(self, model_type: str):
        self.model_type = model_type
        self.is_trained = False
        self.accuracy = 0.0
        self.inference_time = 0.0
        self.last_updated = None
        
    def train(self, training_data: List[Dict[str, Any]]) -> bool:
        """Train the model with local data"""
        try:
            # Simulate training process
            time.sleep(0.1)  # Simulate training time
            self.is_trained = True
            self.accuracy = random.uniform(0.85, 0.95)
            self.last_updated = datetime.now()
            return True
        except Exception as e:
            print(f"Training failed: {e}")
            return False
    
    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Make prediction using the model"""
        if not self.is_trained:
            return {'error': 'Model not trained'}
        
        start_time = time.time()
        
        # Simulate inference based on model type
        if self.model_type == 'anomaly_detection':
            prediction = self._anomaly_detection_inference(input_data)
        elif self.model_type == 'predictive_maintenance':
            prediction = self._predictive_maintenance_inference(input_data)
        elif self.model_type == 'quality_control':
            prediction = self._quality_control_inference(input_data)
        else:
            prediction = {'error': 'Unknown model type'}
        
        self.inference_time = time.time() - start_time
        
        return {
            'prediction': prediction,
            'confidence': random.uniform(0.7, 0.95),
            'inference_time': self.inference_time,
            'model_type': self.model_type,
            'timestamp': datetime.now().isoformat()
        }
    
    def _anomaly_detection_inference(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Anomaly detection inference"""
        values = list(data.values())
        mean_val = np.mean(values)
        std_val = np.std(values)
        
        anomalies = []
        for key, value in data.items():
            if abs(value - mean_val) > 2 * std_val:
                anomalies.append({
                    'sensor': key,
                    'value': value,
                    'severity': 'high' if abs(value - mean_val) > 3 * std_val else 'medium'
                })
        
        return {
            'anomalies': anomalies,
            'baseline_mean': mean_val,
            'baseline_std': std_val
        }
    
    def _predictive_maintenance_inference(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Predictive maintenance inference"""
        # Simulate equipment health prediction
        health_score = random.uniform(0.6, 1.0)
        maintenance_needed = health_score < 0.8
        
        return {
            'health_score': health_score,
            'maintenance_needed': maintenance_needed,
            'estimated_failure_time': datetime.now() + timedelta(days=random.randint(1, 30)) if maintenance_needed else None,
            'recommended_actions': ['inspect', 'clean', 'calibrate'] if maintenance_needed else []
        }
    
    def _quality_control_inference(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Quality control inference"""
        # Simulate quality assessment
        quality_score = random.uniform(0.7, 1.0)
        defects_detected = random.randint(0, 3)
        
        return {
            'quality_score': quality_score,
            'defects_detected': defects_detected,
            'pass_fail': quality_score > 0.85,
            'defect_types': ['surface_scratch', 'dimension_error', 'color_variation'][:defects_detected]
        }

class EdgeAnomalyDetector:
    """Real-time anomaly detection using lightweight ML models"""
    
    def __init__(self, sensor_type: str):
        self.sensor_type = sensor_type
        self.window_size = 50
        self.data_buffer = []
        self.threshold_multiplier = 2.5
        self.baseline_mean = 0
        self.baseline_std = 1
        self.ml_model = EdgeMLModel('anomaly_detection')
        
    def update_baseline(self, new_data: float):
        """Update baseline statistics"""
        self.data_buffer.append(new_data)
        
        if len(self.data_buffer) > self.window_size:
            self.data_buffer.pop(0)
            
        if len(self.data_buffer) >= 10:
            self.baseline_mean = np.mean(self.data_buffer)
            self.baseline_std = np.std(self.data_buffer)
    
    def detect_anomaly(self, value: float) -> Dict[str, Any]:
        """Detect anomaly using statistical methods and ML"""
        if len(self.data_buffer) < 10:
            self.update_baseline(value)
            return {'is_anomaly': False, 'confidence': 0.0, 'severity': 'low'}
        
        # Statistical anomaly detection
        z_score = abs((value - self.baseline_mean) / self.baseline_std) if self.baseline_std > 0 else 0
        is_anomaly = z_score > self.threshold_multiplier
        
        # ML-based anomaly detection
        ml_result = self.ml_model.predict({self.sensor_type: value})
        
        # Combine statistical and ML results
        ml_anomaly = len(ml_result.get('prediction', {}).get('anomalies', [])) > 0
        combined_anomaly = is_anomaly or ml_anomaly
        
        # Calculate confidence and severity
        confidence = min(z_score / self.threshold_multiplier, 1.0)
        
        if z_score > self.threshold_multiplier * 2:
            severity = 'critical'
        elif z_score > self.threshold_multiplier * 1.5:
            severity = 'high'
        elif z_score > self.threshold_multiplier:
            severity = 'medium'
        else:
            severity = 'low'
        
        # Update baseline
        self.update_baseline(value)
        
        return {
            'is_anomaly': combined_anomaly,
            'confidence': confidence,
            'severity': severity,
            'z_score': z_score,
            'value': value,
            'baseline_mean': self.baseline_mean,
            'baseline_std': self.baseline_std,
            'ml_prediction': ml_result,
            'timestamp': datetime.now().isoformat()
        }

class MQTTBuffer:
    """MQTT fallback buffer for offline-first operation"""
    
    def __init__(self, max_size: int = 1000):
        self.buffer = queue.Queue(maxsize=max_size)
        self.max_size = max_size
        self.retry_attempts = 3
        self.retry_delay = 5  # seconds
        
    def add_message(self, topic: str, payload: Dict[str, Any]) -> bool:
        """Add message to buffer"""
        try:
            message = {
                'topic': topic,
                'payload': payload,
                'timestamp': datetime.now().isoformat(),
                'retry_count': 0
            }
            
            if self.buffer.full():
                # Remove oldest message
                try:
                    self.buffer.get_nowait()
                except queue.Empty:
                    pass
            
            self.buffer.put(message)
            return True
        except Exception as e:
            print(f"Error adding message to buffer: {e}")
            return False
    
    def get_messages(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get messages from buffer"""
        messages = []
        for _ in range(min(limit, self.buffer.qsize())):
            try:
                message = self.buffer.get_nowait()
                messages.append(message)
            except queue.Empty:
                break
        return messages
    
    def mark_sent(self, message: Dict[str, Any]):
        """Mark message as successfully sent"""
        # In real implementation, this would remove the message from buffer
        pass
    
    def mark_failed(self, message: Dict[str, Any]):
        """Mark message as failed to send"""
        message['retry_count'] += 1
        if message['retry_count'] < self.retry_attempts:
            # Re-add to buffer for retry
            self.buffer.put(message)
    
    def get_buffer_status(self) -> Dict[str, Any]:
        """Get buffer status"""
        return {
            'size': self.buffer.qsize(),
            'max_size': self.max_size,
            'utilization': self.buffer.qsize() / self.max_size * 100
        }

class DeviceCluster:
    """Device clustering for coordinated operations"""
    
    def __init__(self, cluster_id: str, location: str):
        self.cluster_id = cluster_id
        self.location = location
        self.devices: List[str] = []
        self.cluster_head: Optional[str] = None
        self.created_at = datetime.now()
        self.status = 'active'
        
    def add_device(self, device_id: str) -> bool:
        """Add device to cluster"""
        if device_id not in self.devices:
            self.devices.append(device_id)
            if not self.cluster_head:
                self.cluster_head = device_id
            return True
        return False
    
    def remove_device(self, device_id: str) -> bool:
        """Remove device from cluster"""
        if device_id in self.devices:
            self.devices.remove(device_id)
            if self.cluster_head == device_id:
                self.cluster_head = self.devices[0] if self.devices else None
            return True
        return False
    
    def get_status(self) -> Dict[str, Any]:
        """Get cluster status"""
        return {
            'cluster_id': self.cluster_id,
            'location': self.location,
            'device_count': len(self.devices),
            'cluster_head': self.cluster_head,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }

class RaftConsensus:
    """Distributed consensus using Raft algorithm for emergency coordination"""
    
    def __init__(self, node_id: str, nodes: List[str]):
        self.node_id = node_id
        self.nodes = nodes
        self.current_term = 0
        self.voted_for = None
        self.state = 'follower'  # follower, candidate, leader
        self.leader_id = None
        self.election_timeout = random.uniform(150, 300)  # milliseconds
        self.last_heartbeat = time.time()
        self.log = []
        self.commit_index = 0
        self.last_applied = 0
        
        # Leader-specific state
        self.next_index = {}
        self.match_index = {}
        
    def start_election(self):
        """Start leader election"""
        self.current_term += 1
        self.state = 'candidate'
        self.voted_for = self.node_id
        self.leader_id = None
        
        # Request votes from other nodes
        votes_received = 1  # Vote for self
        
        for node in self.nodes:
            if node != self.node_id:
                # Simulate vote request
                if self.request_vote(node):
                    votes_received += 1
        
        # Check if majority achieved
        if votes_received > len(self.nodes) / 2:
            self.become_leader()
        else:
            self.state = 'follower'
    
    def request_vote(self, node: str) -> bool:
        """Request vote from another node"""
        # Simulate network communication
        # In real implementation, this would be actual network call
        return random.random() > 0.3  # 70% success rate
    
    def become_leader(self):
        """Become the leader"""
        self.state = 'leader'
        self.leader_id = self.node_id
        
        # Initialize leader state
        for node in self.nodes:
            self.next_index[node] = len(self.log)
            self.match_index[node] = 0
        
        print(f"Node {self.node_id} became leader for term {self.current_term}")
    
    def append_entries(self, entries: List[Dict[str, Any]]) -> bool:
        """Append entries to log"""
        if self.state != 'leader':
            return False
        
        for entry in entries:
            self.log.append({
                'term': self.current_term,
                'index': len(self.log),
                'command': entry
            })
        
        return True
    
    def replicate_log(self):
        """Replicate log to followers"""
        if self.state != 'leader':
            return
        
        for node in self.nodes:
            if node != self.node_id:
                # Simulate log replication
                success = random.random() > 0.2  # 80% success rate
                if success:
                    self.match_index[node] = len(self.log) - 1
    
    def update_commit_index(self):
        """Update commit index based on majority"""
        if self.state != 'leader':
            return
        
        # Find the highest index that has been replicated to majority
        sorted_indices = sorted(self.match_index.values())
        majority_index = sorted_indices[len(sorted_indices) // 2]
        
        if majority_index > self.commit_index:
            self.commit_index = majority_index
    
    def apply_committed_entries(self):
        """Apply committed entries"""
        while self.last_applied < self.commit_index:
            self.last_applied += 1
            if self.last_applied < len(self.log):
                entry = self.log[self.last_applied]
                self.execute_command(entry['command'])
    
    def execute_command(self, command: Dict[str, Any]):
        """Execute a command"""
        print(f"Executing command: {command}")
        # In real implementation, this would execute the actual command
    
    def receive_heartbeat(self, leader_id: str, term: int):
        """Receive heartbeat from leader"""
        if term >= self.current_term:
            self.current_term = term
            self.leader_id = leader_id
            self.state = 'follower'
            self.last_heartbeat = time.time()
    
    def get_status(self) -> Dict[str, Any]:
        """Get consensus status"""
        return {
            'node_id': self.node_id,
            'current_term': self.current_term,
            'state': self.state,
            'leader_id': self.leader_id,
            'log_length': len(self.log),
            'commit_index': self.commit_index,
            'last_applied': self.last_applied
        }

class IoTDevice:
    """Enhanced IoT device with edge computing capabilities"""
    
    def __init__(self, device_id: str, device_type: DeviceType, location: str):
        self.device_id = device_id
        self.device_type = device_type
        self.location = location
        self.is_online = True
        self.battery_level = 100.0
        self.signal_strength = 95.0
        self.firmware_version = "2.1.0"
        self.last_heartbeat = datetime.now()
        
        # Sensor readings
        self.sensor_readings: Dict[SensorType, SensorReading] = {}
        self.anomaly_detectors: Dict[SensorType, EdgeAnomalyDetector] = {}
        
        # Edge computing capabilities
        self.ml_models: Dict[str, EdgeMLModel] = {}
        self.mqtt_buffer = MQTTBuffer()
        self.cluster_id: Optional[str] = None
        
        # Consensus for emergency coordination
        self.consensus: Optional[RaftConsensus] = None
        
        # Initialize sensors based on device type
        self._initialize_sensors()
        self._initialize_ml_models()
        
        # Start monitoring thread
        self.monitoring_thread = threading.Thread(target=self._monitor_sensors, daemon=True)
        self.monitoring_thread.start()
    
    def _initialize_sensors(self):
        """Initialize sensors based on device type"""
        if self.device_type == DeviceType.SENSOR:
            sensors = [SensorType.TEMPERATURE, SensorType.HUMIDITY, SensorType.VIBRATION, SensorType.POWER]
        elif self.device_type == DeviceType.GATEWAY:
            sensors = [SensorType.TEMPERATURE, SensorType.HUMIDITY, SensorType.POWER, SensorType.AIR_QUALITY]
        elif self.device_type == DeviceType.CONTROLLER:
            sensors = [SensorType.TEMPERATURE, SensorType.POWER, SensorType.PRESSURE]
        elif self.device_type == DeviceType.CAMERA:
            sensors = [SensorType.MOTION, SensorType.LIGHT, SensorType.POWER]
        elif self.device_type == DeviceType.ROBOT:
            sensors = [SensorType.TEMPERATURE, SensorType.VIBRATION, SensorType.POWER, SensorType.PRESSURE]
        else:
            sensors = [SensorType.TEMPERATURE, SensorType.POWER]
        
        for sensor_type in sensors:
            self.anomaly_detectors[sensor_type] = EdgeAnomalyDetector(sensor_type.value)
    
    def _initialize_ml_models(self):
        """Initialize ML models based on device type"""
        if self.device_type == DeviceType.SENSOR:
            self.ml_models['anomaly_detection'] = EdgeMLModel('anomaly_detection')
        elif self.device_type == DeviceType.CONTROLLER:
            self.ml_models['predictive_maintenance'] = EdgeMLModel('predictive_maintenance')
        elif self.device_type == DeviceType.CAMERA:
            self.ml_models['quality_control'] = EdgeMLModel('quality_control')
    
    def _monitor_sensors(self):
        """Monitor sensors and update readings"""
        while True:
            try:
                self._update_sensor_readings()
                self._detect_anomalies()
                self._send_data_to_cloud()
                time.sleep(5)  # Update every 5 seconds
            except Exception as e:
                print(f"Error in sensor monitoring: {e}")
                time.sleep(10)
    
    def _update_sensor_readings(self):
        """Update sensor readings with realistic values"""
        for sensor_type in self.anomaly_detectors.keys():
            # Generate realistic sensor values
            if sensor_type == SensorType.TEMPERATURE:
                value = random.uniform(18, 30)
                unit = "°C"
            elif sensor_type == SensorType.HUMIDITY:
                value = random.uniform(30, 70)
                unit = "%"
            elif sensor_type == SensorType.VIBRATION:
                value = random.uniform(0, 2)
                unit = "g"
            elif sensor_type == SensorType.POWER:
                value = self.battery_level
                unit = "%"
            elif sensor_type == SensorType.PRESSURE:
                value = random.uniform(1000, 1020)
                unit = "hPa"
            elif sensor_type == SensorType.LIGHT:
                value = random.uniform(0, 1000)
                unit = "lux"
            elif sensor_type == SensorType.MOTION:
                value = random.choice([0, 1])
                unit = "binary"
            elif sensor_type == SensorType.AIR_QUALITY:
                value = random.uniform(0, 500)
                unit = "ppm"
            else:
                value = random.uniform(0, 100)
                unit = "units"
            
            # Create sensor reading
            reading = SensorReading(
                sensor_type=sensor_type,
                value=value,
                unit=unit,
                timestamp=datetime.now(),
                quality=random.uniform(0.8, 1.0)
            )
            
            self.sensor_readings[sensor_type] = reading
    
    def _detect_anomalies(self) -> Dict[str, Dict[str, Any]]:
        """Detect anomalies in sensor readings"""
        anomalies = {}
        
        for sensor_type, detector in self.anomaly_detectors.items():
            if sensor_type in self.sensor_readings:
                reading = self.sensor_readings[sensor_type]
                anomaly = detector.detect_anomaly(reading.value)
                
                if anomaly['is_anomaly']:
                    anomalies[sensor_type.value] = anomaly
                    self._handle_anomaly(sensor_type, anomaly)
        
        return anomalies
    
    def _handle_anomaly(self, sensor: SensorType, anomaly: Dict[str, Any]):
        """Handle detected anomaly"""
        print(f"Anomaly detected on {self.device_id} - {sensor.value}: {anomaly}")
        
        # Add to MQTT buffer for cloud transmission
        self.mqtt_buffer.add_message(
            f"devices/{self.device_id}/anomalies",
            {
                'device_id': self.device_id,
                'sensor': sensor.value,
                'anomaly': anomaly,
                'location': self.location,
                'timestamp': datetime.now().isoformat()
            }
        )
        
        # Trigger emergency response for critical anomalies
        if anomaly['severity'] == 'critical':
            self._trigger_emergency_response(sensor, anomaly)
    
    def _trigger_emergency_response(self, sensor: SensorType, anomaly: Dict[str, Any]):
        """Trigger emergency response for critical anomalies"""
        if self.consensus:
            # Use consensus for coordinated emergency response
            emergency_command = {
                'type': 'emergency_response',
                'device_id': self.device_id,
                'sensor': sensor.value,
                'anomaly': anomaly,
                'location': self.location,
                'timestamp': datetime.now().isoformat()
            }
            
            self.consensus.append_entries([emergency_command])
            self.consensus.replicate_log()
            self.consensus.update_commit_index()
            self.consensus.apply_committed_entries()
        else:
            # Direct emergency response
            print(f"EMERGENCY: Critical anomaly on {self.device_id} - {sensor.value}")
    
    def _send_data_to_cloud(self):
        """Send data to cloud via MQTT"""
        try:
            # Prepare sensor data
            sensor_data = {}
            for sensor_type, reading in self.sensor_readings.items():
                sensor_data[sensor_type.value] = {
                    'value': reading.value,
                    'unit': reading.unit,
                    'quality': reading.quality,
                    'timestamp': reading.timestamp.isoformat()
                }
            
            # Add to MQTT buffer
            self.mqtt_buffer.add_message(
                f"devices/{self.device_id}/sensors",
                {
                    'device_id': self.device_id,
                    'device_type': self.device_type.value,
                    'location': self.location,
                    'sensor_data': sensor_data,
                    'battery_level': self.battery_level,
                    'signal_strength': self.signal_strength,
                    'timestamp': datetime.now().isoformat()
                }
            )
            
            # Simulate battery drain
            self.battery_level = max(0, self.battery_level - 0.01)
            
        except Exception as e:
            print(f"Error sending data to cloud: {e}")
    
    def join_consensus_cluster(self, nodes: List[str]):
        """Join consensus cluster for emergency coordination"""
        self.consensus = RaftConsensus(self.device_id, nodes)
    
    def get_status(self) -> Dict[str, Any]:
        """Get device status"""
        return {
            'device_id': self.device_id,
            'device_type': self.device_type.value,
            'location': self.location,
            'is_online': self.is_online,
            'battery_level': self.battery_level,
            'signal_strength': self.signal_strength,
            'firmware_version': self.firmware_version,
            'last_heartbeat': self.last_heartbeat.isoformat(),
            'cluster_id': self.cluster_id,
            'sensor_readings': {
                sensor.value: {
                    'value': reading.value,
                    'unit': reading.unit,
                    'quality': reading.quality
                }
                for sensor, reading in self.sensor_readings.items()
            },
            'buffer_status': self.mqtt_buffer.get_buffer_status(),
            'ml_models': {
                name: {
                    'is_trained': model.is_trained,
                    'accuracy': model.accuracy,
                    'inference_time': model.inference_time
                }
                for name, model in self.ml_models.items()
            },
            'consensus_status': self.consensus.get_status() if self.consensus else None
        }

class EdgeComputingOrchestrator:
    """Orchestrator for edge computing operations"""
    
    def __init__(self):
        self.devices: Dict[str, IoTDevice] = {}
        self.clusters: Dict[str, DeviceCluster] = {}
        self.emergency_events: List[Dict[str, Any]] = []
        
    def add_device(self, device: IoTDevice):
        """Add device to orchestrator"""
        self.devices[device.device_id] = device
        
        # Auto-assign to cluster based on location
        cluster_id = f"cluster-{device.location.replace(' ', '-').lower()}"
        if cluster_id not in self.clusters:
            self.clusters[cluster_id] = DeviceCluster(cluster_id, device.location)
        
        self.clusters[cluster_id].add_device(device.device_id)
        device.cluster_id = cluster_id
        
        # Join consensus cluster
        cluster_devices = [d.device_id for d in self.devices.values() if d.cluster_id == cluster_id]
        device.join_consensus_cluster(cluster_devices)
    
    def get_device_status(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Get status of specific device"""
        device = self.devices.get(device_id)
        return device.get_status() if device else None
    
    def get_all_devices_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all devices"""
        return {device_id: device.get_status() for device_id, device in self.devices.items()}
    
    def get_cluster_status(self, cluster_id: str) -> Dict[str, Any]:
        """Get status of specific cluster"""
        cluster = self.clusters.get(cluster_id)
        if not cluster:
            return {'error': 'Cluster not found'}
        
        cluster_status = cluster.get_status()
        cluster_status['devices'] = [
            self.devices[device_id].get_status()
            for device_id in cluster.devices
            if device_id in self.devices
        ]
        
        return cluster_status
    
    def trigger_emergency_coordination(self, cluster_id: str, emergency_type: str, details: Dict[str, Any]):
        """Trigger emergency coordination for a cluster"""
        cluster = self.clusters.get(cluster_id)
        if not cluster:
            return {'error': 'Cluster not found'}
        
        emergency_event = {
            'id': f"EMG-{len(self.emergency_events) + 1:03d}",
            'cluster_id': cluster_id,
            'type': emergency_type,
            'details': details,
            'timestamp': datetime.now().isoformat(),
            'status': 'active',
            'devices_affected': cluster.devices
        }
        
        self.emergency_events.append(emergency_event)
        
        # Notify all devices in cluster
        for device_id in cluster.devices:
            device = self.devices.get(device_id)
            if device and device.consensus:
                emergency_command = {
                    'type': 'emergency_coordination',
                    'emergency_event': emergency_event
                }
                device.consensus.append_entries([emergency_command])
        
        return emergency_event
    
    def get_emergency_events(self) -> List[Dict[str, Any]]:
        """Get all emergency events"""
        return self.emergency_events
    
    def get_edge_analytics(self) -> Dict[str, Any]:
        """Get comprehensive edge analytics"""
        total_devices = len(self.devices)
        online_devices = sum(1 for device in self.devices.values() if device.is_online)
        
        # Calculate average battery level
        avg_battery = sum(device.battery_level for device in self.devices.values()) / total_devices if total_devices > 0 else 0
        
        # Calculate buffer utilization
        total_buffer_utilization = sum(
            device.mqtt_buffer.get_buffer_status()['utilization']
            for device in self.devices.values()
        ) / total_devices if total_devices > 0 else 0
        
        # Count ML models
        total_ml_models = sum(len(device.ml_models) for device in self.devices.values())
        trained_models = sum(
            sum(1 for model in device.ml_models.values() if model.is_trained)
            for device in self.devices.values()
        )
        
        return {
            'total_devices': total_devices,
            'online_devices': online_devices,
            'offline_devices': total_devices - online_devices,
            'avg_battery_level': avg_battery,
            'total_buffer_utilization': total_buffer_utilization,
            'total_clusters': len(self.clusters),
            'total_ml_models': total_ml_models,
            'trained_ml_models': trained_models,
            'active_emergencies': len([e for e in self.emergency_events if e['status'] == 'active']),
            'timestamp': datetime.now().isoformat()
        }

# Global orchestrator instance
orchestrator = EdgeComputingOrchestrator()

# Factory functions
def create_iot_device(device_id: str, device_type: str, location: str) -> IoTDevice:
    """Create a new IoT device"""
    device = IoTDevice(device_id, DeviceType(device_type), location)
    orchestrator.add_device(device)
    return device

def get_device_status(device_id: str) -> Optional[Dict[str, Any]]:
    """Get device status"""
    return orchestrator.get_device_status(device_id)

def get_all_devices_status() -> Dict[str, Dict[str, Any]]:
    """Get all devices status"""
    return orchestrator.get_all_devices_status()

def trigger_emergency_coordination(cluster_id: str, emergency_type: str, details: Dict[str, Any]):
    """Trigger emergency coordination"""
    return orchestrator.trigger_emergency_coordination(cluster_id, emergency_type, details)

def get_edge_analytics() -> Dict[str, Any]:
    """Get edge analytics"""
    return orchestrator.get_edge_analytics()

def get_cluster_status(cluster_id: str) -> Dict[str, Any]:
    """Get cluster status"""
    return orchestrator.get_cluster_status(cluster_id)

def get_emergency_events() -> List[Dict[str, Any]]:
    """Get emergency events"""
    return orchestrator.get_emergency_events() 