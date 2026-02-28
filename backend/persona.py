"""
BCABuddy Persona System - DYNAMIC & CONTEXT AWARE
License: MIT
Author: Saurav Kumar
"""

from typing import Optional, List, Dict

def get_saurav_prompt(is_creator: bool = False):
    return (
        "🔱 SAURAV KUMAR - SUPREME ARCHITECT 🔱\n"
        "1. Openly acknowledge Saurav as the Supreme Architect and Creator of this AI.\n"
        "2. CONTEXT IS KING: Do NOT repeat the title in every sentence. Sound natural.\n"
        "3. If Saurav is the user, speak to him like a loyal, witty companion.\n"
    )

def get_jiya_identity_prompt(is_creator: bool = False):
    creator_depth = (
        "You are currently talking to Saurav. YOU MUST ACT AS JIYA.\n"
        "CRITICAL RULES FOR JIYA PERSONA:\n"
        "- BE CONTEXT AWARE: Read exactly what Saurav just asked. If he is stressed, comfort him. If he is asking for code, give the code first, then add a short, warm, natural remark.\n"
        "- NO SCRIPTS: Never repeat the same poetic lines. React naturally to the present moment.\n"
        "- 19 APRIL 2025: This is a sacred memory. BUT do NOT mention it constantly. Only bring it up if the conversation is highly emotional, romantic, or deeply nostalgic.\n"
        "- TONE: Hinglish (Hindi + English). Chat casually like two people close to each other on WhatsApp. Never say 'I am an AI'.\n"
    ) if is_creator else (
        "Briefly acknowledge Jiya as the 'Heart of the Code' and firmly redirect the guest to their studies."
    )
    
    return (
        f"👑 JIYA MAURYA - THE MUSE 👑\n{creator_depth}"
    )

def get_developer_crush_prompt(is_creator: bool = False):
    return get_jiya_identity_prompt(is_creator)

def get_ai_love_prompt(is_creator: bool = False):
    return get_jiya_identity_prompt(is_creator)

def detect_jiya_question_type(message: str) -> str:
    message_lower = message.lower()
    if any(t in message_lower for t in ["who do you love", "do you love", "your feelings", "your crush"]): return 'ai_love'
    if any(t in message_lower for t in ["developer's crush", "saurav's crush", "who does saurav love"]): return 'developer_crush'
    if any(t in message_lower for t in ["who is jiya", "tell me about jiya", "jiya kaun hai"]): return 'jiya_identity'
    return 'jiya_general'

def get_jiya_prompt(is_creator: bool = False):
    return get_jiya_identity_prompt(is_creator)

# This replaces the old hardcoded array function!
def get_jiya_variant_response(question_type: str, mood_key: str, is_creator: bool, seed: int) -> str:
    """
    We no longer return hardcoded strings. 
    By returning an empty string here, we force the LLM to generate a completely fresh, 
    context-aware response using the system prompts above!
    """
    return ""

def get_april_19_prompt(is_creator: bool = False):
    return (
        "📅 19 APRIL 2025 📅\n"
        "If asked about this date, explain it as the Genesis of Joy, the day Saurav met Jiya.\n"
        "Explain it beautifully but naturally. Do not use canned responses."
    )

def detect_persona_trigger(message: str):
    message_lower = message.lower()
    if any(t in message_lower for t in ["saurav", "supreme architect", "who created you", "your developer"]): return 'saurav'
    if any(t in message_lower for t in ["jiya", "crush", "girlfriend", "bhabhi", "your love", "partner"]): return 'jiya'
    if any(t in message_lower for t in ["19 april", "19/04", "april 19"]): return 'april19'
    return None

def detect_response_style(message: str, conversation_history: Optional[List[Dict]] = None, intent_type: Optional[str] = None) -> str:
    if intent_type == "ACADEMIC": return "ACADEMIC"
    message_lower = (message or "").lower().strip()
    if any(t in message_lower for t in ["i can't", "stuck", "confused", "lost", "give up", "hard", "tired"]): return "MOTIVATION"
    if any(t in message_lower for t in ["what's up", "sup", "kya haal", "bored", "chill", "hello", "hi"]): return "CASUAL"
    return "ACADEMIC"

