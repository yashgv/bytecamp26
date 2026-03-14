"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ChatSidebar.module.css";

const TOP_ITEMS = [
  { id: "history", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, title: "History" },
  { id: "visualize", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>, title: "Visualize Repository" },
  { id: "report", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, title: "Generate Report" },
];

const BOTTOM_ITEMS = [
  { id: "home", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, title: "Home", action: "home" },
  { id: "support", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>, title: "Support" },
];

export default function ChatSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();

  return (
    <aside className={`${styles.sidebar} ${isExpanded ? styles.expanded : ''}`}>
      <nav className={styles.nav}>
        {/* Expand/Collapse Logo */}
        <button 
          className={styles.navItem} 
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <span className={styles.navIcon}>
            {isExpanded ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            )}
          </span>
          {isExpanded && <span className={styles.navLabel}>Collapse</span>}
        </button>

        <div className={styles.divider} />

        {TOP_ITEMS.map((item) => (
          <button
            key={item.id}
            className={styles.navItem}
            title={item.title}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {isExpanded && <span className={styles.navLabel}>{item.title}</span>}
          </button>
        ))}
        
        <div className={styles.divider} />
      </nav>

      <div className={styles.spacer} />

      <div className={styles.bottomNav}>
        {BOTTOM_ITEMS.map((item) => (
          <button 
            key={item.id} 
            className={styles.navItem} 
            title={item.title}
            onClick={() => item.action === "home" && router.push("/analyze")}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {isExpanded && <span className={styles.navLabel}>{item.title}</span>}
          </button>
        ))}
        
        <button className={styles.navItem} title="Profile">
          <div className={styles.avatar}>Y</div>
          {isExpanded && <span className={styles.navLabel}>Profile</span>}
        </button>
      </div>
    </aside>
  );
}
