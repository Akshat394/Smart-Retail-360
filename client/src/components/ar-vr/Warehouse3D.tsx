import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { apiService } from '../../services/api';
import { Warehouse as WarehouseIcon, Award } from 'lucide-react';

interface Robot {
  id: string;
  position: { x: number; y: number; z: number };
  status: 'idle' | 'active' | 'maintenance';
  health: number;
}

const Warehouse3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const robotsRef = useRef<{ [id: string]: THREE.Mesh }>({});
  const fbxModelUrl = '/uploads_files_2883707_warehouse6.fbx';

  const [robots, setRobots] = useState<Robot[]>([]);
  const [robotPaths, setRobotPaths] = useState<{ [id: string]: { path: { x: number; y: number }[]; progress: number } }>({});
  const [co2Data, setCo2Data] = useState<any[]>([]);
  const [iotZones, setIotZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fbxError, setFbxError] = useState<string | null>(null);

  // Add grid and pathfinding utilities
  const GRID_SIZE = 20;
  const GRID_SPACING = 4;
  function gridToWorld(x: number, y: number) {
    return { x: (x - GRID_SIZE / 2) * GRID_SPACING, z: (y - GRID_SIZE / 2) * GRID_SPACING };
  }
  function worldToGrid(x: number, z: number) {
    return {
      x: Math.round(x / GRID_SPACING + GRID_SIZE / 2),
      y: Math.round(z / GRID_SPACING + GRID_SIZE / 2)
    };
  }
  // Simple Dijkstra for open grid (no obstacles)
  function dijkstra(start: [number, number], end: [number, number]) {
    const queue: [number, number][] = [start];
    const visited = new Set();
    const prev: Record<string, [number, number] | null> = {};
    prev[start.join(',')] = null;
    while (queue.length) {
      const [x, y] = queue.shift()!;
      if (x === end[0] && y === end[1]) break;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
        const key = `${nx},${ny}`;
        if (!visited.has(key)) {
          queue.push([nx, ny]);
          visited.add(key);
          prev[key] = [x, y];
        }
      }
    }
    // Reconstruct path
    let path: [number, number][] = [];
    let cur: [number, number] | null = end;
    while (cur && prev[cur.join(',')]) {
      path.push(cur);
      cur = prev[cur.join(',')];
    }
    path.push(start);
    return path.reverse();
  }

  useEffect(() => {
    if (!mountRef.current) return;
    setLoading(true);
    setFbxError(null);

    let fbxLoaded = false;
    let animationFrameId: number;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(50, 30, 50);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(30, 100, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.3, roughness: 0.6 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Load FBX with error handling and timeout
    const loader = new FBXLoader();
    let fbxTimeout = setTimeout(() => {
      if (!fbxLoaded) {
        setFbxError('3D warehouse model took too long to load. Showing basic view.');
        setLoading(false);
      }
    }, 7000); // 7 seconds max
    try {
      loader.load(
        fbxModelUrl,
        (fbx) => {
          fbxLoaded = true;
          clearTimeout(fbxTimeout);
          fbx.scale.set(0.05, 0.05, 0.05);
          fbx.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          scene.add(fbx);
          setLoading(false);
        },
        undefined,
        (err) => {
          setFbxError('Failed to load 3D warehouse model. Showing basic view.');
          setLoading(false);
        }
      );
    } catch (err) {
      setFbxError('Error loading 3D warehouse model. Showing basic view.');
      setLoading(false);
    }

    // Animate robots
    const clock = new THREE.Clock();
    const animate = () => {
      try {
        animationFrameId = requestAnimationFrame(animate);
        const time = clock.getElapsedTime();
        Object.entries(robotsRef.current).forEach(([id, mesh], idx) => {
          const robot = robots.find(r => r.id === id);
          if (!robot) return;
          const pathObj = robotPaths[id];
          if (pathObj && pathObj.path.length > 1) {
            // Progress along path
            pathObj.progress = Math.min(pathObj.progress + 0.002, 1);
            const pathIdx = Math.floor(pathObj.progress * (pathObj.path.length - 1));
            const { x, y } = pathObj.path[pathIdx];
            const world = gridToWorld(x, y);
            mesh.position.x = world.x;
            mesh.position.z = world.z;
            mesh.position.y = 1 + Math.sin(time * 2 + idx) * 0.5;
            mesh.rotation.y += 0.05;
            // Draw path trail (as spheres, limit to 20 per robot)
            if (scene && !mesh.userData.trailDrawn) {
              pathObj.path.forEach((pt, i) => {
                if (i % Math.ceil(pathObj.path.length / 20) === 0) { // max 20 spheres
                  let co2 = co2Data[idx % co2Data.length]?.co2 || 0;
                  let color = co2 < 7 ? 0x00ff00 : co2 < 12 ? 0xffff00 : 0xff0000;
                  const sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(0.2, 8, 8),
                    new THREE.MeshBasicMaterial({ color })
                  );
                  const w = gridToWorld(pt.x, pt.y);
                  sphere.position.set(w.x, 0.2, w.z);
                  scene.add(sphere);
                }
              });
              mesh.userData.trailDrawn = true;
            }
          } else if (robot.status === 'active') {
            const radius = 10 + idx * 5;
            mesh.position.x = Math.cos(time + idx) * radius;
            mesh.position.z = Math.sin(time + idx) * radius;
            mesh.position.y = 1 + Math.sin(time * 2 + idx) * 0.5;
            mesh.rotation.y += 0.05;
          } else if (robot.status === 'idle') {
            mesh.position.y = 1 + Math.abs(Math.sin(time * 2 + idx)) * 1.5;
          } else if (robot.status === 'maintenance') {
            const intensity = 0.5 + 0.5 * Math.abs(Math.sin(time * 3));
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mat.color.setRGB(intensity, 0, 0);
          }
        });
        controls.update();
        renderer.render(scene, camera);
      } catch (err) {
        setFbxError('Error in 3D rendering loop. Showing basic view.');
        setLoading(false);
      }
    };
    animate();

    // Cleanup
    return () => {
      if (renderer.domElement && mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      clearTimeout(fbxTimeout);
      cancelAnimationFrame(animationFrameId);
    };
  }, [robots, robotPaths, co2Data]);

  // Load R1, R2, R3
  useEffect(() => {
    const loadRobots = async () => {
      try {
        const data = await apiService.getRobotHealthData() as any[];
        const filtered = data.filter((r: any) => ['R1', 'R2', 'R3'].includes(r.robotId));
        const mapped = filtered.map((r: any) => ({
          id: r.robotId,
          health: r.health,
          status: (r.health > 80 ? 'active' : r.health > 50 ? 'idle' : 'maintenance') as 'active' | 'idle' | 'maintenance',
          position: { x: Math.random() * 60 - 30, y: 1, z: Math.random() * 60 - 30 }
        }));
        setRobots(mapped);
      } catch {
        setRobots([
          { id: 'R1', position: { x: -20, y: 1, z: -20 }, status: 'active', health: 90 },
          { id: 'R2', position: { x: 20, y: 1, z: -20 }, status: 'idle', health: 70 },
          { id: 'R3', position: { x: 0, y: 1, z: 20 }, status: 'maintenance', health: 45 },
        ]);
      }
    };

    loadRobots();
    const interval = setInterval(loadRobots, 10000);
    return () => clearInterval(interval);
  }, []);

  // On robots load, generate a path for each robot
  useEffect(() => {
    const newPaths: { [id: string]: { path: { x: number; y: number }[]; progress: number } } = {};
    robots.forEach((robot, idx) => {
      // Mock: start at (2+idx*5,2), end at (GRID_SIZE-3-idx*5,GRID_SIZE-3)
      const start: [number, number] = [2 + idx * 5, 2];
      const end: [number, number] = [GRID_SIZE - 3 - idx * 5, GRID_SIZE - 3];
      const path = dijkstra(start, end).map(([x, y]) => ({ x, y }));
      newPaths[robot.id] = { path, progress: 0 };
    });
    setRobotPaths(newPaths);
  }, [robots]);

  // Render robots
  useEffect(() => {
    if (!sceneRef.current) return;

    Object.values(robotsRef.current).forEach(mesh => {
      sceneRef.current!.remove(mesh);
    });
    robotsRef.current = {};

    robots.forEach((robot, index) => {
      const color =
        robot.status === 'active' ? 0x00ff00 :
        robot.status === 'idle' ? 0xffff00 :
        0xff0000;

      const geometry = new THREE.SphereGeometry(1.2, 32, 32);
      const material = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.3 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(robot.position.x, robot.position.y, robot.position.z);
      mesh.castShadow = true;
      mesh.userData = { type: 'robot', id: robot.id };
      sceneRef.current!.add(mesh);
      robotsRef.current[robot.id] = mesh;

      // Label
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = '#000';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${robot.id} (${robot.health}%)`, 128, 40);

      const texture = new THREE.CanvasTexture(canvas);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
      label.position.set(robot.position.x, robot.position.y + 2.5, robot.position.z);
      label.scale.set(8, 2, 1);
      sceneRef.current!.add(label);
    });
  }, [robots]);

  useEffect(() => {
    fetch('/api/delivery/co2').then(res => res.json()).then(setCo2Data).catch(() => setCo2Data([]));
  }, []);

  useEffect(() => {
    fetch('/api/iot/latest').then(res => res.json()).then(setIotZones).catch(() => setIotZones([]));
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;
    // Remove old overlays
    sceneRef.current.children = sceneRef.current.children.filter(obj => !obj.userData?.iotOverlay);
    // Zone positions (mock/fixed)
    const zonePositions: Record<'A' | 'B' | 'C', { x: number; z: number }> = { A: { x: -20, z: -20 }, B: { x: 0, z: 0 }, C: { x: 20, z: 20 } };
    iotZones.forEach((zone: any) => {
      const zoneId = zone.zone_id as keyof typeof zonePositions;
      const pos = zonePositions[zoneId];
      if (!pos) return;
      let color = 0x00ff00;
      if (zone.temperature > 28 || zone.vibration > 1.5) color = 0xff0000;
      else if (zone.temperature > 24 || zone.vibration > 1.0) color = 0xffff00;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(8, 2, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 })
      );
      box.position.set(pos.x, 1, pos.z);
      box.userData.iotOverlay = true;
      if (sceneRef.current) sceneRef.current.add(box);
    });
  }, [iotZones]);

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 min-h-screen p-6 relative flex flex-col items-center">
      <div className="flex items-center gap-3 mb-4">
        <span className="bg-blue-900/80 p-2 rounded-full border-2 border-blue-400 shadow-lg">
          <WarehouseIcon className="w-8 h-8 text-blue-300" />
        </span>
        <h2 className="text-3xl font-extrabold text-white tracking-tight drop-shadow">Warehouse Operations</h2>
      </div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-gray-900/80">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-400"></div>
          <span className="ml-4 text-white text-lg">Loading 3D warehouse...</span>
        </div>
      )}
      {fbxError && !loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-red-900/90 text-red-200 px-6 py-4 rounded-lg shadow-xl border border-red-400">
            <strong>Notice:</strong> {fbxError}
          </div>
        </div>
      )}
      <div
        ref={mountRef}
        className="w-full max-w-5xl h-96 bg-gray-800/80 rounded-2xl border-2 border-blue-700 shadow-2xl mb-8"
        style={{ minHeight: '500px' }}
      />
      <div className="absolute top-8 right-8 bg-gradient-to-br from-green-900/90 to-green-800/80 rounded-xl p-6 shadow-2xl border-2 border-green-500 z-10 w-80 max-w-full">
        <div className="flex items-center gap-2 mb-2">
          <Award className="w-6 h-6 text-green-300" />
          <h3 className="text-lg font-bold text-green-200">CO₂ Leaderboard</h3>
        </div>
        <div className="text-sm text-white mb-1">Top Green Routes:</div>
        <ul className="mb-2 space-y-1">
          {co2Data.sort((a, b) => a.co2 - b.co2).slice(0, 3).map((d, i) => (
            <li key={d.deliveryId} className="flex items-center gap-2 text-green-100 font-semibold">
              <span className="inline-block w-6 text-center text-green-400 font-bold">{i + 1}.</span>
              <span className="truncate flex-1">{d.route}</span>
              <span className="bg-green-700/80 px-2 py-0.5 rounded text-xs font-mono">{d.co2} kg</span>
            </li>
          ))}
        </ul>
        <div className="text-xs text-green-200 font-semibold">CO₂ Saved: <span className="bg-green-700 px-2 py-1 rounded">{Math.max(0, 50 - (co2Data[0]?.co2 || 0)).toFixed(1)} kg</span></div>
      </div>
    </div>
  );
};

export default Warehouse3D;