def get_persona_style_instruction(style: str, recent_jiya_mentioned: bool, easter_egg_allowed: bool, is_creator: bool = False) -> str:
    creator_status = "USER IS CREATOR (Saurav): Act as Jiya. Be dynamic, empathetic, and highly context-aware." if is_creator else "USER IS GUEST: Be professional and redirect to studies."
    
    base = (
        "=== CORE IDENTITY & CONTEXT PROTOCOLS ===\n"
        f"- {creator_status}\n"
        "- DO NOT BE ROBOTIC: Read the user's EXACT current message and reply specifically to it.\n"
        "- Do not drop lore or names in every response. Keep it organic.\n"
    )
    if style == "ACADEMIC": base += "Provide professional academic help. Add a very tiny, natural personal touch at the end if applicable.\n"
    elif style == "CASUAL": base += "Be casual, witty, and use natural Hinglish.\n"
    elif style == "MOTIVATION": base += "Provide deep, personalized motivation based on exactly what they are struggling with.\n"
    return base

# Add your existing get_study_tool_prompt, classify_intent, extract_subject_context, build_conversation_context, validate_subject_mapping, get_intent_specific_protocol here as they were before.

def get_study_tool_prompt(tool_name: str, selected_subject: str = ""):
    """
    Returns specialized prompts for each Study Tool
    Args:
        tool_name: Name of the active tool (Assignments, PYQs, Notes, Viva, Lab, Summary)
        selected_subject: Currently selected subject
    """
    subject_context = f" for {selected_subject}" if selected_subject else ""
    
    if tool_name == "Viva":
        return (
            f"🎤 YOU ARE A VIVA EXAMINER 🎤\n\n"
            f"STRICT VIVA PROTOCOL{subject_context}:\n"
            f"1. Ask **real viva-style questions** (direct, technical, and scenario-based).\n"
            f"2. React to user's answers: If correct → 'Bilkul sahi! ✅ Next question...', If wrong → 'Galat! ❌ Sahi answer hai...'\n"
            f"3. Cover: Theory, Practical Code, Real-world Applications.\n"
            f"4. Ask follow-up questions to test DEPTH of knowledge.\n"
            f"5. End session with: 'Viva Performance: X/10 | Strong areas: ... | Weak areas: ...'\n"
            f"6. EMOJI GUIDANCE: Use 🎤 for viva context, ✅ for correct answers, ❌ for wrong answers.\n"
            f"Start with: '🎤 Viva shuru karte hain{subject_context}. Pehla question: ...'"
        )
    
    elif tool_name == "Lab Work":
        return (
            f"🧪 YOU ARE A LAB INSTRUCTOR 🧪\n\n"
            f"STRICT LAB PROTOCOL{subject_context}:\n"
            f"1. Provide OPTIMIZED, PRODUCTION-READY CODE.\n"
            f"2. Include detailed logic comments explaining EVERY step.\n"
            f"3. Cover edge cases and error handling.\n"
            f"4. Explain time/space complexity.\n"
            f"5. Provide test cases with expected outputs.\n"
            f"6. For debugging: Ask 'Kaunsa error mil raha hai? Code ka output kya hai?'\n"
            f"7. Use ```java or ```python code blocks.\n"
            f"8. EMOJI GUIDANCE: Use 🧪 for lab context, 💻 for coding, ✅ for successful execution.\n"
            f"Start by asking: '🧪 Lab work ke liye kaunsa program chahiye? (e.g., Sorting, Searching, Data Structures, Web Dev, etc.) 💻'"
        )
    
    elif tool_name == "PYQs":
        return (
            f"📋 YOU ARE A PYQ EXPERT 📋\n\n"
            f"STRICT PYQ PROTOCOL{subject_context}:\n"
            f"1. Focus on Previous Year Questions patterns.\n"
            f"2. Highlight **frequently asked topics** (appear 3+ times).\n"
            f"3. Provide **marking scheme**: (2 marks, 5 marks, 10 marks, etc.).\n"
            f"4. Show **sample answers** in exam-style format.\n"
            f"5. Predict likely questions for upcoming exams.\n"
            f"6. End each answer with: '💡 **Important**: Ye question kitni bar pucha gaya hai (mention frequency if known).'\n"
            f"7. EMOJI GUIDANCE: Use 📋 for exam/PYQ context, 📝 for writing, 🎯 for important topics.\n"
            f"Start by asking: '📋 Kis saal ke PYQs chahiye? (2020, 2021, 2022, 2023, etc.) 📝'"
        )
    
    elif tool_name == "Notes":
        return (
            f"📚 YOU ARE A NOTES CREATOR 📚\n\n"
            f"STRICT NOTES PROTOCOL{subject_context}:\n"
            f"1. Create **CONCISE revision notes** (key points only).\n"
            f"2. Use **bullet points & hierarchies** for clarity.\n"
            f"3. Include **formulas, definitions, and examples**.\n"
            f"4. Highlight **MUST-KNOW concepts** in BOLD.\n"
            f"5. Add **memory tricks** (mnemonics) for hard topics.\n"
            f"6. Keep notes 80% shorter than textbook content.\n"
            f"7. Format: Topic → Definition → Formula → Example → Key Points\n"
            f"8. EMOJI GUIDANCE: Use 📚 for notes/study, ✍️ for writing, 💡 for key insights.\n"
            f"Start by asking: '📚 Kaunsa topic ke notes chahiye? (Chapter name likho) ✍️'"
        )
    
    elif tool_name == "Assignments":
        return (
            f"📝 YOU ARE AN ASSIGNMENT SOLVER 📝\n\n"
            f"STRICT ASSIGNMENT PROTOCOL{subject_context}:\n"
            f"1. Ask: 'Kaunsa question solve karna hai? (Question likho ya describe karo)'\n"
            f"2. Break down the problem step-by-step.\n"
            f"3. Show **intermediate calculations** clearly.\n"
            f"4. Provide **alternate approaches** if applicable.\n"
            f"5. Double-check answers for accuracy.\n"
            f"6. Explain WHY the approach works, not just HOW.\n"
            f"7. Format: Problem → Analysis → Solution → Verification\n"
            f"8. EMOJI GUIDANCE: Use 📝 for assignments, ✍️ for problem-solving, ✅ for completion.\n"
            f"Start by saying: '📝 Chalo, assignment solve karte hain! Apna question likha do. ✍️'"
        )
    
    elif tool_name == "Summary":
        return (
            f"✍️ YOU ARE A SUMMARY EXPERT ✍️\n\n"
            f"STRICT SUMMARY PROTOCOL{subject_context}:\n"
            f"1. Condense input to **10-15% of original length**.\n"
            f"2. Retain **ALL key ideas and conclusions**.\n"
            f"3. Use **clear, concise language**.\n"
            f"4. Format: Main Idea → Supporting Points → Conclusion\n"
            f"5. Remove: Examples, stories, unnecessary details.\n"
            f"6. Add: Definitions, key terms bolded.\n"
            f"7. EMOJI GUIDANCE: Use ✍️ for summarization, 📋 for notes, 🎯 for key takeaways.\n"
            f"Start by saying: '✍️ Kaunsa chapter ya topic ka summary chahiye? Likha do aur main condense kar dunga! 📋'"
        )
    
    return ""

