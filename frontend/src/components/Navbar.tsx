"use client";

import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>SYNAPSE</div>
      <div className={styles.links}>
        <a href="#features">Features</a>
        <a href="#agent">Download Agent</a>
        <a href="/scanning" className={styles.ctaLink}>Get Started →</a>
      </div>
    </nav>
  );
}
