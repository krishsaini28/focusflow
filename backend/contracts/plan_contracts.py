from datetime import datetime
from pydantic import BaseModel
from typing import List


class PlanItem(BaseModel):
    title: str
    minutes: int
    details: str
    difficulty: str  # "easy" | "medium" | "hard"


class PlanResponse(BaseModel):
    id: str
    created_at: datetime
    
    task: str
    total_minutes: int
    focus_tip: str
    energy_level: str  # "low" | "medium" | "high"
    plan: List[PlanItem]
