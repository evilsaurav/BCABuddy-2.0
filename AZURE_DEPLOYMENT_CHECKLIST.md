# Azure Deployment Checklist (BCABuddy)

## 1) App Service Basics

- OS/Plan: Linux App Service (Web App for Containers)
- Container port: 8000
- Health check path: /api/health
- Startup command: leave empty (use Dockerfile CMD)

## 2) Required App Settings (Environment Variables)

- SECRET_KEY: strong random value (production only)
- GROQ_API_KEY: your Groq API key
- BACKEND_CORS_ORIGINS: frontend origin list (comma-separated or JSON array)

Examples:

- Comma-separated:
  https://your-frontend-domain.com,https://www.your-frontend-domain.com

- JSON array:
  ["https://your-frontend-domain.com","https://www.your-frontend-domain.com"]

## 3) Optional but Recommended Settings

- WEBSITES_PORT: 8000
- BCABUDDY_CHAT_MODEL: llama-3.3-70b-versatile (or your preferred Groq model)

## 4) Optional Supabase Avatar Storage (only if using cloud avatar upload)

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_AVATAR_BUCKET (default: avatars)

## 5) Docker/Image Expectations

- Dockerfile must expose and run on port 8000
- Do not override startup command in Azure unless absolutely needed
- Ensure image tag is updated and pushed before restart

## 6) Health Validation After Deploy

Run these checks after deployment:

- GET /health -> 200
- GET /api/health -> 200
- Login flow works
- Chat response works with valid token

## 7) Frontend-to-Backend Connection

- Set VITE_API_BASE in frontend to your backend base URL
- If frontend is hosted separately, ensure BACKEND_CORS_ORIGINS contains frontend origin(s)

## 8) Common Failure Prevention

- Do not keep SECRET_KEY as CHANGE_ME_IN_PRODUCTION
- Avoid wildcard CORS in production unless intentionally public
- Keep startup command empty to avoid conflict with Docker CMD
- Confirm App Service health check path exactly matches /api/health
- Recycle app after changing env vars

## 9) Final Go-Live Gate

- Env vars saved and app restarted
- /api/health green for 5+ minutes
- End-to-end test passed: signup -> login -> chat -> profile update
- Logs show no repeated startup/warmup failures

## 10) GitHub Actions Auto-Deploy Wiring (Two Action Buttons)

Configured workflows:

- Backend deploy workflow: .github/workflows/deploy.yml
- Frontend deploy workflow: .github/workflows/azure-static-web-apps-kind-sea-0b41fb700.yml

Both support:

- Auto deploy on push to main (path filtered)
- Manual deploy from Actions tab via Run workflow button

Required GitHub repository secrets:

- REGISTRY_LOGIN_SERVER
- REGISTRY_USERNAME
- REGISTRY_PASSWORD
- AZURE_WEBAPP_PUBLISH_PROFILE
- AZURE_BACKEND_WEBAPP_NAME
- AZURE_STATIC_WEB_APPS_API_TOKEN
- FRONTEND_VITE_API_BASE

Where to set these:

- GitHub repo -> Settings -> Secrets and variables -> Actions -> New repository secret

How to get Azure values:

- AZURE_WEBAPP_PUBLISH_PROFILE:
  Azure Portal -> App Service (backend) -> Get publish profile -> upload content as secret
- AZURE_BACKEND_WEBAPP_NAME:
  exact backend Web App name in Azure
- AZURE_STATIC_WEB_APPS_API_TOKEN:
  Azure Portal -> Static Web App -> Manage deployment token
- FRONTEND_VITE_API_BASE:
  backend base URL, example: https://your-backend-app.azurewebsites.net

First run checklist:

- Push to main after adding secrets
- Verify both workflows pass in GitHub Actions
- Confirm frontend calls backend with correct API base
- Confirm backend container is updated in App Service
