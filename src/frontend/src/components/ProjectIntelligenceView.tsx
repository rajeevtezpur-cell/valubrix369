import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  BarChart2,
  Building2,
  ChevronRight,
  GitCompare,
  HelpCircle,
  MapPin,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type AIMasterProject,
  getAIHotspots,
  getStrongBuyProjects,
  getTopRankedByFlag,
} from "../engines/aiMasterScoreEngine";
import { classifyFromLocality } from "../engines/marketClassificationEngine";
import {
  type MetroResult,
  formatMetroDisplay,
  getNearestMetros,
} from "../engines/metroEngine";
import {
  type FilterOptions,
  SCORED_PROJECTS,
  type ScoredProject,
  UNIQUE_STATUS,
  UNIQUE_TYPES,
  UNIQUE_ZONES,
  filterProjects,
  getHotspots,
  getPriceInsights,
  getRecommendations,
} from "../engines/projectIntelligenceEngine";
import AIStrongBuyCard from "./AIStrongBuyCard";
import EnquiryModal from "./EnquiryModal";
import MapView from "./MapView";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(rupees: number): string {
  const cr = rupees / 10000000;
  if (cr >= 1) return `₹${cr.toFixed(2)}Cr`;
  const lakhs = rupees / 100000;
  return `₹${lakhs.toFixed(0)}L`;
}

function getTagStyle(tag: string) {
  switch (tag) {
    case "Luxury":
      return "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30";
    case "Premium":
      return "bg-purple-500/20 text-purple-300 border border-purple-500/30";
    case "Best Value":
      return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
    case "Budget Pick":
      return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
    default:
      return "bg-white/10 text-white/60";
  }
}

function getScoreColor(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 55) return "text-amber-400";
  return "text-orange-400";
}

function getScoreBg(score: number) {
  if (score >= 75) return "bg-emerald-500/20 border-emerald-500/40";
  if (score >= 55) return "bg-amber-500/20 border-amber-500/40";
  return "bg-orange-500/20 border-orange-500/40";
}

function getMarketClassBadgeStyle(cls: string) {
  switch (cls) {
    case "Emerging":
      return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
    case "Growth Corridor":
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
    case "Established":
      return "bg-blue-500/15 text-blue-300 border border-blue-500/30";
    case "Saturated":
      return "bg-red-500/15 text-red-300 border border-red-500/30";
    default:
      return "bg-white/10 text-white/50";
  }
}

function getStatusStyle(status: string) {
  switch (status) {
    case "Ready":
      return "bg-emerald-500/20 text-emerald-300";
    case "Under Construction":
      return "bg-amber-500/20 text-amber-300";
    case "Pre-Launch":
      return "bg-blue-500/20 text-blue-300";
    default:
      return "bg-white/10 text-white/60";
  }
}

// ─── Custom Map View ──────────────────────────────────────────────────────────
// Plots projects on a scaled coordinate canvas using SVG — no external deps.
// ─── Project Card ─────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: ScoredProject;
  index: number;
  compareList: ScoredProject[];
  onWhyBuy: (p: ScoredProject) => void;
  onCompare: (p: ScoredProject) => void;
  onEnquire: (p: ScoredProject) => void;
}

