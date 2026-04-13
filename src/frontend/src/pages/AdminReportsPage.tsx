import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BarChart2, FileText } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import GlobalNav from "../components/GlobalNav";
import { useAdmin } from "../context/AdminContext";

const trendData = [
  { month: "Oct", val: 12 },
  { month: "Nov", val: 18 },
  { month: "Dec", val: 24 },
  { month: "Jan", val: 31 },
  { month: "Feb", val: 45 },
  { month: "Mar", val: 62 },
];

export default function AdminReportsPage() {
  const navigate = useNavigate();
  const { totalBankReports } = useAdmin();

  const totalValuations = (() => {
    try {
      const h = JSON.parse(
        localStorage.getItem("valubrix_bank_reports") || "[]",
      );
      return h.length + 3; // +3 for sample
    } catch {
      return 3;
    }
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35]">
      <GlobalNav />
      <div
        className="pt-24 pb-16 px-4 max-w-4xl mx-auto"
        data-ocid="admin.reports.section"
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/admin" })}
          className="flex items-center gap-2 text-white/50 hover:text-white mb-6 text-sm"
        >
          <ArrowLeft size={16} /> Back to Admin
        </button>
        <h1 className="text-2xl font-bold text-white mb-6">
          Reports Monitoring
        </h1>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
              <BarChart2 size={16} /> Total Valuations
            </div>
            <p className="text-[#D4AF37] font-bold font-mono text-3xl">
              {totalValuations}
            </p>
          </div>
          <div className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-white/50 text-sm mb-2">
              <FileText size={16} /> Bank Reports Generated
            </div>
            <p className="text-[#D4AF37] font-bold font-mono text-3xl">
              {totalBankReports + 3}
            </p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">
            Valuation Activity (Last 6 Months)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <XAxis
                dataKey="month"
                stroke="#ffffff30"
                tick={{ fill: "#ffffff50", fontSize: 12 }}
              />
              <YAxis
                stroke="#ffffff30"
                tick={{ fill: "#ffffff50", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#121B35",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="val"
                stroke="#D4AF37"
                strokeWidth={2}
                dot={{ fill: "#D4AF37", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
