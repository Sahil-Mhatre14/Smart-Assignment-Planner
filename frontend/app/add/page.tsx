"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addAssignment } from "@/lib/api";

const COURSES = ["CS245", "CS255", "MATH250", "HIST101", "ENG110", "PHYS200", "ECON120", "CS298", "OTHER"];

export default function AddAssignmentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    course: "CS245",
    processing_time_hours: "",
    deadline_hours: "",
    release_time_hours: "0",
    grade_weight_percent: "",
    penalty_type: "linear",
    penalty_rate_percent_per_hour: "",
    difficulty: "3",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await addAssignment({
        name: form.name,
        course: form.course,
        processing_time_hours: parseFloat(form.processing_time_hours),
        deadline_hours: parseFloat(form.deadline_hours),
        release_time_hours: parseFloat(form.release_time_hours),
        grade_weight_percent: parseFloat(form.grade_weight_percent),
        penalty_type: form.penalty_type as "linear" | "fixed" | "capped_linear",
        penalty_rate_percent_per_hour: parseFloat(form.penalty_rate_percent_per_hour),
        difficulty: parseInt(form.difficulty),
      });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Assignment</h1>
        <p className="text-sm text-gray-500 mt-1">Fill in the details for your new assignment</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Name</label>
          <input
            required
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. CS245 Problem Set 6"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0055A2]"
          />
        </div>

        {/* Course */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
          <select
            value={form.course}
            onChange={(e) => set("course", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0055A2]"
          >
            {COURSES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Duration + Deadline */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
            <input
              required
              type="number"
              min="0.1"
              step="0.1"
              value={form.processing_time_hours}
              onChange={(e) => set("processing_time_hours", e.target.value)}
              placeholder="e.g. 3.5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0055A2]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (hours from now)</label>
            <input
              required
              type="number"
              min="0.1"
              step="0.1"
              value={form.deadline_hours}
              onChange={(e) => set("deadline_hours", e.target.value)}
              placeholder="e.g. 24"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0055A2]"
            />
          </div>
        </div>

        {/* Grade weight + Penalty rate */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade Weight (%)</label>
            <input
              required
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={form.grade_weight_percent}
              onChange={(e) => set("grade_weight_percent", e.target.value)}
              placeholder="e.g. 15"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0055A2]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Penalty Rate (%/hour late)</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.penalty_rate_percent_per_hour}
              onChange={(e) => set("penalty_rate_percent_per_hour", e.target.value)}
              placeholder="e.g. 5.0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0055A2]"
            />
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
          <div className="flex gap-2">
            {[
              [1, "Easy"],
              [2, "Low"],
              [3, "Medium"],
              [4, "Hard"],
              [5, "Very Hard"],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => set("difficulty", String(val))}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  form.difficulty === String(val)
                    ? "bg-[#0055A2] text-white border-[#0055A2]"
                    : "bg-white text-gray-600 border-gray-300 hover:border-[#0055A2]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 rounded-lg bg-[#0055A2] text-white text-sm font-medium hover:bg-[#003f7f] disabled:opacity-60 transition-colors"
          >
            {submitting ? "Adding..." : "Add Assignment"}
          </button>
        </div>
      </form>
    </div>
  );
}
