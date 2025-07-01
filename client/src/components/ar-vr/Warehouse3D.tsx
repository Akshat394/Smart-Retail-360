import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { apiService } from '../../services/api';

interface WarehouseLayout {
  zone: string;
  products: string[];
  capacity: number;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
}

interface Robot {
  id: string;
  position: { x: number; y: number; z: number };
  status: 'idle' | 'active' | 'maintenance';
  currentTask?: string;
  health: number;
}

interface ARPath {
  robotId: string;
  path: THREE.Vector3[];
  color: string;
  status: 'planned' | 'active' | 'completed';
}

const Warehouse3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  
  const [warehouseLayout, setWarehouseLayout] = useState<WarehouseLayout[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [arPaths, setArPaths] = useState<ARPath[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'normal' | 'ar' | 'heatmap'>('normal');

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(50, 30, 50);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x333333,
      transparent: true,
      opacity: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid helper
    const gridHelper = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Load warehouse layout from database
  useEffect(() => {
    const loadWarehouseLayout = async () => {
      try {
        const layout = await apiService.getWarehouseLayout() as WarehouseLayout[];
        setWarehouseLayout(layout);
      } catch (error) {
        console.error('Error loading warehouse layout:', error);
        // Fallback to mock data
        setWarehouseLayout([
          {
            zone: 'A',
            products: ['Laptop', 'Smartphone'],
            capacity: 100,
            position: { x: -30, y: 0, z: -30 },
            dimensions: { width: 20, height: 8, depth: 20 }
          },
          {
            zone: 'B',
            products: ['T-Shirt', 'Desk Chair'],
            capacity: 80,
            position: { x: 0, y: 0, z: -30 },
            dimensions: { width: 20, height: 8, depth: 20 }
          },
          {
            zone: 'C',
            products: ['Apples'],
            capacity: 120,
            position: { x: 30, y: 0, z: -30 },
            dimensions: { width: 20, height: 8, depth: 20 }
          },
          {
            zone: 'D',
            products: [],
            capacity: 60,
            position: { x: 0, y: 0, z: 0 },
            dimensions: { width: 20, height: 8, depth: 20 }
          }
        ]);
      }
    };

    loadWarehouseLayout();
  }, []);

  // Load robot data
  useEffect(() => {
    const loadRobots = async () => {
      try {
        const robotData = await apiService.getRobotHealthData() as any[];
        setRobots(robotData.map((robot: any) => ({
          id: robot.robotId,
          position: { x: Math.random() * 60 - 30, y: 1, z: Math.random() * 60 - 30 },
          status: robot.health > 80 ? 'active' : robot.health > 50 ? 'idle' : 'maintenance',
          health: robot.health
        })));
      } catch (error) {
        console.error('Error loading robot data:', error);
        // Fallback to mock data
        setRobots([
          { id: 'R1', position: { x: -20, y: 1, z: -20 }, status: 'active', health: 85 },
          { id: 'R2', position: { x: 20, y: 1, z: -20 }, status: 'idle', health: 92 },
          { id: 'R3', position: { x: 0, y: 1, z: 20 }, status: 'maintenance', health: 78 }
        ]);
      }
    };

    loadRobots();
    const interval = setInterval(loadRobots, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Render warehouse zones
  useEffect(() => {
    if (!sceneRef.current) return;

    // Clear existing zones
    const existingZones = sceneRef.current.children.filter((child: THREE.Object3D) => 
      (child as any).userData?.type === 'warehouse_zone'
    );
    existingZones.forEach(zone => sceneRef.current!.remove(zone));

    // Create zone meshes
    warehouseLayout.forEach((zone: WarehouseLayout) => {
      const geometry = new THREE.BoxGeometry(
        zone.dimensions.width,
        zone.dimensions.height,
        zone.dimensions.depth
      );
      
      const material = new THREE.MeshLambertMaterial({
        color: selectedZone === zone.zone ? 0x00ff00 : 0x666666,
        transparent: true,
        opacity: 0.7
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        zone.position.x,
        zone.position.y + zone.dimensions.height / 2,
        zone.position.z
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      (mesh as any).userData = { type: 'warehouse_zone', zoneId: zone.zone };
      
      // Add click event
      (mesh as any).userData.onClick = () => setSelectedZone(zone.zone);
      
      sceneRef.current!.add(mesh);

      // Add zone label
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 64;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#000000';
      context.font = '24px Arial';
      context.textAlign = 'center';
      context.fillText(`Zone ${zone.zone}`, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.SpriteMaterial({ map: texture });
      const label = new THREE.Sprite(labelMaterial);
      label.position.set(
        zone.position.x,
        zone.position.y + zone.dimensions.height + 2,
        zone.position.z
      );
      label.scale.set(10, 2.5, 1);
      sceneRef.current!.add(label);
    });
  }, [warehouseLayout, selectedZone]);

  // Render robots
  useEffect(() => {
    if (!sceneRef.current) return;

    // Clear existing robots
    const existingRobots = sceneRef.current.children.filter((child: THREE.Object3D) => 
      (child as any).userData?.type === 'robot'
    );
    existingRobots.forEach(robot => sceneRef.current!.remove(robot));

    // Create robot meshes
    robots.forEach((robot: Robot) => {
      const geometry = new THREE.SphereGeometry(1, 16, 16);
      const color = robot.status === 'active' ? 0x00ff00 : 
                   robot.status === 'idle' ? 0xffff00 : 0xff0000;
      const material = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(robot.position.x, robot.position.y, robot.position.z);
      mesh.castShadow = true;
      (mesh as any).userData = { type: 'robot', robotId: robot.id };
      
      sceneRef.current!.add(mesh);

      // Add robot label
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 64;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#000000';
      context.font = '16px Arial';
      context.textAlign = 'center';
      context.fillText(`${robot.id} (${robot.health}%)`, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.SpriteMaterial({ map: texture });
      const label = new THREE.Sprite(labelMaterial);
      label.position.set(robot.position.x, robot.position.y + 2, robot.position.z);
      label.scale.set(8, 2, 1);
      sceneRef.current!.add(label);
    });
  }, [robots]);

  // Render AR paths
  useEffect(() => {
    if (!sceneRef.current || viewMode !== 'ar') return;

    // Clear existing paths
    const existingPaths = sceneRef.current.children.filter((child: THREE.Object3D) => 
      (child as any).userData?.type === 'ar_path'
    );
    existingPaths.forEach(path => sceneRef.current!.remove(path));

    // Create AR path lines
    arPaths.forEach((path: ARPath) => {
      if (path.path.length < 2) return;

      const points = path.path;
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ 
        color: path.color,
        linewidth: 3
      });
      const line = new THREE.Line(geometry, material);
      (line as any).userData = { type: 'ar_path', robotId: path.robotId };
      
      sceneRef.current!.add(line);

      // Add path markers
      points.forEach((point: THREE.Vector3, index: number) => {
        const markerGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: path.color });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(point);
        (marker as any).userData = { type: 'ar_path_marker', robotId: path.robotId, index };
        
        sceneRef.current!.add(marker);
      });
    });
  }, [arPaths, viewMode]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle mouse clicks for zone selection
  useEffect(() => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

    const handleClick = (event: MouseEvent) => {
      const rect = rendererRef.current!.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current!);

      const intersects = raycaster.intersectObjects(sceneRef.current!.children);
      
      for (const intersect of intersects) {
        if ((intersect.object as any).userData?.type === 'warehouse_zone') {
          setSelectedZone((intersect.object as any).userData.zoneId);
          break;
        }
      }
    };

    mountRef.current.addEventListener('click', handleClick);
    return () => mountRef.current?.removeEventListener('click', handleClick);
  }, []);

  // Generate AR paths for robots
  const generateARPaths = () => {
    const newPaths: ARPath[] = robots.map(robot => {
      const pathPoints: THREE.Vector3[] = [];
      const startPoint = new THREE.Vector3(robot.position.x, robot.position.y, robot.position.z);
      
      // Generate a simple path to a random destination
      const endPoint = new THREE.Vector3(
        Math.random() * 60 - 30,
        1,
        Math.random() * 60 - 30
      );
      
      // Create intermediate points
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const point = new THREE.Vector3().lerpVectors(startPoint, endPoint, t);
        pathPoints.push(point);
      }
      
      return {
        robotId: robot.id,
        path: pathPoints,
        color: robot.status === 'active' ? '#00ff00' : '#ffff00',
        status: 'planned'
      };
    });
    
    setArPaths(newPaths);
  };

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">3D Warehouse Visualization</h2>
        
        <div className="flex gap-4 mb-4">
          <button
            className={`px-4 py-2 rounded ${viewMode === 'normal' ? 'bg-blue-600' : 'bg-gray-600'} text-white`}
            onClick={() => setViewMode('normal')}
          >
            Normal View
          </button>
          <button
            className={`px-4 py-2 rounded ${viewMode === 'ar' ? 'bg-green-600' : 'bg-gray-600'} text-white`}
            onClick={() => setViewMode('ar')}
          >
            AR View
          </button>
          <button
            className={`px-4 py-2 rounded ${viewMode === 'heatmap' ? 'bg-red-600' : 'bg-gray-600'} text-white`}
            onClick={() => setViewMode('heatmap')}
          >
            Heatmap
          </button>
          <button
            className="px-4 py-2 rounded bg-purple-600 text-white"
            onClick={generateARPaths}
          >
            Generate AR Paths
          </button>
        </div>

        {selectedZone && (
          <div className="bg-gray-800 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">Selected Zone: {selectedZone}</h3>
            <div className="text-gray-300">
              {warehouseLayout.find(zone => zone.zone === selectedZone)?.products.join(', ')}
            </div>
          </div>
        )}
      </div>

      <div 
        ref={mountRef} 
        className="w-full h-96 bg-gray-800 rounded-lg border border-gray-600"
        style={{ minHeight: '500px' }}
      />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-3">Warehouse Zones</h3>
          <div className="space-y-2">
            {warehouseLayout.map(zone => (
              <div 
                key={zone.zone}
                className={`p-2 rounded cursor-pointer ${
                  selectedZone === zone.zone ? 'bg-blue-600' : 'bg-gray-700'
                }`}
                onClick={() => setSelectedZone(zone.zone)}
              >
                <div className="text-white font-medium">Zone {zone.zone}</div>
                <div className="text-gray-400 text-sm">
                  {zone.products.length} products, {zone.capacity} capacity
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-3">Robot Status</h3>
          <div className="space-y-2">
            {robots.map(robot => (
              <div key={robot.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <div>
                  <div className="text-white font-medium">{robot.id}</div>
                  <div className="text-gray-400 text-sm">{robot.status}</div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  robot.status === 'active' ? 'bg-green-500' :
                  robot.status === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-3">AR Paths</h3>
          <div className="space-y-2">
            {arPaths.map(path => (
              <div key={path.robotId} className="p-2 bg-gray-700 rounded">
                <div className="text-white font-medium">{path.robotId}</div>
                <div className="text-gray-400 text-sm">{path.status}</div>
                <div 
                  className="w-4 h-4 rounded mt-1"
                  style={{ backgroundColor: path.color }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Warehouse3D; 