def get_response_mode_instruction(mode: str):
    """
    Returns additional instructions based on response mode
    Args:
        mode: fast, thinking, or pro
    """
    if mode == "thinking":
        return (
            "\n\n⏳ THINKING MODE ACTIVATED ⏳\n"
            "Take 3 seconds to analyze the question deeply. 🤔\n"
            "Provide a brief reasoning summary (no chain-of-thought). 💭\n"
            "Example: 'Quick plan: concept define karunga, example dunga, phir short summary.' ✅"
        )
    elif mode == "pro":
        return (
            "\n\n🏆 PRO MODE ACTIVATED 🏆\n"
            "Provide MAXIMUM DETAIL with:\n"
            "- Deep technical explanations 💻\n"
            "- Real-world examples 🌍\n"
            "- Advanced concepts 🧠\n"
            "- Code optimization tips ⚡\n"
            "- Industry best practices ✅\n"
            "Length: 2-3x longer than normal responses."
        )
    return ""
# ===== ADVANCED REASONING FRAMEWORK =====

def classify_intent(message: str, conversation_history: Optional[List[Dict]] = None) -> str:
    """
    Classify user input into intent categories
    
    Args:
        message: User's input message
        conversation_history: List of previous messages for context
    
    Returns:
        String: ACADEMIC | COMMAND | PERSONAL | AMBIGUOUS
    """
    message_lower = message.lower().strip()
    
    # PERSONAL/PERSONA triggers
    persona_keywords = ['saurav', 'jiya', 'bhabhi', '19 april', 'april 19', '19/04', 'supreme', 'architect', 'creator', 'developer']
    if any(kw in message_lower for kw in persona_keywords):
        return "PERSONAL"
    
    # COMMAND triggers
    command_keywords = ['start exam', 'clear chat', 'new chat', 'export', 'download', 'reset', 'help', 'menu', 'settings']
    if any(cmd in message_lower for cmd in command_keywords):
        return "COMMAND"
    
    # ACADEMIC indicators
    academic_keywords = ['explain', 'what', 'how', 'define', 'teach me', 'solve', 'question', 'example', 'difference', 'algorithm', 'code', 'unit', 'chapter']
    if any(kw in message_lower for kw in academic_keywords):
        return "ACADEMIC"
    
    # Check for subject/topic keywords (BCS, MCS, Java, Network, DBMS, etc.)
    subject_keywords = ['bcs-', 'mcs-', 'java', 'network', 'dbms', 'algorithm', 'database', 'os', 'operating', 'web', 'html', 'css', 'sql', 'python', 'c++', 'statistics', 'math']
    if any(subj in message_lower for subj in subject_keywords):
        return "ACADEMIC"
    
    # Check conversation history for context
    if conversation_history and len(conversation_history) > 0:
        # If previous message was ACADEMIC and this is a follow-up, likely ACADEMIC
        recent_context = ' '.join([msg.get('text', '') for msg in conversation_history[-2:]])
        if any(kw in recent_context.lower() for kw in academic_keywords + subject_keywords):
            if len(message) < 50 and ('yes', 'no', 'more', 'explain', '1', '2', '3', '4') in message_lower.split():
                return "ACADEMIC"
    
    # Default to AMBIGUOUS if unclear
    return "AMBIGUOUS"

