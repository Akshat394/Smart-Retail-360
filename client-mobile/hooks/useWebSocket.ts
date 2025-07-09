import { useEffect, useRef } from 'react';

export function useWebSocket(url: string, onMessage: (data: any) => void) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;
    function connect() {
      ws.current = new WebSocket(url);
      ws.current.onopen = () => {
        // Optionally send auth or subscribe message
      };
      ws.current.onmessage = (event) => {
        if (isMounted) {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (e) {}
        }
      };
      ws.current.onclose = () => {
        if (isMounted) {
          reconnectTimeout.current = setTimeout(connect, 3000);
        }
      };
      ws.current.onerror = () => {
        ws.current?.close();
      };
    }
    connect();
    return () => {
      isMounted = false;
      ws.current?.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [url, onMessage]);
} 