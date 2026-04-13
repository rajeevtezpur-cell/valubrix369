import type { LocationRecord } from "../data/locationData";

const typeBadge: Record<string, string> = {
  sector: "bg-cyan-500/20 text-cyan-300",
  layout: "bg-pink-500/20 text-pink-300",
  village: "bg-yellow-500/20 text-yellow-300",
  GP: "bg-amber-500/20 text-amber-300",
  locality: "bg-emerald-500/20 text-emerald-300",
};

interface SubLocalityPickerProps {
  subLocalities: LocationRecord[];
  onSelect?: (loc: LocationRecord) => void;
  selectedId?: string;
}

export default function SubLocalityPicker({
  subLocalities,
  onSelect,
  selectedId,
}: SubLocalityPickerProps) {
  if (subLocalities.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {subLocalities.map((loc, i) => (
        <button
          type="button"
          key={loc.id}
          onClick={() => onSelect?.(loc)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:scale-105 ${
            loc.id === selectedId
              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/8 hover:border-white/20 hover:text-white"
          }`}
          data-ocid={`sublocality.item.${i + 1}`}
        >
          {loc.name}
          <span
            className={`px-1 py-0.5 rounded text-[10px] ${typeBadge[loc.type] ?? "bg-white/10 text-white/50"}`}
          >
            {loc.type}
          </span>
        </button>
      ))}
    </div>
  );
}
