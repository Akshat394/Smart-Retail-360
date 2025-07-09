import mqtt from 'mqtt';
import { db } from './db';
import { iotReadings } from '../../../shared/schema';

const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const ZONES = ['A', 'B', 'C'];

export function startIotMqttSubscriber() {
  const client = mqtt.connect(MQTT_BROKER);

  client.on('connect', () => {
    ZONES.forEach(zone => {
      client.subscribe(`zone/${zone}`);
    });
    console.log('IoT MQTT subscriber connected and subscribed to zones:', ZONES);
  });

  client.on('message', async (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      if (!data.zone || !ZONES.includes(data.zone)) return;
      await db.insert(iotReadings).values({
        zone: data.zone,
        temperature: data.temperature,
        humidity: data.humidity,
        vibration: data.vibration,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      });
      // Optionally: emit event or log
    } catch (e) {
      console.error('Failed to process IoT MQTT message:', e);
    }
  });
} 