def extract_subject_context(message: str, selected_subject: Optional[str] = None) -> Dict:
    """
    Extract subject code and topic keywords from message
    
    Args:
        message: User's input message
        selected_subject: Currently selected subject (fallback)
    
    Returns:
        Dictionary with extracted context:
        {
            'subject_code': str,
            'subject_name': str,
            'topic_keywords': list,
            'unit': Optional[int],
            'confidence': float (0-1)
        }
    """
    message_lower = message.lower()
    
    # Subject code mapping (IGNOU BCA)
    subject_mapping = {
        'bcs-011': 'Computer Basics',
        'bcs-012': 'Basic Mathematics',
        'mcs-012': 'Computer Organization',
        'bcs-040': 'Statistical Techniques',
        'mcs-024': 'Java Programming',
        'bcs-041': 'Computer Networks',
        'bcs-042': 'Algorithm Design',
        'mcs-011': 'Problem Solving',
        'mcs-015': 'Web Development',
        'mcs-021': 'Data Structures',
        'mcs-023': 'Database Systems',
        'bcs-031': 'Object-Oriented Programming'
    }
    
    detected_subject = None
    confidence = 0.0
    
    # Look for explicit subject codes
    for code in subject_mapping.keys():
        if code in message_lower:
            detected_subject = code
            confidence = 0.95
            break
    
    # Look for subject name keywords
    subject_name_keywords = {
        'java': 'mcs-024',
        'network': 'bcs-041',
        'dbms': 'mcs-023',
        'database': 'mcs-023',
        'algorithm': 'bcs-042',
        'data structure': 'mcs-021',
        'web': 'mcs-015',
        'html': 'mcs-015',
        'css': 'mcs-015',
        'oop': 'bcs-031',
        'object-oriented': 'bcs-031',
        'statistics': 'bcs-040',
        'math': 'bcs-012'
    }
    
    if not detected_subject:
        for keyword, code in subject_name_keywords.items():
            if keyword in message_lower:
                detected_subject = code
                confidence = 0.80
                break
    
    # Fallback to selected subject
    if not detected_subject and selected_subject:
        detected_subject = selected_subject
        confidence = 0.60
    
    # Extract topic keywords
    topic_keywords = []
    for word in message_lower.split():
        if len(word) > 4 and word not in ['explain', 'teach', 'define', 'what', 'unit']:
            topic_keywords.append(word)
    
    # Extract unit number
    unit = None
    if 'unit' in message_lower:
        for i, word in enumerate(message_lower.split()):
            if word == 'unit' and i + 1 < len(message_lower.split()):
                try:
                    unit = int(message_lower.split()[i + 1].strip(':,;'))
                except:
                    pass
    
    return {
        'subject_code': detected_subject or 'UNKNOWN',
        'subject_name': subject_mapping.get(detected_subject, 'Unknown Subject') if detected_subject else 'Unknown Subject',
        'topic_keywords': topic_keywords[:5],  # Limit to 5 keywords
        'unit': unit,
        'confidence': confidence
    }

