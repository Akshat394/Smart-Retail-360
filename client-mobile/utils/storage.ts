import AsyncStorage from '@react-native-async-storage/async-storage';

export async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function getItem<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(key);
  return value ? JSON.parse(value) : null;
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

// Offline queue helpers
const QUEUE_KEY = 'offline_queue';

export async function addToQueue(action: any) {
  const queue = (await getItem<any[]>(QUEUE_KEY)) || [];
  queue.push(action);
  await setItem(QUEUE_KEY, queue);
}

export async function getQueue(): Promise<any[]> {
  return (await getItem<any[]>(QUEUE_KEY)) || [];
}

export async function clearQueue() {
  await setItem(QUEUE_KEY, []);
} 