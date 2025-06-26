import React, { useMemo } from 'react';
import type { Filters } from './SidebarFilters_new';
import { generateVehicles } from './mockData';

type Props = {
  filters: Filters;
  highlightVehicleIds?: number[];
  onVehicleHover?: (vehicleId: number | null) => void;
  highlightRegion?: string | null;
  vehicles?: any[];
};

const mapWidth = 400;
const mapHeight = 250;
const minLat = 19.07, maxLat = 19.08, minLng = 72.87, maxLng = 72.88;

function project(lat: number, lng: number) {
  // Simple normalization for mock map
  return {
    x: ((lng - minLng) / (maxLng - minLng)) * mapWidth,
    y: mapHeight - ((lat - minLat) / (maxLat - minLat)) * mapHeight,
  };
}

const VehicleMapPanel: React.FC<Props> = ({ filters, highlightVehicleIds = [], onVehicleHover, highlightRegion, vehicles: propVehicles }) => {
  const vehicles = propVehicles ?? (useMemo(() => generateVehicles(), []) as any[]);

  const filteredVehicles = useMemo(() =>
    vehicles.filter(v =>
      (filters.state.length === 0 || filters.state.includes(v.state)) &&
      (filters.city.length === 0 || filters.city.includes(v.city)) &&
      (filters.category.length === 0 || filters.category.includes(v.type))
    ),
    [filters, vehicles]
  );

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Vehicle Map</h2>
      <div className={`bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border-2 border-cyan-500/40 shadow-xl flex flex-col items-center ${highlightRegion ? 'ring-4 ring-cyan-400/40' : ''}`}>
        <h3 className="text-lg text-white mb-4">Live Vehicle Locations (Mock)</h3>
        <svg width={mapWidth} height={mapHeight} className="bg-gray-900 rounded-lg border border-gray-700">
          {/* Draw vehicles */}
          {filteredVehicles.map(v => {
            const { x, y } = project(v.lat, v.lng);
            const isHighlighted = highlightVehicleIds.includes(v.id);
            return (
              <g key={v.id}
                onMouseEnter={() => onVehicleHover && onVehicleHover(v.id)}
                onMouseLeave={() => onVehicleHover && onVehicleHover(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHighlighted ? 18 : 14}
                  fill={v.color}
                  opacity={isHighlighted ? 1 : 0.8}
                  stroke={isHighlighted ? '#fff' : 'none'}
                  strokeWidth={isHighlighted ? 4 : 0}
                  filter={isHighlighted ? 'drop-shadow(0 0 8px #fff)' : ''}
                />
                <text x={x} y={y + 5} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold">{v.label}</text>
              </g>
            );
          })}
        </svg>
        <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-xl">
          {filteredVehicles.map(v => {
            const isHighlighted = highlightVehicleIds.includes(v.id);
            return (
              <div
                key={v.id}
                className={`flex items-center gap-2 bg-gray-700/60 rounded-lg px-3 py-2 ${isHighlighted ? 'ring-2 ring-cyan-400' : ''}`}
                onMouseEnter={() => onVehicleHover && onVehicleHover(v.id)}
                onMouseLeave={() => onVehicleHover && onVehicleHover(null)}
                style={{ cursor: 'pointer' }}
              >
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: v.color }} />
                <span className="text-white font-semibold">{v.label}</span>
                <span className="text-xs text-gray-300">{v.type}</span>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: v.status === 'Active' ? '#10B981' : v.status === 'Delivering' ? '#F59E0B' : '#6366F1', color: '#fff' }}>{v.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VehicleMapPanel;
export type { Props as VehicleMapPanelProps }; 