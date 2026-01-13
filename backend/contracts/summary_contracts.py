from pydantic import BaseModel
from typing import List


class WeeklySummary(BaseModel):
    total_sessions: int
    total_minutes: int
    top_tasks: List[str]
    themes: List[str]
    suggestions: List[str]
