"use client";

import dynamic from "next/dynamic";
import styles from "./HeroSection.module.css";

const GraphCanvas = dynamic(() => import("./GraphCanvas"), { ssr: false });
const HalftoneBackground = dynamic(() => import("./HalftoneBackground"), { ssr: false });

export default function HeroSection() {
  return (
    <section className={styles.hero} id="hero">
      <HalftoneBackground />
      <div className={styles.left}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          GenAI-Powered · Polyglot-Ready
        </div>
        <h1 className={styles.headline}>
          Map the Invisible<br />
          <span className={styles.highlight}>Bridges</span> in Your Code.
        </h1>
        <p className={styles.subtext}>
          Trace logic across polyglot boundaries — from your React frontend
          to your SQL database — before a single line breaks production.
        </p>
        <div className={styles.ctas}>
          <a href="#" className={styles.primaryBtn}>
            Start Analyzing
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <a href="#" className={styles.secondaryBtn}>
            Download VS Extension
          </a>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum}>5+</span>
            <span className={styles.statLabel}>Languages</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>∞</span>
            <span className={styles.statLabel}>Dependencies</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statNum}>0</span>
            <span className={styles.statLabel}>Blind Spots</span>
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.graphWrapper}>
          <div className={styles.graphGlow} />
          <GraphCanvas />
          <div className={styles.graphLabels}>
            <span className={styles.label} style={{ top: "12%", left: "10%" }}>React</span>
            <span className={styles.label} style={{ top: "22%", right: "8%" }}>Node.js</span>
            <span className={styles.label} style={{ bottom: "28%", left: "5%" }}>PostgreSQL</span>
            <span className={styles.label} style={{ bottom: "15%", right: "12%" }}>Python</span>
            <span className={styles.label} style={{ top: "50%", right: "4%" }}>Go</span>
          </div>
        </div>
      </div>
    </section>
  );
}
