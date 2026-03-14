"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function ScanningPage() {
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + (Math.random() * 5);
      });
    }, 150);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.loader}>
          <div className={styles.spinner} />
          <span className={styles.progressText}>{Math.floor(progress)}%</span>
        </div>
        
        <h1 className={styles.title}>Scanning Repository</h1>
        <p className={styles.subtitle}>
          Synapse is mapping dependencies and analyzing code structure...
        </p>

        <div className={styles.barContainer}>
          <div className={styles.bar} style={{ width: `${progress}%` }} />
        </div>

        <div className={styles.statusList}>
          <div className={styles.statusItem}>
            <span className={progress > 20 ? styles.done : styles.pending}>✓</span> Mapping file tree
          </div>
          <div className={styles.statusItem}>
            <span className={progress > 50 ? styles.done : styles.pending}>✓</span> Building dependency graph
          </div>
          <div className={styles.statusItem}>
            <span className={progress > 85 ? styles.done : styles.pending}>✓</span> Indexing function calls
          </div>
        </div>

        {progress >= 100 && (
          <button 
            className={styles.continueBtn}
            onClick={() => router.push("/chatbot")}
          >
            Enter Chatbot
          </button>
        )}
      </div>
    </div>
  );
}
