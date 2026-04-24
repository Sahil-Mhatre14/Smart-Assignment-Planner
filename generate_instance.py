"""
Synthetic data generator for the Assignments Planner project.

Generates a 'mixed' regime instance: a realistic blend of assignment types,
grade weights, late-penalty policies, and deadline tightness — the kind of
workload a real student might face over a 1-2 week window.

Usage:
    python generate_instance.py --n 8 --seed 42 --out instance.json
"""

import argparse
import json
import random
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Course pool. Each course has a typical late-penalty rate (% of assignment
# value lost per hour late) — some professors are strict, some are lenient.
# ---------------------------------------------------------------------------
COURSES = [
    # (code, name, default_penalty_rate_percent_per_hour)
    ("CS255",   "Algorithms",          5.0),
    ("CS245",   "Database Systems",    4.0),
    ("MATH250", "Linear Algebra",      2.5),
    ("HIST101", "World History",       1.5),
    ("ENG110",  "Technical Writing",   2.0),
    ("PHYS200", "Classical Mechanics", 3.0),
    ("ECON120", "Microeconomics",      2.0),
]

# ---------------------------------------------------------------------------
# Assignment templates. Each has a typical grade-weight range, processing-time
# range, and difficulty range. This keeps generated data internally consistent:
# a "Final Report" is always heavy, a "Reading Response" always light.
# ---------------------------------------------------------------------------
TEMPLATES = [
    # (label,             grade_pct_range, hours_range, difficulty_range)
    ("Homework {n}",         (3.0,  7.0),  (1.5, 4.0), (2, 4)),
    ("Problem Set {n}",      (3.0,  7.0),  (2.0, 5.0), (3, 5)),
    ("Lab Writeup {n}",      (2.0,  5.0),  (1.0, 3.0), (2, 3)),
    ("Reading Response {n}", (1.0,  3.0),  (1.0, 2.5), (1, 2)),
    ("Quiz Prep",            (2.0,  5.0),  (1.0, 3.0), (2, 4)),
    ("Project Milestone {n}",(8.0, 15.0),  (4.0, 8.0), (3, 5)),
    ("Final Report",         (20.0, 35.0), (6.0, 12.0),(4, 5)),
    ("Midterm Review",       (15.0, 30.0), (3.0, 6.0), (3, 5)),
]


def generate_assignment(idx: int, horizon_hours: float, rng: random.Random) -> dict:
    """Generate a single assignment with internally consistent characteristics."""
    course_code, _, course_penalty_rate = rng.choice(COURSES)
    label, grade_range, hours_range, diff_range = rng.choice(TEMPLATES)

    name = f"{course_code} {label.format(n=rng.randint(1, 9))}"

    processing_time = round(rng.uniform(*hours_range), 1)
    grade_weight = round(rng.uniform(*grade_range), 1)
    difficulty = rng.randint(*diff_range)

    # Deadline: biased toward the middle/late part of the horizon, but ensure
    # most are at least feasible (deadline >= processing_time + small slack).
    # ~15% are deliberately tight (deadline < processing_time + slack) so the
    # algorithm has interesting tradeoffs to make.
    deadline_frac = rng.betavariate(2.5, 2.0)
    deadline = round(deadline_frac * horizon_hours, 1)
    if rng.random() > 0.15:
        deadline = max(deadline, processing_time + rng.uniform(2, 12))
        deadline = round(min(deadline, horizon_hours), 1)

    # Penalty: mostly the course default, with a little jitter so it feels real.
    # Phase 1 only emits 'linear' penalties; we'll add other types later.
    penalty_rate = round(course_penalty_rate * rng.uniform(0.8, 1.2), 2)

    return {
        "id": f"A{idx:03d}",
        "name": name,
        "course": course_code,
        "processing_time_hours": processing_time,
        "deadline_hours": deadline,
        "release_time_hours": 0.0,
        "grade_weight_percent": grade_weight,
        "penalty": {
            "type": "linear",
            "rate_percent_per_hour": penalty_rate,
        },
        "difficulty": difficulty,
    }


def generate_instance(n: int, seed: int, horizon_days: float = 10.0) -> dict:
    """Generate a full instance with `n` assignments over `horizon_days`."""
    rng = random.Random(seed)
    horizon_hours = horizon_days * 24.0

    now = datetime.now(timezone.utc).replace(hour=8, minute=0, second=0, microsecond=0)

    assignments = [generate_assignment(i + 1, horizon_hours, rng) for i in range(n)]

    return {
        "instance_name": f"mixed_n{n}_seed{seed}",
        "description": (
            f"Mixed-regime synthetic instance: {n} assignments across a "
            f"{horizon_days:g}-day horizon. Generated with seed={seed}."
        ),
        "reference_time": now.isoformat(),
        "assignments": assignments,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a synthetic assignment instance.")
    parser.add_argument("--n", type=int, default=8, help="Number of assignments (default: 8).")
    parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducibility.")
    parser.add_argument("--horizon-days", type=float, default=10.0,
                        help="Planning horizon in days (default: 10).")
    parser.add_argument("--out", type=Path, default=Path("instance.json"),
                        help="Output JSON file path.")
    args = parser.parse_args()

    instance = generate_instance(args.n, args.seed, args.horizon_days)
    args.out.write_text(json.dumps(instance, indent=2))
    print(f"Wrote {len(instance['assignments'])} assignments to {args.out}")


if __name__ == "__main__":
    main()