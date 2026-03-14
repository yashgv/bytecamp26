"use client";

import { useEffect, useRef } from "react";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";
import styles from "./GraphMappingSection.module.css";

const LANGS = [
  { id: "react", label: "React", color: "#61dafb", x: 20, y: 30 },
  { id: "nodejs", label: "Node.js", color: "#8cc84b", x: 50, y: 15 },
  { id: "go", label: "Go", color: "#00acd7", x: 78, y: 28 },
  { id: "python", label: "Python", color: "#ffd845", x: 65, y: 60 },
  { id: "postgres", label: "PostgreSQL", color: "#336791", x: 30, y: 70 },
  { id: "graphql", label: "GraphQL", color: "#e535ab", x: 50, y: 50 },
];

const EDGES = [
  ["react", "nodejs"], ["react", "graphql"], ["nodejs", "go"],
  ["nodejs", "postgres"], ["go", "python"], ["python", "postgres"],
  ["graphql", "nodejs"], ["graphql", "postgres"], ["react", "postgres"],
];

export default function GraphMappingSection() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.2,
    triggerOnce: true,
  });

  useEffect(() => {
    if (!isIntersecting) return;
    const edges = svgRef.current?.querySelectorAll(".edge-line");
    edges?.forEach((el, i) => {
      (el as SVGElement).style.strokeDashoffset = "1000";
      (el as SVGElement).style.transition = `stroke-dashoffset 1.2s ease ${i * 0.15 + 0.3}s`;
      requestAnimationFrame(() => {
        (el as SVGElement).style.strokeDashoffset = "0";
      });
    });
  }, [isIntersecting]);

  const findNode = (id: string) => LANGS.find((n) => n.id === id)!;

  return (
    <section className={styles.section} id="mapping" ref={ref}>
      <div className={styles.container}>
        <div className={`reveal-up ${isIntersecting ? "active" : ""} ${styles.header}`}>
          <span className={styles.eyebrow}>Live Dependency Graph</span>
          <h2 className={styles.title}>See Every Connection,<br />Across Every Layer</h2>
          <p className={styles.desc}>
            Synapse builds a living graph of your entire system. Watch
            dependencies propagate in real-time as you change code.
          </p>
        </div>

        <div className={`reveal-up ${isIntersecting ? "active" : ""} ${styles.graphBox}`} style={{ transitionDelay: "200ms" }}>
          <div className={styles.graphInner}>
            <svg
              ref={svgRef}
              viewBox="0 0 100 90"
              className={styles.svg}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                  <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {/* Edges */}
              {EDGES.map(([a, b], i) => {
                const na = findNode(a), nb = findNode(b);
                return (
                  <line
                    key={i}
                    className="edge-line"
                    x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                    stroke="rgba(0,212,255,0.3)"
                    strokeWidth="0.4"
                    strokeDasharray="1000"
                    strokeDashoffset="1000"
                  />
                );
              })}

              {/* Nodes */}
              {LANGS.map((node) => (
                <g key={node.id} filter="url(#glow)">
                  <circle
                    cx={node.x} cy={node.y} r="2.2"
                    fill="none"
                    stroke={node.color}
                    strokeWidth="0.6"
                    opacity="0.5"
                  />
                  <circle
                    cx={node.x} cy={node.y} r="1.2"
                    fill={node.color}
                    opacity="0.9"
                  />
                  <text
                    x={node.x} y={node.y + 4.5}
                    fontSize="2.8"
                    fill="rgba(255,255,255,0.6)"
                    textAnchor="middle"
                    fontFamily="Inter, sans-serif"
                  >
                    {node.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Legend */}
          <div className={styles.legend}>
            {LANGS.map((n) => (
              <div key={n.id} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: n.color }} />
                {n.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
