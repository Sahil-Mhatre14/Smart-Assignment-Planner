"""
main.py — FastAPI backend for the Schedule Optimizer.

In-memory store is preloaded from crunch_wspt_wins.json on startup.
All assignments are available at time 0 (release_time_hours = 0).
"""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from scheduler import Assignment, compute_schedule
from algorithms import ALGORITHMS

app = FastAPI(title="Schedule Optimizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory store
# ---------------------------------------------------------------------------

_assignments: list[dict] = []


def _load_preloaded():
    path = Path(__file__).parent / "data" / "crunch_wspt_wins.json"
    raw = json.loads(path.read_text())
    for a in raw["assignments"]:
        _assignments.append({
            "id": a["id"],
            "name": a["name"],
            "course": a["course"],
            "processing_time_hours": a["processing_time_hours"],
            "deadline_hours": a["deadline_hours"],
            "release_time_hours": a.get("release_time_hours", 0.0),
            "grade_weight_percent": a["grade_weight_percent"],
            "penalty_type": a["penalty"]["type"],
            "penalty_rate_percent_per_hour": a["penalty"].get("rate_percent_per_hour", 0.0),
            "difficulty": a["difficulty"],
            "preloaded": True,
        })


_load_preloaded()


def _to_assignment(d: dict) -> Assignment:
    return Assignment(
        id=d["id"],
        name=d["name"],
        course=d["course"],
        processing_time_hours=d["processing_time_hours"],
        deadline_hours=d["deadline_hours"],
        release_time_hours=d["release_time_hours"],
        grade_weight_percent=d["grade_weight_percent"],
        penalty_type=d["penalty_type"],
        penalty_rate_percent_per_hour=d["penalty_rate_percent_per_hour"],
        difficulty=d["difficulty"],
    )


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class AssignmentIn(BaseModel):
    name: str
    course: str
    processing_time_hours: float = Field(gt=0)
    deadline_hours: float = Field(gt=0)
    release_time_hours: float = 0.0
    grade_weight_percent: float = Field(gt=0, le=100)
    penalty_type: Literal["linear", "fixed", "capped_linear"] = "linear"
    penalty_rate_percent_per_hour: float = Field(ge=0)
    difficulty: int = Field(ge=1, le=5)


class ScheduleEntryOut(BaseModel):
    id: str
    name: str
    course: str
    start_time: float
    end_time: float
    deadline_hours: float
    tardiness: float
    bleeding: float


class AlgoResultOut(BaseModel):
    algorithm: str
    total_bleeding: float
    entries: list[ScheduleEntryOut]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/assignments")
def get_assignments():
    return _assignments


@app.post("/assignments", status_code=201)
def add_assignment(body: AssignmentIn):
    new_id = f"U{uuid.uuid4().hex[:6].upper()}"
    record = {"id": new_id, "preloaded": False, **body.model_dump()}
    _assignments.append(record)
    return record


@app.delete("/assignments/{assignment_id}", status_code=204)
def delete_assignment(assignment_id: str):
    global _assignments
    before = len(_assignments)
    _assignments = [a for a in _assignments if a["id"] != assignment_id]
    if len(_assignments) == before:
        raise HTTPException(status_code=404, detail="Assignment not found")


@app.post("/optimize")
def optimize(algo: str = "bitmask_optimal") -> list[AlgoResultOut]:
    if not _assignments:
        raise HTTPException(status_code=400, detail="No assignments to optimize")

    run_algos: list[str]
    if algo == "all":
        run_algos = ["edf", "wspt", "bitmask_optimal"]
    elif algo not in ALGORITHMS:
        raise HTTPException(status_code=400, detail=f"Unknown algorithm: {algo}")
    else:
        run_algos = [algo]

    objects = [_to_assignment(a) for a in _assignments]
    results: list[AlgoResultOut] = []

    for name in run_algos:
        ordering = ALGORITHMS[name](list(objects))
        result = compute_schedule(ordering, algorithm_name=name)
        entries = [
            ScheduleEntryOut(
                id=e.assignment.id,
                name=e.assignment.name,
                course=e.assignment.course,
                start_time=e.start_time,
                end_time=e.end_time,
                deadline_hours=e.assignment.deadline_hours,
                tardiness=e.tardiness,
                bleeding=e.bleeding,
            )
            for e in result.entries
        ]
        results.append(AlgoResultOut(
            algorithm=name,
            total_bleeding=result.total_bleeding,
            entries=entries,
        ))

    return results
