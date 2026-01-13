import json
from openai import OpenAI
from contracts.plan_contracts import PlanResponse
from services.plan_store import save_plan

def build_mock_plan(task: str, total_minutes: int):
    warmup = 5
    deep_work = max(20, total_minutes - 15)
    break_minutes = 5
    review = max(5, total_minutes - warmup - deep_work - break_minutes)

    return {
        "task": task,
        "total_minutes": total_minutes,
        "focus_tip": "Stay consistent, small wins add up.",
        "energy_level": "medium",
        "plan": [
            {
                "title": "Warm up",
                "minutes": warmup,
                "details": "Review notes or outline key concepts.",
                "difficulty": "easy",
            },
            {
                "title": "Deep work block",
                "minutes": deep_work,
                "details": f"Work on core tasks related to {task}.",
                "difficulty": "hard",
            },
            {
                "title": "Quick break",
                "minutes": break_minutes,
                "details": "Stretch, hydrate, short reset.",
                "difficulty": "easy",
            },
            {
                "title": "Review",
                "minutes": review,
                "details": "Summarize progress & next steps.",
                "difficulty": "medium",
            },
        ],
    }


def validate_and_fix_plan(plan_dict: dict, total_minutes: int) -> dict:
    """
    Make sure the plan's minutes make sense.

    - Ensure each item has at least 1 minute.
    - Adjust the last block so total minutes roughly equal total_minutes.
    """

    items = plan_dict.get("plan", [])
    if not items:
        # If AI somehow returned empty, just bail; caller can decide what to do.
        return plan_dict

    # 1) Clamp each block to at least 1 minute
    for item in items:
        mins = item.get("minutes", 0)
        if mins is None or mins <= 0:
            item["minutes"] = 1

    # 2) Recalculate total and adjust last block if needed
    current_total = sum(item.get("minutes", 0) for item in items)
    diff = total_minutes - current_total

    if abs(diff) > 3:  # allow a small mismatch of a few minutes
        # Adjust the last block to fix the difference
        last = items[-1]
        new_last_minutes = max(1, last.get("minutes", 1) + diff)
        print(
            f"[validator] Adjusting last block from {last.get('minutes')} "
            f"to {new_last_minutes} to match total_minutes={total_minutes}"
        )
        last["minutes"] = new_last_minutes

    # 3) Update top-level total_minutes to be consistent
    plan_dict["total_minutes"] = total_minutes
    return plan_dict


def ai_generate_plan(task: str, total_minutes: int, mode: str = "study", intensity: str = "normal"):
    client = OpenAI()
    """
    Use OpenAI to generate a plan that matches PlanResponse.
    """

    prompt = f"""
    You are a focused study/work planning assistant.

    User settings:
    - Task: {task}
    - Total minutes: {total_minutes}
    - Mode: {mode}   (one of: study, coding, admin)
    - Intensity: {intensity}   (one of: chill, normal, grind)

    Rules:
    - For "study", focus on reading, notes, practice questions.
    - For "coding", focus on specs, implementation, debugging, refactoring.
    - For "admin", focus on batching small tasks, email, planning.

    - For "chill" intensity: more breaks, easier blocks.
    - For "normal": balanced blocks.
    - For "grind": longer deep-work blocks, fewer/shorter breaks.

    Return a plan that matches the PlanResponse schema.
    """
    # Ask OpenAI to give us JSON matching PlanResponse
    response = client.responses.parse(
        model="gpt-4o-mini",  # good + cheap
        input=[{"role": "user", "content": prompt}],
        text_format=PlanResponse,
        temperature=0.4,
    )

    parsed: PlanResponse = response.output_parsed
    # Convert Pydantic model -> plain dict for FastAPI / frontend
    return parsed.model_dump()

def generate_plan(task: str, total_minutes: int, mode: str = "study", intensity: str = "normal"):
    """
    1) Try AI (ai_generate_plan)
    2) Validate + fix its output
    3) If anything blows up, fall back to mock plan
    """
    try:
        print("Trying AI plan...", task, total_minutes, mode, intensity)
        raw_plan = ai_generate_plan(task, total_minutes, mode, intensity)
        safe_plan = validate_and_fix_plan(raw_plan, total_minutes)

        saved = save_plan(safe_plan)
        return saved.model_dump()

    except Exception as e:
        print("AI plan failed, falling back to mock:", e)
        fallback = build_mock_plan(task, total_minutes)
        saved = save_plan(fallback)
        return saved

