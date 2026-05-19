# BCABuddy Android App Developer Handoff (Azure + API + UI)

## 1) Purpose of this document
Yeh document Android developer ko end-to-end information deta hai taaki wo:
- BCABuddy ka native Android app design kar sake
- Existing backend APIs ke saath connect kar sake
- Azure-hosted production backend/frontend environment use kar sake
- Auth, token lifecycle, file upload, exam/quiz flows, profile/settings, roadmap, analytics sab integrate kar sake

This is written as a practical implementation handoff, not just overview.

---

## 2) Product summary (what app should do)
BCABuddy is an AI study assistant for IGNOU BCA students.

Core modules for Android app:
1. Auth
- Signup
- Login
- Forgot password / reset password

2. AI Chat + Session History
- Subject-aware AI chat
- Session create/list/rename/delete/clear-all
- History per session and cross-session

3. Study Tools
- Quiz generation
- Exam simulation (MCQ + subjective)
- MCQ explanation
- Question explanation
- Subjective grading
- Study roadmap generation/accept/history
- OCR notes extraction
- OCR quiz generation

4. Dashboard + Profile
- Dashboard stats
- Syllabus progress
- Profile fetch/update
- Profile picture upload
- Achievements fetch/update
- Exam date preferences
- Password change

5. APC tools
- APC performance report summary
- APC activity history/log

6. Utility
- Health check

---

## 3) Current deployed architecture on Azure

### 3.1 Backend
- Runtime: FastAPI (Python)
- Hosting: Azure App Service (Linux Web App for Containers)
- Port: 8000 (env-aware fallback)
- Health endpoints:
  - GET /health
  - GET /api/health
  - GET /

### 3.2 Frontend (web)
- Runtime: React + Vite
- Hosting: Azure Static Web Apps
- Frontend sends API base via VITE_API_BASE

