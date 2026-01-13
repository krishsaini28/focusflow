# FocusFlow  
### AI-Powered Study & Work Session Planner

FocusFlow is a full-stack AI productivity web app that generates structured focus plans with timed work blocks, runs a guided session timer, and stores plan history and reflections to help users stay consistent and focused.

---

## 🚀 Demo

https://github.com/user-attachments/assets/609fb893-3ea4-416e-9be3-4d1483a93549

---

## ✨ Features

- **AI Plan Generator**  
  Generates a step-by-step focus plan based on task, total time, work mode, and intensity.

- **Reliable AI Fallback**  
  If the AI request fails, the backend automatically falls back to a deterministic mock plan to prevent crashes.

- **Guided Session Timer**  
  Runs through each plan block automatically and advances when time reaches zero.

- **Plan History**  
  View previously generated plans and reload them by ID.

- **Session Reflections**  
  Save quick reflections after each session, including mood and notes.

- **Summary Endpoint**  
  Provides a high-level summary of stored plans for quick insights.

---

## 🛠 Tech Stack

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS

### Backend
- FastAPI (Python)
- OpenAI API
- Lightweight persistence layer for plans, history, and reflections

---

## 🧠 System Design (High Level)

1. User submits a task, total minutes, mode, and intensity from the Next.js UI  
2. FastAPI validates input using Pydantic models  
3. Backend attempts AI-based plan generation  
4. If AI fails → a deterministic fallback plan is returned  
5. Plan is stored and available in History  
6. User runs a guided session and saves a reflection afterward  

---

## 🔌 API Endpoints

- GET /health — Health check  
- POST /ai/plan — Generate a focus plan  
- GET /ai/history — List previously generated plans  
- GET /ai/plan/{id} — Load a specific plan by ID  
- GET /ai/summary — Summary statistics  
- POST /ai/reflection — Save a session reflection  

---

## 💻 Local Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add your OPENAI_API_KEY in backend/.env
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
# Optional: create frontend/.env with NEXT_PUBLIC_API_BASE=http://localhost:8000
npm run dev
```

Then open:
- Frontend: http://localhost:3000  
- Backend Docs: http://localhost:8000/docs  

---

## 🔐 Environment Variables

### Backend (backend/.env)
```
OPENAI_API_KEY=your_openai_key
ALLOWED_ORIGINS=http://localhost:3000
DATABASE_URL=sqlite:///./focusflow.db
```

### Frontend (frontend/.env)
```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

---

## 📚 What I Learned

- Designing and validating API contracts using Pydantic  
- Handling AI unreliability with fallback logic  
- Implementing CORS and environment-based configuration  
- Debugging JSON serialization issues (e.g., datetime)  
- Managing complex frontend state (loading, errors, timers, multi-step flows)  
- Professional Git workflows and secrets management (.env, .gitignore)  

---

## 📄 License
MIT