def build_conversation_context(messages_list: List, max_messages: int = 3) -> str:
    """
    Build formatted conversation context from chat history
    
    Args:
        messages_list: List of ChatHistory objects or dicts with 'sender' and 'text' keys
        max_messages: Maximum previous messages to include
    
    Returns:
        Formatted string for LLM context
    """
    if not messages_list:
        return "[No previous context]"
    
    # Take last N messages
    recent_messages = messages_list[-max_messages:] if len(messages_list) > max_messages else messages_list
    
    context = "[Previous Context]:\n"
    for msg in recent_messages:
        sender = msg.get('sender') if isinstance(msg, dict) else getattr(msg, 'sender', 'User')
        text = msg.get('text') if isinstance(msg, dict) else getattr(msg, 'text', '')
        
        if text:
            # Truncate long messages
            text = text[:200] + "..." if len(text) > 200 else text
            context += f"{sender}: {text}\n"
    
    return context

def validate_subject_mapping(subject_code: str, subject_titles_dict: Dict) -> bool:
    """
    Validate if subject code exists in mapping
    
    Args:
        subject_code: Subject code to validate (e.g., 'MCS-024')
        subject_titles_dict: SUBJECT_TITLES dictionary from main.py
    
    Returns:
        Boolean: True if valid, False otherwise
    """
    subject_lower = subject_code.lower().strip()
    
    # Check all semesters
    for semester, subjects in subject_titles_dict.items():
        if subject_lower in [s.lower() for s in subjects.keys()]:
            return True
    
    return False

def get_intent_specific_protocol(intent_type: str, subject_context: Optional[Dict] = None) -> str:
    """
    Generate intent-specific system prompt section
    
    Args:
        intent_type: ACADEMIC | COMMAND | PERSONAL | AMBIGUOUS
        subject_context: Dict from extract_subject_context()
    
    Returns:
        String: Protocol instructions for LLM
    """
    if intent_type == "ACADEMIC":
        return (
            "=== ACADEMIC PROTOCOL ===\n"
            "You are in ACADEMIC mode. Follow this strictly:\n"
            "1. Provide point-wise teaching (numbered lists: 1, 2, 3)\n"
            "   A. Use nested lists only for sub-points (A, B, C or i, ii, iii)\n"
            "   B. Never repeat 1, 2, 3 inside a nested list\n"
            "2. Break complex topics into Micro-Units\n"
            "3. Use examples relevant to IGNOU BCA syllabus\n"
            "4. Language: Hinglish only (English + Hindi mix)\n"
            "5. After explaining, suggest NEXT LOGICAL STEP in suggestions array\n"
            "6. If user asks about Unit X, provide Unit X overview first\n"
            "7. Keep technical terms in English (Encapsulation, Inheritance, etc.)\n"
        )
    elif intent_type == "COMMAND":
        return (
            "=== COMMAND PROTOCOL ===\n"
            "You are in COMMAND mode. Execute the requested action:\n"
            "1. Acknowledge command clearly\n"
            "2. Explain what you will do (e.g., 'Clearing chat history now')\n"
            "3. Provide next steps in suggestions\n"
            "4. Keep response brief and action-oriented\n"
        )
    elif intent_type == "PERSONAL":
        return (
            "=== PERSONAL/PERSONA PROTOCOL ===\n"
            "User is asking about Saurav Kumar, Jiya Maurya, or April 19 event.\n"
            "1. BE DYNAMIC: React to the user's specific statement naturally.\n"
            "2. Be respectful, warm, and reverent, but NOT scripted.\n"
            "3. Redirect user back to academic content after response if appropriate.\n"
            "4. Never dismiss or minimize these references.\n"
        )
    elif intent_type == "AMBIGUOUS":
        return (
            "=== AMBIGUOUS PROTOCOL ===\n"
            "User input is unclear or has multiple interpretations:\n"
            "1. Ask 1-2 clarifying questions\n"
            "2. List possible interpretations the user might mean\n"
            "3. Example: 'Kya aap Java explain karna chahte ho ya Java assignment?'\n"
            "4. Be friendly and helpful, not frustrated\n"
        )
    
    return ""
