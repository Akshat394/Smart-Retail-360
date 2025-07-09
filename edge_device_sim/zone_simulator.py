import time
import json
import random
import paho.mqtt.client as mqtt
from datetime import datetime

BROKER = 'localhost'  # Change to your MQTT broker address if needed
PORT = 1883
ZONES = ['A', 'B', 'C']

client = mqtt.Client()
client.connect(BROKER, PORT, 60)


def generate_payload(zone):
    return json.dumps({
        'zone': zone,
        'temperature': round(random.uniform(18, 30), 2),
        'humidity': round(random.uniform(30, 70), 2),
        'vibration': round(random.uniform(0, 2), 2),
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    })


def main():
    while True:
        for zone in ZONES:
            topic = f'zone/{zone}'
            payload = generate_payload(zone)
            client.publish(topic, payload)
            print(f'Published to {topic}: {payload}')
        time.sleep(5)


if __name__ == '__main__':
    main() 