function ProjectCard({
  project: p,
  index,
  compareList,
  onWhyBuy,
  onCompare,
  onEnquire,
}: ProjectCardProps) {
  const isInCompare = compareList.some((c) => c.id === p.id);
  const compareDisabled = !isInCompare && compareList.length >= 3;
  const ocidIndex = index + 1;

  return (
    <div
      data-ocid={ocidIndex <= 3 ? `projects.card.item.${ocidIndex}` : undefined}
      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5 min-w-[280px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(212,175,55,0.15)] hover:border-[#D4AF37]/30 group"
    >
      {/* Row 1: Tag + Score */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${getTagStyle(p.score.tag)}`}
        >
          {p.score.tag}
        </span>
        <div
          className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-xs flex-shrink-0 ${getScoreBg(p.score.investmentScore)} ${getScoreColor(p.score.investmentScore)}`}
        >
          {p.score.investmentScore}
        </div>
      </div>

      {/* Row 2: Name + Builder */}
      <div className="flex flex-col gap-0.5">
        <h3
          className="text-white font-bold text-sm leading-tight truncate group-hover:text-[#D4AF37] transition-colors"
          title={p.name}
        >
          {p.name}
        </h3>
        <p className="text-white/50 text-[11px] truncate">{p.builder}</p>
      </div>

      {/* Row 3: Location */}
      <div className="flex items-center gap-1.5 text-white/60 text-[11px]">
        <MapPin size={10} className="flex-shrink-0 text-[#D4AF37]" />
        <span className="truncate">
          {p.micro_location}, {p.locality}
        </span>
      </div>

      {/* Row 4: Badges */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/10 whitespace-nowrap">
          {p.zone.replace(" Bangalore", "")}
        </span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${getStatusStyle(p.status)}`}
        >
          {p.status}
        </span>
        {(() => {
          const mc = classifyFromLocality(p.latitude, p.longitude, p.locality);
          return (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${getMarketClassBadgeStyle(mc.classification)}`}
            >
              {mc.classification}
            </span>
          );
        })()}
      </div>

      {/* Row 5: Price */}
      <div className="pt-2 border-t border-white/5">
        <p className="text-[#D4AF37] font-bold text-sm">
          {formatPrice(p.price_min)} – {formatPrice(p.price_max)}
        </p>
        <p className="text-white/40 text-[10px] mt-0.5 truncate">
          {p.configuration} · {p.property_type}
        </p>
      </div>

      {/* Row 6: Buttons */}
      <div className="flex gap-1.5 pt-0.5">
        <button
          type="button"
          data-ocid={
            ocidIndex <= 3 ? `projects.card.why_button.${ocidIndex}` : undefined
          }
          onClick={() => onWhyBuy(p)}
          className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 transition-all"
        >
          <HelpCircle size={11} /> Why Buy?
        </button>
        <button
          type="button"
          data-ocid={
            ocidIndex <= 3
              ? `projects.card.compare_button.${ocidIndex}`
              : undefined
          }
          onClick={() => onCompare(p)}
          disabled={compareDisabled}
          className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-2 rounded-xl border transition-all ${isInCompare ? "bg-purple-500/20 text-purple-300 border-purple-500/30" : compareDisabled ? "bg-white/5 text-white/20 border-white/10 cursor-not-allowed" : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"}`}
        >
          <GitCompare size={11} /> {isInCompare ? "Added" : "Compare"}
        </button>
        <button
          type="button"
          data-ocid={
            ocidIndex <= 3
              ? `projects.card.enquire_button.${ocidIndex}`
              : undefined
          }
          onClick={() => onEnquire(p)}
          className="flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
        >
          <Zap size={11} /> Enquire
        </button>
      </div>
    </div>
  );
}

// ─── Why Buy Modal ────────────────────────────────────────────────────────────

interface WhyBuyModalProps {
  project: ScoredProject | null;
  zoneAvgs: Record<string, number>;
  onClose: () => void;
}

