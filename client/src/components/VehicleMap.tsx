import React, { useEffect, useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Maximize2, X } from 'lucide-react';
import { apiService } from '../services/api';

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

  // WebSocket for real-time updates
  useEffect(() => {
    // Use window.location.port if present, else default to 3000 (or your backend port)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    // If your backend runs on a different port, set it here. Otherwise, use window.location.port
    const wsPort = window.location.port ? `:${window.location.port}` : '';
    const wsUrl = `${wsProtocol}//${wsHost}${wsPort}/ws`;
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
        {/* Polyline overlay using Google Maps API directly */}
        {polyline.length > 1 && <PolylineOverlay path={polyline} />}
        {polyline.length > 1 && polyline.map((point, idx) => (
          isValidLatLng(point) && <AdvancedMarker key={`polyline-point-${idx}`} position={point} />
        ))}
      </Map>
    </APIProvider>
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