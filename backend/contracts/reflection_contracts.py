from pydantic import BaseModel
from typing import List


class ReflectionRequest(BaseModel):
    task: str
    total_minutes: int
    mood: str  # "good" | "okay" | "bad"
    notes: str | None = None


class ReflectionResponse(BaseModel):
    summary: str
    wins: List[str]
    next_steps: List[str]
    encouragement: str
