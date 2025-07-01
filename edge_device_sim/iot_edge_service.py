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

class EdgeAnomalyDetector:
    """Real-time anomaly detection using lightweight ML models"""
    
    def __init__(self, sensor_type: str):
        self.sensor_type = sensor_type
        self.window_size = 50
        self.data_buffer = []
        self.threshold_multiplier = 2.5
        self.baseline_mean = 0
        self.baseline_std = 1
        
    def update_baseline(self, new_data: float):
        """Update baseline statistics"""
        self.data_buffer.append(new_data)
        
        if len(self.data_buffer) > self.window_size:
            self.data_buffer.pop(0)
            
        if len(self.data_buffer) >= 10:
            self.baseline_mean = np.mean(self.data_buffer)
            self.baseline_std = np.std(self.data_buffer)
    
    def detect_anomaly(self, value: float) -> Dict[str, Any]:
        """Detect anomaly using statistical methods"""
        if len(self.data_buffer) < 10:
            self.update_baseline(value)
            return {'is_anomaly': False, 'confidence': 0.0, 'severity': 'low'}
        
        # Calculate z-score
        z_score = abs((value - self.baseline_mean) / self.baseline_std) if self.baseline_std > 0 else 0
        
        # Determine anomaly
        is_anomaly = z_score > self.threshold_multiplier
        
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
            'is_anomaly': is_anomaly,
            'confidence': confidence,
            'severity': severity,
            'z_score': z_score,
            'value': value,
            'baseline_mean': self.baseline_mean,
            'baseline_std': self.baseline_std,
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
            log_entry = {
                'term': self.current_term,
                'index': len(self.log),
                'command': entry,
                'timestamp': datetime.now().isoformat()
            }
            self.log.append(log_entry)
        
        # Replicate to followers
        self.replicate_log()
        return True
    
    def replicate_log(self):
        """Replicate log to followers"""
        for node in self.nodes:
            if node != self.node_id:
                # Simulate log replication
                success = random.random() > 0.2  # 80% success rate
                if success:
                    self.match_index[node] = len(self.log) - 1
        
        # Update commit index
        self.update_commit_index()
    
    def update_commit_index(self):
        """Update commit index based on majority replication"""
        sorted_match_indices = sorted(self.match_index.values())
        majority_index = sorted_match_indices[len(sorted_match_indices) // 2]
        
        if majority_index > self.commit_index:
            self.commit_index = majority_index
            self.apply_committed_entries()
    
    def apply_committed_entries(self):
        """Apply committed entries"""
        while self.last_applied < self.commit_index:
            self.last_applied += 1
            if self.last_applied < len(self.log):
                entry = self.log[self.last_applied]
                self.execute_command(entry['command'])
    
    def execute_command(self, command: Dict[str, Any]):
        """Execute a command"""
        command_type = command.get('type')
        
        if command_type == 'emergency_stop':
            print(f"EMERGENCY STOP executed by {self.node_id}: {command.get('reason')}")
        elif command_type == 'route_change':
            print(f"Route change executed by {self.node_id}: {command.get('new_route')}")
        elif command_type == 'system_alert':
            print(f"System alert executed by {self.node_id}: {command.get('message')}")
    
    def receive_heartbeat(self, leader_id: str, term: int):
        """Receive heartbeat from leader"""
        if term >= self.current_term:
            self.current_term = term
            self.leader_id = leader_id
            self.state = 'follower'
            self.last_heartbeat = time.time()
    
    def get_status(self) -> Dict[str, Any]:
        """Get node status"""
        return {
            'node_id': self.node_id,
            'state': self.state,
            'current_term': self.current_term,
            'leader_id': self.leader_id,
            'log_length': len(self.log),
            'commit_index': self.commit_index,
            'last_applied': self.last_applied
        }

class IoTDevice:
    """Simulated IoT device with edge computing capabilities"""
    
    def __init__(self, device_id: str, device_type: str, location: str):
        self.device_id = device_id
        self.device_type = device_type
        self.location = location
        self.is_online = True
        self.last_seen = datetime.now()
        
        # Initialize components
        self.anomaly_detectors = {
            'temperature': EdgeAnomalyDetector('temperature'),
            'humidity': EdgeAnomalyDetector('humidity'),
            'vibration': EdgeAnomalyDetector('vibration'),
            'power': EdgeAnomalyDetector('power')
        }
        
        self.mqtt_buffer = MQTTBuffer(max_size=500)
        self.raft_consensus = None  # Will be initialized if part of cluster
        
        # Device-specific parameters
        self.sensor_readings = {
            'temperature': 22.0,
            'humidity': 45.0,
            'vibration': 0.1,
            'power': 100.0
        }
        
        # Start monitoring thread
        self.monitoring_thread = threading.Thread(target=self._monitor_sensors, daemon=True)
        self.monitoring_thread.start()
    
    def _monitor_sensors(self):
        """Monitor sensors and detect anomalies"""
        while True:
            try:
                # Simulate sensor readings
                self._update_sensor_readings()
                
                # Detect anomalies
                anomalies = self._detect_anomalies()
                
                # Process anomalies
                for sensor, anomaly in anomalies.items():
                    if anomaly['is_anomaly']:
                        self._handle_anomaly(sensor, anomaly)
                
                # Send data to cloud (with fallback)
                self._send_data_to_cloud()
                
                time.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                print(f"Error in sensor monitoring: {e}")
                time.sleep(10)
    
    def _update_sensor_readings(self):
        """Update sensor readings with realistic variations"""
        # Temperature variation
        self.sensor_readings['temperature'] += random.uniform(-0.5, 0.5)
        self.sensor_readings['temperature'] = max(15, min(35, self.sensor_readings['temperature']))
        
        # Humidity variation
        self.sensor_readings['humidity'] += random.uniform(-2, 2)
        self.sensor_readings['humidity'] = max(30, min(70, self.sensor_readings['humidity']))
        
        # Vibration (simulate equipment operation)
        base_vibration = 0.1
        if random.random() > 0.8:  # 20% chance of high vibration
            self.sensor_readings['vibration'] = base_vibration + random.uniform(0.5, 2.0)
        else:
            self.sensor_readings['vibration'] = base_vibration + random.uniform(0, 0.3)
        
        # Power consumption
        self.sensor_readings['power'] += random.uniform(-1, 1)
        self.sensor_readings['power'] = max(80, min(120, self.sensor_readings['power']))
    
    def _detect_anomalies(self) -> Dict[str, Dict[str, Any]]:
        """Detect anomalies in all sensors"""
        anomalies = {}
        
        for sensor, value in self.sensor_readings.items():
            detector = self.anomaly_detectors[sensor]
            anomaly = detector.detect_anomaly(value)
            anomalies[sensor] = anomaly
        
        return anomalies
    
    def _handle_anomaly(self, sensor: str, anomaly: Dict[str, Any]):
        """Handle detected anomaly"""
        print(f"ANOMALY DETECTED on {self.device_id} - {sensor}: {anomaly}")
        
        # Add to MQTT buffer for cloud sync
        self.mqtt_buffer.add_message(
            f"devices/{self.device_id}/anomalies",
            {
                'device_id': self.device_id,
                'sensor': sensor,
                'anomaly': anomaly,
                'location': self.location,
                'device_type': self.device_type
            }
        )
        
        # If critical anomaly, trigger emergency response
        if anomaly['severity'] == 'critical':
            self._trigger_emergency_response(sensor, anomaly)
    
    def _trigger_emergency_response(self, sensor: str, anomaly: Dict[str, Any]):
        """Trigger emergency response for critical anomalies"""
        if self.raft_consensus and self.raft_consensus.state == 'leader':
            # Propose emergency action
            emergency_command = {
                'type': 'emergency_stop',
                'device_id': self.device_id,
                'sensor': sensor,
                'reason': f"Critical {sensor} anomaly detected",
                'severity': anomaly['severity'],
                'timestamp': datetime.now().isoformat()
            }
            
            self.raft_consensus.append_entries([emergency_command])
        
        # Local emergency response
        print(f"EMERGENCY RESPONSE triggered on {self.device_id} for {sensor}")
    
    def _send_data_to_cloud(self):
        """Send data to cloud with fallback buffer"""
        try:
            # Simulate cloud connection
            if random.random() > 0.1:  # 90% success rate
                # Successfully sent to cloud
                data = {
                    'device_id': self.device_id,
                    'readings': self.sensor_readings,
                    'timestamp': datetime.now().isoformat(),
                    'location': self.location
                }
                
                # Clear buffer messages that were successfully sent
                messages = self.mqtt_buffer.get_messages(10)
                for message in messages:
                    self.mqtt_buffer.mark_sent(message)
                
                print(f"Data sent to cloud from {self.device_id}")
            else:
                # Failed to send, add to buffer
                data = {
                    'device_id': self.device_id,
                    'readings': self.sensor_readings,
                    'timestamp': datetime.now().isoformat(),
                    'location': self.location
                }
                
                self.mqtt_buffer.add_message(f"devices/{self.device_id}/data", data)
                print(f"Data buffered for {self.device_id} (offline)")
                
        except Exception as e:
            print(f"Error sending data to cloud: {e}")
            # Add to buffer as fallback
            data = {
                'device_id': self.device_id,
                'readings': self.sensor_readings,
                'timestamp': datetime.now().isoformat(),
                'location': self.location
            }
            self.mqtt_buffer.add_message(f"devices/{self.device_id}/data", data)
    
    def join_consensus_cluster(self, nodes: List[str]):
        """Join Raft consensus cluster"""
        self.raft_consensus = RaftConsensus(self.device_id, nodes)
        print(f"Device {self.device_id} joined consensus cluster")
    
    def get_status(self) -> Dict[str, Any]:
        """Get device status"""
        return {
            'device_id': self.device_id,
            'device_type': self.device_type,
            'location': self.location,
            'is_online': self.is_online,
            'last_seen': self.last_seen.isoformat(),
            'sensor_readings': self.sensor_readings,
            'buffer_status': self.mqtt_buffer.get_buffer_status(),
            'consensus_status': self.raft_consensus.get_status() if self.raft_consensus else None
        }

class EdgeComputingOrchestrator:
    """Orchestrates edge computing across multiple IoT devices"""
    
    def __init__(self):
        self.devices: Dict[str, IoTDevice] = {}
        self.clusters: Dict[str, List[str]] = {}
        
    def add_device(self, device: IoTDevice):
        """Add device to orchestrator"""
        self.devices[device.device_id] = device
        
        # Auto-assign to cluster based on location
        cluster_id = f"cluster_{device.location}"
        if cluster_id not in self.clusters:
            self.clusters[cluster_id] = []
        self.clusters[cluster_id].append(device.device_id)
        
        # Join consensus cluster
        device.join_consensus_cluster(self.clusters[cluster_id])
    
    def get_device_status(self, device_id: str) -> Optional[Dict[str, Any]]:
        """Get status of specific device"""
        device = self.devices.get(device_id)
        return device.get_status() if device else None
    
    def get_all_devices_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all devices"""
        return {device_id: device.get_status() for device_id, device in self.devices.items()}
    
    def get_cluster_status(self, cluster_id: str) -> Dict[str, Any]:
        """Get status of specific cluster"""
        device_ids = self.clusters.get(cluster_id, [])
        devices = [self.devices[device_id] for device_id in device_ids if device_id in self.devices]
        
        return {
            'cluster_id': cluster_id,
            'device_count': len(devices),
            'devices': [device.get_status() for device in devices],
            'consensus_leaders': [device.device_id for device in devices 
                                if device.raft_consensus and device.raft_consensus.state == 'leader']
        }
    
    def trigger_emergency_coordination(self, cluster_id: str, emergency_type: str, details: Dict[str, Any]):
        """Trigger emergency coordination across cluster"""
        device_ids = self.clusters.get(cluster_id, [])
        
        for device_id in device_ids:
            device = self.devices.get(device_id)
            if device and device.raft_consensus and device.raft_consensus.state == 'leader':
                emergency_command = {
                    'type': 'emergency_coordination',
                    'emergency_type': emergency_type,
                    'details': details,
                    'cluster_id': cluster_id,
                    'timestamp': datetime.now().isoformat()
                }
                
                device.raft_consensus.append_entries([emergency_command])
                print(f"Emergency coordination triggered in cluster {cluster_id}")
                break

# Global orchestrator instance
edge_orchestrator = EdgeComputingOrchestrator()

# API functions for external integration
def create_iot_device(device_id: str, device_type: str, location: str) -> IoTDevice:
    """Create and register a new IoT device"""
    device = IoTDevice(device_id, device_type, location)
    edge_orchestrator.add_device(device)
    return device

def get_device_status(device_id: str) -> Optional[Dict[str, Any]]:
    """Get status of a specific device"""
    return edge_orchestrator.get_device_status(device_id)

def get_all_devices_status() -> Dict[str, Dict[str, Any]]:
    """Get status of all devices"""
    return edge_orchestrator.get_all_devices_status()

def trigger_emergency_coordination(cluster_id: str, emergency_type: str, details: Dict[str, Any]):
    """Trigger emergency coordination"""
    edge_orchestrator.trigger_emergency_coordination(cluster_id, emergency_type, details) 