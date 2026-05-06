const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Assignment {
  id: string;
  name: string;
  course: string;
  processing_time_hours: number;
  deadline_hours: number;
  release_time_hours: number;
  grade_weight_percent: number;
  penalty_type: string;
  penalty_rate_percent_per_hour: number;
  difficulty: number;
  preloaded: boolean;
}

export interface ScheduleEntry {
  id: string;
  name: string;
  course: string;
  start_time: number;
  end_time: number;
  deadline_hours: number;
  tardiness: number;
  bleeding: number;
}

export interface AlgoResult {
  algorithm: string;
  total_bleeding: number;
  entries: ScheduleEntry[];
}

export async function getAssignments(): Promise<Assignment[]> {
  const res = await fetch(`${BASE}/assignments`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch assignments");
  return res.json();
}

export async function addAssignment(body: Omit<Assignment, "id" | "preloaded">): Promise<Assignment> {
  const res = await fetch(`${BASE}/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to add assignment");
  return res.json();
}

export async function deleteAssignment(id: string): Promise<void> {
  const res = await fetch(`${BASE}/assignments/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete assignment");
}

export async function optimize(algo: string): Promise<AlgoResult[]> {
  const res = await fetch(`${BASE}/optimize?algo=${algo}`, { method: "POST", cache: "no-store" });
  if (!res.ok) throw new Error("Failed to run optimizer");
  return res.json();
}
