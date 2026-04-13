import { MapPin } from "lucide-react";
import type { LocationRecord } from "../data/locationData";

interface NearbyChipsProps {
  localities: LocationRecord[];
  onSelect?: (loc: LocationRecord) => void;
  currentId?: string;
}

export default function NearbyChips({
  localities,
  onSelect,
  currentId,
}: NearbyChipsProps) {
  if (localities.length === 0) return null;
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
      style={{ scrollbarWidth: "none" }}
    >
      {localities.map((loc, i) => (
        <button
          type="button"
          key={loc.id}
          onClick={() => onSelect?.(loc)}
          className={`nearby-chip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all hover:-translate-y-0.5 hover:shadow-md ${
            loc.id === currentId
              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 hover:text-white"
          }`}
          style={{ animationDelay: `${i * 50}ms` }}
          data-ocid={`nearby.item.${i + 1}`}
        >
          <MapPin size={11} className="shrink-0" />
          {loc.name}
        </button>
      ))}
    </div>
  );
}
