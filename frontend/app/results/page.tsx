"use client";

import { useState } from "react";
import { optimize, AlgoResult } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const ALGO_OPTIONS = [
  { value: "all", label: "Compare All (EDF, WSPT, Bitmask DP)" },
  { value: "bitmask_optimal", label: "Bitmask Optimal (Exact DP)" },
  { value: "wspt", label: "WSPT (Weighted Shortest Processing Time)" },
  { value: "edf", label: "EDF (Earliest Deadline First)" },
  { value: "brute_force", label: "Brute Force (small datasets only)" },
];

const ALGO_LABEL: Record<string, string> = {
  bitmask_optimal: "Bitmask DP",
  wspt: "WSPT",
  edf: "EDF",
  brute_force: "Brute Force",
};

export default function ResultsPage() {
  const [selectedAlgo, setSelectedAlgo] = useState("all");
  const [results, setResults] = useState<AlgoResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const data = await optimize(selectedAlgo);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run optimizer");
    } finally {
      setLoading(false);
    }
  }

  const bestBleeding = results ? Math.min(...results.map((r) => r.total_bleeding)) : null;

  const primary = results
    ? results.reduce((best, r) => (r.total_bleeding < best.total_bleeding ? r : best), results[0])
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Optimizer</h1>
        <p className="text-sm text-gray-500 mt-1">Run scheduling algorithms on your current assignment list</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Algorithm</label>
          <select
            value={selectedAlgo}
            onChange={(e) => setSelectedAlgo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0055A2]"
          >
            {ALGO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          className="px-6 py-2 bg-[#0055A2] text-white rounded-lg text-sm font-medium hover:bg-[#003f7f] disabled:opacity-60 transition-colors"
        >
          {loading ? "Running..." : "Run"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
          Computing optimal schedule...
        </div>
      )}

      {results && (
        <>
          {/* Comparison bar chart */}
          {results.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Algorithm Comparison — Total Grade Bleeding</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={results.map((r) => ({ name: ALGO_LABEL[r.algorithm] ?? r.algorithm, bleeding: r.total_bleeding }))}
                  barCategoryGap="30%"
                >
                  <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                  <YAxis tickFormatter={(v) => `${v.toFixed(2)}%`} tick={{ fontSize: 12 }} width={60} />
                  <Tooltip formatter={(v) => [`${Number(v).toFixed(4)}%`, "Bleeding"]} />
                  <Bar dataKey="bleeding" radius={[6, 6, 0, 0]}>
                    {results.map((r) => (
                      <Cell
                        key={r.algorithm}
                        fill={r.total_bleeding === bestBleeding ? "#E5A823" : "#93b8dc"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex flex-wrap gap-3">
                {results.map((r) => (
                  <div
                    key={r.algorithm}
                    className={`text-sm px-3 py-1.5 rounded-lg border font-medium ${
                      r.total_bleeding === bestBleeding
                        ? "bg-[#E5A823]/10 border-[#E5A823] text-[#0055A2]"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                    }`}
                  >
                    {ALGO_LABEL[r.algorithm] ?? r.algorithm}: {r.total_bleeding.toFixed(4)}%
                    {r.total_bleeding === bestBleeding && " ← best"}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ordered task list */}
          {primary && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-800">
                    Optimal Order — {ALGO_LABEL[primary.algorithm] ?? primary.algorithm}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Work through these tasks one at a time, top to bottom</p>
                </div>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${primary.total_bleeding === 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  Total Bleeding: {primary.total_bleeding.toFixed(4)}%
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {primary.entries.map((e, idx) => {
                  const isLate = e.tardiness > 0;
                  return (
                    <div
                      key={e.id}
                      className={`flex items-center gap-5 px-6 py-4 ${isLate ? "bg-red-50/40" : "hover:bg-blue-50/20"} transition-colors`}
                    >
                      {/* Step number */}
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
                        style={{ backgroundColor: isLate ? "#ef4444" : "#0055A2" }}
                      >
                        {idx + 1}
                      </div>

                      {/* Task info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{e.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {e.course} · {e.start_time}h → {e.end_time}h · deadline {e.deadline_hours}h
                        </p>
                      </div>

                      {/* Duration pill */}
                      <div className="shrink-0 text-center hidden sm:block">
                        <p className="text-xs text-gray-400">Duration</p>
                        <p className="text-sm font-semibold text-gray-700">{(e.end_time - e.start_time).toFixed(1)}h</p>
                      </div>

                      {/* Status */}
                      <div className="shrink-0 text-right">
                        {isLate ? (
                          <div>
                            <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                              {e.tardiness}h late
                            </span>
                            <p className="text-xs text-red-500 mt-1 font-medium">{e.bleeding.toFixed(4)}% bleed</p>
                          </div>
                        ) : (
                          <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            On time
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer total */}
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                <span className="text-sm font-semibold text-gray-700">
                  Total Bleeding:{" "}
                  <span className={primary.total_bleeding > 0 ? "text-red-600" : "text-green-600"}>
                    {primary.total_bleeding.toFixed(4)}%
                  </span>
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
