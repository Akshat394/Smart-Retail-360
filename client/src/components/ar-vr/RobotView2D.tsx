import React, { useRef, useEffect, useState } from 'react';

// Types for objects in the warehouse
interface WarehouseObject {
  id: string;
  x: number; // world coordinates (meters)
  y: number; // world coordinates (meters)
  width: number; // meters
  height: number; // meters
  color: string;
}

// Robot state
interface RobotState {
  x: number; // meters
  y: number; // meters
  angle: number; // radians, 0 = facing up
}

const WAREHOUSE_OBJECTS: WarehouseObject[] = [
  { id: 'box1', x: 0, y: 5, width: 1, height: 1, color: '#8ecae6' },
  { id: 'box2', x: -2, y: 7, width: 1.5, height: 1, color: '#ffb703' },
  { id: 'box3', x: 2, y: 9, width: 1, height: 2, color: '#219ebc' },
  { id: 'box4', x: 1, y: 4, width: 0.5, height: 0.5, color: '#fb8500' },
];

const VIEW_WIDTH = 500; // px
const VIEW_HEIGHT = 400; // px
const METERS_PER_PX = 0.05; // 1 px = 5 cm
const FOV = Math.PI / 2; // 90 degrees
const MAX_VIEW_DISTANCE = 10; // meters

function worldToRobotCoords(
  obj: WarehouseObject,
  robot: RobotState
): { x: number; y: number } {
  // Translate world coordinates to robot-centric coordinates
  const dx = obj.x - robot.x;
  const dy = obj.y - robot.y;
  // Rotate by -robot.angle
  const x = dx * Math.cos(-robot.angle) - dy * Math.sin(-robot.angle);
  const y = dx * Math.sin(-robot.angle) + dy * Math.cos(-robot.angle);
  return { x, y };
}

function robotToScreenCoords(x: number, y: number): { sx: number; sy: number } {
  // Robot is at bottom center
  // y increases away from robot
  const sx = VIEW_WIDTH / 2 + x / METERS_PER_PX;
  const sy = VIEW_HEIGHT - y / METERS_PER_PX;
  return { sx, sy };
}

const RobotView2D: React.FC = () => {
  const [robot, setRobot] = useState<RobotState>({ x: 0, y: 0, angle: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        moveRobot(e.key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line
  }, [robot]);

  const moveRobot = (direction: string) => {
    setRobot(prev => {
      const MOVE_STEP = 0.5; // meters
      const TURN_STEP = Math.PI / 16; // radians
      let { x, y, angle } = prev;
      if (direction === 'ArrowUp') {
        x += MOVE_STEP * Math.sin(angle);
        y += MOVE_STEP * Math.cos(angle);
      } else if (direction === 'ArrowDown') {
        x -= MOVE_STEP * Math.sin(angle);
        y -= MOVE_STEP * Math.cos(angle);
      } else if (direction === 'ArrowLeft') {
        angle -= TURN_STEP;
      } else if (direction === 'ArrowRight') {
        angle += TURN_STEP;
      }
      return { x, y, angle };
    });
  };

  // Filter objects in FOV and range
  const visibleObjects = WAREHOUSE_OBJECTS
    .map(obj => {
      const { x, y } = worldToRobotCoords(obj, robot);
      return { ...obj, rx: x, ry: y };
    })
    .filter(obj => {
      // Only objects in front of robot and within FOV
      const angleToObj = Math.atan2(obj.rx, obj.ry);
      return (
        obj.ry > 0 &&
        Math.abs(angleToObj) < FOV / 2 &&
        Math.sqrt(obj.rx ** 2 + obj.ry ** 2) < MAX_VIEW_DISTANCE
      );
    })
    .sort((a, b) => a.ry - b.ry); // draw farthest first

  return (
    <div style={{ textAlign: 'center' }}>
      <h3>Robot's Eye View (2D)</h3>
      <svg
        ref={svgRef}
        width={VIEW_WIDTH}
        height={VIEW_HEIGHT}
        style={{ border: '2px solid #333', background: '#f0f0f0' }}
      >
        {/* Draw visible objects */}
        {visibleObjects.map(obj => {
          const { sx, sy } = robotToScreenCoords(obj.rx, obj.ry);
          const objWidthPx = obj.width / METERS_PER_PX;
          const objHeightPx = obj.height / METERS_PER_PX;
          return (
            <rect
              key={obj.id}
              x={sx - objWidthPx / 2}
              y={sy - objHeightPx}
              width={objWidthPx}
              height={objHeightPx}
              fill={obj.color}
              stroke="#333"
              strokeWidth={2}
              opacity={0.9}
            />
          );
        })}
        {/* Draw robot (bottom center) */}
        <circle
          cx={VIEW_WIDTH / 2}
          cy={VIEW_HEIGHT}
          r={16}
          fill="#023047"
          stroke="#333"
          strokeWidth={2}
        />
        {/* Draw direction indicator */}
        <line
          x1={VIEW_WIDTH / 2}
          y1={VIEW_HEIGHT}
          x2={VIEW_WIDTH / 2 + 0.0 * 0.0}
          y2={VIEW_HEIGHT - 40}
          stroke="#219ebc"
          strokeWidth={4}
          markerEnd="url(#arrowhead)"
        />
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#219ebc" />
          </marker>
        </defs>
      </svg>
      <div style={{ marginTop: 16 }}>
        <button onClick={() => moveRobot('ArrowUp')}>⬆️ Forward</button>
        <button onClick={() => moveRobot('ArrowLeft')}>⬅️ Turn Left</button>
        <button onClick={() => moveRobot('ArrowRight')}>➡️ Turn Right</button>
        <button onClick={() => moveRobot('ArrowDown')}>⬇️ Backward</button>
      </div>
      <div style={{ marginTop: 8, fontSize: 14 }}>
        <strong>Controls:</strong> Arrow keys or buttons<br />
        <strong>Robot Position:</strong> x={robot.x.toFixed(2)} m, y={robot.y.toFixed(2)} m, angle={(robot.angle * 180 / Math.PI).toFixed(0)}°
      </div>
    </div>
  );
};

export default RobotView2D; 