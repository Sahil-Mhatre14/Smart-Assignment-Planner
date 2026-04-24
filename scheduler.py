"""
scheduler.py — Core data structures and objective function.

This module is the "referee": it takes any schedule (a sequence of assignments)
and computes the total grade-percentage bleeding. Every algorithm module
produces a schedule; this module scores it.

Schedule representation (Phase 1 — simple sequential):
    A schedule is a list of assignment IDs in execution order.
    Assignments are processed back-to-back starting at time 0.
    No idle time, no preemption, no daily capacity limit (Phase 1 simplification).

Bleeding formula (linear penalty):
    For assignment i finishing at time c_i with deadline d_i:
        tardiness_i = max(0, c_i - d_i)
        bleeding_i  = grade_weight_percent_i * rate_percent_per_hour_i * tardiness_i / 100
    Total bleeding = sum of all bleeding_i  (in units of course-grade %)
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Assignment:
    """Parsed assignment from a JSON instance."""
    id: str
    name: str
    course: str
    processing_time_hours: float
    deadline_hours: float
    release_time_hours: float
    grade_weight_percent: float
    penalty_type: str
    penalty_rate_percent_per_hour: float
    difficulty: int


@dataclass
class ScheduleEntry:
    """One entry in a computed schedule."""
    assignment: Assignment
    start_time: float
    end_time: float
    tardiness: float
    bleeding: float


@dataclass
class ScheduleResult:
    """Complete result: ordered entries + summary stats."""
    entries: list[ScheduleEntry]
    total_bleeding: float
    algorithm_name: str


def load_instance(path: str | Path) -> tuple[dict, list[Assignment]]:
    """Load a JSON instance file and return (metadata, assignments)."""
    raw = json.loads(Path(path).read_text())
    assignments = []
    for a in raw["assignments"]:
        pen = a["penalty"]
        assignments.append(Assignment(
            id=a["id"],
            name=a["name"],
            course=a["course"],
            processing_time_hours=a["processing_time_hours"],
            deadline_hours=a["deadline_hours"],
            release_time_hours=a.get("release_time_hours", 0.0),
            grade_weight_percent=a["grade_weight_percent"],
            penalty_type=pen["type"],
            penalty_rate_percent_per_hour=pen.get("rate_percent_per_hour", 0.0),
            difficulty=a["difficulty"],
        ))
    return raw, assignments


def compute_schedule(
    ordering: list[Assignment],
    algorithm_name: str = "unknown",
) -> ScheduleResult:
    """
    Given an ordered list of assignments, simulate back-to-back execution
    starting at t=0 and compute bleeding for each.

    Phase 1 simplification: continuous work, no daily limits, no preemption.
    """
    entries = []
    current_time = 0.0

    for a in ordering:
        start = max(current_time, a.release_time_hours)
        end = start + a.processing_time_hours
        tardiness = max(0.0, end - a.deadline_hours)

        # Compute bleeding based on penalty type
        if a.penalty_type == "linear":
            bleeding = (
                a.grade_weight_percent
                * a.penalty_rate_percent_per_hour
                * tardiness
                / 100.0
            )
        elif a.penalty_type == "fixed":
            bleeding = a.grade_weight_percent if tardiness > 0 else 0.0
        elif a.penalty_type == "capped_linear":
            # Not fully wired yet; treat as linear for now
            bleeding = (
                a.grade_weight_percent
                * a.penalty_rate_percent_per_hour
                * tardiness
                / 100.0
            )
        else:
            raise ValueError(f"Unknown penalty type: {a.penalty_type}")

        entries.append(ScheduleEntry(
            assignment=a,
            start_time=round(start, 2),
            end_time=round(end, 2),
            tardiness=round(tardiness, 2),
            bleeding=round(bleeding, 4),
        ))
        current_time = end

    total_bleeding = round(sum(e.bleeding for e in entries), 4)
    return ScheduleResult(
        entries=entries,
        total_bleeding=total_bleeding,
        algorithm_name=algorithm_name,
    )


def print_schedule(result: ScheduleResult) -> None:
    """Pretty-print a schedule result to stdout."""
    print(f"\n{'='*70}")
    print(f"  Algorithm: {result.algorithm_name}")
    print(f"{'='*70}")
    print(f"  {'ID':<6} {'Name':<35} {'Start':>6} {'End':>6} {'Dead':>6} {'Late':>6} {'Bleed':>7}")
    print(f"  {'-'*6} {'-'*35} {'-'*6} {'-'*6} {'-'*6} {'-'*6} {'-'*7}")

    for e in result.entries:
        late_flag = " ***" if e.tardiness > 0 else ""
        print(
            f"  {e.assignment.id:<6} "
            f"{e.assignment.name:<35} "
            f"{e.start_time:>6.1f} "
            f"{e.end_time:>6.1f} "
            f"{e.assignment.deadline_hours:>6.1f} "
            f"{e.tardiness:>6.1f} "
            f"{e.bleeding:>6.3f}%"
            f"{late_flag}"
        )

    print(f"  {'-'*6} {'-'*35} {'-'*6} {'-'*6} {'-'*6} {'-'*6} {'-'*7}")
    print(f"  TOTAL BLEEDING: {result.total_bleeding:.4f}% of course grade")
    print(f"{'='*70}\n")