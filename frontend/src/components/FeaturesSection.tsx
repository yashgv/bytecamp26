"use client";

import { useIntersectionObserver } from "../hooks/useIntersectionObserver";
import styles from "./FeaturesSection.module.css";

const features = [
  {
    icon: "💬",
    num: "01",
    title: "Interactive Chatbot",
    desc: 'Talk to your codebase. Ask "What breaks if I delete this API endpoint?" and get instant, accurate answers backed by a live dependency graph.',
  },
  {
    icon: "🌐",
    num: "02",
    title: "Multi-Language Graphs",
    desc: "Visualize your entire system architecture — from Go backends to Flutter frontends — in one unified, interactive graph.",
  },
  {
    icon: "📊",
    num: "03",
    title: "Impact Reports",
    desc: 'Generate PDF/Markdown reports summarizing the "Blast Radius" of proposed changes before you even hit Merge.',
  },
];

export default function FeaturesSection() {
  const { isIntersecting, ref } = useIntersectionObserver({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <section className={styles.section} id="features" ref={ref}>
      <div className={styles.container}>
        <div className={`reveal-up ${isIntersecting ? "active" : ""} ${styles.header}`}>
          <span className={styles.eyebrow}>Key Features</span>
          <h2 className={styles.title}>Everything you need to<br />ship with confidence</h2>
        </div>
        <div className={`reveal-up ${isIntersecting ? "active" : ""} ${styles.grid}`} style={{ transitionDelay: "150ms" }}>
          {features.map((f) => (
            <div key={f.num} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.num}>{f.num}</span>
                <span className={styles.icon}>{f.icon}</span>
              </div>
              <h3 className={styles.cardTitle}>{f.title}</h3>
              <p className={styles.cardDesc}>{f.desc}</p>
              <div className={styles.cardHoverLine} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
