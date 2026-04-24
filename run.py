"""
run.py — CLI entry point for the Assignments Planner.

Usage:
    python run.py data/small.json --algo edf
    python run.py data/medium.json --algo wspt
    python run.py data/medium.json --algo all      # run all algorithms and compare
"""

import argparse
from pathlib import Path

from scheduler import load_instance, compute_schedule, print_schedule
from algorithms import ALGORITHMS


def run_single(assignments, algo_name: str):
    """Run one algorithm and return the result."""
    algo_fn = ALGORITHMS[algo_name]
    ordering = algo_fn(list(assignments))  # copy so we don't mutate
    return compute_schedule(ordering, algorithm_name=algo_name.upper())


def run_all(assignments):
    """Run all algorithms, print each, then print a comparison summary."""
    results = []
    for name in ALGORITHMS:
        result = run_single(assignments, name)
        print_schedule(result)
        results.append(result)

    # Comparison summary
    print(f"\n{'='*50}")
    print(f"  COMPARISON SUMMARY")
    print(f"{'='*50}")
    results_sorted = sorted(results, key=lambda r: r.total_bleeding)
    for i, r in enumerate(results_sorted):
        marker = " <-- best" if i == 0 else ""
        print(f"  {r.algorithm_name:<10} bleeding: {r.total_bleeding:.4f}%{marker}")
    print(f"{'='*50}\n")

    return results


def main():
    parser = argparse.ArgumentParser(
        description="Run scheduling algorithms on an assignment instance."
    )
    parser.add_argument("instance", type=Path, help="Path to the JSON instance file.")
    parser.add_argument(
        "--algo",
        choices=list(ALGORITHMS.keys()) + ["all"],
        default="all",
        help="Algorithm to run (default: all).",
    )
    args = parser.parse_args()

    _, assignments = load_instance(args.instance)
    print(f"\nLoaded {len(assignments)} assignments from {args.instance}")

    if args.algo == "all":
        run_all(assignments)
    else:
        result = run_single(assignments, args.algo)
        print_schedule(result)


if __name__ == "__main__":
    main()