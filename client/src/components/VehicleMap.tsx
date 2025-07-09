import React, { useEffect, useState, useRef, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Maximize2, X, AlertTriangle, Package } from 'lucide-react';
import { apiService } from '../services/api';
import { NotificationToast } from './Notifications';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDvT7wST6n7YFSb-Afkt307F2kiX9W_b1o';
const DEFAULT_POSITION = { lat: 28.6139, lng: 77.2090 };

// Traffic alert icons by type (not used directly, but kept for future custom marker support)
const alertIcons: Record<string, string> = {
  construction: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  accident: 'https://cdn-icons-png.flaticon.com/512/565/565547.png',
  weather: 'https://cdn-icons-png.flaticon.com/512/1163/1163661.png',
};

interface VehicleMapProps {
  routeId?: string;
}

// Polyline overlay component using Google Maps API directly
const PolylineOverlay: React.FC<{ path: { lat: number; lng: number }[] }> = ({ path }) => {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !path || path.length < 2) return;
    // Remove previous polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    // Draw new polyline
    polylineRef.current = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#00eaff',
      strokeOpacity: 0.8,
      strokeWeight: 5,
    });
    polylineRef.current.setMap(map);
    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, path]);
  return null;
};

const VehicleMap: React.FC<VehicleMapProps> = ({ routeId }) => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [polyline, setPolyline] = useState<{ lat: number; lng: number }[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [infoWindowIdx, setInfoWindowIdx] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [simEvent, setSimEvent] = useState<null | {
    blocked: boolean;
    oldPath: { lat: number; lng: number }[];
    newPath: { lat: number; lng: number }[];
    eta: number;
    reroutedEta: number;
  }>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type?: string } | null>(null);

  // Fetch initial vehicle locations
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const data = await apiService.getVehicleLocations();
        setVehicles(data as any[]);
      } catch (error) {
        // Handle error
      }
    };
    fetchVehicles();
  }, []);

  // Fetch traffic alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await apiService.getTrafficAlerts();
        setAlerts(data as any[]);
      } catch (error) {
        // Handle error
      }
    };
    fetchAlerts();
  }, []);

  // Fetch optimized route polyline if routeId is provided
  useEffect(() => {
    if (!routeId) return;
    const fetchPolyline = async () => {
      try {
        const data = await apiService.getOptimizedRoute(routeId);
        setPolyline((data as any).polyline || []);
      } catch (error) {
        // Handle error
      }
    };
    fetchPolyline();
  }, [routeId]);

  // Fetch active deliveries on mount
  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const data = await apiService.getAutonomousDeliveries();
        setDeliveries(data as any[]);
      } catch {}
    };
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 10000); // Poll every 10s for backup
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time delivery updates
  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    // Use port 5000 explicitly since window.location.port might be undefined in development
    const wsPort = window.location.port || '5000';
    const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/ws`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'autonomous_delivery_update' && msg.data) {
          setDeliveries((prev) => {
            const idx = prev.findIndex(d => d.id === msg.data.id);
            if (idx !== -1) {
              // Update delivery
              const updated = [...prev];
              // Show toast if just delivered
              if (updated[idx].status !== 'Delivered' && msg.data.status === 'Delivered') {
                setToast({ message: `Delivery #${msg.data.id} completed!`, type: 'success' });
                setTimeout(() => setToast(null), 4000);
              }
              updated[idx] = { ...updated[idx], ...msg.data };
              return updated;
            } else {
              // New delivery
              return [...prev, msg.data];
            }
          });
        }
      } catch {}
    };
    return () => ws.close();
  }, []);

  // WebSocket for real-time updates
  useEffect(() => {
    // Use port 5000 explicitly since window.location.port might be undefined in development
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    const wsPort = window.location.port || '5000';
    const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/ws`;
    wsRef.current = new WebSocket(wsUrl);
    wsRef.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'vehicle_location_update' && msg.data) {
          setVehicles((prev) => {
            const idx = prev.findIndex(v => v.id === msg.data.id);
            if (idx !== -1) {
              // Animate movement (simple: just update position)
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...msg.data };
              return updated;
            } else {
              // New vehicle
              return [...prev, msg.data];
            }
          });
        }
      } catch (e) { /* ignore */ }
    };
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const isValidLatLng = (loc: any) => loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' && !isNaN(loc.lat) && !isNaN(loc.lng);

  // Simulate traffic event handler
  const handleSimulateTraffic = useCallback(() => {
    // For demo: pick a random route polyline (or use current polyline if available)
    const oldPath = polyline.length > 1 ? polyline : [
      { lat: 28.6139, lng: 77.2090 },
      { lat: 28.7041, lng: 77.1025 },
      { lat: 28.5355, lng: 77.3910 }
    ];
    // Simulate rerouted path (add a detour)
    const newPath = [oldPath[0], { lat: 28.65, lng: 77.25 }, oldPath[oldPath.length - 1]];
    setSimEvent({
      blocked: true,
      oldPath,
      newPath,
      eta: 45,
      reroutedEta: 60
    });
    setTimeout(() => setSimEvent(null), 10000); // Auto-clear after 10s
  }, [polyline]);

  // Polyline overlay with color
  const ColoredPolylineOverlay: React.FC<{ path: { lat: number; lng: number }[]; color: string }> = ({ path, color }) => {
    const map = useMap();
    const polylineRef = useRef<google.maps.Polyline | null>(null);
    useEffect(() => {
      if (!map || !path || path.length < 2) return;
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      polylineRef.current = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 6,
      });
      polylineRef.current.setMap(map);
      return () => {
        if (polylineRef.current) {
          polylineRef.current.setMap(null);
          polylineRef.current = null;
        }
      };
    }, [map, path, color]);
    return null;
  };

  const renderMap = (height: string, width: string) => (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        defaultCenter={DEFAULT_POSITION}
        defaultZoom={6}
        style={{ width, height, borderRadius: '12px' }}
        mapId={undefined}
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        {/* Vehicle markers */}
        {vehicles.map((vehicle, idx) => (
          isValidLatLng(vehicle.location) && (
            <AdvancedMarker
              key={vehicle.id}
              position={vehicle.location}
              onClick={() => setInfoWindowIdx(idx)}
            >
              {infoWindowIdx === idx && (
                <InfoWindow onCloseClick={() => setInfoWindowIdx(null)}>
                  <div>
                    <strong>{vehicle.name}</strong><br />
                    Vehicle: {vehicle.vehicleId || 'N/A'}<br />
                    Status: {vehicle.status}<br />
                    Email: {vehicle.email}
                  </div>
                </InfoWindow>
              )}
            </AdvancedMarker>
          )
        ))}
        {/* Animated drone/vehicle delivery markers */}
        {deliveries.map((delivery, idx) => (
          isValidLatLng(delivery.current) && (
            <AdvancedMarker
              key={`delivery-${delivery.id}`}
              position={delivery.current}
              onClick={() => setInfoWindowIdx(10000 + idx)}
            >
              {delivery.mode === 'drone' ? <Package color="#10B981" /> : <Package color="#6366F1" />}
              {infoWindowIdx === 10000 + idx && (
                <InfoWindow onCloseClick={() => setInfoWindowIdx(null)}>
                  <div>
                    <strong>Delivery #{delivery.id}</strong><br />
                    Mode: {delivery.mode}<br />
                    Status: {delivery.status}<br />
                    ETA: {delivery.eta} min<br />
                    CO₂: {delivery.co2} kg<br />
                    Cost: ${delivery.cost}<br />
                  </div>
                </InfoWindow>
              )}
            </AdvancedMarker>
          )
        ))}
        {/* Traffic alert markers */}
        {alerts.map((alert, idx) => (
          isValidLatLng(alert.location) && (
            <AdvancedMarker
              key={alert.id}
              position={alert.location}
              onClick={() => setInfoWindowIdx(1000 + idx)}
            >
              {infoWindowIdx === 1000 + idx && (
                <InfoWindow onCloseClick={() => setInfoWindowIdx(null)}>
                  <div>
                    <strong>{alert.type.toUpperCase()}</strong><br />
                    Impact: {alert.impact}<br />
                    Delay: {alert.delay}<br />
                    Affected Routes: {alert.affectedRoutes.join(', ')}
                  </div>
                </InfoWindow>
              )}
            </AdvancedMarker>
          )
        ))}
        {/* Simulated traffic event overlays */}
        {simEvent && simEvent.blocked && (
          <>
            {/* Old route in red */}
            <ColoredPolylineOverlay path={simEvent.oldPath} color="#ef4444" />
            {/* New route in green */}
            <ColoredPolylineOverlay path={simEvent.newPath} color="#22c55e" />
            {/* Markers for start, detour, end */}
            <AdvancedMarker position={simEvent.oldPath[0]}><AlertTriangle color="#f87171" /></AdvancedMarker>
            <AdvancedMarker position={simEvent.newPath[1]}><AlertTriangle color="#facc15" /></AdvancedMarker>
            <AdvancedMarker position={simEvent.oldPath[simEvent.oldPath.length-1]}><AlertTriangle color="#34d399" /></AdvancedMarker>
          </>
        )}
        {/* Polyline overlay using Google Maps API directly */}
        {!simEvent && polyline.length > 1 && <PolylineOverlay path={polyline} />}
        {!simEvent && polyline.length > 1 && polyline.map((point, idx) => (
          isValidLatLng(point) && <AdvancedMarker key={`polyline-point-${idx}`} position={point} />
        ))}
      </Map>
    </APIProvider>
  );

  // Sidebar/overlay for active deliveries
  const renderDeliveriesSidebar = () => (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 60,
      zIndex: 1200,
      background: '#0f172a',
      color: '#fff',
      padding: '16px 20px',
      borderRadius: 12,
      boxShadow: '0 2px 12px #0006',
      minWidth: 260,
      maxHeight: 340,
      overflowY: 'auto',
    }}>
      <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Active Deliveries</h3>
      {deliveries.length === 0 ? (
        <div style={{ color: '#94a3b8' }}>No active deliveries</div>
      ) : (
        deliveries.map(delivery => (
          <div key={delivery.id} style={{
            background: delivery.mode === 'drone' ? '#0e7490' : '#6366f1',
            color: '#fff',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 10,
            boxShadow: '0 1px 4px #0003',
            fontWeight: 500,
          }}>
            <div>#{delivery.id} <span style={{ fontSize: 12, fontWeight: 400 }}>({delivery.mode})</span></div>
            <div>Status: {delivery.status}</div>
            <div>ETA: {delivery.eta} min</div>
            <div>From: [{delivery.start.lat.toFixed(3)}, {delivery.start.lng.toFixed(3)}]</div>
            <div>To: [{delivery.end.lat.toFixed(3)}, {delivery.end.lng.toFixed(3)}]</div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <>
      <div style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 16px #0003', position: 'relative' }}>
        <button
          onClick={() => setFullscreen(true)}
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, background: 'rgba(30,41,59,0.8)', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer' }}
          title="Expand Map"
        >
          <Maximize2 size={20} color="#fff" />
        </button>
        {/* Simulate Traffic Event Button */}
        <button
          onClick={handleSimulateTraffic}
          style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px #0002' }}
        >
          Simulate Traffic Event
        </button>
        {simEvent && (
          <div style={{ position: 'absolute', top: 60, left: 16, zIndex: 1100, background: '#1e293b', color: '#fff', padding: '12px 18px', borderRadius: 8, boxShadow: '0 2px 8px #0006', fontWeight: 500 }}>
            <AlertTriangle style={{ verticalAlign: 'middle', marginRight: 8 }} color="#f59e0b" />
            <span>Traffic Event: Route Blocked!<br />Old ETA: {simEvent.eta} min &rarr; New ETA: {simEvent.reroutedEta} min</span>
          </div>
        )}
        {toast && (
          <NotificationToast notification={{
            id: Date.now(),
            orderId: 0,
            customerName: '',
            message: toast.message,
            type: toast.type || 'info',
            createdAt: new Date().toISOString(),
            read: false
          }} onClose={() => setToast(null)} />
        )}
        {renderDeliveriesSidebar()}
        {renderMap('400px', '100%')}
      </div>
      {/* Fullscreen Modal */}
      {fullscreen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(16,23,42,0.98)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <button
            onClick={() => setFullscreen(false)}
            style={{ position: 'absolute', top: 32, right: 32, zIndex: 2100, background: 'rgba(30,41,59,0.8)', border: 'none', borderRadius: 6, padding: 8, cursor: 'pointer' }}
            title="Close Fullscreen"
          >
            <X size={24} color="#fff" />
          </button>
          <div style={{ width: '90vw', height: '85vh', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 32px #0008', background: '#1e293b' }}>
            {renderMap('85vh', '100%')}
          </div>
        </div>
      )}
    </>
  );
};

export default VehicleMap; 