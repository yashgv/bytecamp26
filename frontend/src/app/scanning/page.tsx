"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";

function ScanningContent() {
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const repoId = searchParams.get("repo_id");

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
          // The backend clones and indexes, we will just simulate progress here.
        return prev + (Math.random() * 5);
      });
    }, 150);

    return () => clearInterval(timer);
  }, []);

  const handleContinue = () => {
    if (repoId) {
      router.push(`/chatbot?repo_id=${repoId}`);
    } else {
      router.push("/chatbot");
    }
  };

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
            onClick={handleContinue}
          >
            Enter Chatbot
          </button>
        )}
      </div>
    </div>
  );
}

export default function ScanningPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ScanningContent />
    </Suspense>
  );
}
