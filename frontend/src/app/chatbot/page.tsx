"use client";

import { useState, useRef, useEffect } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import styles from "./page.module.css";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  {
    id: "graph",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
    ),
    title: "Graph Visualization",
    desc: "Render the interactive dependency graph for this repo",
  },
  {
    id: "debug",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 8v4M12 16h.01"/></svg>
    ),
    title: "Debug Redundancies",
    desc: "Find duplicate or redundant logic scattered across files",
  },
  {
    id: "report",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    ),
    title: "Code Structure Reports",
    desc: "Generate a full architectural report of the codebase",
  },
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const reply: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: `I'm analyzing your repository for: **"${text.trim()}"**\n\nThis feature will connect to the Synapse backend to provide real-time insights from your scanned codebase.`,
      };
      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 1400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className={styles.layout}>
      <ChatSidebar />

      <div className={styles.main}>
        {/* Welcome / Quick actions */}
        {!hasMessages && (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <h1 className={styles.welcomeTitle}>Your Personal Agent</h1>
            <p className={styles.welcomeSub}>
              Trained to understand your code and cater to your architecture needs.
            </p>

            <div className={styles.quickActions}>
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  className={styles.quickCard}
                  onClick={() => sendMessage(action.desc)}
                >
                  <span className={styles.quickIcon}>{action.icon}</span>
                  <span className={styles.quickDesc}>{action.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message thread */}
        {hasMessages && (
          <div className={styles.messages}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.message} ${msg.role === "user" ? styles.userMessage : styles.aiMessage}`}
              >
                {msg.role === "assistant" && (
                  <div className={styles.aiAvatar}>S</div>
                )}
                <div className={styles.messageBubble}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className={`${styles.message} ${styles.aiMessage}`}>
                <div className={styles.aiAvatar}>S</div>
                <div className={`${styles.messageBubble} ${styles.typing}`}>
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input bar */}
        <div className={styles.inputArea}>
          <div className={styles.inputBox}>
            <button className={styles.attachBtn} title="Attach context">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder="Ask your personal agent..."
              value={input}
              rows={1}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
            />
            <button
              className={styles.sendBtn}
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
