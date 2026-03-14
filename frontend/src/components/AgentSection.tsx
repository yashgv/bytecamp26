"use client";

import { useIntersectionObserver } from "../hooks/useIntersectionObserver";
import styles from "./AgentSection.module.css";

const steps = [
  { label: "Install CLI", code: "npm install -g @synapse/cli" },
  { label: "Authenticate", code: "synapse auth login" },
  { label: "Scan Repo", code: "synapse scan ./your-project" },
];

export default function AgentSection() {
  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.2,
    triggerOnce: true,
  });

  return (
    <section className={styles.section} id="agent" ref={ref}>
      <div className={styles.container}>
        <div className={`reveal-up ${isIntersecting ? "active" : ""} ${styles.left}`}>
          <span className={styles.eyebrow}>The Downloadable Agent</span>
          <h2 className={styles.title}>Take it Offline.</h2>
          <p className={styles.desc}>
            Privacy matters. Download the Synapse Agent to run locally on your
            machine. No code leaves your infrastructure. Use our CLI to integrate
            directly into your CI/CD pipeline.
          </p>
          <div className={styles.features}>
            {["Runs 100% locally", "CI/CD integration", "No data egress", "Air-gap compatible"].map((f) => (
              <div key={f} className={styles.featureItem}>
                <span className={styles.check}>✓</span> {f}
              </div>
            ))}
          </div>
          <div className={styles.ctas}>
            <a href="#" className={styles.primaryBtn}>
              Download Agent v1.0
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v8M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="#" className={styles.ghostBtn}>View Docs →</a>
          </div>
        </div>

        <div className={`reveal-up ${isIntersecting ? "active" : ""} ${styles.right}`} style={{ transitionDelay: "200ms" }}>
          <div className={styles.terminal}>
            <div className={styles.terminalBar}>
              <span className={styles.dot} style={{ background: "#ff5f57" }} />
              <span className={styles.dot} style={{ background: "#febc2e" }} />
              <span className={styles.dot} style={{ background: "#28c840" }} />
              <span className={styles.terminalLabel}>synapse-cli</span>
            </div>
            <div className={styles.terminalBody}>
              {steps.map((s, i) => (
                <div key={s.label} className={styles.terminalLine}>
                  <span className={styles.prompt}>$</span>
                  <span className={styles.cmd}>{s.code}</span>
                  {i < steps.length - 1 && (
                    <span className={styles.output}>
                      {i === 0 ? "✓ Synapse CLI installed" : i === 1 ? "✓ Authenticated as you@company.com" : ""}
                    </span>
                  )}
                </div>
              ))}
              <div className={styles.terminalLine}>
                <span className={styles.prompt}>$</span>
                <span className={styles.cursor}>▋</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
