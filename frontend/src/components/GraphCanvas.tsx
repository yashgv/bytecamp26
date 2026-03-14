"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function GraphCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Scene setup ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    
    // Provide fallback dimensions in case ref hasn't fully laid out yet (NaN aspect ratio crashes Three.js)
    let w = mount.clientWidth || 500;
    let h = mount.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 2000);
    // The Icosahedron radius is ~7, distortions push it to ~12. 
    // Moving the camera back to z=28 ensures it clearly fits the 55 degree FOV
    camera.position.set(0, 0, 28);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap ratio for performance
    renderer.setClearColor(0x000000, 0);
    
    // Make sure the canvas element properly fills the wrapper dynamically
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    
    mount.appendChild(renderer.domElement);

    // ── Web Graph / Line Render ──────────────────────────────────
    // Create an interconnected web/net shape
    const geometry = new THREE.IcosahedronGeometry(7, 3);
    const posAttribute = geometry.getAttribute("position");
    
    // Distort vertices slightly for a dynamic, organic web appearance
    for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);
        const z = posAttribute.getZ(i);
        
        // Add smooth noise using sine waves based on the position
        const distortion = 1 + (Math.sin(x * 0.8) * Math.cos(y * 0.8) * 0.08);
        posAttribute.setXYZ(i, x * distortion, y * distortion, z * distortion);
    }
    
    // Create the primary spinning lines
    const wireframe = new THREE.WireframeGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    const edges = new THREE.LineSegments(wireframe, edgeMaterial);
    
    // Add tiny glowing connection points at the vertices
    const nodeMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
    });
    const nodes = new THREE.Points(geometry, nodeMaterial);

    // ── Mouse Interaction (Drag to Rotate) ──────────────────────────
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    // We'll store the target rotation driven by drag
    const targetRotation = { x: 0, y: 0 };
    // And smoothly interpolate the group's rotation towards it
    const currentRotation = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
      if (mount) mount.style.cursor = "grabbing";
    };

    const onMouseUp = () => {
      isDragging = false;
      if (mount) mount.style.cursor = "grab";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y,
      };

      // Adjust rotation speed multiplier as needed
      targetRotation.x += deltaMove.y * 0.005;
      targetRotation.y += deltaMove.x * 0.005;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseLeave = () => {
      isDragging = false;
      if (mount) mount.style.cursor = "grab";
    };

    mount.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    mount.addEventListener("mouseleave", onMouseLeave);

    // ── Animation loop ────────────────────────────────────────────
    let frameId: number;
    const group = new THREE.Group();
    group.add(edges);
    group.add(nodes);
    scene.add(group);

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // Slow auto-rotation always happens
      group.rotation.y += 0.0018;
      group.rotation.x += 0.0006;

      // Apply drag rotation with damping (lerp)
      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1;
      
      // We ADD the currentRotation delta (which is a velocity/offset) to the rotation, 
      // but because currentRotation doesn't reset, we should just apply it as an offset to the auto-rotation.
      group.rotation.x += currentRotation.x;
      group.rotation.y += currentRotation.y;

      // Slowly damp the target rotation back to 0 so the graph returns to its auto-rotation baseline when released
      if (!isDragging) {
        targetRotation.x *= 0.95;
        targetRotation.y *= 0.95;
        currentRotation.x *= 0.95;
        currentRotation.y *= 0.95;
      }

      // Pulse opacity
      const t = Date.now() * 0.001;
      nodeMaterial.opacity = 0.7 + 0.3 * Math.sin(t * 1.2);
      edgeMaterial.opacity = 0.15 + 0.1 * Math.sin(t * 0.8);

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ────────────────────────────────────────────────────
    const observer = new ResizeObserver(() => {
      if (!mount) return;
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      if (nw === 0 || nh === 0) return; // Prevent NaN aspect ratio crashes
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    observer.observe(mount);

    return () => {
      cancelAnimationFrame(frameId);
      
      mount.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      mount.removeEventListener("mouseleave", onMouseLeave);
      observer.disconnect();
      
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        width: 520,
        height: 520,
        maxWidth: "100%",
        cursor: "grab",
        position: "relative",
      }}
    />
  );
}
