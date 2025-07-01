#!/usr/bin/env python3
"""
MQTT Fallback Buffer for Offline-First Operation
Handles message buffering when network is unavailable
"""

import json
import time
import threading
import queue
import sqlite3
import os
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MQTTFallbackBuffer:
    """MQTT fallback buffer for offline-first operation"""
    
    def __init__(self, buffer_size: int = 1000, db_path: str = "mqtt_buffer.db"):
        self.buffer_size = buffer_size
        self.db_path = db_path
        self.memory_buffer = queue.Queue(maxsize=buffer_size)
        self.persistent_buffer = queue.Queue(maxsize=buffer_size)
        self.retry_attempts = 3
        self.retry_delay = 5  # seconds
        self.is_connected = False
        self.sync_thread = None
        self.stop_sync = False
        
        # Initialize database
        self._init_database()
        
        # Start sync thread
        self._start_sync_thread()
    
    def _init_database(self):
        """Initialize SQLite database for persistent storage"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create messages table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS mqtt_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    topic TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    qos INTEGER DEFAULT 1,
                    timestamp TEXT NOT NULL,
                    retry_count INTEGER DEFAULT 0,
                    sent INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Create index for faster queries
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_timestamp ON mqtt_messages(timestamp)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_sent ON mqtt_messages(sent)
            ''')
            
            conn.commit()
            conn.close()
            
            logger.info("MQTT buffer database initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
    
    def _start_sync_thread(self):
        """Start background sync thread"""
        self.sync_thread = threading.Thread(target=self._sync_loop)
        self.sync_thread.daemon = True
        self.sync_thread.start()
        logger.info("MQTT sync thread started")
    
    def _sync_loop(self):
        """Background sync loop"""
        while not self.stop_sync:
            try:
                if self.is_connected:
                    # Try to send pending messages
                    self._send_pending_messages()
                
                # Sync memory and persistent buffers
                self._sync_buffers()
                
                # Clean up old messages
                self._cleanup_old_messages()
                
                # Sleep before next sync
                time.sleep(10)  # 10 second sync interval
                
            except Exception as e:
                logger.error(f"Error in sync loop: {e}")
                time.sleep(30)  # Wait longer on error
    
    def _send_pending_messages(self):
        """Send pending messages to MQTT broker"""
        try:
            # Get unsent messages from database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, topic, payload, qos, retry_count 
                FROM mqtt_messages 
                WHERE sent = 0 AND retry_count < ?
                ORDER BY created_at ASC
                LIMIT 10
            ''', (self.retry_attempts,))
            
            messages = cursor.fetchall()
            
            for msg_id, topic, payload, qos, retry_count in messages:
                try:
                    # Simulate MQTT publish
                    success = self._publish_message(topic, payload, qos)
                    
                    if success:
                        # Mark as sent
                        cursor.execute('''
                            UPDATE mqtt_messages 
                            SET sent = 1, timestamp = ? 
                            WHERE id = ?
                        ''', (datetime.now().isoformat(), msg_id))
                        
                        logger.info(f"Message {msg_id} sent successfully to {topic}")
                    else:
                        # Increment retry count
                        cursor.execute('''
                            UPDATE mqtt_messages 
                            SET retry_count = retry_count + 1 
                            WHERE id = ?
                        ''', (msg_id,))
                        
                        logger.warning(f"Failed to send message {msg_id}, retry count: {retry_count + 1}")
                
                except Exception as e:
                    logger.error(f"Error sending message {msg_id}: {e}")
                    # Increment retry count
                    cursor.execute('''
                        UPDATE mqtt_messages 
                        SET retry_count = retry_count + 1 
                        WHERE id = ?
                    ''', (msg_id,))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error in send pending messages: {e}")
    
    def _publish_message(self, topic: str, payload: str, qos: int) -> bool:
        """Simulate MQTT publish (replace with actual MQTT client)"""
        try:
            # Simulate network delay and occasional failures
            time.sleep(random.uniform(0.1, 0.5))
            
            # Simulate 95% success rate
            success = random.random() < 0.95
            
            if success:
                logger.debug(f"MQTT publish: {topic} -> {payload[:50]}...")
            else:
                logger.debug(f"MQTT publish failed: {topic}")
            
            return success
            
        except Exception as e:
            logger.error(f"MQTT publish error: {e}")
            return False
    
    def _sync_buffers(self):
        """Sync memory and persistent buffers"""
        try:
            # Move messages from memory buffer to persistent buffer
            while not self.memory_buffer.empty():
                try:
                    message = self.memory_buffer.get_nowait()
                    self._store_message_persistent(message)
                except queue.Empty:
                    break
            
            # Move messages from persistent buffer to memory buffer
            while not self.persistent_buffer.empty():
                try:
                    message = self.persistent_buffer.get_nowait()
                    if not self.memory_buffer.full():
                        self.memory_buffer.put_nowait(message)
                except queue.Empty:
                    break
                    
        except Exception as e:
            logger.error(f"Error syncing buffers: {e}")
    
    def _store_message_persistent(self, message: Dict[str, Any]):
        """Store message in persistent storage"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO mqtt_messages (topic, payload, qos, timestamp, created_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                message['topic'],
                json.dumps(message['payload']),
                message.get('qos', 1),
                message['timestamp'],
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing message persistently: {e}")
    
    def _cleanup_old_messages(self):
        """Clean up old sent messages"""
        try:
            # Keep messages for 7 days
            cutoff_date = (datetime.now() - timedelta(days=7)).isoformat()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                DELETE FROM mqtt_messages 
                WHERE sent = 1 AND created_at < ?
            ''', (cutoff_date,))
            
            deleted_count = cursor.rowcount
            conn.commit()
            conn.close()
            
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} old messages")
                
        except Exception as e:
            logger.error(f"Error cleaning up old messages: {e}")
    
    def add_message(self, topic: str, payload: Dict[str, Any], qos: int = 1) -> bool:
        """Add message to buffer"""
        try:
            message = {
                'topic': topic,
                'payload': payload,
                'qos': qos,
                'timestamp': datetime.now().isoformat(),
                'retry_count': 0
            }
            
            # Try to add to memory buffer first
            try:
                self.memory_buffer.put_nowait(message)
                logger.debug(f"Message added to memory buffer: {topic}")
                return True
            except queue.Full:
                # Memory buffer full, add to persistent buffer
                try:
                    self.persistent_buffer.put_nowait(message)
                    logger.debug(f"Message added to persistent buffer: {topic}")
                    return True
                except queue.Full:
                    # Both buffers full, store directly in database
                    self._store_message_persistent(message)
                    logger.debug(f"Message stored directly in database: {topic}")
                    return True
                    
        except Exception as e:
            logger.error(f"Error adding message: {e}")
            return False
    
    def get_buffer_status(self) -> Dict[str, Any]:
        """Get buffer status"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get total message count
            cursor.execute('SELECT COUNT(*) FROM mqtt_messages')
            total_messages = cursor.fetchone()[0]
            
            # Get unsent message count
            cursor.execute('SELECT COUNT(*) FROM mqtt_messages WHERE sent = 0')
            unsent_messages = cursor.fetchone()[0]
            
            # Get failed message count
            cursor.execute('SELECT COUNT(*) FROM mqtt_messages WHERE retry_count >= ?', (self.retry_attempts,))
            failed_messages = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'memory_buffer_size': self.memory_buffer.qsize(),
                'memory_buffer_max': self.buffer_size,
                'persistent_buffer_size': self.persistent_buffer.qsize(),
                'persistent_buffer_max': self.buffer_size,
                'total_messages': total_messages,
                'unsent_messages': unsent_messages,
                'failed_messages': failed_messages,
                'is_connected': self.is_connected,
                'retry_attempts': self.retry_attempts,
                'retry_delay': self.retry_delay
            }
            
        except Exception as e:
            logger.error(f"Error getting buffer status: {e}")
            return {}
    
    def set_connection_status(self, is_connected: bool):
        """Set MQTT connection status"""
        self.is_connected = is_connected
        logger.info(f"MQTT connection status: {'Connected' if is_connected else 'Disconnected'}")
    
    def get_pending_messages(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get pending messages for manual processing"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, topic, payload, qos, retry_count, created_at
                FROM mqtt_messages 
                WHERE sent = 0 AND retry_count < ?
                ORDER BY created_at ASC
                LIMIT ?
            ''', (self.retry_attempts, limit))
            
            messages = []
            for row in cursor.fetchall():
                messages.append({
                    'id': row[0],
                    'topic': row[1],
                    'payload': json.loads(row[2]),
                    'qos': row[3],
                    'retry_count': row[4],
                    'created_at': row[5]
                })
            
            conn.close()
            return messages
            
        except Exception as e:
            logger.error(f"Error getting pending messages: {e}")
            return []
    
    def mark_message_sent(self, message_id: int):
        """Mark a specific message as sent"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE mqtt_messages 
                SET sent = 1, timestamp = ? 
                WHERE id = ?
            ''', (datetime.now().isoformat(), message_id))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Message {message_id} marked as sent")
            
        except Exception as e:
            logger.error(f"Error marking message as sent: {e}")
    
    def clear_failed_messages(self):
        """Clear messages that have exceeded retry attempts"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                DELETE FROM mqtt_messages 
                WHERE retry_count >= ?
            ''', (self.retry_attempts,))
            
            deleted_count = cursor.rowcount
            conn.commit()
            conn.close()
            
            logger.info(f"Cleared {deleted_count} failed messages")
            
        except Exception as e:
            logger.error(f"Error clearing failed messages: {e}")
    
    def shutdown(self):
        """Shutdown the buffer"""
        self.stop_sync = True
        if self.sync_thread and self.sync_thread.is_alive():
            self.sync_thread.join(timeout=5)
        logger.info("MQTT fallback buffer shutdown")

# Example usage
if __name__ == "__main__":
    import random
    
    # Create MQTT fallback buffer
    buffer = MQTTFallbackBuffer(buffer_size=100)
    
    # Simulate some messages
    topics = [
        'sensors/temperature/warehouse-a',
        'sensors/humidity/warehouse-a',
        'sensors/vibration/machine-1',
        'alerts/system/health',
        'data/analytics/metrics'
    ]
    
    print("Adding test messages to buffer...")
    for i in range(20):
        topic = random.choice(topics)
        payload = {
            'device_id': f'device-{i:03d}',
            'value': random.uniform(20, 30),
            'timestamp': datetime.now().isoformat(),
            'sequence': i
        }
        
        buffer.add_message(topic, payload)
        time.sleep(0.1)
    
    # Monitor buffer status
    try:
        print("Monitoring buffer status. Press Ctrl+C to stop.")
        while True:
            status = buffer.get_buffer_status()
            print(f"\nBuffer Status:")
            print(f"  Memory Buffer: {status['memory_buffer_size']}/{status['memory_buffer_max']}")
            print(f"  Persistent Buffer: {status['persistent_buffer_size']}/{status['persistent_buffer_max']}")
            print(f"  Total Messages: {status['total_messages']}")
            print(f"  Unsent Messages: {status['unsent_messages']}")
            print(f"  Failed Messages: {status['failed_messages']}")
            print(f"  Connected: {status['is_connected']}")
            
            time.sleep(5)
    except KeyboardInterrupt:
        print("\nShutting down...")
        buffer.shutdown() 