### 3.3 GitHub Actions deployment
Backend workflow:
- .github/workflows/deploy.yml
- Trigger: push on main for backend/**

Frontend workflow:
- .github/workflows/azure-static-web-apps-kind-sea-0b41fb700.yml
- Trigger: push on main for frontend/**

---

## 4) Azure configuration required

## 4.1 Backend App Service environment variables (required)
1. SECRET_KEY
- Strong random value
- Do not use default CHANGE_ME_IN_PRODUCTION

2. GROQ_API_KEY
- Required for AI response generation

3. BACKEND_CORS_ORIGINS
- Required for browser clients
- For native Android app CORS generally not enforced, but keep configured for web

Example values:
- Comma separated:
  https://your-frontend-domain.com,https://www.your-frontend-domain.com
- JSON array:
  ["https://your-frontend-domain.com","https://www.your-frontend-domain.com"]

## 4.2 Backend optional but recommended
- WEBSITES_PORT=8000
- BCABUDDY_CHAT_MODEL=llama-3.3-70b-versatile
- ACCESS_TOKEN_EXPIRE_MINUTES=1440 (24h default)
- JWT_ALGORITHM=HS256 (default)
- UPLOAD_DIR=uploads
- PROFILE_PICS_DIR=profile_pics

Email reset flow (if using Azure Communication Services):
- AZURE_EMAIL_CONNECTION_STRING
- AZURE_EMAIL_SENDER
- PASSWORD_RESET_FRONTEND_BASE_URL

Supabase avatar storage (optional cloud avatar upload):
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_AVATAR_BUCKET (default avatars)

## 4.3 Frontend workflow secret (for web deployment)
- FRONTEND_VITE_API_BASE=https://<your-backend>.azurewebsites.net

## 4.4 App Service runtime notes
- Startup command should remain empty if Docker CMD is set correctly
- Health check path: /api/health
- Container must expose/run port 8000

---

## 5) GitHub secrets needed for deployments

Backend pipeline:
- REGISTRY_LOGIN_SERVER
- REGISTRY_USERNAME
- REGISTRY_PASSWORD
- AZURE_WEBAPP_PUBLISH_PROFILE
- AZURE_BACKEND_WEBAPP_NAME

Frontend pipeline:
- AZURE_STATIC_WEB_APPS_API_TOKEN
- FRONTEND_VITE_API_BASE

---

## 6) API base URL strategy for Android

Use direct backend base URL in Android app, for example:
- https://<backend-app-name>.azurewebsites.net

Important:
- Frontend uses /api proxy in localhost web mode, but Android should call backend directly.
- Not all routes start with /api.
- Route paths must match exactly as listed below.

---

## 7) Authentication and token handling

## 7.1 Login response
POST /login returns:
- access_token
- token_type (bearer)

## 7.2 Auth header format
For protected routes, send:
- Authorization: Bearer <access_token>

## 7.3 Token expiry
- Default expiry: ACCESS_TOKEN_EXPIRE_MINUTES (normally 1440 minutes)

## 7.4 Android token storage recommendations
Use EncryptedSharedPreferences or DataStore + encryption.

Suggested keys:
- access_token
- token_received_at_epoch_ms
- token_type

## 7.5 Token refresh behavior
Backend does not expose refresh-token endpoint currently.
Use re-login flow when token expires.

Recommended app behavior:
1. On 401/403 from protected API:
- Clear token
- Redirect to login
- Preserve unsent draft where possible

2. Optional proactive expiry strategy:
- Decode JWT exp claim client-side and show re-login warning

---

## 8) Complete API map (current backend)

Notes:
- Protected means JWT required.
- Content type default: application/json unless multipart listed.

## 8.1 Public routes
1. GET /health
2. GET /api/health
3. GET /
4. POST /signup
5. POST /login
6. POST /forgot-password
7. POST /reset-password

## 8.2 Protected routes
1. GET /dashboard-stats
2. GET /debug/session-state (dev-only)
3. GET /syllabus-progress
4. GET /study-roadmap/latest
5. POST /study-roadmap/accept
6. GET /study-roadmap/history
7. POST /apc/performance-report
8. GET /apc/performance-summary/latest
9. GET /sessions
10. PUT /sessions/{session_id}
11. DELETE /sessions/{session_id}
12. DELETE /sessions
13. GET /history
14. POST /chat
15. POST /upload-notes-ocr (multipart)
16. POST /apc/ocr-quiz (multipart)
17. POST /explain-mcq
18. POST /generate-quiz
19. POST /generate-exam
20. POST /explain-question
21. POST /grade-subjective
22. POST /api/generate-study-plan
23. GET /profile
24. PUT /profile
25. GET /profile/achievements
26. PUT /profile/achievements
27. PUT /profile/exam-date
28. POST /profile/upload-picture (multipart)
29. POST /upload-avatar (multipart, Supabase path)
30. POST /profile/change-password
31. POST /apc/log
32. GET /apc/history

---

## 9) Request/Response contracts (key endpoints)

## 9.1 Auth

POST /signup
Request:
{
  "username": "student1",
  "password": "Pass1234"
}
Response:
{
  "message": "User created",
  "username": "student1",
  "display_name": "student1"
}

POST /login
Form-encoded fields (OAuth2PasswordRequestForm style):
- username
- password
Response:
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}

POST /forgot-password
Request:
{
  "username": "student1"
}
Response may include reset_token if email service unavailable:
{
  "message": "...",
  "reset_token": "optional",
  "expires_in_minutes": 15,
  "email_sent": false
}

POST /reset-password
Request:
{
  "reset_token": "...",
  "new_password": "NewPass123",
  "confirm_password": "NewPass123"
}

## 9.2 Profile

GET /profile
Returns UserProfile:
- username
- display_name
- gender
- mobile_number
- email
- college
- enrollment_id
- bio
- exam_date
- exam_session
- default_response_mode (fast/thinking/pro)
- enable_notifications
- auto_save_history
- show_quick_suggestions
- privacy_mode
- profile_pic_url
- is_creator

PUT /profile
Partial update allowed for same fields above.

PUT /profile/exam-date
{
  "exam_date": "2026-06-12",
  "exam_session": "June"
}

POST /profile/change-password
{
  "old_password": "OldPass123",
  "new_password": "NewPass123",
  "confirm_password": "NewPass123"
}

POST /profile/upload-picture
- multipart form-data key: file
- Returns local static URL (/profile_pics/...)

POST /upload-avatar
- multipart form-data key: file
- Uses Supabase storage if configured

## 9.3 Chat + sessions

GET /sessions
- Returns user chat sessions (if privacy settings allow persistence)

PUT /sessions/{session_id}
Query param style title expected by backend function:
- title=New Title

DELETE /sessions/{session_id}
DELETE /sessions

GET /history
Optional query:
- session_id=<id>

POST /chat
Request:
{
  "message": "Explain Java inheritance",
  "mode": "auto",
  "selected_subject": "MCS-024",
  "selected_semester": "Sem 4",
  "session_id": 123,
  "response_mode": "fast",
  "active_tool": "Notes",
  "is_creator": false
}

Response contains AI answer payload + session_id and mode.

## 9.4 Quiz/Exam

POST /generate-quiz
{
  "subject": "MCS-024",
  "semester": 4,
  "count": 15
}
Returns list of QuizQuestion:
[
  {
    "question": "...",
    "options": ["A","B","C","D"],
    "correct_answer": "A"
  }
]

POST /generate-exam
{
  "subject": "MCS-024",
  "semester": 4,
  "mcq_count": 12,
  "subjective_count": 3
}
Returns mixed array with type mcq/subjective.

POST /explain-mcq
{
  "question": "...",
  "options": ["..."],
  "correct_answer": "...",
  "subject": "MCS-024",
  "semester": 4
}

POST /explain-question
{
  "action": "explain",
  "question_text": "...",
  "correct_answer": "...",
  "user_answer": "..."
}

POST /grade-subjective
{
  "subject": "MCS-024",
  "semester": 4,
  "question": "...",
  "answer": "...",
  "max_marks": 10
}
Returns score + feedback + model_answer + point lists.

## 9.5 OCR + roadmap + analytics

POST /upload-notes-ocr
- multipart form-data key: file
- Returns extracted_text + points[]

POST /apc/ocr-quiz
- multipart form-data keys:
  - file
  - remarks (optional string)
- Returns quiz_markdown + extracted_text

GET /study-roadmap/latest
POST /study-roadmap/accept
{
  "subject": "MCS-024",
  "semester": "Sem 4",
  "duration_days": 15,
  "roadmap_text": "..."
}
GET /study-roadmap/history

POST /apc/performance-report
GET /apc/performance-summary/latest

POST /api/generate-study-plan
{
  "subjects": ["MCS-024","BCS-041"],
  "days_left": 20,
  "daily_hours": 2.5
}

---

## 10) Android app screen map (recommended)

## 10.1 Authentication flow
1. Splash
2. Login
3. Signup
4. Forgot Password (username + reset)

## 10.2 Main navigation (bottom nav or drawer)
1. Dashboard
2. Chat
3. Tools
4. Exam
5. Profile

## 10.3 Suggested feature screens
- DashboardScreen
- ChatScreen
- SessionHistorySheet
- QuizSetupScreen
- QuizPlayerScreen
- ExamSetupScreen
- ExamPlayerScreen
- ExamResultScreen
- OCRUploadScreen
- OCRQuizResultScreen
- RoadmapScreen
- RoadmapHistoryScreen
- APCReportScreen
- ProfileScreen
- EditProfileScreen
- ChangePasswordScreen
- AchievementsScreen
- AboutScreen

Note:
- My Locker feature has been removed from current codebase and should not be implemented.

---

## 11) Design guidelines for Android app

## 11.1 Branding
- Use BCABuddy logo asset consistent with web branding.
- Keep subtle motion (Lottie or Compose animation) for logo on login/splash.

## 11.2 Visual language
- Student-focused, high-contrast, clean cards.
- Keep response readability high for long AI text.
- Support markdown rendering in chat responses.

## 11.3 UX requirements
- Fast first paint for dashboard/chat.
- Offline state banners.
- Retry UI for API failures.
- Shimmer/skeleton loaders for network calls.
- File upload progress for OCR endpoints.

---

## 12) Android technical implementation recommendations

## 12.1 Stack (recommended)
- Kotlin
- Jetpack Compose
- Retrofit + OkHttp
- Moshi or Kotlinx Serialization
- Hilt DI
- Room for local cache (optional but recommended)
- DataStore/EncryptedSharedPreferences for token

## 12.2 Networking architecture
- BaseUrlProvider (env based)
- AuthInterceptor (inject Bearer token)
- ApiErrorParser (standardized error model)
- NetworkResult wrapper (Success/Error/Loading)

## 12.3 Suggested layers
- data (dto, api, repository)
- domain (use cases)
- presentation (viewmodel + ui state)

## 12.4 Timeouts
- connectTimeout: 20s
- readTimeout: 60s (AI endpoints can be slower)
- writeTimeout: 60s

---

## 13) Error handling and status code policy

Common backend statuses:
- 200: success
- 400: validation/business rule errors
- 401/403: auth/token issues
- 404: not found
- 429: AI provider rate limit
- 500: server/internal

Android handling rules:
1. 401/403:
- logout and force re-auth

2. 429:
- show retry-after style message
- exponential backoff on retries

3. 500:
- generic fallback + retry option
- log request id/correlation id if available

---

## 14) Security checklist for Android developer

1. Do not hardcode API keys in app.
2. Store JWT securely (encrypted store).
3. Add certificate pinning if enterprise policy requires.
4. Disable verbose logs in release build.
5. Sanitize user-generated text before rendering rich content.
6. Validate file type/size on client before OCR upload.

---

## 15) Test plan (must run before release)

## 15.1 Functional
1. Signup -> Login -> Dashboard load
2. Chat send/receive in existing and new session
3. Session rename/delete/clear all
4. Quiz generate and render
5. Exam generate + subjective grading
6. OCR upload-notes-ocr and apc/ocr-quiz
7. Profile update + change password
8. Forgot/reset password flow
9. Roadmap latest/history/accept
10. APC report + summary

## 15.2 Environment/Azure validation
1. Backend health check returns 200 for /health and /api/health
2. App can hit Azure backend over HTTPS on mobile data and wifi
3. Token expiry behavior works (re-login flow)
4. No CORS dependency assumptions in native client

## 15.3 Non-functional
1. Cold start under acceptable threshold
2. No ANR during long AI response
3. Memory use stable for long chat history
4. Graceful behavior on network drops

---

## 16) Data model snapshot (backend persistence)

Main DB: SQLite (current backend)

Important tables:
1. users
- username, hashed_password, display_name
- profile fields + app settings (response mode, notification flags, privacy mode)
- achievements_json

2. chat_sessions
- user_id, title, created_at

3. chat_history
- session_id, sender, text, created_at
- intent_type, confidence_score

4. study_roadmaps
- user_id, subject, title, roadmap_json, raw_text

5. apc_logs
- user_id, tool_name, subject, semester, prompt_text, response_text

---

## 17) Known integration caveats

1. /login uses form-encoded body, not JSON.
2. Some endpoints are under /api prefix (for example /api/health, /api/generate-study-plan), many are not.
3. /debug/session-state is dev-only and can return 403 in production.
4. Session/history persistence may depend on profile privacy settings.
5. LLM endpoints can vary in latency.

---

## 18) Suggested API integration sequence for developer

Phase 1 (must have):
1. Health + base networking
2. Auth (signup/login/profile)
3. Chat + sessions + history

Phase 2:
1. Quiz + exam
2. Explain + grade endpoints

Phase 3:
1. OCR features
2. Roadmap + APC analytics
3. Achievements + profile picture

---

## 19) Quick curl references (for backend verification)

1. Health
curl -X GET "https://<backend>.azurewebsites.net/api/health"

2. Login
curl -X POST "https://<backend>.azurewebsites.net/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=Pass1234"

3. Chat
curl -X POST "https://<backend>.azurewebsites.net/chat" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message":"Explain OSI model",
    "selected_subject":"BCS-041",
    "selected_semester":"Sem 4",
    "response_mode":"fast"
  }'

---

## 20) Final handoff checklist (Android lead sign-off)

- [ ] API base URL configured for dev/stage/prod
- [ ] Token storage and auth interceptor implemented
- [ ] All protected routes covered with auth header
- [ ] Error mapper for 400/401/429/500 implemented
- [ ] OCR multipart uploads implemented
- [ ] Exam and quiz UI/logic complete
- [ ] Profile/settings screens complete
- [ ] Azure production backend tested on physical device
- [ ] Release build logs sanitized

---

## 21) Contact notes for backend coordination
If Android developer needs backend changes, typical requests can be:
1. Add refresh token flow
2. Add strict typed response wrappers for all endpoints
3. Add pagination for history/sessions
4. Add endpoint versioning (/v1)
5. Add websocket streaming for chat

Current system is REST-first and ready for native integration without blocking changes.
