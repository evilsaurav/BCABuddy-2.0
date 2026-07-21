<div align="center">
  <img src="https://raw.githubusercontent.com/saurav/BCABuddy/main/frontend/public/logo192.png" alt="BCABuddy Logo" width="150" height="150" />
  
  # BCABuddy
  **The Ultimate AI-Powered Academic Assistant for IGNOU BCA Students**

  [![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
  [![Groq](https://img.shields.io/badge/AI-Groq_Llama3-orange.svg)](https://groq.com/)
  [![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
</div>

<br/>

## 🌟 What is BCABuddy?

BCABuddy is a highly specialized, AI-powered study companion designed exclusively for students pursuing a Bachelor of Computer Applications (BCA) at the Indira Gandhi National Open University (IGNOU). 

Most AI chatbots offer generic, broad answers. **BCABuddy is different.** It has been contextually tuned to understand the specific syllabus, block structure, credit system, and past examination patterns of IGNOU. This ensures that every summary, explanation, and quiz it generates is hyper-relevant to what the student actually needs to pass their Term-End Examinations (TEE) and practicals.

**The Origin Story:**
BCABuddy wasn't built in a corporate boardroom. It was born out of real student experiences, frustrating late-night coding sessions, and the genuine desire to solve the everyday academic struggles faced by open-university students. Built by Saurav, with the constant support and inspiration of Jiya, this platform is a passion project designed *by* a student, *for* the students.

---

## ✨ Comprehensive Feature Breakdown

### 🧠 1. Core Intelligence & Chat System
- **Agentic Backend Routing**: The backend dynamically routes requests to different AI models to optimize speed and cost. 
  - *Pro Tier (`llama-3.3-70b-versatile`)*: Used for complex reasoning, answering in-depth programming questions, and grading OCR assignments.
  - *Lite Tier (`llama3-8b-8192`)*: Used for rapid, deterministic tasks like creating chat titles, explaining simple MCQs, and generating structured JSON roadmaps.
- **RAG (Retrieval-Augmented Generation)**: Answers are augmented with real IGNOU syllabus data to prevent AI hallucinations.
- **Semantic Caching**: The system locally caches the semantic meaning of questions. If multiple students ask similar questions (e.g., "What is OOPS?"), the AI instantly returns the cached response, saving API tokens and delivering zero-latency answers.

### 🛠️ 2. Advanced Preparation Center (APC)
The APC is a suite of specialized tools built to tackle every aspect of BCA preparation:
- **Exam Predictor**: Uses historical syllabus weightage to predict which blocks and units are most likely to appear in the upcoming exams.
- **Study Roadmap (AI Tutor Mode)**: Tell the AI how many days you have left and how many hours you can study daily. It will generate a realistic, hour-by-hour study plan broken down by subject and topic.
- **Smart Assignment Evaluator**: Use your device's camera to take a picture of a handwritten assignment or code snippet. The backend uses OCR (Optical Character Recognition via EasyOCR) to extract the text and grades your answer against a maximum score, providing constructive feedback.
- **AI Viva Mentor**: A voice-interactive mentor that uses the browser's Web Speech API. It conducts mock viva-voce interviews by asking you practical questions out loud and listening to your verbal responses, grading you in real-time.
- **Quiz Master**: Automatically spins up customized multiple-choice and subjective quizzes based on specific chapters you want to revise.

### ⚔️ 3. Live 1v1 Battle (Multiplayer)
Studying doesn't have to be lonely.
- **Real-Time WebSockets**: Challenge your friends to a live quiz battle. Both players receive the same questions simultaneously, racing against a 10-second timer.
- **Ranked ELO System**: A competitive ladder! Everyone starts at a base ELO rating of 1000. Winning matches against higher-ranked players yields more points using a standard K=32 Elo algorithm, tracked seamlessly in the SQLite database.

### 🎮 4. Gamification & Progression
- **XP & Streaks**: Every action you take—completing a roadmap day, winning a battle, or just chatting—earns you XP. Daily logins build up your study streak.
- **Achievements**: Unlock dynamic badges like "Early Bird" or "Quiz Master" as you hit specific milestones in your learning journey.
- **Daily Welcome Modal**: A beautiful, 3D-styled motivational modal greets users upon their first login every day, displaying a countdown to exams and a dynamic motivational quote.

### 🛡️ 5. Enterprise-Grade Security
- **API Rate Limiting**: Integrated `slowapi` to rigorously rate-limit heavy AI endpoints (e.g., 20 req/min for Chat, 10 req/min for Roadmaps) to prevent DDoS attacks and token draining.
- **Trace Masking**: A custom global exception handler silently intercepts 500 Server Errors, logging the traceback securely while presenting a safe generic message to the user, preventing sensitive stack trace leaks.

### 📱 6. Progressive Web App (PWA) & Offline UX
- **Native App Feel**: Fully configured with `vite-plugin-pwa` and Workbox, allowing students to install BCABuddy directly to their phone's home screen.
- **Reconnect Grace Period**: Live WebSocket battles now feature a built-in 15-second grace period. If a student's network drops during a match, the server pauses the game rather than instantly forfeiting them.

---

## 🏗️ Technical Architecture

### Frontend (Client)
- **Framework**: React.js with Vite for blazing-fast HMR (Hot Module Replacement).
- **Styling & 4D UI**: 
  - Material-UI (MUI) combined with custom CSS.
  - **"4D Modern" Physics Engine**: Utilizes `framer-motion` for immersive interactions. Features a completely unified **Glassmorphism Auth Screen** (Login/Signup combined) with animated glowing background orbs and seamless layout transitions. UI cards dynamically track mouse movements with 3D parallax tilts, and buttons use staggered spring bounces.
  - **Glassmorphism 2.0**: High-contrast Cyberpunk/Neon aesthetic with deep `backdrop-filter: blur(20px)` layering, glowing multi-colored box shadows, and custom animated scrollbars.
  - **Interactive Ambient Environment**: Features a globally injected `@tsparticles/react` background that reacts to cursor hovers (repulsion) and clicks (scattering).
- **Adaptive Mobile Responsiveness**: The entire application is perfectly scaled for mobile browsers. Dashboards fold gracefully into stacked grids, sidebars tuck into hamburger menus, and chat input zones respect native iOS safe-area keyboards.
- **State Management**: `zustand` and Context API for global state, paired with `localStorage` for persisting chat sessions and offline roadmap progress.
- **Web APIs**: Utilizes the native Web Speech API for voice recognition in the Viva Mentor.

### Backend (Server)
- **Framework**: FastAPI (Python), chosen for its asynchronous capabilities and automatic OpenAPI documentation.
- **Database**: SQLite with SQLAlchemy ORM. Optimized with WAL (Write-Ahead Logging) mode to support high concurrency during live battles.
- **AI Integration**: Groq API for lightning-fast inference on Llama 3 models.
- **WebSockets**: Custom socket manager to handle room-based matchmaking and real-time state synchronization for Live Battles.

---

## 🚀 In-Depth Setup & Installation Guide

Follow these steps carefully to run the entire BCABuddy stack on your local machine.

### Prerequisites
Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/en/download/) (v18 or higher)
- [Python](https://www.python.org/downloads/) (v3.10 or higher)
- [Git](https://git-scm.com/downloads)
- A **Groq API Key**. You can get one for free at the [Groq Console](https://console.groq.com/keys).

### Step 1: Clone the Repository
Open your terminal (or Command Prompt/PowerShell) and run:
```bash
git clone https://github.com/evilsaurav/BCABuddy-2.0.git
cd BCABuddy-2.0
```

### Step 2: Configure and Run the Backend
The backend powers the AI, database, and WebSockets.

1. **Navigate to the backend folder**:
   ```bash
   cd backend
   ```
2. **Create a virtual environment**:
   ```bash
   python -m venv .venv
   ```
3. **Activate the virtual environment**:
   - On Windows:
     ```bash
     .venv\Scripts\activate
     ```
   - On Mac/Linux:
     ```bash
     source .venv/bin/activate
     ```
4. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
5. **Set up Environment Variables**:
   Create a file named `.env` inside the `backend` folder and add the following lines (replace `your_groq_api_key_here` with your actual key):
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   DATABASE_URL=sqlite:///./bcabuddy.db
   SECRET_KEY=super_secret_jwt_key_123
   ```
6. **Start the FastAPI Server**:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *Success! The backend is now running at `http://localhost:8000`. Leave this terminal window open.*

### Step 3: Configure and Run the Frontend
The frontend is the visual UI you will interact with in your browser.

1. **Open a new terminal window/tab** and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. **Install Node modules**:
   ```bash
   npm install
   ```
3. **Set up Environment Variables**:
   Create a file named `.env` inside the `frontend` folder and add:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
4. **Start the Vite Development Server**:
   ```bash
   npm run dev
   ```
   *Success! The frontend is now running at `http://localhost:5173`.*

### Step 4: Access the App
Open your web browser (Chrome/Edge recommended for Web Speech support) and navigate to `http://localhost:5173`. 
Create a new account on the login screen, select your BCA semester and subjects, and start studying!

---

## 🤝 Contributing
BCABuddy is an open project aimed at helping students. If you're a developer and want to add support for other IGNOU courses (like MCA or BCOM), feel free to fork the repository, add the relevant syllabus JSON files, and submit a Pull Request!

## 💖 Credits & Acknowledgments
- **Creator & Lead Developer**: Saurav
- **Inspiration & Support**: Jiya
- **Core Technologies**: Powered by the incredible speeds of [Groq](https://groq.com/), the robustness of [FastAPI](https://fastapi.tiangolo.com/), and the flexibility of [React](https://reactjs.org/).

> *"For the students, by a student."*
