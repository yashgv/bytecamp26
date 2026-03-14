"use client";

import styles from "./Navbar.module.css";

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        <img src="/synapselogo.png" alt="SYNAPSE" style={{ height: '50px', width: 'auto' }} />
      </div>
      <div className={styles.links}>
        <a href="#features">Features</a>
        <a href="/graph">Graph View</a>
        <a href="#agent">Download Agent</a>
        <a href="/scanning" className={styles.ctaLink}>Get Started →</a>
      </div>
    </nav>
  );
}
