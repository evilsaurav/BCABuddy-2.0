# 🚀 BCABuddy-2.0

> Your ultimate AI-powered companion for mastering the BCA curriculum, specifically tailored for IGNOU Semesters and beyond.

![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-2023-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 📖 Overview

**BCABuddy-2.0** is a full-stack AI assistant designed to simplify the life of a BCA student. From explaining complex data structures to generating exam-specific notes for IGNOU subjects, this tool bridges the gap between massive textbooks and efficient learning.

### 🌟 Key Features

* **🧠 Intelligent Tutoring:** Specialized AI models that understand the BCA syllabus (Networking, DBMS, Java, etc.).
* **📝 Exam Prep Mode:** Tailored assistance for IGNOU Semester 4 exam patterns and previous year question analysis.
* **⚡ High-Performance API:** Powered by **FastAPI** for lightning-fast response times.
* **💻 Modern UI:** A sleek, responsive dashboard built with **React**.
* **📚 Subject Mastery:** Deep-dive explanations for core subjects like MCS-024, MCS-021, and more.

---

## 🛠️ Tech Stack

### Backend
* **Language:** Python 3.9+
* **Framework:** FastAPI
* **AI Integration:** OpenAI / Gemini API (via LangChain/Custom Wrappers)
* **Database:** (Add your DB here, e.g., PostgreSQL or MongoDB)

### Frontend
* **Framework:** React.js
* **Styling:** Tailwind CSS / Lucide Icons
* **State Management:** React Hooks / Context API

---

## 🚀 Getting Started

### Prerequisites
* Python 3.9 or higher
* Node.js & npm

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/bcabuddy-2.0.git](https://github.com/your-username/bcabuddy-2.0.git)
cd bcabuddy-2.0

Backend Setup

cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

Frontend Setup

cd frontend
npm install
npm start

BCABuddy-2.0/
├── backend/            # FastAPI source code
│   ├── app/            # Main application logic
│   └── main.py         # Entry point
├── frontend/           # React application
│   ├── src/            # Components and hooks
│   └── public/         # Static assets
└── docs/               # Documentation and syllabus guides
