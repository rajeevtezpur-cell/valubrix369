import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import GlobalNav from "../components/GlobalNav";

interface BulkRow {
  id: string;
  address: string;
  type: string;
  area: string;
  city: string;
}
interface BulkResult {
  id: string;
  address: string;
  fmv: string;
  grade: "A" | "B" | "C";
  loan: string;
}

const newRow = (): BulkRow => ({
  id: `row_${Date.now()}_${Math.random()}`,
  address: "",
  type: "Flat",
  area: "",
  city: "",
});
const gradeLabel: Record<string, string> = {
  A: "Low Risk",
  B: "Moderate Risk",
  C: "High Risk",
};
const gradeColor: Record<string, string> = {
  A: "#10b981",
  B: "#f59e0b",
  C: "#ef4444",
};

function generateResult(row: BulkRow, idx: number): BulkResult {
  const fmvBase = [132, 85, 210, 65, 180][idx] || 100;
  const grades: Array<"A" | "B" | "C"> = ["A", "A", "B", "C", "A"];
  const loan = fmvBase * 0.75;
  const loanStr =
    loan >= 100
      ? `\u20b9${(loan / 100).toFixed(2)} Cr`
      : `\u20b9${Math.round(loan)}L`;
  return {
    id: row.id,
    address: row.address || `Property ${idx + 1}`,
    fmv:
      fmvBase >= 100
        ? `\u20b9${(fmvBase / 100).toFixed(2)} Cr`
        : `\u20b9${fmvBase}L`,
    grade: grades[idx] || "B",
    loan: loanStr,
  };
}

export default function BankBulkPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<BulkRow[]>([newRow(), newRow(), newRow()]);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [results, setResults] = useState<BulkResult[] | null>(null);

  const updateRow = (id: string, key: keyof BulkRow, val: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: val } : r)),
    );
  };

  const addRow = () => {
    if (rows.length < 5) setRows((prev) => [...prev, newRow()]);
  };
  const removeRow = (id: string) => {
    if (rows.length > 1) setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRun = async () => {
    setLoading(true);
    setResults(null);
    for (let i = 0; i < rows.length; i++) {
      setLoadMsg(`Scanning property data\u2026 (${i + 1}/${rows.length})`);
      await new Promise((r) => setTimeout(r, 600));
    }
    setLoading(false);
    setResults(rows.map((r, i) => generateResult(r, i)));
  };

  const riskChartData = results
    ? [
        {
          name: "Grade A",
          count: results.filter((r) => r.grade === "A").length,
          fill: "#10b981",
        },
        {
          name: "Grade B",
          count: results.filter((r) => r.grade === "B").length,
          fill: "#f59e0b",
        },
        {
          name: "Grade C",
          count: results.filter((r) => r.grade === "C").length,
          fill: "#ef4444",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      <GlobalNav />
      <div className="pt-24 pb-16 px-4 max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => navigate({ to: "/bank" })}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-6 text-sm transition-colors"
        >
          <ArrowLeft size={16} /> Back to Bank Portal
        </button>
        <h1 className="text-2xl font-bold text-white mb-6">
          Bulk Property Valuation
        </h1>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur mb-4 overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-white/40 text-xs border-b border-white/10">
                <th className="text-left pb-2 pr-3">#</th>
                <th className="text-left pb-2 pr-3">Property Address</th>
                <th className="text-left pb-2 pr-3">Type</th>
                <th className="text-left pb-2 pr-3">Area (sq ft)</th>
                <th className="text-left pb-2 pr-3">City</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="py-2 pr-3 text-white/30 text-sm">{i + 1}</td>
                  <td className="py-2 pr-3">
                    <input
                      value={row.address}
                      onChange={(e) =>
                        updateRow(row.id, "address", e.target.value)
                      }
                      placeholder="Address"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/40"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      value={row.type}
                      onChange={(e) =>
                        updateRow(row.id, "type", e.target.value)
                      }
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
                    >
                      {["Flat", "Villa", "Plot"].map((t) => (
                        <option key={t} value={t} className="bg-[#121B35]">
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      value={row.area}
                      onChange={(e) =>
                        updateRow(row.id, "area", e.target.value)
                      }
                      placeholder="e.g. 1200"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/40"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      value={row.city}
                      onChange={(e) =>
                        updateRow(row.id, "city", e.target.value)
                      }
                      placeholder="City"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/40"
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-red-400/60 hover:text-red-400 text-sm"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length < 5 && (
            <button
              type="button"
              onClick={addRow}
              className="mt-3 text-[#D4AF37]/70 hover:text-[#D4AF37] text-sm"
            >
              + Add row ({rows.length}/5)
            </button>
          )}
        </div>

        <button
          type="button"
          data-ocid="bank.bulk.run.button"
          onClick={handleRun}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3 bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold rounded-xl transition-all hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Play size={18} />
          )}
          Run AI Analysis
        </button>

        {loading && (
          <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <Loader2
              size={32}
              className="text-[#D4AF37] animate-spin mx-auto mb-3"
            />
            <p className="text-white font-medium">{loadMsg}</p>
          </div>
        )}

        {results && (
          <div className="mt-6 space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur overflow-x-auto">
              <h3 className="text-white font-semibold mb-4">
                Valuation Results
              </h3>
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="text-white/40 text-xs border-b border-white/10">
                    <th className="text-left pb-2 pr-4">Property Address</th>
                    <th className="text-left pb-2 pr-4">FMV</th>
                    <th className="text-left pb-2 pr-4">Risk Grade</th>
                    <th className="text-left pb-2">Recommended Loan</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="py-3 pr-4 text-white text-sm">
                        {r.address}
                      </td>
                      <td className="py-3 pr-4 text-[#D4AF37] font-mono font-semibold text-sm">
                        {r.fmv}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className="text-xs font-bold px-2 py-1 rounded-full"
                          style={{
                            color: gradeColor[r.grade],
                            backgroundColor: `${gradeColor[r.grade]}20`,
                            border: `1px solid ${gradeColor[r.grade]}40`,
                          }}
                        >
                          {r.grade} \u2013 {gradeLabel[r.grade]}
                        </span>
                      </td>
                      <td className="py-3 text-white/80 font-mono text-sm">
                        {r.loan}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Avg Portfolio Value", val: "\u20b91.34 Cr" },
                { label: "Average Risk Grade", val: "A" },
                { label: "Total Eligible Loan", val: "\u20b94.92 Cr" },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-5"
                >
                  <p className="text-white/40 text-xs mb-1">{label}</p>
                  <p className="text-[#D4AF37] font-bold font-mono text-xl">
                    {val}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">
                Risk Distribution
              </h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={riskChartData}>
                  <XAxis
                    dataKey="name"
                    stroke="#ffffff40"
                    tick={{ fill: "#ffffff60", fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#ffffff40"
                    tick={{ fill: "#ffffff60", fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#121B35",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {riskChartData.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