function WhyBuyModal({ project: p, zoneAvgs, onClose }: WhyBuyModalProps) {
  const [metros, setMetros] = useState<MetroResult[]>([]);
  const pLat = p?.latitude ?? 0;
  const pLng = p?.longitude ?? 0;
  useEffect(() => {
    if (!pLat || !pLng) {
      setMetros([]);
      return;
    }
    getNearestMetros(pLat, pLng, 1)
      .then(setMetros)
      .catch(() => setMetros([]));
  }, [pLat, pLng]);
  if (!p) return null;
  const nearestMetro = metros[0];
  const zoneAvg = zoneAvgs[p.zone] ?? p.score.avgPrice;
  const priceDiff = (((zoneAvg - p.score.avgPrice) / zoneAvg) * 100).toFixed(1);
  const isUnderMarket = p.score.avgPrice < zoneAvg;

  const roiLabel =
    p.score.subScores.growth >= 70
      ? "High"
      : p.score.subScores.growth >= 50
        ? "Medium"
        : "Low";
  const roiColor =
    p.score.subScores.growth >= 70
      ? "text-emerald-400"
      : p.score.subScores.growth >= 50
        ? "text-amber-400"
        : "text-orange-400";

  return (
    <Dialog open={!!p} onOpenChange={onClose}>
      <DialogContent
        data-ocid="projects.why_modal.dialog"
        className="max-w-lg bg-[#0D1B2A] border border-white/10 text-white rounded-2xl p-0 overflow-hidden"
      >
        <div className="p-6">
          <DialogHeader>
            <div className="flex items-start justify-between mb-1">
              <DialogTitle className="text-xl font-bold text-white leading-tight">
                {p.name}
              </DialogTitle>
              <button
                type="button"
                data-ocid="projects.why_modal.close_button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all flex-shrink-0 ml-2"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getTagStyle(p.score.tag)}`}
              >
                {p.score.tag}
              </span>
              <span
                className={`text-sm font-bold ${getScoreColor(p.score.investmentScore)}`}
              >
                Score: {p.score.investmentScore}/100
              </span>
            </div>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            {/* ROI Potential */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/70 text-sm font-medium flex items-center gap-2">
                  <TrendingUp size={14} className="text-[#D4AF37]" /> ROI
                  Potential
                </span>
                <span className={`text-sm font-bold ${roiColor}`}>
                  {roiLabel}
                </span>
              </div>
              <Progress value={p.score.subScores.growth} className="h-2" />
            </div>

            {/* Location Advantage */}
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/70 text-sm font-medium flex items-center gap-2 mb-2">
                <MapPin size={14} className="text-[#D4AF37]" /> Location
                Advantage
              </p>
              {nearestMetro && (
                <p className="text-white text-sm">
                  {formatMetroDisplay(nearestMetro)}
                </p>
              )}
              <p className="text-white/50 text-xs mt-1">
                {p.zone} · {p.micro_location}
              </p>
            </div>

            {/* Price Comparison */}
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/70 text-sm font-medium flex items-center gap-2 mb-2">
                <BarChart2 size={14} className="text-[#D4AF37]" /> Price vs Zone
                Average
              </p>
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">
                    This Project
                  </p>
                  <p className="text-[#D4AF37] font-bold">
                    {formatPrice(p.score.avgPrice)}
                  </p>
                </div>
                <div className="text-white/30 text-sm mb-0.5">vs</div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">
                    Zone Avg
                  </p>
                  <p className="text-white font-bold">{formatPrice(zoneAvg)}</p>
                </div>
                {isUnderMarket && (
                  <span className="ml-auto text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                    {priceDiff}% below market
                  </span>
                )}
                {!isUnderMarket && (
                  <span className="ml-auto text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
                    {Math.abs(Number(priceDiff))}% above market
                  </span>
                )}
              </div>
            </div>

            {/* Sub-scores */}
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
                <Sparkles size={14} className="text-[#D4AF37]" /> Score
                Breakdown
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Location", val: p.score.subScores.location },
                  { label: "Price Value", val: p.score.subScores.price },
                  { label: "Growth", val: p.score.subScores.growth },
                  { label: "Builder", val: p.score.subScores.builder },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/60">{label}</span>
                      <span className={getScoreColor(val)}>{val}</span>
                    </div>
                    <Progress value={val} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Compare Tray ─────────────────────────────────────────────────────────────

interface CompareTrayProps {
  compareList: ScoredProject[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

function CompareTray({ compareList, onRemove, onClear }: CompareTrayProps) {
  const [showModal, setShowModal] = useState(false);

  if (compareList.length === 0) return null;

  return (
    <>
      {/* Tray */}
      <div
        data-ocid="projects.compare_tray.panel"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0D1B2A]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4"
      >
        <div className="flex items-center gap-2">
          {compareList.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5"
            >
              <span className="text-white text-xs font-medium max-w-[120px] truncate">
                {p.name}
              </span>
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          data-ocid="projects.compare_tray.compare_button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#D4AF37] text-black text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#B8960C] transition-all"
        >
          <GitCompare size={13} />
          Compare {compareList.length}
        </button>
        <button
          type="button"
          data-ocid="projects.compare_tray.clear_button"
          onClick={onClear}
          className="text-white/40 hover:text-white text-xs transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Compare Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl bg-[#0D1B2A] border border-white/10 text-white rounded-2xl p-0 overflow-hidden">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">
                Project Comparison
              </DialogTitle>
            </DialogHeader>
            <div
              className={`mt-5 grid gap-4 ${compareList.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}
            >
              {compareList.map((p) => (
                <div
                  key={p.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3"
                >
                  <h4 className="text-white font-bold text-sm leading-tight">
                    {p.name}
                  </h4>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getTagStyle(p.score.tag)}`}
                  >
                    {p.score.tag}
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-white/50">Price</span>
                      <span className="text-[#D4AF37] font-semibold">
                        {formatPrice(p.score.avgPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Score</span>
                      <span
                        className={`font-bold ${getScoreColor(p.score.investmentScore)}`}
                      >
                        {p.score.investmentScore}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Zone</span>
                      <span className="text-white">
                        {p.zone.replace(" Bangalore", "")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Status</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusStyle(p.status)}`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Builder</span>
                      <span className="text-white text-right max-w-[100px] truncate">
                        {p.builder}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Growth</span>
                      <span className={getScoreColor(p.score.subScores.growth)}>
                        {p.score.subScores.growth}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ProjectIntelligenceViewProps {
  mode: "public" | "portal";
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────

interface BottomSheetProps {
  project: ScoredProject | null;
  zoneAvgs: Record<string, number>;
  compareList: ScoredProject[];
  onClose: () => void;
  onWhyBuy: (p: ScoredProject) => void;
  onCompare: (p: ScoredProject) => void;
  onEnquire: (p: ScoredProject) => void;
}

function BottomSheet({
  project: p,
  zoneAvgs: _zoneAvgs,
  compareList,
  onClose,
  onWhyBuy,
  onCompare,
  onEnquire,
}: BottomSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const [metros, setMetros] = useState<MetroResult[]>([]);
  const pLat = p?.latitude ?? 0;
  const pLng = p?.longitude ?? 0;
  useEffect(() => {
    if (!pLat || !pLng) {
      setMetros([]);
      return;
    }
    getNearestMetros(pLat, pLng, 1)
      .then(setMetros)
      .catch(() => setMetros([]));
  }, [pLat, pLng]);

  if (!p) return null;

  const nearestMetro = metros[0];
  const isInCompare = compareList.some((c) => c.id === p.id);
  const compareDisabled = !isInCompare && compareList.length >= 3;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Close bottom sheet"
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex flex-col rounded-t-3xl bg-[#0D1B2A] border-t border-x border-white/15 shadow-2xl transition-all duration-300"
        style={{ height: expanded ? "80vh" : "40vh" }}
      >
        {/* Handle */}
        <button
          type="button"
          className="flex justify-center items-center pt-3 pb-2 cursor-pointer flex-shrink-0 w-full bg-transparent border-0"
          onClick={() => setExpanded((e) => !e)}
          aria-label="Toggle sheet height"
        >
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </button>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-lg leading-tight truncate">
                {p.name}
              </h3>
              <p className="text-white/50 text-sm truncate">{p.builder}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm ${getScoreBg(p.score.investmentScore)} ${getScoreColor(p.score.investmentScore)}`}
              >
                {p.score.investmentScore}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              >
                <X size={14} className="text-white/70" />
              </button>
            </div>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-2">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getTagStyle(p.score.tag)}`}
            >
              {p.score.tag}
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full ${getStatusStyle(p.status)}`}
            >
              {p.status}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-white/50">
              {p.zone.replace(" Bangalore", "")}
            </span>
            {(() => {
              const mc = classifyFromLocality(
                p.latitude,
                p.longitude,
                p.locality,
              );
              return (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${getMarketClassBadgeStyle(mc.classification)}`}
                >
                  {mc.classification}
                </span>
              );
            })()}
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-white/60 text-sm">
            <MapPin size={13} className="flex-shrink-0 text-[#D4AF37]" />
            <span className="truncate">
              {p.micro_location}, {p.locality}
            </span>
          </div>

          {/* Price + Config */}
          <div className="bg-white/5 rounded-2xl p-4">
            <p className="text-[#D4AF37] font-bold text-lg">
              {formatPrice(p.price_min)} – {formatPrice(p.price_max)}
            </p>
            <p className="text-white/40 text-sm mt-1">
              {p.configuration} · {p.property_type}
            </p>
          </div>

          {/* Nearest metro */}
          {nearestMetro && (
            <div className="bg-white/5 rounded-2xl p-4">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-1">
                Nearest Metro
              </p>
              <p className="text-white text-sm font-medium">
                {formatMetroDisplay(nearestMetro)}
              </p>
            </div>
          )}

          {/* Sub scores */}
          <div className="bg-white/5 rounded-2xl p-4 space-y-3">
            <p className="text-white/50 text-xs uppercase tracking-wider">
              Score Breakdown
            </p>
            {[
              { label: "Location", val: p.score.subScores.location },
              { label: "Price Value", val: p.score.subScores.price },
              { label: "Growth", val: p.score.subScores.growth },
              { label: "Builder", val: p.score.subScores.builder },
            ].map(({ label, val }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">{label}</span>
                  <span className={getScoreColor(val)}>{val}</span>
                </div>
                <Progress value={val} className="h-1.5" />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onWhyBuy(p)}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 transition-all"
            >
              <HelpCircle size={14} /> Why Buy?
            </button>
            <button
              type="button"
              onClick={() => onCompare(p)}
              disabled={compareDisabled}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-3 rounded-xl border transition-all ${isInCompare ? "bg-purple-500/20 text-purple-300 border-purple-500/30" : compareDisabled ? "bg-white/5 text-white/20 border-white/10 cursor-not-allowed" : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"}`}
            >
              <GitCompare size={14} /> {isInCompare ? "Added" : "Compare"}
            </button>
            <button
              type="button"
              onClick={() => onEnquire(p)}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
            >
              <Zap size={14} /> Enquire
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ProjectIntelligenceView({
  mode,
}: ProjectIntelligenceViewProps) {
  const _mode = mode;
  const [filters, setFilters] = useState<FilterOptions>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    { type: string; label: string; value: string }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab, setActiveTab] = useState<"grid" | "map">("grid");
  const [compareList, setCompareList] = useState<ScoredProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ScoredProject | null>(
    null,
  );
  const [sheetProject, setSheetProject] = useState<ScoredProject | null>(null);
  const [enquiryProject, setEnquiryProject] = useState<ScoredProject | null>(
    null,
  );
  const [recBudget, setRecBudget] = useState("100");
  const [recZone, setRecZone] = useState("All");
  const [recommendations, setRecommendations] = useState(() =>
    getRecommendations(100, "All"),
  );
  const [hotspots] = useState(() => getHotspots());
  const [priceInsights] = useState(() => getPriceInsights());
  const [aiStrongBuys] = useState(() => getStrongBuyProjects(10));
  const [aiHotspots] = useState(() => getAIHotspots());
  const [aiBuyProjects] = useState(() => getTopRankedByFlag("BUY", 5));
  const [expandedAICard, setExpandedAICard] = useState<string | null>(null);

  const filteredProjects = useMemo(() => filterProjects(filters), [filters]);

  const fetchSuggestions = useCallback((q: string) => {
    if (q.length <= 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const lower = q.toLowerCase();
    const results: { type: string; label: string; value: string }[] = [];
    const builderSeen = new Set<string>();
    const localitySeen = new Set<string>();
    for (const p of SCORED_PROJECTS) {
      if (results.length >= 8) break;
      if (
        !builderSeen.has(p.builder) &&
        p.builder.toLowerCase().includes(lower)
      ) {
        builderSeen.add(p.builder);
        results.push({ type: "Builder", label: p.builder, value: p.builder });
      }
      if (
        !localitySeen.has(p.locality) &&
        p.locality.toLowerCase().includes(lower)
      ) {
        localitySeen.add(p.locality);
        results.push({
          type: "Locality",
          label: p.locality,
          value: p.locality,
        });
      }
      if (p.name.toLowerCase().includes(lower)) {
        results.push({ type: "Project", label: p.name, value: p.name });
      }
    }
    setSuggestions(results.slice(0, 8));
    setShowSuggestions(results.length > 0);
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setFilters((f) => ({ ...f, searchText: value || undefined }));
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(
        () => fetchSuggestions(value),
        300,
      );
    },
    [fetchSuggestions],
  );

  const handleSuggestionSelect = useCallback(
    (s: { type: string; label: string; value: string }) => {
      setSearchQuery(s.label);
      setFilters((f) => ({ ...f, searchText: s.label }));
      setSuggestions([]);
      setShowSuggestions(false);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const zoneAvgs = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const p of SCORED_PROJECTS) {
      if (!map[p.zone]) map[p.zone] = [];
      map[p.zone].push(p.score.avgPrice);
    }
    const avgs: Record<string, number> = {};
    for (const [z, prices] of Object.entries(map)) {
      avgs[z] = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    }
    return avgs;
  }, []);

  function handleCompare(p: ScoredProject) {
    setCompareList((prev) => {
      if (prev.some((c) => c.id === p.id))
        return prev.filter((c) => c.id !== p.id);
      if (prev.length >= 3) return prev;
      return [...prev, p];
    });
  }

  function handleEnquire(p: ScoredProject) {
    console.log("Enquiry clicked", p.id);
    setEnquiryProject(p);
  }

  function handleGetRecs() {
    const budget = Number(recBudget);
    if (!budget || budget <= 0) {
      toast.error("Please enter a valid budget");
      return;
    }
    setRecommendations(getRecommendations(budget, recZone));
  }

  return (
    <div className="space-y-8">
      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-6 px-1">
        {[
          {
            label: "Total Projects",
            val: SCORED_PROJECTS.length,
            icon: Building2,
          },
          { label: "Zones Covered", val: UNIQUE_ZONES.length, icon: MapPin },
          { label: "Filtered", val: filteredProjects.length, icon: Search },
        ].map(({ label, val, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
              <Icon size={14} className="text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">{val}</p>
              <p className="text-white/40 text-[11px]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Layout: Filters + Content */}
      <div className="flex gap-6">
        {/* Filter Panel */}
        <aside className="w-64 flex-shrink-0 space-y-5">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-5 sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Filters</h3>
              <button
                type="button"
                data-ocid="projects.filter.reset.button"
                onClick={() => setFilters({})}
                className="flex items-center gap-1 text-white/40 hover:text-[#D4AF37] text-xs transition-colors"
              >
                <RotateCcw size={11} /> Reset
              </button>
            </div>

            {/* Search */}
            <div>
              <p className="text-white/50 text-[11px] uppercase tracking-wider block mb-1.5">
                Search
              </p>
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 z-10"
                />
                <input
                  type="text"
                  data-ocid="projects.search_input"
                  placeholder="Project, builder, locality..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() =>
                    searchQuery.length > 1 && setShowSuggestions(true)
                  }
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 150)
                  }
                  onKeyDown={(e) =>
                    e.key === "Escape" && setShowSuggestions(false)
                  }
                  autoComplete="off"
                  className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/40 transition-all"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#0D1B2A] border border-white/10 rounded-xl shadow-2xl z-[9999] max-h-72 overflow-y-auto">
                    {suggestions.map((s) => (
                      <button
                        key={`${s.type}-${s.value}`}
                        type="button"
                        onMouseDown={() => handleSuggestionSelect(s)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                      >
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${
                            s.type === "Builder"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : s.type === "Locality"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-purple-500/20 text-purple-400"
                          }`}
                        >
                          {s.type}
                        </span>
                        <span className="text-white/80 text-xs truncate">
                          {s.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Budget */}
            <div>
              <p className="text-white/50 text-[11px] uppercase tracking-wider block mb-1.5">
                Budget (Lakhs ₹)
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.budgetMin ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      budgetMin: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/40 transition-all"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.budgetMax ?? ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      budgetMax: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/40 transition-all"
                />
              </div>
            </div>

            {/* Property Type */}
            <div>
              <p className="text-white/50 text-[11px] uppercase tracking-wider block mb-1.5">
                Property Type
              </p>
              <div className="flex flex-wrap gap-1.5">
                {UNIQUE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    data-ocid="projects.filter.type.button"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        propertyType: t === "All" ? undefined : t,
                      }))
                    }
                    className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                      (t === "All" && !filters.propertyType) ||
                      filters.propertyType === t
                        ? "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30"
                        : "bg-white/5 text-white/50 border-white/10 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* BHK */}
            <div>
              <p className="text-white/50 text-[11px] uppercase tracking-wider block mb-1.5">
                BHK
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["All", "1BHK", "2BHK", "3BHK", "4BHK"].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        bhk: b === "All" ? undefined : b,
                      }))
                    }
                    className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                      (b === "All" && !filters.bhk) || filters.bhk === b
                        ? "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30"
                        : "bg-white/5 text-white/50 border-white/10 hover:text-white"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Zone */}
            <div>
              <p className="text-white/50 text-[11px] uppercase tracking-wider block mb-1.5">
                Zone
              </p>
              <select
                data-ocid="projects.filter.zone.select"
                value={filters.zone ?? "All"}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    zone: e.target.value === "All" ? undefined : e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#D4AF37]/40 transition-all appearance-none"
              >
                <option value="All" className="bg-[#0D1B2A]">
                  All Zones
                </option>
                {UNIQUE_ZONES.map((z) => (
                  <option key={z} value={z} className="bg-[#0D1B2A]">
                    {z}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <p className="text-white/50 text-[11px] uppercase tracking-wider block mb-1.5">
                Status
              </p>
              <div className="flex flex-col gap-1.5">
                {UNIQUE_STATUS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    data-ocid="projects.filter.status.button"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        status: s === "All" ? undefined : s,
                      }))
                    }
                    className={`text-[11px] px-3 py-1.5 rounded-xl border text-left transition-all ${
                      (s === "All" && !filters.status) || filters.status === s
                        ? "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30"
                        : "bg-white/5 text-white/50 border-white/10 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-white/40 text-[11px] text-center pt-1 border-t border-white/5">
              {filteredProjects.length} of {SCORED_PROJECTS.length} projects
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Tab Toggle */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
            {(["grid", "map"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                data-ocid="projects.view.tab"
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  activeTab === tab
                    ? "bg-[#D4AF37] text-black"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {tab === "grid" ? "Grid View" : "Map View"}
              </button>
            ))}
          </div>

          {/* Grid View */}
          {activeTab === "grid" && (
            <div>
              {filteredProjects.length === 0 ? (
                <div
                  data-ocid="projects.list.empty_state"
                  className="flex flex-col items-center justify-center py-20 text-white/40"
                >
                  <Building2 size={40} className="mb-3 opacity-30" />
                  <p className="text-sm">No projects match your filters</p>
                  <button
                    type="button"
                    onClick={() => setFilters({})}
                    className="mt-3 text-[#D4AF37] text-xs hover:underline"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredProjects.map((p, i) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      index={i}
                      compareList={compareList}
                      onWhyBuy={setSelectedProject}
                      onCompare={handleCompare}
                      onEnquire={handleEnquire}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Map View */}
          {activeTab === "map" && (
            <div
              style={{
                height: "580px",
                minHeight: "500px",
                position: "relative",
                zIndex: 1,
              }}
            >
              <MapView
                key={activeTab}
                projects={filteredProjects}
                onSelect={setSheetProject}
              />
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Section */}
      <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
            <Sparkles size={16} className="text-[#D4AF37]" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">AI Recommendations</h2>
            <p className="text-white/40 text-xs">
              Top projects matched to your budget
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <p className="text-white/50 text-xs block mb-1.5">
              Budget (₹ Lakhs)
            </p>
            <input
              type="number"
              data-ocid="projects.rec.budget_input"
              value={recBudget}
              onChange={(e) => setRecBudget(e.target.value)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#D4AF37]/40 w-40"
              placeholder="e.g. 100"
            />
          </div>
          <div>
            <p className="text-white/50 text-xs block mb-1.5">
              Preferred Zone (optional)
            </p>
            <select
              data-ocid="projects.rec.zone_select"
              value={recZone}
              onChange={(e) => setRecZone(e.target.value)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#D4AF37]/40 w-52 appearance-none"
            >
              <option value="All" className="bg-[#0D1B2A]">
                All Zones
              </option>
              {UNIQUE_ZONES.map((z) => (
                <option key={z} value={z} className="bg-[#0D1B2A]">
                  {z}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            data-ocid="projects.rec.submit_button"
            onClick={handleGetRecs}
            className="flex items-center gap-2 bg-[#D4AF37] text-black font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-[#B8960C] transition-all"
          >
            <Sparkles size={15} /> Get Recommendations
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {recommendations.map((rec, i) => (
            <div
              key={rec.project.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 hover:border-[#D4AF37]/20 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-full bg-[#D4AF37] text-black font-bold text-xs flex items-center justify-center flex-shrink-0">
                  #{i + 1}
                </span>
                <span
                  className={`text-xs font-bold ${getScoreColor(rec.project.score.investmentScore)}`}
                >
                  {rec.project.score.investmentScore}
                </span>
              </div>
              <p
                className="text-white font-semibold text-xs leading-tight truncate"
                title={rec.project.name}
              >
                {rec.project.name}
              </p>
              <p className="text-white/50 text-[10px]">
                {rec.project.locality}
              </p>
              <p className="text-[#D4AF37] text-[11px] font-semibold">
                {formatPrice(rec.project.price_min)}
              </p>
              <p className="text-white/50 text-[10px] italic leading-tight">
                {rec.reason}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Hotspots Section */}
      <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Zap size={16} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">
              Hotspot Micro-Markets
            </h2>
            <p className="text-white/40 text-xs">
              Top 10 ranked by activity, launches & growth
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {hotspots.map((h) => (
            <div
              key={h.locality}
              className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:border-orange-500/20 transition-all"
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5 ${h.rank <= 3 ? "bg-[#D4AF37] text-black" : "bg-white/10 text-white/70"}`}
              >
                {h.rank}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold text-sm">
                    {h.locality}
                  </p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 flex-shrink-0">
                    {h.zone.replace(" Bangalore", "")}
                  </span>
                </div>
                <p className="text-white/40 text-[11px] mt-0.5 truncate">
                  {h.reason}
                </p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="text-white font-bold text-xs">
                      {h.projectCount}
                    </span>
                    <span className="text-white/40 text-[11px]">Projects</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-400 font-bold text-xs">
                      {h.newLaunches}
                    </span>
                    <span className="text-white/40 text-[11px]">New</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-[100px]">
                    <span className="text-white/40 text-[11px] flex-shrink-0">
                      Score
                    </span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                        style={{ width: `${h.hotspotScore}%` }}
                      />
                    </div>
                    <span className="text-orange-400 font-bold text-xs flex-shrink-0">
                      {h.hotspotScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Price Insights Section */}
      <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <BarChart2 size={16} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Price Insights</h2>
            <p className="text-white/40 text-xs">
              Market pricing across zones, types & budgets
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* By Zone */}
          <div>
            <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              By Zone
            </h3>
            <div className="space-y-2">
              {priceInsights.byZone.map((z) => (
                <div
                  key={z.zone}
                  className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2"
                >
                  <div>
                    <p className="text-white text-xs font-medium">
                      {z.zone.replace(" Bangalore", "")}
                    </p>
                    <p className="text-white/40 text-[10px]">
                      {z.count} projects
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#D4AF37] text-xs font-bold">
                      {formatPrice(z.avgPrice)}
                    </p>
                    <p className="text-white/50 text-[10px]">
                      {formatPrice(z.minPrice)}–{formatPrice(z.maxPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Type */}
          <div>
            <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              By Property Type
            </h3>
            <div className="space-y-2">
              {priceInsights.byType.map((t) => (
                <div
                  key={t.type}
                  className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2"
                >
                  <div>
                    <p className="text-white text-xs font-medium">{t.type}</p>
                    <p className="text-white/40 text-[10px]">
                      {t.count} projects
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#D4AF37] text-xs font-bold">
                      {formatPrice(t.avgPrice)}
                    </p>
                    <p className="text-white/50 text-[10px]">
                      {formatPrice(t.minPrice)}–{formatPrice(t.maxPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Buckets */}
          <div>
            <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              Budget Distribution
            </h3>
            <div className="space-y-3">
              {priceInsights.budgetBuckets.map((b, i) => {
                const colors = [
                  "bg-blue-500",
                  "bg-emerald-500",
                  "bg-purple-500",
                  "bg-[#D4AF37]",
                ];
                return (
                  <div key={b.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/70">{b.range}</span>
                      <span className="text-white font-semibold">
                        {b.count}{" "}
                        <span className="text-white/40">({b.percentage}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[i]}`}
                        style={{ width: `${b.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* AI Master Score Section */}
      <section className="px-4 sm:px-6 py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">
                AI Master Score Rankings
              </h2>
              <p className="text-white/50 text-xs">
                Full 8-factor engine: Location · Price · Growth · Rental · Risk
                · Approval · Micro · Future Upside
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            {(["STRONG BUY", "BUY", "Hotspots"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() =>
                  setExpandedAICard(expandedAICard === tab ? null : tab)
                }
                className={
                  expandedAICard === tab
                    ? "px-4 py-1.5 rounded-full text-xs font-semibold bg-[#D4AF37] text-black"
                    : "px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white/60 hover:bg-white/15"
                }
              >
                {tab === "STRONG BUY" && (
                  <span>&#127942; {aiStrongBuys.length} Strong Buy</span>
                )}
                {tab === "BUY" && (
                  <span>&#9989; {aiBuyProjects.length} Buy</span>
                )}
                {tab === "Hotspots" && <span>&#128293; AI Hotspots</span>}
              </button>
            ))}
          </div>

          {/* STRONG BUY Grid */}
          {(expandedAICard === "STRONG BUY" || expandedAICard === null) && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {aiStrongBuys.slice(0, 6).map((p, i) => (
                <AIStrongBuyCard key={p.project_id} project={p} rank={i + 1} />
              ))}
            </div>
          )}

          {/* BUY Grid */}
          {expandedAICard === "BUY" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {aiBuyProjects.map((p, i) => (
                <AIStrongBuyCard key={p.project_id} project={p} rank={i + 1} />
              ))}
            </div>
          )}

          {/* Hotspots Table */}
          {expandedAICard === "Hotspots" && (
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-7 gap-2 px-4 py-2 bg-white/5 border-b border-white/10 text-[10px] text-white/40 font-semibold uppercase tracking-wider">
                <span>#</span>
                <span className="col-span-2">Micro Location</span>
                <span className="text-center">Growth</span>
                <span className="text-center">Rental</span>
                <span className="text-center">Infra</span>
                <span className="text-center">AI Score</span>
              </div>
              {aiHotspots.map((h) => (
                <div
                  key={h.micro_location}
                  className="grid grid-cols-7 gap-2 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <span className="text-[#D4AF37] font-bold text-sm">
                    #{h.rank}
                  </span>
                  <div className="col-span-2">
                    <div className="text-white text-xs font-semibold">
                      {h.micro_location}
                    </div>
                    <div className="text-white/40 text-[10px]">{h.ai_tag}</div>
                  </div>
                  <span className="text-center text-xs text-emerald-400">
                    #{h.growth_rank}
                  </span>
                  <span className="text-center text-xs text-blue-400">
                    #{h.rental_rank}
                  </span>
                  <span className="text-center text-xs text-purple-400">
                    #{h.infra_rank}
                  </span>
                  <div className="text-center">
                    <span className="text-xs font-bold text-[#D4AF37]">
                      {h.avg_ai_score}
                    </span>
                    <div className="text-[9px] text-white/30">
                      {h.project_count} proj
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Buy Modal */}
      <WhyBuyModal
        project={selectedProject}
        zoneAvgs={zoneAvgs}
        onClose={() => setSelectedProject(null)}
      />

      {/* Bottom Sheet (map mode) */}
      {activeTab === "map" && (
        <BottomSheet
          project={sheetProject}
          zoneAvgs={zoneAvgs}
          compareList={compareList}
          onClose={() => setSheetProject(null)}
          onWhyBuy={setSelectedProject}
          onCompare={handleCompare}
          onEnquire={handleEnquire}
        />
      )}

      {/* Compare Tray */}
      <CompareTray
        compareList={compareList}
        onRemove={(id) =>
          setCompareList((prev) => prev.filter((p) => p.id !== id))
        }
        onClear={() => setCompareList([])}
      />

      {/* Enquiry Modal */}
      <EnquiryModal
        project={enquiryProject}
        onClose={() => setEnquiryProject(null)}
      />
    </div>
  );
}
