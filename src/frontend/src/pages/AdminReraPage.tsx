import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle,
  Database,
  Download,
  Upload,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";

type ReraProject = {
  projectName: string;
  builderName: string;
  locality: string;
  microLocation: string;
  propertyType: string;
  status: string;
  unitSize: number;
  priceMin: number;
  priceMax: number;
  possessionDate: string;
  dataType: string;
};

export default function AdminReraPage() {
  const navigate = useNavigate();
  const { actor } = useActor();
  const [jsonText, setJsonText] = useState("");
  const [parsed, setParsed] = useState<ReraProject[] | null>(null);
  const [parseError, setParseError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  function handlePreview() {
    setParseError("");
    setParsed(null);
    setSubmitResult(null);
    try {
      const data = JSON.parse(jsonText);
      if (!Array.isArray(data)) throw new Error("Expected a JSON array");
      if (data.length === 0) throw new Error("Array is empty");
      const required = [
        "projectName",
        "builderName",
        "locality",
        "microLocation",
        "propertyType",
        "status",
        "unitSize",
        "priceMin",
        "priceMax",
        "possessionDate",
        "dataType",
      ];
      const first = data[0];
      const missing = required.filter((k) => !(k in first));
      if (missing.length > 0)
        throw new Error(`Missing fields: ${missing.join(", ")}`);
      setParsed(data as ReraProject[]);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  async function handleSubmit() {
    if (!parsed || !actor) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actorAny = actor as any;
      const projects = parsed.map((p) => ({
        ...p,
        unitSize: BigInt(Math.round(p.unitSize)),
        priceMin: BigInt(Math.round(p.priceMin)),
        priceMax: BigInt(Math.round(p.priceMax)),
      }));
      if (actorAny.seedAndRetrain) {
        await actorAny.seedAndRetrain(projects);
        setSubmitResult({
          success: true,
          message: `Successfully submitted ${parsed.length} RERA projects to backend.`,
        });
      } else {
        setSubmitResult({
          success: false,
          message:
            "Backend endpoint not available. Deploy the latest backend first.",
        });
      }
    } catch (e: unknown) {
      setSubmitResult({
        success: false,
        message: e instanceof Error ? e.message : "Submission failed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadCsv() {
    if (!actor) {
      toast.error("Actor not available. Please wait and try again.");
      return;
    }
    setDownloading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actorAny = actor as any;
      let projects: ReraProject[] = [];
      if (actorAny.getReraProjects) {
        const raw = await actorAny.getReraProjects();
        projects = (raw as any[]).map((p: any) => ({
          ...p,
          unitSize:
            typeof p.unitSize === "bigint" ? Number(p.unitSize) : p.unitSize,
          priceMin:
            typeof p.priceMin === "bigint" ? Number(p.priceMin) : p.priceMin,
          priceMax:
            typeof p.priceMax === "bigint" ? Number(p.priceMax) : p.priceMax,
        }));
      }

      if (projects.length === 0) {
        toast.info("No RERA projects stored yet");
        return;
      }

      const headers = [
        "projectName",
        "builderName",
        "locality",
        "microLocation",
        "propertyType",
        "status",
        "unitSize",
        "priceMin",
        "priceMax",
        "possessionDate",
        "dataType",
      ];

      const escapeCell = (val: string | number | undefined) => {
        const str = String(val ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = [
        headers.join(","),
        ...projects.map((p) =>
          headers.map((h) => escapeCell((p as any)[h])).join(","),
        ),
      ];

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().split("T")[0];
      const link = document.createElement("a");
      link.href = url;
      link.download = `rera_projects_${today}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${projects.length} RERA projects as CSV`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  const sampleJson = JSON.stringify(
    [
      {
        projectName: "DS Max Skysisra",
        builderName: "DS Max",
        locality: "Rajankunte",
        microLocation: "Skysisra",
        propertyType: "Apartment",
        status: "Under Construction",
        unitSize: 1200,
        priceMin: 5000000,
        priceMax: 5200000,
        possessionDate: "2026-06-30",
        dataType: "rera",
      },
    ],
    null,
    2,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] to-[#121B35] px-4">
      <div className="max-w-3xl mx-auto pt-12 pb-16">
        <button
          type="button"
          onClick={() => navigate({ to: "/admin" })}
          className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-8 transition-colors"
          data-ocid="admin_rera.link"
        >
          <ArrowLeft size={16} /> Back to Admin
        </button>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Database size={22} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                RERA Upload Panel
              </h1>
              <p className="text-white/40 text-sm">
                Upload new RERA projects to backend storage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={downloading || !actor}
            data-ocid="admin_rera.download_button"
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download
              size={15}
              className={downloading ? "animate-bounce" : ""}
            />
            {downloading ? "Fetching..." : "Download Stored Projects (CSV)"}
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <h2 className="text-white/80 font-semibold mb-2 text-sm uppercase tracking-wide">
            Instructions
          </h2>
          <ol className="text-white/50 text-sm space-y-1 list-decimal list-inside">
            <li>
              Run rera_scraper.py on your machine to auto-scrape Karnataka RERA
            </li>
            <li>Review output/rera_backup.csv for data quality</li>
            <li>Upload output/rera_output.json below to add new projects</li>
            <li>
              For updates, upload output/rera_updates.json to apply changes
            </li>
          </ol>
        </div>

        {/* Sample */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <h2 className="text-white/80 font-semibold mb-2 text-sm uppercase tracking-wide">
            Sample Format
          </h2>
          <pre className="text-green-400/80 text-xs overflow-x-auto">
            {sampleJson}
          </pre>
        </div>

        {/* Input */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
          <h2 className="text-white/80 font-semibold mb-3 text-sm uppercase tracking-wide">
            Paste RERA Projects JSON
          </h2>
          <textarea
            data-ocid="admin_rera.json.textarea"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={12}
            placeholder={`Paste JSON array here...\n${sampleJson}`}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white/80 text-xs font-mono placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 resize-none"
          />
          <div className="flex gap-3 mt-3">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!jsonText.trim()}
              data-ocid="admin_rera.preview.button"
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Preview &amp; Validate
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!parsed || submitting || !actor}
              data-ocid="admin_rera.submit_button"
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Upload size={14} />
              {submitting ? "Submitting..." : "Submit to Backend"}
            </button>
          </div>
        </div>

        {/* Parse error */}
        {parseError && (
          <div
            data-ocid="admin_rera.error_state"
            className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4"
          >
            <XCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-semibold text-sm">
                Validation Error
              </p>
              <p className="text-red-300/70 text-xs mt-0.5">{parseError}</p>
            </div>
          </div>
        )}

        {/* Preview */}
        {parsed && (
          <div
            data-ocid="admin_rera.preview.panel"
            className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={16} className="text-green-400" />
              <h2 className="text-green-400 font-semibold text-sm">
                {parsed.length} projects validated and ready to submit
              </h2>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {parsed.slice(0, 20).map((p, i) => (
                <div
                  key={`${p.projectName}-${i}`}
                  data-ocid={`admin_rera.preview.item.${i + 1}`}
                  className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-white text-sm font-medium">
                      {p.projectName}
                    </p>
                    <p className="text-white/40 text-xs">
                      {p.builderName} · {p.locality} · {p.propertyType}
                    </p>
                  </div>
                  <span className="text-amber-400/60 text-xs">{p.status}</span>
                </div>
              ))}
              {parsed.length > 20 && (
                <p className="text-white/30 text-xs text-center py-2">
                  ...and {parsed.length - 20} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Submit result */}
        {submitResult && (
          <div
            data-ocid={
              submitResult.success
                ? "admin_rera.success_state"
                : "admin_rera.error_state"
            }
            className={`flex items-start gap-3 rounded-xl p-4 ${
              submitResult.success
                ? "bg-green-500/10 border border-green-500/30"
                : "bg-red-500/10 border border-red-500/30"
            }`}
          >
            {submitResult.success ? (
              <CheckCircle
                size={18}
                className="text-green-400 mt-0.5 flex-shrink-0"
              />
            ) : (
              <XCircle
                size={18}
                className="text-red-400 mt-0.5 flex-shrink-0"
              />
            )}
            <p
              className={`text-sm ${
                submitResult.success ? "text-green-300" : "text-red-300"
              }`}
            >
              {submitResult.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
