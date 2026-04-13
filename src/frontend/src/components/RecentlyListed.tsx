import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Maximize2 } from "lucide-react";
import { useRecentListings } from "../hooks/useQueries";
import { useScrollReveal } from "../hooks/useScrollReveal";

const FALLBACK_LISTINGS = [
  {
    id: "f1",
    title: "3BHK Premium Flat, Bandra West",
    price: 28500000,
    areaSqFt: 1450,
    propertyType: "Apartment",
    location: "Bandra West, Mumbai",
    badges: ["High Liquidity", "Golden Verified"],
    gradient: "linear-gradient(135deg, #1a2744, #0d1a3a)",
  },
  {
    id: "f2",
    title: "Independent Villa, Whitefield",
    price: 15200000,
    areaSqFt: 2800,
    propertyType: "Villa",
    location: "Whitefield, Bangalore",
    badges: ["High Value Asset", "Golden Verified"],
    gradient: "linear-gradient(135deg, #0f2744, #071a30)",
  },
  {
    id: "f3",
    title: "Commercial Office Space, Cyber City",
    price: 62000000,
    areaSqFt: 4200,
    propertyType: "Commercial",
    location: "Cyber City, Gurugram",
    badges: ["High Liquidity", "High Value Asset"],
    gradient: "linear-gradient(135deg, #102244, #0a1830)",
  },
];

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  "High Liquidity": { bg: "rgba(59,130,246,0.15)", color: "#3B82F6" },
  "Golden Verified": { bg: "rgba(201,168,76,0.15)", color: "#C9A84C" },
  "High Value Asset": { bg: "rgba(22,199,132,0.15)", color: "#16C784" },
};

function formatPrice(price: number) {
  if (price >= 10000000) return `\u20b9${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `\u20b9${(price / 100000).toFixed(1)} L`;
  return `\u20b9${price.toLocaleString("en-IN")}`;
}

interface CardData {
  id: string | bigint;
  title: string;
  price: number | bigint;
  areaSqFt?: number | bigint;
  carpetArea?: number | bigint;
  propertyType: string;
  location: string;
  badges: string[];
  gradient?: string;
}

function PropertyCard({ card, index }: { card: CardData; index: number }) {
  const gradients = [
    "linear-gradient(135deg, #1a2744, #0d1a3a)",
    "linear-gradient(135deg, #0f2744, #071a30)",
    "linear-gradient(135deg, #102244, #0a1830)",
  ];
  const gradient = card.gradient ?? gradients[index % gradients.length];
  const price =
    typeof card.price === "bigint" ? Number(card.price) : card.price;
  const area =
    typeof card.areaSqFt === "bigint"
      ? Number(card.areaSqFt)
      : (card.areaSqFt ??
        (typeof card.carpetArea === "bigint"
          ? Number(card.carpetArea)
          : (card.carpetArea ?? 0)));

  return (
    <div
      className="glass-card overflow-hidden flex flex-col"
      data-ocid={`properties.item.${index + 1}`}
    >
      <div className="h-44 relative" style={{ background: gradient }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 30% 50%, rgba(201,168,76,0.08), transparent)",
          }}
        />
        <div className="absolute bottom-3 right-3 flex flex-wrap gap-1 justify-end">
          {card.badges.map((badge) => {
            const badgeStyle = BADGE_COLORS[badge] ?? {
              bg: "rgba(255,255,255,0.1)",
              color: "#fff",
            };
            return (
              <span
                key={badge}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: badgeStyle.bg,
                  color: badgeStyle.color,
                  border: `1px solid ${badgeStyle.color}40`,
                }}
              >
                {badge}
              </span>
            );
          })}
        </div>
      </div>
      <div className="p-5 flex flex-col gap-3 flex-1">
        <h3 className="font-bold text-white text-sm leading-snug line-clamp-2">
          {card.title}
        </h3>
        <div className="flex items-center gap-1 text-white/45 text-xs">
          <MapPin size={12} />
          <span>{card.location}</span>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <span
            className="font-bold text-base"
            style={{
              color: "#C9A84C",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            {formatPrice(price)}
          </span>
          <div className="flex items-center gap-1 text-white/40 text-xs">
            <Maximize2 size={11} />
            <span>{area.toLocaleString("en-IN")} sqft</span>
          </div>
        </div>
        <div
          className="text-xs px-2 py-0.5 rounded self-start"
          style={{
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          {card.propertyType}
        </div>
      </div>
    </div>
  );
}

export default function RecentlyListed() {
  const { data, isLoading } = useRecentListings(6);
  const ref = useScrollReveal();
  const listings: CardData[] =
    data && data.length > 0
      ? data.map((l) => ({
          ...l,
          id: String(l.id),
          gradient: undefined,
          areaSqFt: Number(l.areaSqft),
          location: l.locality,
          price: Number(l.priceInr),
          badges: [l.stage],
        }))
      : FALLBACK_LISTINGS;

  return (
    <section className="py-20 max-w-6xl mx-auto px-4" id="search">
      <div ref={ref as React.RefObject<HTMLDivElement>}>
        <div className="text-center mb-14">
          <p className="text-[#C9A84C] text-sm font-semibold uppercase tracking-widest mb-3">
            Live Market
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Recently Listed Properties
          </h2>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable id
              <div key={i} className="glass-card overflow-hidden">
                <Skeleton className="h-44 w-full skeleton" />
                <div className="p-5 flex flex-col gap-3">
                  <Skeleton className="h-4 w-3/4 skeleton" />
                  <Skeleton className="h-3 w-1/2 skeleton" />
                  <Skeleton className="h-5 w-1/3 skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((card, i) => (
              <PropertyCard key={String(card.id)} card={card} index={i} />
            ))}
          </div>
        )}
        {listings.length === 0 && !isLoading && (
          <div
            className="glass-card p-16 text-center"
            data-ocid="properties.empty_state"
          >
            <p className="text-white/40">
              No properties listed yet. Be the first to list yours.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
