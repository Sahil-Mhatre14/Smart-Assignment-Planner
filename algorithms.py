"""
algorithms.py — Scheduling algorithms.

Each function takes a list[Assignment] and returns a reordered list[Assignment].
The scheduler module then simulates execution and scores it.

Algorithms implemented:
    - EDF  (Earliest Deadline First): sort by deadline, break ties by shorter job first
    - WSPT (Weighted Shortest Processing Time / Smith's Rule): sort by
      priority_weight / processing_time descending, where priority_weight =
      grade_weight_percent * penalty_rate_percent_per_hour

Both are O(n log n) and optimal for their respective classical objectives,
but neither is optimal for weighted tardiness — which is our actual objective.
Comparing them shows where each strategy wins and loses.
"""

from __future__ import annotations
from scheduler import Assignment


def edf(assignments: list[Assignment]) -> list[Assignment]:
    """
    Earliest Deadline First.

    Optimal for minimizing maximum lateness on a single machine.
    Intuition: always work on whatever is due soonest.

    Tie-breaking: shorter processing time first (SPT) — if two assignments
    share a deadline, finishing the faster one first can't hurt.
    """
    return sorted(
        assignments,
        key=lambda a: (a.deadline_hours, a.processing_time_hours),
    )


def wspt(assignments: list[Assignment]) -> list[Assignment]:
    """
    Weighted Shortest Processing Time (Smith's Rule).

    Optimal for minimizing total weighted completion time on a single machine.
    Intuition: prioritize jobs with high "cost density" — high penalty weight
    per hour of work.

    Priority weight for our model:
        w_i = grade_weight_percent_i * penalty_rate_percent_per_hour_i

    Sort by w_i / p_i descending (highest bang-per-hour first).
    """
    def priority(a: Assignment) -> float:
        w = a.grade_weight_percent * a.penalty_rate_percent_per_hour
        return -(w / a.processing_time_hours)  # negative for descending sort

    return sorted(assignments, key=priority)


# Registry of available algorithms — makes the CLI extensible.
ALGORITHMS: dict[str, callable] = {
    "edf": edf,
    "wspt": wspt,
}