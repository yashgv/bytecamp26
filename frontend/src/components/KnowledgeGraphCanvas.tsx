import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default function KnowledgeGraphCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Setup ──────────────────────────────────────────────
    const scene = new THREE.Scene();

    let width = mount.clientWidth || window.innerWidth;
    let height = mount.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 45;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparent background

    mount.appendChild(renderer.domElement);

    // ── Controls ───────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    
    // Only allow zooming if the cursor is in the middle 50% of the screen horizontally.
    // This leaves a 25% "safe zone" on the left and right for normal webpage scrolling.
    const handleWheel = (e: WheelEvent) => {
      if (!mount) return;
      
      const rect = mount.getBoundingClientRect();
      // Calculate mouse X position relative to the canvas element
      const relativeX = e.clientX - rect.left;
      
      // Calculate percentage (0.0 to 1.0)
      const widthPercent = relativeX / rect.width;
      
      // Zoom only if mouse is between 25% and 75% horizontally
      if (widthPercent > 0.25 && widthPercent < 0.75) {
        controls.enableZoom = true;
      } else {
        controls.enableZoom = false; // Allow native page scroll to happen
      }
    };
    
    mount.addEventListener('wheel', handleWheel, { passive: true });
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // ── Node & Edge Generation ──────────────────────────────
    const NODE_COUNT = 300;
    const EDGE_DISTANCE = 12;

    const nodesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(NODE_COUNT * 3);
    const nodeVectors: THREE.Vector3[] = [];

    // Create random nodes within a sphere volume
    for (let i = 0; i < NODE_COUNT; i++) {
        // Use spherical coordinates for a more clustered organic shape
        const radius = Math.random() * 25;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        nodeVectors.push(new THREE.Vector3(x, y, z));
    }

    nodesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Nodes visual style
    // Use a soft gray/white for the reference image's ghostly aesthetic
    const nodesMaterial = new THREE.PointsMaterial({
        color: 0x888888,
        size: 0.4,
        transparent: true,
        opacity: 0.8,
        map: createCircleTexture(),
        depthWrite: false, // Prevents z-fighting alpha issues
    });

    const pointCloud = new THREE.Points(nodesGeometry, nodesMaterial);
    scene.add(pointCloud);

    // Create Edges between nearby nodes
    const edgePoints: number[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i + 1; j < NODE_COUNT; j++) {
            const dist = nodeVectors[i].distanceTo(nodeVectors[j]);
            if (dist < EDGE_DISTANCE) {
                // Add start and end points of the line
                edgePoints.push(
                    nodeVectors[i].x, nodeVectors[i].y, nodeVectors[i].z,
                    nodeVectors[j].x, nodeVectors[j].y, nodeVectors[j].z
                );
            }
        }
    }

    const edgesGeometry = new THREE.BufferGeometry();
    edgesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePoints, 3));

    // Edges visual style
    const edgesMaterial = new THREE.LineBasicMaterial({
        color: 0x555555,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
    });

    const edgeLines = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    scene.add(edgeLines);

    // Helper function to create soft circular nodes instead of squares
    function createCircleTexture() {
        const dpr = window.devicePixelRatio || 1;
        const size = 64 * dpr;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (context) {
            context.beginPath();
            context.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
            context.fillStyle = '#ffffff';
            context.fill();
        }
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    // ── Interaction / Hover Raycaster ──────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredNodeIndex: number | null = null;
    
    // Create a special geometry to highlight hovered nodes and their connections
    const highlightMaterial = new THREE.LineBasicMaterial({
        color: 0xdddddd,
        transparent: true,
        opacity: 0.6,
        linewidth: 2,
        depthTest: false,
    });
    
    // Highlight points material
    const highlightNodeMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.2,
        transparent: true,
        opacity: 1.0,
        map: createCircleTexture(),
        depthTest: false,
    });
    
    const highlightLinesGeometry = new THREE.BufferGeometry();
    const highlightNodeGeometry = new THREE.BufferGeometry();
    
    const highlightLines = new THREE.LineSegments(highlightLinesGeometry, highlightMaterial);
    const highlightPoint = new THREE.Points(highlightNodeGeometry, highlightNodeMaterial);
    
    scene.add(highlightLines);
    scene.add(highlightPoint);

    const onPointerMove = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    mount.addEventListener('pointermove', onPointerMove);

    // ── Animation Loop ───────────────────────────────────────
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // Slowly pulse graph opacity
        nodesMaterial.opacity = 0.6 + 0.3 * Math.sin(time * 0.5);
        edgesMaterial.opacity = 0.1 + 0.15 * Math.sin(time * 0.4);

        // Slow rotation for the whole scene container
        pointCloud.rotation.y = time * 0.05;
        edgeLines.rotation.y = time * 0.05;
        highlightLines.rotation.y = time * 0.05;
        highlightPoint.rotation.y = time * 0.05;

        // Perform raycasting specifically against the point cloud 
        // We slightly inflate the point scale for the raycaster threshold to make them easier to hit
        raycaster.params.Points.threshold = 0.5;
        raycaster.setFromCamera(mouse, camera);
        
        // Adjust raycaster rotation context (since group is rotating)
        const intersects = raycaster.intersectObject(pointCloud);

        if (intersects.length > 0) {
            // Find the closest point
            const intersect = intersects[0];
            const idx = intersect.index;
            
            if (idx !== undefined && idx !== hoveredNodeIndex) {
                 hoveredNodeIndex = idx;
                 
                 // Highlight the hovered point
                 highlightNodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
                     nodeVectors[idx].x, nodeVectors[idx].y, nodeVectors[idx].z
                 ], 3));
                 
                 // Find all connected edges and generate highlighting lines
                 const activeLines: number[] = [];
                 for(let i=0; i<NODE_COUNT; i++) {
                     if (i === idx) continue;
                     
                     const dist = nodeVectors[idx].distanceTo(nodeVectors[i]);
                     if (dist < EDGE_DISTANCE) {
                         activeLines.push(
                             nodeVectors[idx].x, nodeVectors[idx].y, nodeVectors[idx].z,
                             nodeVectors[i].x, nodeVectors[i].y, nodeVectors[i].z
                         );
                     }
                 }
                 
                 highlightLinesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(activeLines, 3));
                 if (mount) mount.style.cursor = 'pointer';
            }
        } else {
            if (hoveredNodeIndex !== null) {
                hoveredNodeIndex = null;
                highlightNodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
                highlightLinesGeometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
                if (mount) mount.style.cursor = 'grab';
            }
        }

        controls.update();
        renderer.render(scene, camera);
    };

    animate();

    // ── Resize Handler ───────────────────────────────────────
    const handleResize = () => {
        if (!mount) return;
        width = mount.clientWidth;
        height = mount.clientHeight;
        
        if (width === 0 || height === 0) return;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // ── Cleanup ──────────────────────────────────────────────
    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
        mount.removeEventListener('pointermove', onPointerMove);
        mount.removeEventListener('wheel', handleWheel);
        
        controls.dispose();
        geometryCleanup();
        
        if (mount.contains(renderer.domElement)) {
            mount.removeChild(renderer.domElement);
        }
    };

    function geometryCleanup() {
        nodesGeometry.dispose();
        edgesGeometry.dispose();
        nodesMaterial.dispose();
        edgesMaterial.dispose();
        highlightLinesGeometry.dispose();
        highlightNodeGeometry.dispose();
        highlightMaterial.dispose();
        highlightNodeMaterial.dispose();
        if (nodesMaterial.map) nodesMaterial.map.dispose();
    }

  }, []);

  return (
    <div 
        ref={mountRef} 
        style={{ width: '100%', height: '100%', cursor: 'grab' }}
        onMouseDown={(e) => (e.currentTarget.style.cursor = 'grabbing')}
        onMouseUp={(e) => (e.currentTarget.style.cursor = 'grab')}
        onMouseLeave={(e) => (e.currentTarget.style.cursor = 'grab')}
    />
  );
}
