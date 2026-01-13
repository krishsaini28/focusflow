from contracts.summary_contracts import WeeklySummary
from contracts.reflection_contracts import ReflectionRequest, ReflectionResponse
from openai import OpenAI
import os
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

from dotenv import load_dotenv
load_dotenv()  # loads variables from .env into the environment
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

from services.db import init_db
init_db()

from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware 
from fastapi import HTTPException
from pydantic import BaseModel 

from services.plan_generator import generate_plan
from services.plan_store import list_plans
from services.plan_store import list_plans, get_plan_by_id
from typing import Literal, Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
class PlanRequest(BaseModel):
    task: str
    total_minutes: int
    mode: Optional[Literal["study", "coding", "admin"]] = "study"
    intensity: Optional[Literal["chill", "normal", "grind"]] = "normal"

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/ai/plan")
def ai_plan(req: PlanRequest):
    # delegate to the service function
    return generate_plan(task=req.task, total_minutes=req.total_minutes, mode=req.mode, intensity=req.intensity)

@app.get("/plans")
def get_plans(limit: int = 10):
    plans = list_plans(limit=limit)
    # Convert Pydantic models to plain dicts
    return [p.model_dump() for p in plans]

@app.get("/ai/history")
def get_history(limit: int = 10):
    plans = list_plans(limit=limit)
    return [p.model_dump() for p in plans]

@app.get("/ai/plan/{plan_id}")
def get_plan(plan_id: str):
    plan = get_plan_by_id(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan.model_dump()

@app.post("/ai/reflect", response_model=ReflectionResponse)
def ai_reflect(body: ReflectionRequest):
    prompt = f"""
You are a friendly study/work coach.

The user just finished a focus session.

Task: {body.task}
Planned minutes: {body.total_minutes}
Mood after session: {body.mood}
User notes: {body.notes or "None"}

Return:
- A 1–2 sentence summary of how this session likely went.
- 2–3 concrete wins (even if it felt bad).
- 2–3 realistic next steps for their *next* session.
- One short encouragement line, not cringe.

Respond in JSON matching this schema exactly:
{{
  "summary": "...",
  "wins": ["...", "..."],
  "next_steps": ["...", "..."],
  "encouragement": "..."
}}
"""

    resp = client.responses.parse(
        model="gpt-4o-mini",
        input=[{"role": "user", "content": prompt}],
        text_format=ReflectionResponse,
        temperature=0.5,
    )

    return resp.output_parsed

@app.get("/ai/summary", response_model=WeeklySummary)
def ai_summary(limit: int = 20):
    plans = list_plans(limit=limit)
    if not plans:
        return WeeklySummary(
            total_sessions=0,
            total_minutes=0,
            top_tasks=[],
            themes=["No data yet"],
            suggestions=["Generate a few plans and run some sessions first."]
        )

    # Prepare a compact history for the model
    history_lines = []
    total_minutes = 0
    for p in plans:
        total_minutes += p.total_minutes
        history_lines.append(
            f"- {p.task} ({p.total_minutes} min, energy={p.energy_level})"
        )

    history_text = "\n".join(history_lines)

    prompt = f"""
You are a productivity coach.

Here is the user's recent focus history (most recent first):

{history_text}

Based on this, return:
- total_sessions: how many sessions in this data
- total_minutes: sum of all minutes you see
- top_tasks: 3–5 task names they focused on the most
- themes: 3–5 short phrases summarizing patterns (e.g. 'lots of context switching')
- suggestions: 3–5 concrete tips for the next week

Return JSON matching this schema exactly:
{{
  "total_sessions": <int>,
  "total_minutes": <int>,
  "top_tasks": ["..."],
  "themes": ["..."],
  "suggestions": ["..."]
}}
"""

    resp = client.responses.parse(
        model="gpt-4o-mini",
        input=[{"role": "user", "content": prompt}],
        text_format=WeeklySummary,
        temperature=0.4,
    )

    summary: WeeklySummary = resp.output_parsed
    # ensure numbers match our own totals
    summary.total_sessions = len(plans)
    summary.total_minutes = total_minutes
    return summary
