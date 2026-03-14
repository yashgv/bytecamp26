"use client";

import { useIntersectionObserver } from "../hooks/useIntersectionObserver";
import styles from "./TaglineSection.module.css";

export default function TaglineSection() {
  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.3,
    triggerOnce: true,
  });

  return (
    <section className={styles.section} ref={ref}>
      <div className={`reveal-up ${isIntersecting ? "active" : ""} ${styles.inner}`}>
        <div className={styles.line} />
        <p className={styles.tagline}>
          The first GenAI agent that traces logic across{" "}
          <span className={styles.accent}>polyglot boundaries</span>.
          Map dependencies from your React frontend to your SQL
          database in seconds.
        </p>
        <div className={styles.line} />
      </div>
    </section>
  );
}
