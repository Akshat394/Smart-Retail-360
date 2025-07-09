#!/usr/bin/env python3
"""
Device Monitor - Real-time IoT device monitoring and management
Integrates with the enhanced IoT edge service for comprehensive device monitoring
"""

import asyncio
import json
import time
import random
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import websockets
import logging

# Import the enhanced IoT edge service
from iot_edge_service import (
    create_iot_device, get_all_devices_status, get_device_status,
    trigger_emergency_coordination, get_edge_analytics, get_cluster_status,
    get_emergency_events, DeviceType, SensorType
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DeviceMonitor:
    """Real-time device monitoring and management system"""
    
    def __init__(self):
        self.devices: Dict[str, Any] = {}
        self.monitoring_active = False
        self.websocket_server = None
        self.clients = set()
        self.alert_thresholds = {
            'temperature': {'min': 15, 'max': 35},
            'humidity': {'min': 20, 'max': 80},
            'battery': {'min': 10, 'max': 100},
            'vibration': {'min': 0, 'max': 5}
        }
        
    async def start_monitoring(self):
        """Start the device monitoring system"""
        logger.info("Starting device monitoring system...")
        
        # Initialize devices
        await self._initialize_devices()
        
        # Start monitoring threads
        self.monitoring_active = True
        threading.Thread(target=self._monitor_devices, daemon=True).start()
        threading.Thread(target=self._monitor_emergencies, daemon=True).start()
        threading.Thread(target=self._generate_analytics, daemon=True).start()
        
        # Start WebSocket server for real-time updates
        await self._start_websocket_server()
        
        logger.info("Device monitoring system started successfully")
    
    async def _initialize_devices(self):
        """Initialize IoT devices"""
        device_configs = [
            {'id': 'device-001', 'type': 'sensor', 'location': 'Warehouse A'},
            {'id': 'device-002', 'type': 'gateway', 'location': 'Warehouse A'},
            {'id': 'device-003', 'type': 'controller', 'location': 'Warehouse A'},
            {'id': 'device-004', 'type': 'camera', 'location': 'Warehouse B'},
            {'id': 'device-005', 'type': 'robot', 'location': 'Warehouse B'},
            {'id': 'device-006', 'type': 'sensor', 'location': 'Loading Dock'},
            {'id': 'device-007', 'type': 'gateway', 'location': 'Warehouse B'},
            {'id': 'device-008', 'type': 'controller', 'location': 'Loading Dock'},
            {'id': 'device-009', 'type': 'drone', 'location': 'Warehouse A'},
            {'id': 'device-010', 'type': 'sensor', 'location': 'Warehouse B'}
        ]
        
        for config in device_configs:
            try:
                device = create_iot_device(
                    config['id'],
                    config['type'],
                    config['location']
                )
                self.devices[config['id']] = device
                logger.info(f"Initialized device: {config['id']} ({config['type']}) at {config['location']}")
            except Exception as e:
                logger.error(f"Failed to initialize device {config['id']}: {e}")
    
    def _monitor_devices(self):
        """Monitor device status and sensor readings"""
        while self.monitoring_active:
            try:
                # Get all device statuses
                all_devices = get_all_devices_status()
                
                for device_id, device_status in all_devices.items():
                    # Check for anomalies and alerts
                    self._check_device_alerts(device_id, device_status)
                    
                    # Update device in local cache
                    if device_id in self.devices:
                        self.devices[device_id] = device_status
                
                # Broadcast updates to WebSocket clients
                asyncio.run(self._broadcast_device_updates(all_devices))
                
                time.sleep(5)  # Update every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in device monitoring: {e}")
                time.sleep(10)
    
    def _check_device_alerts(self, device_id: str, device_status: Dict[str, Any]):
        """Check for device alerts and anomalies"""
        try:
            sensor_readings = device_status.get('sensor_readings', {})
            
            for sensor_type, reading in sensor_readings.items():
                value = reading.get('value', 0)
                
                # Check temperature alerts
                if sensor_type == 'temperature':
                    if value < self.alert_thresholds['temperature']['min']:
                        self._trigger_alert(device_id, 'temperature_low', value)
                    elif value > self.alert_thresholds['temperature']['max']:
                        self._trigger_alert(device_id, 'temperature_high', value)
                
                # Check humidity alerts
                elif sensor_type == 'humidity':
                    if value < self.alert_thresholds['humidity']['min']:
                        self._trigger_alert(device_id, 'humidity_low', value)
                    elif value > self.alert_thresholds['humidity']['max']:
                        self._trigger_alert(device_id, 'humidity_high', value)
                
                # Check battery alerts
                elif sensor_type == 'power':
                    if value < self.alert_thresholds['battery']['min']:
                        self._trigger_alert(device_id, 'battery_low', value)
                
                # Check vibration alerts
                elif sensor_type == 'vibration':
                    if value > self.alert_thresholds['vibration']['max']:
                        self._trigger_alert(device_id, 'vibration_high', value)
        
        except Exception as e:
            logger.error(f"Error checking alerts for device {device_id}: {e}")
    
    def _trigger_alert(self, device_id: str, alert_type: str, value: float):
        """Trigger device alert"""
        alert = {
            'device_id': device_id,
            'alert_type': alert_type,
            'value': value,
            'timestamp': datetime.now().isoformat(),
            'severity': 'high' if 'high' in alert_type or 'low' in alert_type else 'medium'
        }
        
        logger.warning(f"ALERT: {alert_type} on {device_id} - Value: {value}")
        
        # Trigger emergency coordination for critical alerts
        if alert['severity'] == 'high':
            cluster_id = f"cluster-{self.devices.get(device_id, {}).get('location', 'unknown').lower().replace(' ', '-')}"
            trigger_emergency_coordination(cluster_id, alert_type, alert)
    
    def _monitor_emergencies(self):
        """Monitor emergency events"""
        while self.monitoring_active:
            try:
                emergencies = get_emergency_events()
                
                for emergency in emergencies:
                    if emergency.get('status') == 'active':
                        logger.warning(f"ACTIVE EMERGENCY: {emergency.get('type')} in {emergency.get('cluster_id')}")
                        
                        # Broadcast emergency to WebSocket clients
                        asyncio.run(self._broadcast_emergency(emergency))
                
                time.sleep(10)  # Check emergencies every 10 seconds
                
            except Exception as e:
                logger.error(f"Error in emergency monitoring: {e}")
                time.sleep(15)
    
    def _generate_analytics(self):
        """Generate and broadcast analytics"""
        while self.monitoring_active:
            try:
                analytics = get_edge_analytics()
                
                # Add additional analytics
                analytics['device_health'] = self._calculate_device_health()
                analytics['network_performance'] = self._calculate_network_performance()
                analytics['predictive_insights'] = self._generate_predictive_insights()
                
                # Broadcast analytics to WebSocket clients
                asyncio.run(self._broadcast_analytics(analytics))
                
                time.sleep(30)  # Generate analytics every 30 seconds
                
            except Exception as e:
                logger.error(f"Error generating analytics: {e}")
                time.sleep(45)
    
    def _calculate_device_health(self) -> Dict[str, Any]:
        """Calculate overall device health metrics"""
        total_devices = len(self.devices)
        if total_devices == 0:
            return {'health_score': 0, 'issues': []}
        
        online_devices = sum(1 for device in self.devices.values() if device.get('is_online', False))
        avg_battery = sum(device.get('battery_level', 0) for device in self.devices.values()) / total_devices
        
        health_score = (online_devices / total_devices) * 0.6 + (avg_battery / 100) * 0.4
        
        issues = []
        if health_score < 0.8:
            issues.append('Low device health score')
        if avg_battery < 20:
            issues.append('Low battery levels detected')
        if online_devices < total_devices * 0.9:
            issues.append('Multiple devices offline')
        
        return {
            'health_score': round(health_score * 100, 2),
            'online_ratio': round(online_devices / total_devices * 100, 2),
            'avg_battery': round(avg_battery, 2),
            'issues': issues
        }
    
    def _calculate_network_performance(self) -> Dict[str, Any]:
        """Calculate network performance metrics"""
        total_devices = len(self.devices)
        if total_devices == 0:
            return {'performance_score': 0, 'issues': []}
        
        avg_signal = sum(device.get('signal_strength', 0) for device in self.devices.values()) / total_devices
        buffer_utilization = sum(
            device.get('buffer_status', {}).get('utilization', 0)
            for device in self.devices.values()
        ) / total_devices
        
        performance_score = (avg_signal / 100) * 0.7 + (1 - buffer_utilization / 100) * 0.3
        
        issues = []
        if avg_signal < 70:
            issues.append('Poor signal strength')
        if buffer_utilization > 80:
            issues.append('High buffer utilization')
        
        return {
            'performance_score': round(performance_score * 100, 2),
            'avg_signal_strength': round(avg_signal, 2),
            'avg_buffer_utilization': round(buffer_utilization, 2),
            'issues': issues
        }
    
    def _generate_predictive_insights(self) -> Dict[str, Any]:
        """Generate predictive insights"""
        insights = {
            'maintenance_predictions': [],
            'capacity_forecasts': [],
            'risk_assessments': []
        }
        
        # Simulate maintenance predictions
        for device_id, device in self.devices.items():
            battery_level = device.get('battery_level', 100)
            if battery_level < 30:
                insights['maintenance_predictions'].append({
                    'device_id': device_id,
                    'type': 'battery_replacement',
                    'urgency': 'high' if battery_level < 15 else 'medium',
                    'estimated_time': datetime.now() + timedelta(hours=random.randint(1, 24))
                })
        
        # Simulate capacity forecasts
        total_devices = len(self.devices)
        online_devices = sum(1 for device in self.devices.values() if device.get('is_online', False))
        
        if online_devices / total_devices < 0.8:
            insights['capacity_forecasts'].append({
                'type': 'device_capacity',
                'message': 'Device capacity may be insufficient',
                'recommendation': 'Add more devices or optimize existing ones'
            })
        
        # Simulate risk assessments
        if len(get_emergency_events()) > 0:
            insights['risk_assessments'].append({
                'type': 'emergency_risk',
                'level': 'medium',
                'message': 'Active emergency events detected',
                'recommendation': 'Review emergency response procedures'
            })
        
        return insights
    
    async def _start_websocket_server(self):
        """Start WebSocket server for real-time updates"""
        try:
            self.websocket_server = await websockets.serve(
                self._websocket_handler,
                "localhost",
                8765
            )
            logger.info("WebSocket server started on ws://localhost:8765")
            
            # Keep the server running
            await self.websocket_server.wait_closed()
            
        except Exception as e:
            logger.error(f"Failed to start WebSocket server: {e}")
    
    async def _websocket_handler(self, websocket, path):
        """Handle WebSocket connections"""
        self.clients.add(websocket)
        logger.info(f"New WebSocket client connected. Total clients: {len(self.clients)}")
        
        try:
            # Send initial data
            await websocket.send(json.dumps({
                'type': 'connection_established',
                'message': 'Connected to Device Monitor',
                'timestamp': datetime.now().isoformat()
            }))
            
            # Keep connection alive
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self._handle_websocket_message(websocket, data)
                except json.JSONDecodeError:
                    logger.warning("Received invalid JSON from WebSocket client")
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket client disconnected")
        finally:
            self.clients.discard(websocket)
            logger.info(f"WebSocket client removed. Total clients: {len(self.clients)}")
    
    async def _handle_websocket_message(self, websocket, data):
        """Handle incoming WebSocket messages"""
        message_type = data.get('type')
        
        if message_type == 'get_devices':
            devices = get_all_devices_status()
            await websocket.send(json.dumps({
                'type': 'devices_update',
                'data': devices,
                'timestamp': datetime.now().isoformat()
            }))
        
        elif message_type == 'get_analytics':
            analytics = get_edge_analytics()
            await websocket.send(json.dumps({
                'type': 'analytics_update',
                'data': analytics,
                'timestamp': datetime.now().isoformat()
            }))
        
        elif message_type == 'get_emergencies':
            emergencies = get_emergency_events()
            await websocket.send(json.dumps({
                'type': 'emergencies_update',
                'data': emergencies,
                'timestamp': datetime.now().isoformat()
            }))
    
    async def _broadcast_device_updates(self, devices: Dict[str, Any]):
        """Broadcast device updates to all WebSocket clients"""
        if not self.clients:
            return
        
        message = json.dumps({
            'type': 'devices_update',
            'data': devices,
            'timestamp': datetime.now().isoformat()
        })
        
        await asyncio.gather(
            *[client.send(message) for client in self.clients],
            return_exceptions=True
        )
    
    async def _broadcast_analytics(self, analytics: Dict[str, Any]):
        """Broadcast analytics to all WebSocket clients"""
        if not self.clients:
            return
        
        message = json.dumps({
            'type': 'analytics_update',
            'data': analytics,
            'timestamp': datetime.now().isoformat()
        })
        
        await asyncio.gather(
            *[client.send(message) for client in self.clients],
            return_exceptions=True
        )
    
    async def _broadcast_emergency(self, emergency: Dict[str, Any]):
        """Broadcast emergency to all WebSocket clients"""
        if not self.clients:
            return
        
        message = json.dumps({
            'type': 'emergency_alert',
            'data': emergency,
            'timestamp': datetime.now().isoformat()
        })
        
        await asyncio.gather(
            *[client.send(message) for client in self.clients],
            return_exceptions=True
        )
    
    def stop_monitoring(self):
        """Stop the device monitoring system"""
        logger.info("Stopping device monitoring system...")
        self.monitoring_active = False
        
        if self.websocket_server:
            self.websocket_server.close()
        
        logger.info("Device monitoring system stopped")

async def main():
    """Main function to run the device monitor"""
    monitor = DeviceMonitor()
    
    try:
        await monitor.start_monitoring()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal, shutting down...")
    finally:
        monitor.stop_monitoring()

if __name__ == "__main__":
    asyncio.run(main()) 