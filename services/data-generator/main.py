import json
import time
import random
from datetime import datetime, timedelta
from kafka import KafkaProducer
from faker import Faker
import threading
import os

fake = Faker()

# Kafka configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')

def create_producer():
    """Create Kafka producer with retry logic"""
    max_retries = 10
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None
            )
            print(f"Connected to Kafka at {KAFKA_BOOTSTRAP_SERVERS}")
            return producer
        except Exception as e:
            retry_count += 1
            print(f"Failed to connect to Kafka (attempt {retry_count}/{max_retries}): {e}")
            time.sleep(5)
    
    raise Exception("Could not connect to Kafka after maximum retries")

def generate_order_event():
    """Generate a realistic order event"""
    return {
        "order_id": f"ORD-{random.randint(10000, 99999)}",
        "customer_id": f"CUST-{random.randint(1000, 9999)}",
        "timestamp": datetime.now().isoformat(),
        "items": [
            {
                "sku": f"SKU-{random.randint(1000, 9999)}",
                "quantity": random.randint(1, 5),
                "price": round(random.uniform(10.0, 500.0), 2),
                "category": random.choice(["Electronics", "Clothing", "Home", "Books", "Sports"])
            }
            for _ in range(random.randint(1, 4))
        ],
        "total_amount": round(random.uniform(50.0, 2000.0), 2),
        "shipping_address": {
            "street": fake.street_address(),
            "city": fake.city(),
            "state": fake.state_abbr(),
            "zip_code": fake.zipcode(),
            "latitude": float(fake.latitude()),
            "longitude": float(fake.longitude())
        },
        "priority": random.choice(["standard", "express", "overnight"]),
        "channel": random.choice(["web", "mobile", "store", "phone"])
    }

def generate_traffic_event():
    """Generate traffic condition event"""
    return {
        "sensor_id": f"TRAFFIC-{random.randint(100, 999)}",
        "timestamp": datetime.now().isoformat(),
        "location": {
            "street": fake.street_name(),
            "intersection": f"{fake.street_name()} & {fake.street_name()}",
            "latitude": float(fake.latitude()),
            "longitude": float(fake.longitude())
        },
        "conditions": {
            "speed": random.randint(15, 65),
            "congestion_level": random.choice(["low", "medium", "high", "severe"]),
            "incident": random.choice([None, "accident", "construction", "weather"]) if random.random() < 0.2 else None,
            "visibility": random.choice(["clear", "fog", "rain", "snow"]),
            "road_condition": random.choice(["dry", "wet", "icy", "construction"])
        },
        "impact": {
            "delay_minutes": random.randint(0, 45),
            "affected_routes": [f"RT-{random.randint(100, 999)}" for _ in range(random.randint(1, 3))]
        }
    }

def generate_delivery_event():
    """Generate delivery tracking event"""
    return {
        "delivery_id": f"DEL-{random.randint(1000, 9999)}",
        "order_id": f"ORD-{random.randint(10000, 99999)}",
        "timestamp": datetime.now().isoformat(),
        "status": random.choice(["picked_up", "in_transit", "out_for_delivery", "delivered", "exception"]),
        "location": {
            "latitude": float(fake.latitude()),
            "longitude": float(fake.longitude()),
            "address": fake.address()
        },
        "vehicle": {
            "id": f"TRK-{random.randint(1000, 9999)}",
            "driver": fake.name(),
            "fuel_level": random.randint(20, 100),
            "speed": random.randint(0, 65)
        },
        "eta": (datetime.now() + timedelta(minutes=random.randint(30, 180))).isoformat(),
        "route_optimization": {
            "original_distance": round(random.uniform(20, 80), 1),
            "optimized_distance": round(random.uniform(15, 60), 1),
            "fuel_savings": round(random.uniform(5, 25), 2),
            "time_savings": random.randint(5, 30)
        }
    }

def produce_orders(producer):
    """Continuously produce order events"""
    while True:
        try:
            order = generate_order_event()
            producer.send('orders', key=order['order_id'], value=order)
            print(f"Produced order: {order['order_id']}")
            time.sleep(random.uniform(2, 8))  # Random interval between orders
        except Exception as e:
            print(f"Error producing order: {e}")
            time.sleep(5)

def produce_traffic(producer):
    """Continuously produce traffic events"""
    while True:
        try:
            traffic = generate_traffic_event()
            producer.send('traffic', key=traffic['sensor_id'], value=traffic)
            print(f"Produced traffic update: {traffic['sensor_id']}")
            time.sleep(random.uniform(10, 30))  # Traffic updates every 10-30 seconds
        except Exception as e:
            print(f"Error producing traffic: {e}")
            time.sleep(5)

def produce_deliveries(producer):
    """Continuously produce delivery events"""
    while True:
        try:
            delivery = generate_delivery_event()
            producer.send('delivery_events', key=delivery['delivery_id'], value=delivery)
            print(f"Produced delivery event: {delivery['delivery_id']} - {delivery['status']}")
            time.sleep(random.uniform(5, 15))  # Delivery updates every 5-15 seconds
        except Exception as e:
            print(f"Error producing delivery: {e}")
            time.sleep(5)

def main():
    """Main function to start all data generators"""
    print("Starting SmartRetail360 Data Generator...")
    
    # Wait for Kafka to be ready
    time.sleep(30)
    
    try:
        producer = create_producer()
        
        # Start producer threads
        threads = [
            threading.Thread(target=produce_orders, args=(producer,), daemon=True),
            threading.Thread(target=produce_traffic, args=(producer,), daemon=True),
            threading.Thread(target=produce_deliveries, args=(producer,), daemon=True)
        ]
        
        for thread in threads:
            thread.start()
            print(f"Started {thread.name}")
        
        print("All data generators started successfully!")
        
        # Keep main thread alive
        while True:
            time.sleep(60)
            print(f"Data generators running... {datetime.now()}")
            
    except KeyboardInterrupt:
        print("Shutting down data generators...")
    except Exception as e:
        print(f"Error in main: {e}")
    finally:
        if 'producer' in locals():
            producer.close()

if __name__ == "__main__":
    main()