"use client";

import { useEffect, useRef } from "react";

interface Dot {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  baseRadius: number;
  currentRadius: number;
  targetRadius: number;
  angle: number;
  angleSpeed: number;
}

export default function HalftoneBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const dotsRef = useRef<Dot[]>([]);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const SPACING = 28;
    const BASE_RADIUS = 1.2;
    const MAX_RADIUS = 5.5;
    const INFLUENCE_RADIUS = 140;

    const init = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      // Full viewport width, but only hero section height
      canvas.width = window.innerWidth;
      canvas.height = rect?.height || window.innerHeight;
      dotsRef.current = [];
      const cols = Math.ceil(canvas.width / SPACING) + 1;
      const rows = Math.ceil(canvas.height / SPACING) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dotsRef.current.push({
            baseX: c * SPACING,
            baseY: r * SPACING,
            x: c * SPACING,
            y: r * SPACING,
            baseRadius: BASE_RADIUS,
            currentRadius: BASE_RADIUS,
            targetRadius: BASE_RADIUS,
            angle: Math.random() * Math.PI * 2,
            angleSpeed: 0.008 + Math.random() * 0.008, // Slower swivel
          });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const dot of dotsRef.current) {
        const dx = dot.baseX - mx;
        const dy = dot.baseY - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let targetAlpha = 0.15; // Base opacity

        dot.angle += dot.angleSpeed;

        if (dist < INFLUENCE_RADIUS) {
          const factor = 1 - dist / INFLUENCE_RADIUS;
          dot.targetRadius = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * factor * factor;
          targetAlpha = 0.15 + 0.25 * factor;
          
          // Swivel logic: move dot in a small circle when influenced
          const swivelRadius = 6 * factor; // Up to 6px offset
          dot.x = dot.baseX + Math.cos(dot.angle) * swivelRadius;
          dot.y = dot.baseY + Math.sin(dot.angle) * swivelRadius;
        } else {
          dot.targetRadius = BASE_RADIUS;
          dot.x += (dot.baseX - dot.x) * 0.1;
          dot.y += (dot.baseY - dot.y) * 0.1;
        }

        dot.currentRadius += (dot.targetRadius - dot.currentRadius) * 0.12;

        let alpha = targetAlpha;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,0,0,${alpha})`; // Black dots for light theme
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      // clientX maps directly since canvas spans full width at left: 0
      mouseRef.current = { x: e.clientX, y: e.clientY - rect.top };
    };

    const onResize = () => {
      cancelAnimationFrame(animFrameRef.current);
      init();
      draw();
    };

    init();
    draw();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100vw",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
