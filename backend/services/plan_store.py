import json
from typing import List
from typing import Optional
from datetime import datetime
from contracts.plan_contracts import PlanResponse
from services.db import get_connection

_PLANS: List[PlanResponse] = []


def save_plan(plan_dict: dict) -> PlanResponse:
    if "id" not in plan_dict:
        plan_dict["id"] = f"plan-{datetime.now().timestamp()}"
    if "created_at" not in plan_dict:
        plan_dict["created_at"] = datetime.now().isoformat()

    plan = PlanResponse(**plan_dict)

    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT OR REPLACE INTO plans (id, created_at, task, total_minutes, data)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            plan.id,
            plan.created_at.isoformat(),
            plan.task,
            plan.total_minutes,
            json.dumps(plan_dict),
        ),
    )
    conn.commit()
    conn.close()

    return plan

def list_plans(limit: int = 10) -> List[PlanResponse]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT data FROM plans ORDER BY datetime(created_at) DESC LIMIT ?",
        (limit,),
    )
    rows = cur.fetchall()
    conn.close()

    plans: List[PlanResponse] = []
    for row in rows:
        data = json.loads(row["data"])
        plans.append(PlanResponse(**data))
    return plans

def get_plan_by_id(plan_id: str) -> Optional[PlanResponse]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT data FROM plans WHERE id = ?", (plan_id,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return None

    data = json.loads(row["data"])
    return PlanResponse(**data)
