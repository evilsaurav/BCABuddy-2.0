<div align="center">
  <img src="https://raw.githubusercontent.com/saurav/BCABuddy/main/frontend/public/logo192.png" alt="BCABuddy Logo" width="150" height="150" />
  
  # BCABuddy
  **The Intelligent AI Assistant for IGNOU BCA Students**

  [![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
  [![Groq](https://img.shields.io/badge/AI-Groq_Llama3-orange.svg)](https://groq.com/)
  [![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
</div>

<br/>

## 🌟 What is BCABuddy?

BCABuddy is not just another study app; it is a personalized, AI-powered academic companion built exclusively for BCA (Bachelor of Computer Applications) students at IGNOU. By leveraging state-of-the-art AI (Groq's Llama 3 models), BCABuddy understands the specific curriculum, syllabus, and examination patterns of IGNOU to deliver highly accurate, contextual, and hyper-personalized study support.

**Why was it built?**
It was born out of real student experiences, late-night coding sessions, and a genuine desire to solve the everyday academic struggles faced by BCA students. Built by Saurav, with the constant support and inspiration of Jiya, this platform is a passion project designed *by* a student, *for* the students. 

Whether you need quick summaries of a block, predictions for your next term-end exam, a personalized study roadmap, or a live 1v1 quiz battle with your friends to test your knowledge, BCABuddy has you covered.

---

## ✨ Key Features & Structure

### 🧠 Core Intelligence
- **Agentic Backend Routing**: Dynamically switches between `llama-3.3-70b-versatile` (for complex reasoning, conversational depth, and OCR grading) and `llama3-8b-8192` (for quick tasks like roadmap generation and title creation).
- **RAG (Retrieval-Augmented Generation)**: Answers questions perfectly aligned with the IGNOU syllabus.
- **Semantic Caching**: Caches AI responses locally to eliminate redundant API calls, massively saving token costs and reducing latency to zero for repeated queries.

### 🛠️ Advanced Tools (APC - Advanced Preparation Center)
- **Exam Predictor**: Predicts important topics for upcoming exams based on the syllabus structure.
- **Study Roadmap (AI Tutor Mode)**: Generates a day-by-day, hour-by-hour personalized study plan based on your remaining days and daily study hours.
- **AI Viva Mentor**: Simulates a live, voice-interactive viva/interview experience using Web Speech API to prepare you for practical exams.
- **Smart Assignment Evaluator**: Upload a picture of your handwritten assignment or code, and the AI will evaluate it using OCR (Optical Character Recognition) and grade it based on the maximum marks.
- **Quiz Master**: Automatically generates MCQ and subjective quizzes based on a given topic, allowing you to upload handwritten answers for grading.

### ⚔️ Live 1v1 Battle (Multiplayer)
- Real-time WebSocket-based quiz battles against other students.
- **Ranked ELO System**: Climb the leaderboard! The system utilizes a standard K=32 ELO rating algorithm to adjust your score after every victory, defeat, or draw.

### 🎮 Gamification & Progression
- **XP & Streaks**: Earn XP for chatting, answering quizzes, and studying consistently.
- **Achievements**: Unlock badges for milestones (e.g., "7-Day Streak", "Quiz Master").

---

## 🏗️ Technical Architecture

BCABuddy uses a modern, decoupled architecture:

### Frontend (React + Vite)
- Built with React and Material-UI (MUI) for a sleek, glassmorphic "Cyberpunk/Neon" UI aesthetic.
- State management handled efficiently via React Hooks and `localStorage`.
- Real-time WebSocket connections for the Live Battle mode.
- PWA (Progressive Web App) ready.

### Backend (Python + FastAPI)
- Asynchronous and highly performant API built with FastAPI.
- **Database**: SQLite (via SQLAlchemy) for tracking user profiles, chat histories, ELO ratings, and achievements.
- **AI Integration**: Groq API integration utilizing `groq-llama-3` models.
- **OCR**: Uses `EasyOCR` to extract text from student-uploaded handwritten assignments for AI grading.

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- A [Groq API Key](https://console.groq.com/keys)

### 1. Clone the Repository
```bash
git clone https://github.com/saurav/BCABuddy.git
cd BCABuddy
```

### 2. Setup the Backend
```bash
cd backend
python -m venv .venv
# Activate the virtual environment
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create a .env file and add your Groq API key
echo "GROQ_API_KEY=your_groq_api_key_here" > .env
echo "DATABASE_URL=sqlite:///./bcabuddy.db" >> .env
echo "SECRET_KEY=super_secret_key" >> .env

# Run the FastAPI server
uvicorn main:app --reload --port 8000
```
*The backend will now be running on `http://localhost:8000`*

### 3. Setup the Frontend
Open a new terminal window:
```bash
cd frontend
npm install

# Create a .env file
echo "VITE_API_URL=http://localhost:8000" > .env

# Run the Vite development server
npm run dev
```
*The frontend will now be running on `http://localhost:5173`*

---

## 💡 Usage Guide
1. **Sign Up**: Create an account and set up your profile (Semester, Subject).
2. **Chat**: Ask BCABuddy any question related to the IGNOU syllabus.
3. **Advanced Tools**: Click the "Wrench" icon (or APC button) to access Roadmaps, Evaluators, and Exam Predictors.
4. **Battle**: Click the "Swords" icon to enter the lobby and queue up for a Live 1v1 match to boost your ELO rating!

---

## 💖 Credits
- **Creator**: Saurav
- **Inspiration & Support**: Jiya
- **Powered by**: Groq, FastAPI, React

*"For the students, by a student."*
