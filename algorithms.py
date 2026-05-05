"""
algorithms.py — Scheduling algorithms.

Each function takes a list[Assignment] and returns a reordered list[Assignment].
The scheduler module then simulates execution and scores it.

Algorithms implemented:
    - EDF  (Earliest Deadline First): sort by deadline, break ties by shorter job first
    - WSPT (Weighted Shortest Processing Time / Smith's Rule): sort by
      priority_weight / processing_time descending, where priority_weight =
      grade_weight_percent * penalty_rate_percent_per_hour
    - Bitmask optimal: exact dynamic programming over subsets for minimizing
      total bleeding

Both are O(n log n) and optimal for their respective classical objectives,
but neither is optimal for weighted tardiness — which is our actual objective.
Comparing them shows where each strategy wins and loses.
"""

from __future__ import annotations
from itertools import permutations
from scheduler import Assignment, compute_schedule


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


def brute_force(assignments: list[Assignment]) -> list[Assignment]:
    """
    Exact optimal via exhaustive search over all n! permutations.
    Practical only for small n (≤ ~10).
    """
    best_ordering = None
    best_bleeding = float("inf")

    for perm in permutations(assignments):
        result = compute_schedule(list(perm))
        if result.total_bleeding < best_bleeding:
            best_bleeding = result.total_bleeding
            best_ordering = list(perm)

    return best_ordering


def bitmask_optimal(assignments: list[Assignment]) -> list[Assignment]:
    """
    Exact optimal algorithm using dynamic programming over assignment subsets.

    dp[mask] stores the minimum total bleeding after completing exactly the
    assignments represented by mask. This is O(n * 2^n), which is much faster
    than brute force O(n!) while still exact for the project's current model,
    where assignments are available at time 0.
    """
    n = len(assignments)
    if n == 0:
        return []

    if any(a.release_time_hours > 0 for a in assignments):
        return brute_force(assignments)

    total_masks = 1 << n
    full_mask = total_masks - 1
    dp = [float("inf")] * total_masks
    best_ordering: list[list[Assignment] | None] = [None] * total_masks

    dp[0] = 0.0
    best_ordering[0] = []

    for mask in range(total_masks):
        current_ordering = best_ordering[mask]
        if current_ordering is None:
            continue

        for i, assignment in enumerate(assignments):
            if mask & (1 << i):
                continue

            new_mask = mask | (1 << i)
            candidate_ordering = current_ordering + [assignment]
            candidate = compute_schedule(candidate_ordering).total_bleeding

            if candidate < dp[new_mask]:
                dp[new_mask] = candidate
                best_ordering[new_mask] = candidate_ordering

    return best_ordering[full_mask]


# Registry of available algorithms — makes the CLI extensible.
ALGORITHMS: dict[str, callable] = {
    "edf": edf,
    "wspt": wspt,
    "bitmask_optimal": bitmask_optimal,
    "brute_force": brute_force,
}
