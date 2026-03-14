"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import styles from './page.module.css';

interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  updated_at: string;
  owner: {
    avatar_url: string;
    login: string;
  };
}

export default function AnalyzePage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [user, setUser] = useState<any>(null);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Check current session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.provider_token) {
        fetchRepos(session.provider_token);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.provider_token) {
        fetchRepos(session.provider_token);
      } else if (!session) {
        setRepos([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRepos = async (token: string) => {
    setLoadingRepos(true);
    try {
      const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRepos(data);
      }
    } catch (error) {
      console.error("Error fetching repos:", error);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'repo',
        redirectTo: window.location.origin + '/analyze',
      }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRepos([]);
  };

  const handleAnalyze = (url?: string) => {
    const targetUrl = url || repoUrl;
    if (targetUrl.trim()) {
      router.push("/scanning");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAnalyze();
    }
  };

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>← Back</button>
        <div className={styles.headerCenter}>
          <img src="/synapselogo.png" alt="SYNAPSE" style={{ height: '32px', width: 'auto' }} />
        </div>
        <div className={styles.headerRight}>
          {user ? (
            <div className={styles.userProfile}>
              <img src={user.user_metadata.avatar_url} alt="Profile" className={styles.avatar} />
              <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <div className={styles.profileIcon}></div>
          )}
        </div>
      </header>
      
      <main className={styles.main}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Analyze a Repository</h1>
          <button className={styles.proBtn}>
            <span className={styles.proIcon}>✦</span> Upgrade to Pro
          </button>
        </div>

        <div className={styles.searchContainer}>
          <span className={styles.searchIcon}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          </span>
          <input 
            type="text" 
            placeholder="Enter a Git repository URL to analyze..." 
            className={styles.searchInput}
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            className={styles.planeBtn} 
            onClick={() => handleAnalyze()}
            disabled={!repoUrl.trim()}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <div className={styles.grid}>
          {/* Left Column: Git Auth / Repo Import */}
          <section className={styles.leftCol}>
            <h2 className={styles.sectionTitle}>Import Git Repository</h2>
            
            {!user ? (
              <div className={styles.emptyStateContainer}>
                <div className={styles.githubLargeIcon}>
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path></svg>
                </div>
                <p className={styles.emptyStateText}>Connect your account to quickly import and analyze your repositories.</p>
                <button className={styles.actionBtnPrimary} onClick={handleLogin}>
                  Login using GitHub
                </button>
              </div>
            ) : (
              <div className={styles.importContainer}>
                <div className={styles.importHeader}>
                  <div className={styles.accountSelector}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ marginRight: '8px' }}><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path></svg>
                    <span>{user.user_metadata.full_name || user.user_metadata.user_name}</span>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" style={{ marginLeft: 'auto' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                  <div className={styles.repoSearchWrapper}>
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" className={styles.searchSmallIcon}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                      type="text" 
                      placeholder="Search..." 
                      className={styles.repoSearchInput}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.repoList}>
                  {loadingRepos ? (
                    <div className={styles.repoLoading}>Loading repositories...</div>
                  ) : filteredRepos.length > 0 ? (
                    filteredRepos.map(repo => (
                      <div key={repo.id} className={styles.repoItem}>
                        <div className={styles.repoLogo}>
                           <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="1.5" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <div className={styles.repoMainInfo}>
                          <span className={styles.repoName}>{repo.name}</span>
                          <span className={styles.repoDate}>{formatDate(repo.updated_at)}</span>
                        </div>
                        <button className={styles.importRepoBtn} onClick={() => handleAnalyze(repo.html_url)}>
                          Import
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className={styles.noRepos}>No repositories found.</div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Right Column: Chat History */}
          <section className={styles.rightCol}>
            <h2 className={styles.sectionTitle}>Chat History</h2>

            <div className={styles.emptyStateContainer}>
               <div className={styles.historyIcon}>
                  <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
               </div>
               <p className={styles.emptyStateText}>
                 {user 
                   ? "You haven't started any analysis chats yet. Import a repository to begin." 
                   : "Login to view your previous analysis history and chats."
                 }
               </p>
               {!user && (
                 <button className={styles.actionBtnSecondary} onClick={handleLogin}>
                   Login / Register
                 </button>
               )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
