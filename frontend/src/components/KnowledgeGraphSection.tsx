"use client";

import dynamic from "next/dynamic";
import styles from "./KnowledgeGraphSection.module.css";
import React from "react";

// Dynamically import the Three.js canvas so it only renders on the client
const KnowledgeGraphCanvas = dynamic(() => import("./KnowledgeGraphCanvas"), { 
    ssr: false,
    loading: () => <div style={{ width: '100%', height: '100%', background: '#030303' }} /> 
});

export default function KnowledgeGraphSection() {
  return (
    <section className={styles.section} id="knowledge-graph">
      <div className={styles.canvasWrapper}>
        <KnowledgeGraphCanvas />
      </div>
      
      <div className={styles.overlay}>
        <h2 className={styles.title}>Visualize your code in real-time</h2>
        <a 
          href="/analyze"
          className={styles.button}
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          Visualize Now
        </a>
      </div>
    </section>
  );
}
