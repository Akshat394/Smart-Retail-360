import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Box, Plane, Environment, SpotLight } from '@react-three/drei';
import * as THREE from 'three';

// Warehouse object type
interface WarehouseObject {
  id: string;
  position: [number, number, number]; // [x, y, z]
  size: [number, number, number]; // [width, height, depth]
  color: string;
}

const WAREHOUSE_OBJECTS: WarehouseObject[] = [
  { id: 'box1', position: [0, 0.5, -5], size: [1, 1, 1], color: '#8ecae6' },
  { id: 'box2', position: [-2, 0.75, -7], size: [1.5, 1.5, 1], color: '#ffb703' },
  { id: 'box3', position: [2, 1, -9], size: [1, 2, 1], color: '#219ebc' },
  { id: 'box4', position: [1, 0.25, -4], size: [0.5, 0.5, 0.5], color: '#fb8500' },
  { id: 'box5', position: [-3, 1, -6], size: [1, 2, 1], color: '#adb5bd' },
  { id: 'box6', position: [3, 0.5, -8], size: [1, 1, 1], color: '#b5179e' },
];

const ROBOT_HEIGHT = 1.2; // meters (eye level)
const MOVE_SPEED = 0.12; // meters per frame
const TURN_SPEED = 0.045; // radians per frame

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

const RobotCameraController: React.FC<{
  robotPos: [number, number, number];
  rotationY: number;
  setRobotPos: React.Dispatch<React.SetStateAction<[number, number, number]>>;
  setRotationY: React.Dispatch<React.SetStateAction<number>>;
  keys: React.MutableRefObject<{ [key: string]: boolean }>;
}> = ({ robotPos, rotationY, setRobotPos, setRotationY, keys }) => {
  useFrame(({ camera }) => {
    let [x, y, z] = robotPos;
    let rot = rotationY;
    let moved = false;
    // Forward/backward
    if (keys.current['w'] || keys.current['arrowup']) {
      x -= Math.sin(rot) * MOVE_SPEED;
      z -= Math.cos(rot) * MOVE_SPEED;
      moved = true;
    }
    if (keys.current['s'] || keys.current['arrowdown']) {
      x += Math.sin(rot) * MOVE_SPEED;
      z += Math.cos(rot) * MOVE_SPEED;
      moved = true;
    }
    // Turn left/right
    if (keys.current['a'] || keys.current['arrowleft']) {
      rot += TURN_SPEED;
      moved = true;
    }
    if (keys.current['d'] || keys.current['arrowright']) {
      rot -= TURN_SPEED;
      moved = true;
    }
    // Clamp position (simple bounds)
    x = clamp(x, -5, 5);
    z = clamp(z, -12, 3);
    if (moved) {
      setRobotPos([x, y, z]);
      setRotationY(rot);
    }
    camera.position.set(x, y, z);
    camera.rotation.set(0, rot, 0);
    camera.updateProjectionMatrix();
  });
  return null;
};

const RobotView3D: React.FC = () => {
  const [robotPos, setRobotPos] = useState<[number, number, number]>([0, ROBOT_HEIGHT, 2]);
  const [rotationY, setRotationY] = useState(0); // radians
  const keys = useRef<{ [key: string]: boolean }>({});

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div style={{ width: '100%', height: 500 }}>
      <Canvas shadows camera={{ fov: 75, near: 0.1, far: 100 }}>
        <Suspense fallback={null}>
          {/* Spot light for realism */}
          <SpotLight
            position={[0, 8, 0]}
            angle={0.4}
            penumbra={0.5}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          {/* Soft ambient light */}
          <ambientLight intensity={0.3} />
          {/* Ground plane */}
          <Plane
            args={[20, 20]}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, -5]}
            receiveShadow
          >
            <meshStandardMaterial color="#e0e0e0" />
          </Plane>
          {/* Warehouse objects */}
          {WAREHOUSE_OBJECTS.map(obj => (
            <Box
              key={obj.id}
              args={obj.size}
              position={obj.position}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial color={obj.color} />
            </Box>
          ))}
          {/* First-person camera controller */}
          <RobotCameraController
            robotPos={robotPos}
            rotationY={rotationY}
            setRobotPos={setRobotPos}
            setRotationY={setRotationY}
            keys={keys}
          />
        </Suspense>
      </Canvas>
      <div style={{ textAlign: 'center', marginTop: 8, color: '#333' }}>
        <strong>Controls:</strong> WASD or Arrow keys to move/turn<br />
        <strong>Robot Position:</strong> x={robotPos[0].toFixed(2)} m, z={robotPos[2].toFixed(2)} m, yaw={(rotationY * 180 / Math.PI).toFixed(0)}°
      </div>
    </div>
  );
};

export default RobotView3D; 