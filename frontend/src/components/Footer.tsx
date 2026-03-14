"use client";

import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <span className={styles.logo}>SYNAPSE</span>
            <p className={styles.tagline}>
              Map the invisible bridges in your code.
            </p>
          </div>
          <div className={styles.links}>
            <div className={styles.col}>
              <span className={styles.colTitle}>Product</span>
              <a href="#">Features</a>
              <a href="#">Download Agent</a>
              <a href="#">VS Extension</a>
            </div>
            <div className={styles.col}>
              <span className={styles.colTitle}>Developers</span>
              <a href="#">Documentation</a>
              <a href="#">API Reference</a>
              <a href="#">GitHub</a>
            </div>
            <div className={styles.col}>
              <span className={styles.colTitle}>Company</span>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>
        <div className={styles.bottom}>
          <span>© 2025 Synapse. Built for ByteCamp 2026.</span>
          <span className={styles.accent}>GENAI Track · PS1</span>
        </div>
      </div>
    </footer>
  );
}
