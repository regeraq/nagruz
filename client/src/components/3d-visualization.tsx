import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function Visualization3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0e27, 100, 1000);
    
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Create animated boxes (representing power blocks)
    const boxes: THREE.Mesh[] = [];
    const boxPositions = [
      { x: -15, y: 10, z: 0 },
      { x: -5, y: -8, z: 10 },
      { x: 8, y: 5, z: -8 },
      { x: 15, y: -10, z: 5 },
      { x: 0, y: 15, z: 12 },
    ];

    boxPositions.forEach((pos, idx) => {
      const geometry = new THREE.BoxGeometry(3, 3, 3);
      const material = new THREE.MeshPhongMaterial({
        color: 0x1a94ff,
        emissive: 0x0d4d99,
        shininess: 100,
        wireframe: false,
      });
      
      const box = new THREE.Mesh(geometry, material);
      box.position.set(pos.x, pos.y, pos.z);
      box.userData = {
        rotationSpeed: 0.003 + idx * 0.001,
        floatSpeed: 0.01 + idx * 0.005,
        floatRange: 5 + idx * 2,
        startY: pos.y,
      };
      
      scene.add(box);
      boxes.push(box);
    });

    // Create connecting lines
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x1a94ff, linewidth: 2 });
    for (let i = 0; i < boxes.length - 1; i++) {
      const points = [boxes[i].position, boxes[i + 1].position];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, lineMaterial);
      scene.add(line);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x1a94ff, 2, 100);
    pointLight.position.set(20, 20, 20);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x00d4ff, 1.5, 100);
    pointLight2.position.set(-20, -10, 30);
    scene.add(pointLight2);

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      boxes.forEach((box) => {
        box.rotation.x += box.userData.rotationSpeed;
        box.rotation.y += box.userData.rotationSpeed * 1.5;
        box.rotation.z += box.userData.rotationSpeed * 0.5;

        box.position.y = 
          box.userData.startY + 
          Math.sin(Date.now() * box.userData.floatSpeed) * box.userData.floatRange;
      });

      pointLight.position.x = Math.sin(Date.now() * 0.0005) * 30;
      pointLight.position.z = Math.cos(Date.now() * 0.0003) * 30;

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-96 rounded-xl border border-primary/20 overflow-hidden relative shadow-2xl shadow-primary/20"
    />
  );
}
