import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { useEffect, useState } from "react";
import GlobalNav from "../components/GlobalNav";

interface Report {
  id: string;
  date: string;
  property: string;
  officer: string;
  fmv: string;
  grade: string;
}

const SAMPLE: Report[] = [
  {
    id: "r0",
    date: "14/03/2026",
    property: "3BHK Flat, Whitefield, Bangalore",
    officer: "Anil Sharma",
    fmv: "\u20b91.32 Cr",
    grade: "A",
  },
  {
    id: "r00",
    date: "10/03/2026",
    property: "Villa, Koregaon Park, Pune",
    officer: "Meera Iyer",
    fmv: "\u20b93.1 Cr",
    grade: "A",
  },
  {
    id: "r000",
    date: "05/03/2026",
    property: "Plot, Sector 62, Delhi",
    officer: "Rajan Kapoor",
    fmv: "\u20b985L",
    grade: "B",
  },
];

export default function BankHistoryPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>(SAMPLE);

  useEffect(() => {
    try {
      const saved: Report[] = JSON.parse(
        localStorage.getItem("valubrix_bank_reports") || "[]",
      );
      if (saved.length > 0) setReports([...saved, ...SAMPLE]);
    } catch {
      /* ignore */
    }
  }, []);

  const handleDownload = (r: Report) => {
    alert(
      `Bank Valuation Report\n\nDate: ${r.date}\nProperty: ${r.property}\nOfficer: ${r.officer}\nFMV: ${r.fmv}\nRisk Grade: ${r.grade}\n\n[PDF download simulated]`,
    );
  };

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
          Valuation History
        </h1>
        <div
          className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur"
          data-ocid="bank.history.table"
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs">
                <th className="text-left px-6 py-4">Date</th>
                <th className="text-left px-6 py-4">Property</th>
                <th className="text-left px-6 py-4">Officer</th>
                <th className="text-left px-6 py-4">FMV</th>
                <th className="text-left px-6 py-4">Grade</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors"
                >
                  <td className="px-6 py-4 text-white/60 text-sm">{r.date}</td>
                  <td className="px-6 py-4 text-white text-sm">{r.property}</td>
                  <td className="px-6 py-4 text-white/70 text-sm">
                    {r.officer}
                  </td>
                  <td className="px-6 py-4 text-[#D4AF37] font-mono font-semibold text-sm">
                    {r.fmv}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-bold ${
                        r.grade === "A"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : r.grade === "B"
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-red-500/15 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {r.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      data-ocid={`bank.history.download.button.${i + 1}`}
                      onClick={() => handleDownload(r)}
                      className="flex items-center gap-1.5 text-white/60 hover:text-[#D4AF37] text-sm transition-colors"
                    >
                      <Download size={14} /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
