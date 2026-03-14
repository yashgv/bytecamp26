"use client";

import dynamic from "next/dynamic";
import styles from "./HeroSection.module.css";

const HalftoneBackground = dynamic(() => import("./HalftoneBackground"), { ssr: false });

export default function HeroSection() {
  return (
    <section className={styles.hero} id="hero">
      <HalftoneBackground />
      
      <div className={styles.content}>
        <h1 className={styles.headline}>
          Map the Invisible<br />
          Bridges in Your Code.
        </h1>
        
        <p className={styles.subtext}>
          The first GenAI agent that traces logic across polyglot boundaries. Map
          dependencies from your React frontend to your SQL database in seconds.
        </p>
        
        <div className={styles.ctas}>
          <a href="/analyze" className={styles.primaryBtn}>
            Start Analyzing
          </a>
          <a href="#" className={styles.secondaryBtn}>
            Download VS Extension
          </a>
        </div>
      </div>
    </section>
  );
}
