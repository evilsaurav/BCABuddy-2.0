import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Flame, User, AlertCircle, Medal } from "lucide-react";
import { API_BASE } from './utils/apiConfig';

export default function Leaderboard() {
  const [leaderboardData, setLeaderboardData] = useState({
    top_xp: [],
    top_scores: [],
    top_streaks: []
  });
  const [activeTab, setActiveTab] = useState("xp");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Use dynamic API_BASE to prevent hardcoded localhost errors in production
      const res = await fetch(`${API_BASE}/leaderboard`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      const data = await res.json();
      setLeaderboardData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "xp", label: "Top XP", icon: Star, dataKey: "top_xp", valueKey: "total_xp", suffix: " XP", color: "#FBBF24" },
    { id: "scores", label: "Highest Exam Scores", icon: Trophy, dataKey: "top_scores", valueKey: "highest_exam_score", suffix: "%", color: "#60A5FA" },
    { id: "streaks", label: "Longest Streaks", icon: Flame, dataKey: "top_streaks", valueKey: "current_streak", suffix: " Days", color: "#F87171" }
  ];

  const getRankColor = (index) => {
    if (index === 0) return { bg: "rgba(251, 191, 36, 0.2)", border: "#FBBF24", text: "#FBBF24", icon: <Medal size={24} color="#FBBF24" /> };
    if (index === 1) return { bg: "rgba(156, 163, 175, 0.2)", border: "#9CA3AF", text: "#9CA3AF", icon: <Medal size={24} color="#9CA3AF" /> };
    if (index === 2) return { bg: "rgba(180, 83, 9, 0.2)", border: "#B45309", text: "#B45309", icon: <Medal size={24} color="#B45309" /> };
    return { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "#9ca3af", icon: <span style={{fontSize: "1.2rem", fontWeight: "bold", width: "24px", textAlign: "center"}}>#{index + 1}</span> };
  };

  const activeTabData = tabs.find(t => t.id === activeTab);
  const currentList = leaderboardData[activeTabData.dataKey] || [];

  return (
    <div style={{ padding: "2rem", color: "white", maxWidth: "1200px", margin: "0 auto", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: "3rem", fontWeight: "bold", background: "linear-gradient(to right, #60A5FA, #A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-flex", alignItems: "center", gap: "1rem" }}
        >
          <Trophy size={40} color="#FBBF24" /> Global Leaderboard
        </motion.h1>
        <p style={{ color: "#9ca3af", marginTop: "1rem", fontSize: "1.1rem" }}>Compete with IGNOU BCA students globally</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "3rem", flexWrap: "wrap" }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem", padding: "1rem 2rem", borderRadius: "100px",
              border: `1px solid ${activeTab === tab.id ? tab.color : 'rgba(255,255,255,0.1)'}`,
              background: activeTab === tab.id ? `${tab.color}20` : 'rgba(0,0,0,0.3)',
              color: activeTab === tab.id ? tab.color : '#9ca3af',
              cursor: "pointer", transition: "all 0.3s ease", fontSize: "1rem", fontWeight: "bold", backdropFilter: "blur(10px)"
            }}
          >
            <tab.icon size={20} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
            <Star size={40} color="#60A5FA" />
          </motion.div>
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", color: "#EF4444", padding: "2rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "1rem" }}>
          <AlertCircle size={40} style={{ margin: "0 auto", marginBottom: "1rem" }} />
          <p>{error}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem", color: "#9ca3af", background: "rgba(0,0,0,0.3)", borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p>No data available yet. Start practicing to get on the board!</p>
                </div>
              ) : (
                currentList.map((user, index) => {
                  const rankStyle = getRankColor(index);
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={user.username + index}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "1.5rem 2rem", marginBottom: "1rem", borderRadius: "1rem",
                        background: rankStyle.bg, border: `1px solid ${rankStyle.border}`,
                        boxShadow: index < 3 ? `0 4px 20px ${rankStyle.border}40` : "none",
                        backdropFilter: "blur(10px)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                        <div style={{ width: "40px", display: "flex", justifyContent: "center" }}>
                          {rankStyle.icon}
                        </div>
                        <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {user.profile_pic_url ? (
                            <img src={user.profile_pic_url.startsWith('http') ? user.profile_pic_url : `${API_BASE}${user.profile_pic_url}`} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <User size={24} color="#9ca3af" />
                          )}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "bold", color: index < 3 ? rankStyle.text : "white" }}>
                            {user.display_name}
                          </h3>
                          <p style={{ margin: 0, fontSize: "0.9rem", color: "#9ca3af" }}>@{user.username}</p>
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.5rem", fontWeight: "bold", color: rankStyle.text }}>
                        {user[activeTabData.valueKey]} <span style={{ fontSize: "1rem", opacity: 0.8 }}>{activeTabData.suffix}</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
