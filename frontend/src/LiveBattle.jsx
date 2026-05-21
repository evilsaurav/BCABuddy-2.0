import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, User, Zap, Trophy, Loader2 } from "lucide-react";

export default function LiveBattle() {
  const [ws, setWs] = useState(null);
  const [gameState, setGameState] = useState("idle"); // idle, waiting, playing, game_over
  const [opponent, setOpponent] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [scores, setScores] = useState({});
  const [winner, setWinner] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [resultMsg, setResultMsg] = useState("");
  const gameIdRef = useRef(null);

  const username = localStorage.getItem("username");

  const connectWebSocket = () => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Please login first.");

    const socket = new WebSocket(`ws://localhost:8000/ws/battle?token=${token}`);
    
    socket.onopen = () => {
      setGameState("waiting");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WS Data:", data);

      if (data.type === "waiting") {
        setGameState("waiting");
      } else if (data.type === "matched") {
        setOpponent(data.opponent);
        gameIdRef.current = data.game_id;
        setScores({ [username]: 0, [data.opponent]: 0 });
        setGameState("playing");
      } else if (data.type === "game_start") {
        setResultMsg(data.message);
      } else if (data.type === "question") {
        setSelectedOption(null);
        setResultMsg("");
        setCurrentQuestion({
          question: data.question,
          options: data.options,
          index: data.question_index
        });
      } else if (data.type === "score_update") {
        setScores(data.scores);
      } else if (data.type === "question_result") {
        setResultMsg(`Time's up! Correct answer: ${data.correct_answer}`);
      } else if (data.type === "game_over") {
        setWinner(data.winner);
        setScores(data.final_scores);
        setGameState("game_over");
      }
    };

    socket.onclose = () => {
      setGameState("idle");
    };

    setWs(socket);
  };

  const handleAnswer = (option) => {
    setSelectedOption(option);
    if (ws && gameIdRef.current && currentQuestion) {
      ws.send(JSON.stringify({
        type: "answer",
        game_id: gameIdRef.current,
        question_index: currentQuestion.index,
        answer: option
      }));
    }
  };

  const quitGame = () => {
    if (ws) ws.close();
    setGameState("idle");
    setOpponent(null);
    setCurrentQuestion(null);
    setScores({});
    setWinner(null);
  };

  return (
    <div style={{ padding: "2rem", color: "white", maxWidth: "800px", margin: "0 auto", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: "2.5rem", fontWeight: "bold", color: "#F87171", display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}
        >
          <Swords size={40} /> Live 1v1 Battle
        </motion.h1>
      </div>

      {gameState === "idle" && (
        <div style={{ textAlign: "center", marginTop: "10vh" }}>
          <p style={{ color: "#9CA3AF", fontSize: "1.2rem", marginBottom: "2rem" }}>
            Challenge other BCABuddy users to a real-time quiz battle!
          </p>
          <button 
            onClick={connectWebSocket}
            style={{ padding: "1rem 3rem", fontSize: "1.2rem", fontWeight: "bold", background: "#EF4444", color: "white", border: "none", borderRadius: "50px", cursor: "pointer", boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)" }}
          >
            Find Opponent
          </button>
        </div>
      )}

      {gameState === "waiting" && (
        <div style={{ textAlign: "center", marginTop: "10vh", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <Loader2 size={60} color="#F87171" style={{ animation: "spin 2s linear infinite" }} />
          <h2 style={{ color: "#F87171" }}>Searching for Opponent...</h2>
          <button onClick={quitGame} style={{ marginTop: "2rem", background: "transparent", border: "1px solid #9CA3AF", color: "#9CA3AF", padding: "0.5rem 2rem", borderRadius: "20px", cursor: "pointer" }}>Cancel</button>
        </div>
      )}

      {gameState === "playing" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.4)", padding: "1rem 2rem", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#60A5FA" }}><User size={20}/> {username} (You)</div>
              <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{scores[username] || 0}</div>
            </div>
            <Zap size={40} color="#FBBF24" />
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#F87171" }}><User size={20}/> {opponent}</div>
              <div style={{ fontSize: "2rem", fontWeight: "bold" }}>{scores[opponent] || 0}</div>
            </div>
          </div>

          <div style={{ textAlign: "center", color: "#FBBF24", fontWeight: "bold", fontSize: "1.2rem", minHeight: "2rem" }}>
            {resultMsg}
          </div>

          {currentQuestion ? (
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentQuestion.index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ background: "rgba(255,255,255,0.05)", padding: "2rem", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <h2 style={{ marginBottom: "2rem", fontSize: "1.5rem" }}>{currentQuestion.question}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {currentQuestion.options.map((opt, i) => (
                    <button 
                      key={i}
                      onClick={() => handleAnswer(opt)}
                      disabled={!!selectedOption}
                      style={{ 
                        padding: "1rem", 
                        fontSize: "1.1rem", 
                        textAlign: "left", 
                        background: selectedOption === opt ? "rgba(96, 165, 250, 0.2)" : "rgba(0,0,0,0.3)", 
                        color: selectedOption === opt ? "#60A5FA" : "white",
                        border: `1px solid ${selectedOption === opt ? "#60A5FA" : "rgba(255,255,255,0.1)"}`,
                        borderRadius: "10px", 
                        cursor: selectedOption ? "default" : "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <p style={{ fontSize: "1.5rem", color: "#9CA3AF" }}>Get Ready...</p>
            </div>
          )}
        </div>
      )}

      {gameState === "game_over" && (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ textAlign: "center", background: "rgba(0,0,0,0.5)", padding: "3rem", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", marginTop: "5vh" }}
        >
          <Trophy size={80} color="#FBBF24" style={{ margin: "0 auto", marginBottom: "1rem" }} />
          <h1 style={{ fontSize: "3rem", color: winner === username ? "#4CAF50" : "#F87171" }}>
            {winner === username ? "Victory!" : "Defeat!"}
          </h1>
          <p style={{ fontSize: "1.5rem", color: "#9CA3AF", marginTop: "1rem" }}>
            Final Score: {scores[username]} - {scores[opponent]}
          </p>
          <button 
            onClick={quitGame}
            style={{ marginTop: "2rem", padding: "1rem 3rem", fontSize: "1.2rem", fontWeight: "bold", background: "#3B82F6", color: "white", border: "none", borderRadius: "50px", cursor: "pointer" }}
          >
            Return to Lobby
          </button>
        </motion.div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
