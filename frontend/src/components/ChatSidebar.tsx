"use client";

import { useState } from "react";
import styles from "./ChatSidebar.module.css";
import { useRouter } from "next/navigation";

// Streamlined to only the necessary items
const NAV_ITEMS = [
  { id: "analyze", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>, title: "Analyze Repo", path: "/analyze" },
  { id: "chat", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>, title: "Current Chat", active: true },
  { id: "history", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>, title: "History" },
];

export default function ChatSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();

  const handleNavClick = (item: typeof NAV_ITEMS[0]) => {
    if (item.path) {
      router.push(item.path);
    }
  };

  return (
    <aside className={`${styles.sidebar} ${isExpanded ? styles.expanded : ""}`}>
      {/* Top Toggle Section */}
      <div className={styles.topSection}>
        <button 
          className={styles.menuToggleBtn} 
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse Menu" : "Expand Menu"}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
      
      {/* Primary Navigation */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`${styles.navItem} ${item.active ? styles.navItemActive : ""}`}
            title={item.title}
            onClick={() => handleNavClick(item)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {isExpanded && <span className={styles.navLabel}>{item.title}</span>}
          </button>
        ))}
      </nav>

      <div className={styles.spacer} />

      {/* Bottom Profile / Settings */}
      <div className={styles.bottomNav}>
        <button className={styles.navItem} title="User Profile">
          <div className={styles.avatar}>Y</div>
          {isExpanded && <span className={styles.navLabel}>User Profile</span>}
        </button>
        <button className={styles.navItem} title="Settings">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          {isExpanded && <span className={styles.navLabel}>Settings</span>}
        </button>
      </div>
    </aside>
  );
}
