# AI Plan Response Contract (v1)

## Request (frontend -> backend)
POST /ai/plan
Body:
{
  "task": "string",
  "total_minutes": 60
}

## Response (backend -> frontend)
{
  "task_title": "string",
  "total_minutes": 60,
  "session_style": {
    "focus_minutes": 25,
    "break_minutes": 5,
    "cycles": 2
  },
  "subtasks": [
    {
      "title": "string",
      "minutes": 15,
      "checklist": ["string", "string"]
    }
  ],
  "focus_tip": "string",
  "if_stuck": ["string", "string"],
  "difficulty": "easy | medium | hard",
  "confidence": 0.0
}
