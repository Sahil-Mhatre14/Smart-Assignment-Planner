"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAssignments, deleteAssignment, Assignment } from "@/lib/api";

const DIFFICULTY_LABEL: Record<number, string> = { 1: "Easy", 2: "Low", 3: "Medium", 4: "Hard", 5: "Very Hard" };
const DIFFICULTY_COLOR: Record<number, string> = {
  1: "bg-green-100 text-green-700",
  2: "bg-teal-100 text-teal-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-orange-100 text-orange-700",
  5: "bg-red-100 text-red-700",
};

export default function DashboardPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    try {
      setAssignments(await getAssignments());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteAssignment(id);
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    setDeletingId(null);
  }

  const totalHours = assignments.reduce((s, a) => s + a.processing_time_hours, 0);
  const courses = new Set(assignments.map((a) => a.course)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">All assignments for the current planning window</p>
        </div>
        <Link
          href="/results"
          className="bg-[#0055A2] text-white px-5 py-2.5 rounded-lg hover:bg-[#003f7f] transition-colors font-medium text-sm"
        >
          Optimize My Schedule →
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Assignments", value: assignments.length },
          { label: "Courses", value: courses },
          { label: "Total Hours", value: `${totalHours.toFixed(1)}h` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-[#0055A2] mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Assignments</h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading...</div>
        ) : assignments.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            No assignments yet.{" "}
            <Link href="/add" className="text-[#0055A2] underline">Add one</Link>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">ID</th>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Course</th>
                  <th className="px-5 py-3 text-right">Duration</th>
                  <th className="px-5 py-3 text-right">Deadline</th>
                  <th className="px-5 py-3 text-right">Weight</th>
                  <th className="px-5 py-3 text-right">Penalty/hr</th>
                  <th className="px-5 py-3 text-center">Difficulty</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-gray-500 text-xs">{a.id}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{a.name}</td>
                    <td className="px-5 py-3 text-gray-600">{a.course}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{a.processing_time_hours}h</td>
                    <td className="px-5 py-3 text-right text-gray-700">{a.deadline_hours}h</td>
                    <td className="px-5 py-3 text-right text-gray-700">{a.grade_weight_percent}%</td>
                    <td className="px-5 py-3 text-right text-gray-700">{a.penalty_rate_percent_per_hour}%</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[a.difficulty]}`}>
                        {DIFFICULTY_LABEL[a.difficulty]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(a.id)}
                        disabled={deletingId === a.id}
                        className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                      >
                        {deletingId === a.id ? "..." : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
