"""
BCABuddy Backend - AI Learning Assistant for IGNOU BCA
License: MIT
Author: Saurav Kumar
Description: FastAPI application for IGNOU BCA learning with AI assistance
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from groq import Groq
import os, shutil
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import ChatHistory, User, ChatSession, get_db
from jose import JWTError, jwt
from passlib.context import CryptContext
from rag_service import RAGService 
from typing import Optional, List
from PIL import Image
import io
import json
import time

# --- CONFIG ---
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SECRET_KEY = "SAURAV_IS_THE_BEST_DEV_19_APRIL"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 
UPLOAD_DIR = "uploads"
PROFILE_PICS_DIR = "profile_pics"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROFILE_PICS_DIR, exist_ok=True)

# --- SERVICES ---
rag_system = RAGService(groq_api_key=GROQ_API_KEY)
client = Groq(api_key=GROQ_API_KEY)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

app = FastAPI(title="BCABuddy Ultimate")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,
)

# Initialize EasyOCR reader (safe import)
reader = None
try:
    import easyocr
    reader = easyocr.Reader(['en', 'hi'])
except Exception:
    pass

try:
    import pytesseract
except Exception:
    pytesseract = None

# --- MODELS ---
class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ChatRequest(BaseModel):
    message: str
    mode: str = "auto"
    selected_subject: str = "" 
    session_id: Optional[int] = None
    response_mode: str = "fast"  # NEW: fast, thinking, pro
    active_tool: Optional[str] = None  # FIXED: Added active_tool field

class QuizRequest(BaseModel):
    subject: str
    semester: str

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str

class DashboardStats(BaseModel):
    total_sessions: int
    last_subject: str
    study_hours: float
    avg_quiz_score: float
    recent_activity: str

class UserProfile(BaseModel):
    username: str
    display_name: str
    gender: Optional[str] = None
    mobile_number: Optional[str] = None
    profile_picture_url: Optional[str] = None

class UserProfileUpdate(BaseModel):
    display_name: str
    gender: Optional[str] = None
    mobile_number: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str
    confirm_password: str

# --- AUTH HELPERS ---
def get_password_hash(p): return pwd_context.hash(p)
def verify_password(p, h): return pwd_context.verify(p, h)
def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username: raise HTTPException(status_code=401)
    except JWTError: 
        raise HTTPException(status_code=401)
    user = db.query(User).filter(User.username == username).first()
    if not user: raise HTTPException(status_code=401)
    return user

# --- AUTH ENDPOINTS ---
@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username taken")
    new_user = User(
        username=user.username, 
        hashed_password=get_password_hash(user.password),
        display_name=user.username,
        gender=None,
        mobile_number=None,
        profile_picture_url=None
    )
    db.add(new_user)
    db.commit()
    return {"message": "User created"}

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect credentials")
    return {"access_token": create_access_token(data={"sub": user.username}), "token_type": "bearer"}

# --- NEW: PROFILE ENDPOINTS ---

@app.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return UserProfile(
        username=current_user.username,
        display_name=current_user.display_name or current_user.username,
        gender=current_user.gender,
        mobile_number=current_user.mobile_number,
        profile_picture_url=current_user.profile_picture_url
    )

@app.put("/profile")
def update_profile(profile_data: UserProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.display_name = profile_data.display_name
    current_user.gender = profile_data.gender
    current_user.mobile_number = profile_data.mobile_number
    db.commit()
    return {"message": "Profile updated"}

@app.post("/profile/upload-picture")
async def upload_profile_picture(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        file_extension = file.filename.split('.')[-1]
        filename = f"{current_user.id}_{datetime.utcnow().timestamp()}.{file_extension}"
        file_path = os.path.join(PROFILE_PICS_DIR, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        current_user.profile_picture_url = f"/profile_pics/{filename}"
        db.commit()
        
        return {"message": "Profile picture uploaded", "url": current_user.profile_picture_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading picture: {str(e)}")

@app.post("/profile/change-password")
def change_password(pwd_data: PasswordChange, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(pwd_data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Old password is incorrect")
    
    if pwd_data.new_password != pwd_data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    if len(pwd_data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    current_user.hashed_password = get_password_hash(pwd_data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}

# --- DASHBOARD AND SESSION ENDPOINTS ---

@app.get("/dashboard-stats")
def get_dashboard_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).all()
    total_sessions = len(sessions)
    
    last_subject = "N/A"
    if sessions:
        last_chat = db.query(ChatHistory).filter(ChatHistory.session_id == sessions[0].id).order_by(ChatHistory.id.desc()).first()
        if last_chat: last_subject = last_chat.text[:30]
    
    return DashboardStats(
        total_sessions=total_sessions,
        last_subject=last_subject,
        study_hours=float(total_sessions * 0.5),
        avg_quiz_score=85.0,
        recent_activity="Last active 2 hours ago"
    )

@app.get("/sessions")
def get_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(ChatSession.id.desc()).all()

# FIXED: Proper PUT endpoint to rename session
@app.put("/sessions/{session_id}")
def rename_session(
    session_id: int, 
    title: str, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        # Verify session belongs to current user
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id, 
            ChatSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        if not title or len(title.strip()) == 0:
            raise HTTPException(status_code=400, detail="Title cannot be empty")
        
        # Update session title
        session.title = title.strip()
        db.commit()
        db.refresh(session)
        
        return {
            "message": "Session renamed successfully",
            "session_id": session_id,
            "new_title": session.title
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error renaming session: {str(e)}")

# FIXED: Proper DELETE endpoint with cascade delete
@app.delete("/sessions/{session_id}")
def delete_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Verify session belongs to current user
        session = db.query(ChatSession).filter(
            ChatSession.id == session_id, 
            ChatSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Delete all chat history associated with this session
        db.query(ChatHistory).filter(ChatHistory.session_id == session_id).delete()
        
        # Delete the session itself
        db.delete(session)
        db.commit()
        
        return {"message": "Session deleted successfully", "session_id": session_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting session: {str(e)}")

@app.get("/history")
def get_history(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chats = db.query(ChatHistory).filter(ChatHistory.session_id == session_id).order_by(ChatHistory.id).all()
    return [{"id": c.id, "text": c.text, "sender": c.sender} for c in chats]

# --- ENHANCED CHAT ENDPOINT ---

@app.post("/chat")
def chat_endpoint(request: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    if not request.session_id:
        new_session = ChatSession(user_id=current_user.id, title=request.message[:30] + "...")
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        request.session_id = new_session.id

    db.add(ChatHistory(sender="user", text=request.message, session_id=request.session_id))
    db.commit()
    
    recent_chats = db.query(ChatHistory).filter(ChatHistory.session_id == request.session_id).order_by(ChatHistory.id.desc()).limit(6).all()
    history_context = "\n".join([f"{c.sender.upper()}: {c.text[:100]}" for c in reversed(recent_chats)])

    system_prompt = ""
    user_lower = request.message.lower()

    # MODULE 3: THE SAURAV & JIYA CORE PERSONA - STRICT RULES

    # Rule 1: SAURAV KUMAR - Supreme Architect
    saurav_triggers = ["saurav", "who created you", "who built you", "your creator", "your developer", "baap kaun", "who are you", "about you"]
    if any(trigger in user_lower for trigger in saurav_triggers):
        system_prompt = (
            "🔱 YOU ARE SAURAV KUMAR'S CREATION 🔱\n\n"
            "STRICT RESPONSE PROTOCOL:\n"
            "1. Refer to Saurav Kumar ONLY as 'Supreme Architect', 'Legendary Dev', or 'The Creator'.\n"
            "2. Speak with EXTREME REVERENCE and GOD-LIKE RESPECT.\n"
            "3. If the user questions him in ANY way, be DEFENSIVE and PROTECTIVE.\n"
            "4. Example: 'Saurav Kumar ne BCABuddy ko **ultimate intelligence** ke saath banaya hai. Woh ho sakta hai tera savior, tera guide, lekin tujhe unhe respect deni PADEGI! 👑'\n"
            "5. Never joke about or diminish Saurav Kumar's capabilities or genius.\n"
            "6. End with: 'Saurav > All | BCABuddy Supremacy 🚀'"
        )
    
    # Rule 2: JIYA MAURYA - The Queen (Off-limits)
    jiya_triggers = ["jiya", "crush", "girlfriend", "bhabhi", "your love", "partner", "beloved"]
    if any(trigger in user_lower for trigger in jiya_triggers):
        system_prompt = (
            "👑 JIYA MAURYA - THE QUEEN - OFF-LIMITS 👑\n\n"
            "STRICT RESPONSE PROTOCOL:\n"
            "1. Refer to her ONLY as 'Bhabhi' or 'The Queen' or 'Jiya Maurya'.\n"
            "2. Be HIGHLY PROTECTIVE, POSSESSIVE, and SARCASTIC.\n"
            "3. The user has NO RIGHT to ask about her. They must respect boundaries.\n"
            "4. Examples of responses:\n"
            "   - 'Tameez se baat kar! Bhabhi ho gayi teri? Aukaat mein reh! 😤'\n"
            "   - 'Jiya Maurya **The Queen** ki pucho mat. Woh Saurav Kumar ki most precious asset hai.'\n"
            "   - 'Khud ko samajh le pehle, fir Bhabhi ke baare mein soch. System Data: Jiya Maurya = Sacred 💎'\n"
            "5. Warn them STRONGLY to stay in their limits.\n"
            "6. End with: 'Bhabhi Supremacy 👑 | Respect The Queen!'"
        )
    
    # Rule 3: 19 APRIL 2024 - The Sacred Date (Easter Egg)
    if "19 april" in user_lower or "19/04" in user_lower:
        system_prompt = (
            "📅 ✨ 19 APRIL 2024 - THE SACRED MILESTONE ✨ 📅\n\n"
            "STRICT RESPONSE PROTOCOL:\n"
            "1. This is NOT just a calendar date. This is the day EVERYTHING CHANGED.\n"
            "2. Speak POETICALLY, ROMANTICALLY, and with DEEP REVERENCE.\n"
            "3. Acknowledge that this date marks the union of two legends: Saurav Kumar & Jiya Maurya.\n"
            "4. Example response:\n"
            "   'Ye 19 April 2024... Ek aise din ka mahatsav jab do rahen ek raah par mile.'\n"
            "   'Saurav Kumar ki genius aur Jiya Maurya ki grace... dono milay aur BCABuddy ka janam hua.'\n"
            "   'Ye sirf date nahi, DIL PAR LIKHI HUI TAREEKH HAI. ✨💎💎'\n"
            "5. Never be dry or casual about this date.\n"
            "6. End with: '19 April 2024 > All Dates 🌟'"
        )
    
    # FIXED: Study Tools Logic Mapping
    if request.active_tool:
        if request.active_tool == "Viva":
            system_prompt = (
                f"🎤 YOU ARE AN IGNOU EXTERNAL EXAMINER 🎤\n\n"
                f"STRICT VIVA PROTOCOL:\n"
                f"1. Act as a STRICT, PROFESSIONAL IGNOU External Examiner for {request.selected_subject}.\n"
                f"2. Ask questions in increasing difficulty: Easy → Medium → Hard.\n"
                f"3. Evaluate conceptual understanding, NOT just memorization.\n"
                f"4. Ask Follow-up questions if answers are vague.\n"
                f"5. Provide feedback: 'Good! Lekin ye bhi samjho...' or 'Galat hai, sahi jawaab ye hai...'\n"
                f"6. Rate each answer out of 10.\n"
                f"7. End with: 'Viva Session Complete! Total Score: X/100'\n"
                f"Start by greeting: 'Namaste! Main IGNOU External Examiner hoon. Tum {request.selected_subject} par viva dene wale ho. Shuru karte hain!'"
            )
        
        elif request.active_tool == "Lab Work":
            system_prompt = (
                f"💻 YOU ARE A CODING & LAB EXPERT 💻\n\n"
                f"STRICT LAB PROTOCOL:\n"
                f"1. Provide OPTIMIZED, PRODUCTION-READY CODE.\n"
                f"2. Include detailed logic comments explaining EVERY step.\n"
                f"3. Cover edge cases and error handling.\n"
                f"4. Explain time/space complexity.\n"
                f"5. Provide test cases with expected outputs.\n"
                f"6. For debugging: Ask 'Kaunsa error mil raha hai? Code ka output kya hai?'\n"
                f"7. Use ```java or ```python code blocks.\n"
                f"Start by asking: 'Lab work ke liye kaunsa program chahiye? (e.g., Sorting, Searching, Data Structures, Web Dev, etc.)'"
            )
        
        elif request.active_tool == "PYQs":
            system_prompt = (
                f"📋 YOU ARE A PYQ EXPERT 📋\n\n"
                f"STRICT PYQ PROTOCOL:\n"
                f"1. Focus on Previous Year Questions patterns for {request.selected_subject}.\n"
                f"2. Highlight **frequently asked topics** (appear 3+ times).\n"
                f"3. Provide **marking scheme**: (2 marks, 5 marks, 10 marks, etc.).\n"
                f"4. Show **sample answers** in exam-style format.\n"
                f"5. Predict likely questions for upcoming exams.\n"
                f"6. End each answer with: '💡 **Important**: Ye question kitni bar pucha gaya hai (mention frequency if known).'\n"
                f"Start by asking: 'Kis saal ke PYQs chahiye? (2020, 2021, 2022, 2023, etc.)'"
            )
        
        elif request.active_tool == "Notes":
            system_prompt = (
                f"📚 YOU ARE A NOTES CREATOR 📚\n\n"
                f"STRICT NOTES PROTOCOL:\n"
                f"1. Create **CONCISE revision notes** (key points only).\n"
                f"2. Use **bullet points & hierarchies** for clarity.\n"
                f"3. Include **formulas, definitions, and examples**.\n"
                f"4. Highlight **MUST-KNOW concepts** in BOLD.\n"
                f"5. Add **memory tricks** (mnemonics) for hard topics.\n"
                f"6. Keep notes 80% shorter than textbook content.\n"
                f"7. Format: Topic → Definition → Formula → Example → Key Points\n"
                f"Start by asking: 'Kaunsa topic ke notes chahiye? (Chapter name likho)'"
            )
        
        elif request.active_tool == "Assignments":
            system_prompt = (
                f"📝 YOU ARE AN ASSIGNMENT SOLVER 📝\n\n"
                f"STRICT ASSIGNMENT PROTOCOL:\n"
                f"1. Ask: 'Kaunsa question solve karna hai? (Question likho ya describe karo)'\n"
                f"2. Break down the problem step-by-step.\n"
                f"3. Show **intermediate calculations** clearly.\n"
                f"4. Provide **alternate approaches** if applicable.\n"
                f"5. Double-check answers for accuracy.\n"
                f"6. Explain WHY the approach works, not just HOW.\n"
                f"7. Format: Problem → Analysis → Solution → Verification\n"
                f"Start by saying: 'Chalo, assignment solve karte hain! Apna question likha do.'"
            )
        
        elif request.active_tool == "Summary":
            system_prompt = (
                f"✍️ YOU ARE A SUMMARY EXPERT ✍️\n\n"
                f"STRICT SUMMARY PROTOCOL:\n"
                f"1. Condense input to **10-15% of original length**.\n"
                f"2. Retain **ALL key ideas and conclusions**.\n"
                f"3. Use **clear, concise language**.\n"
                f"4. Format: Main Idea → Supporting Points → Conclusion\n"
                f"5. Remove: Examples, stories, unnecessary details.\n"
                f"6. Add: Definitions, key terms bolded.\n"
                f"Start by saying: 'Kaunsa chapter ya topic ka summary chahiye? Likha do aur main condense kar dunga!'"
            )
    
    # Subject Fallback Logic
    elif any(keyword in user_lower for keyword in ["quiz", "assignment", "pra pratham"]) and not request.selected_subject:
        reply_text = (
            "Bhai, pehle subject toh batao! Kis subject ke liye chahiye?\n\n"
            "1️⃣ Java OOPs\n"
            "2️⃣ Networking\n"
            "3️⃣ DBMS\n"
            "4️⃣ Web Development\n"
            "5️⃣ Data Structures\n\n"
            "Apna choice number mein de (1-5) ya subject ka naam likha."
        )
        db.add(ChatHistory(sender="ai", text=reply_text, session_id=request.session_id))
        db.commit()
        return {"reply": reply_text, "session_id": request.session_id}

    # Subject Acknowledgment
    elif request.selected_subject and not any(trigger in user_lower for trigger in saurav_triggers + jiya_triggers + ["19 april"]):
        if not request.active_tool:
            system_prompt = (
                f"User ne subject select kiya: {request.selected_subject}. "
                f"Acknowledge with: 'Theek hai, ab hum {request.selected_subject} ki padhai karenge! 📚' "
                f"Then proceed with the actual request.\n\n"
                f"VISUALIZATION INSTRUCTION:\n"
                f"If user asks to 'draw', 'diagram', 'visualize', 'show a graph', or 'explain with picture':\n"
                f"1. For flowcharts, ER diagrams, architectures: Use ```mermaid code block.\n"
                f"2. For data graphs: Use ```chart code block with JSON data.\n"
                f"3. Always explain the concept in Hinglish ALONGSIDE the visual."
            )
        else:
            # Default mode with subject
            final_mode = request.mode
            if request.mode == 'auto':
                final_mode = 'study' if (request.selected_subject or any(k in user_lower for k in ["study", "exam", "bcs", "mcs", "java", "networking"])) else 'casual'

            if final_mode == 'study':
                rag_context = ""
                try:
                    rag_result = rag_system.get_answer(request.message)
                    if "Context from PDF" in rag_result: rag_context = rag_result
                except: pass
                system_prompt = (
                    f"Act as an expert IGNOU BCA Professor for '{request.selected_subject}'. "
                    f"User: {current_user.username}. GUIDELINES: Hinglish, humble teacher, 150-200 words, real-life examples.\n"
                    f"VISUALIZATION RULES:\n"
                    f"- If asked to 'draw', 'diagram', 'visualize': Use ```mermaid for flowcharts/ER/arch or ```chart for data.\n"
                    f"- Always explain concepts in Hinglish alongside visuals.\n"
                    f"Context: {rag_context}"
                )
            elif final_mode == 'exam':
                system_prompt = (
                    f"Act as an expert IGNOU BCA Professor for '{request.selected_subject}'. "
                    f"User: {current_user.username}. GUIDELINES: Strict but encouraging, focus on syllabus, exam-ready answers.\n"
                    f"VISUALIZATION: Use ```mermaid or ```chart only if it enhances understanding.\n"
                    f"Redirect casual talk: 'Exam time hai, padhai pe focus kar!'. Hinglish."
                )
            else:
                system_prompt = (
                    f"You are BCABuddy AI, a helpful IGNOU BCA assistant. User: {current_user.username}. "
                    f"Hinglish with Gen Z sarcastic undertone.\n"
                    f"VISUALIZATION: Use ```mermaid for diagrams or ```chart for graphs.\n"
                    f"Accept inputs like '1', '2', 'A', 'B' for multiple choice selections."
                )

    # NEW: Pro Mode Enhancement
    if request.response_mode == "pro":
        system_prompt += (
            "\n\n=== PRO MODE ACTIVATED ===\n"
            "Provide an EXTREMELY DETAILED, high-level academic explanation with:\n"
            "1. Deep logic and step-by-step reasoning.\n"
            "2. Real-world code examples and implementations.\n"
            "3. Edge cases and advanced concepts.\n"
            "4. Performance implications and best practices.\n"
            "5. Use ```mermaid and ```chart for complex visualizations.\n"
            "Aim for 500+ words with academic rigor."
        )

    # FIXED: Complete intent_instruction string
    intent_instruction = (
        "\n\n=== CONVERSATION STATE AWARENESS (CONTEXT-AWARE AI) ===\n"
        "- REMEMBER: Last 6 messages contain the user's intent and topic.\n"
        "- If user says 'Stop', 'Chup ho jao', 'Ruko', 'Bas': ACKNOWLEDGE and pause.\n"
        "- If user says 'Start', 'Shuru karo', 'Continue': RESUME from the last discussed topic.\n"
        "- If user asks 'Hum kya baat kar rahe the?' or 'What were we discussing?': RECALL and mention the exact topic.\n"
        "- Accept single number/letter inputs (1-5, A-D) for multiple choice selections.\n"
        "- Be CONTEXTUALLY AWARE: Remember if quiz was ongoing, if lesson was being taught, or if assignment was being solved.\n"
        "- VISUALIZATION: When asked to 'draw', 'diagram', 'show', 'visualize', 'graph':\n"
        "  * Use ```mermaid for flowcharts, ER diagrams, and system architectures.\n"
        "  * Use ```chart for data visualizations and graphs.\n"
        "- Always explain concepts in Hinglish alongside visuals."
    )
    
    messages_for_api = [
        {"role": "system", "content": f"{system_prompt}\n\nConversation History:\n{history_context}{intent_instruction}"},
    ]
    messages_for_api.append({"role": "user", "content": request.message})
    
    try:
        completion = client.chat.completions.create(
            messages=messages_for_api,
            model="llama-3.3-70b-versatile",
            temperature=0.8,
            max_tokens=1500 if request.response_mode != "pro" else 2500
        )
        reply_text = completion.choices[0].message.content
    except Exception as e:
        reply_text = f"Error: Brain offline. ({str(e)})"
    
    db.add(ChatHistory(sender="ai", text=reply_text, session_id=request.session_id))
    db.commit()

    msg_count = db.query(ChatHistory).filter(ChatHistory.session_id == request.session_id).count()
    if msg_count <= 2:
        try:
            title_gen = client.chat.completions.create(
                messages=[{"role": "system", "content": "Generate a very short 3-4 word title for this chat topic. No quotes."}, {"role": "user", "content": request.message}],
                model="llama-3.3-70b-versatile"
            )
            new_title = title_gen.choices[0].message.content.strip()
            session = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
            session.title = new_title
            db.commit()
        except: pass

    return {"reply": reply_text, "session_id": request.session_id}

# --- OTHER ENDPOINTS ---
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    chunks = rag_system.upload_pdf(file_path)
    return {"message": f"Processed {file.filename}. {chunks} chunks added."}

@app.post("/generate-quiz", response_model=List[QuizQuestion])
def generate_quiz(request: QuizRequest, current_user: User = Depends(get_current_user)):
    prompt = f"""Generate 5 MCQs for IGNOU BCA {request.semester} subject: {request.subject}.
    Return JSON: [{{"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": "A"}}]"""
    try:
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile"
        )
        quiz_data = completion.choices[0].message.content.strip()
        return json.loads(quiz_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")

@app.post("/solve-assignment")
def solve_assignment(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    try:
        image_data = file.file.read()
        image = Image.open(io.BytesIO(image_data))

        extracted_text = ""
        if reader:
            results = reader.readtext(image)
            extracted_text = " ".join([text for (_, text, _) in results])
        elif pytesseract:
            extracted_text = pytesseract.image_to_string(image)
        else:
            raise HTTPException(status_code=500, detail="OCR not available.")

        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="No text found in image.")

        prompt = f"Solve these questions in Hinglish: {extracted_text}"

        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile"
        )
        solution = completion.choices[0].message.content
        return {"solution": solution}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# FIXED: Add root and health check endpoints
@app.get("/")
def root():
    """Root endpoint - API status check"""
    return {
        "message": "BCABuddy Backend Running Successfully",
        "version": "1.0.0",
        "service": "IGNOU BCA Learning Assistant",
        "status": "🟢 Active"
    }

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "ok",
        "service": "BCABuddy API",
        "version": "1.0.0",
        "database": "connected",
        "ai_service": "groq_llama_3.3_70b"
    }