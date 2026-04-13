import { TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import SellerLayout from "../components/SellerLayout";

const MY_LISTINGS = [
  {
    id: 1,
    title: "Prestige Park 3BHK, Whitefield",
    type: "3BHK Apartment",
    myPrice: 1.28,
    myArea: 1420,
    myPSF: 9014,
  },
  {
    id: 2,
    title: "Sobha Villa, Sarjapur",
    type: "Villa",
    myPrice: 2.45,
    myArea: 2800,
    myPSF: 8750,
  },
  {
    id: 3,
    title: "Brigade Plot, Devanahalli",
    type: "Plot",
    myPrice: 0.62,
    myArea: 1200,
    myPSF: 5167,
  },
  {
    id: 4,
    title: "Godrej Commercial, Electronic City",
    type: "Commercial",
    myPrice: 1.85,
    myArea: 3200,
    myPSF: 5781,
  },
];

const COMPS_BY_TYPE: Record<
  string,
  {
    id: number;
    project: string;
    price: number;
    area: number;
    psf: number;
    daysListed: number;
    popularity: number;
  }[]
> = {
  "3BHK Apartment": [
    {
      id: 2,
      project: "Sobha Dream Acres",
      price: 1.15,
      area: 1380,
      psf: 8333,
      daysListed: 14,
      popularity: 88,
    },
    {
      id: 3,
      project: "Brigade Cornerstone",
      price: 1.22,
      area: 1400,
      psf: 8714,
      daysListed: 28,
      popularity: 81,
    },
    {
      id: 4,
      project: "Godrej Woodland",
      price: 1.35,
      area: 1450,
      psf: 9310,
      daysListed: 45,
      popularity: 64,
    },
    {
      id: 5,
      project: "Puravankara Zenium",
      price: 1.18,
      area: 1390,
      psf: 8489,
      daysListed: 7,
      popularity: 95,
    },
    {
      id: 6,
      project: "Tata Carnatica",
      price: 1.3,
      area: 1410,
      psf: 9220,
      daysListed: 31,
      popularity: 76,
    },
    {
      id: 7,
      project: "Salarpuria Sattva",
      price: 1.25,
      area: 1430,
      psf: 8741,
      daysListed: 19,
      popularity: 83,
    },
    {
      id: 8,
      project: "Embassy Springs",
      price: 1.42,
      area: 1480,
      psf: 9595,
      daysListed: 55,
      popularity: 59,
    },
  ],
  Villa: [
    {
      id: 10,
      project: "Prestige Woodside",
      price: 2.2,
      area: 2600,
      psf: 8462,
      daysListed: 21,
      popularity: 82,
    },
    {
      id: 11,
      project: "Salarpuria Greenage",
      price: 2.6,
      area: 2900,
      psf: 8966,
      daysListed: 38,
      popularity: 73,
    },
    {
      id: 12,
      project: "Total Environment",
      price: 2.35,
      area: 2750,
      psf: 8545,
      daysListed: 15,
      popularity: 91,
    },
    {
      id: 13,
      project: "Brigade Camellia",
      price: 2.8,
      area: 3000,
      psf: 9333,
      daysListed: 60,
      popularity: 65,
    },
  ],
  Plot: [
    {
      id: 20,
      project: "Devanahalli Layout A",
      price: 0.55,
      area: 1200,
      psf: 4583,
      daysListed: 10,
      popularity: 88,
    },
    {
      id: 21,
      project: "Aerospace Layout",
      price: 0.7,
      area: 1500,
      psf: 4667,
      daysListed: 25,
      popularity: 76,
    },
    {
      id: 22,
      project: "Golden Mile Plots",
      price: 0.45,
      area: 1000,
      psf: 4500,
      daysListed: 7,
      popularity: 92,
    },
  ],
  Commercial: [
    {
      id: 30,
      project: "Electronic City Phase 2",
      price: 1.6,
      area: 2800,
      psf: 5714,
      daysListed: 20,
      popularity: 84,
    },
    {
      id: 31,
      project: "Bagmane Tech Park",
      price: 2.1,
      area: 3500,
      psf: 6000,
      daysListed: 45,
      popularity: 71,
    },
    {
      id: 32,
      project: "Outer Ring Road Office",
      price: 1.7,
      area: 3000,
      psf: 5667,
      daysListed: 12,
      popularity: 89,
    },
  ],
};

export default function SellerCompetitionPage() {
  const [selectedListingId, setSelectedListingId] = useState(1);

  const myListing = MY_LISTINGS.find((l) => l.id === selectedListingId)!;
  const comps = COMPS_BY_TYPE[myListing.type] ?? [];

  const avgPSF = useMemo(() => {
    if (!comps.length) return myListing.myPSF;
    return Math.round(comps.reduce((s, c) => s + c.psf, 0) / comps.length);
  }, [comps, myListing.myPSF]);

  const diff = (((myListing.myPSF - avgPSF) / avgPSF) * 100).toFixed(1);

  const allRows = [
    {
      id: 0,
      project: `Your Property (${myListing.title.split(",")[0]})`,
      price: myListing.myPrice,
      area: myListing.myArea,
      psf: myListing.myPSF,
      daysListed: 62,
      popularity: 72,
      highlight: true,
    },
    ...comps.map((c) => ({ ...c, highlight: false })),
  ];

  return (
    <SellerLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Competition <span className="text-[#D4AF37]">Intelligence</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">
            How your listing compares to nearby properties
          </p>
        </div>

        {/* Property Selector */}
        <div className="flex flex-wrap gap-2">
          {MY_LISTINGS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setSelectedListingId(l.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedListingId === l.id
                  ? "bg-[#D4AF37] text-black"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              {l.title}
            </button>
          ))}
        </div>

        {/* Summary */}
        <motion.div
          key={selectedListingId}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${Number.parseFloat(diff) > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30"} border rounded-2xl p-5 flex items-center gap-4`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${Number.parseFloat(diff) > 0 ? "bg-amber-500/20" : "bg-emerald-500/20"}`}
          >
            {Number.parseFloat(diff) > 0 ? (
              <TrendingUp size={24} className="text-amber-400" />
            ) : (
              <TrendingDown size={24} className="text-emerald-400" />
            )}
          </div>
          <div>
            <p
              className={`text-lg font-bold ${Number.parseFloat(diff) > 0 ? "text-amber-400" : "text-emerald-400"}`}
            >
              You are priced {Math.abs(Number.parseFloat(diff))}%{" "}
              {Number.parseFloat(diff) > 0 ? "above" : "below"} area average
            </p>
            <p className="text-white/50 text-sm">
              Your price: ₹{myListing.myPSF.toLocaleString()}/sqft · Area avg: ₹
              {avgPSF.toLocaleString()}/sqft
            </p>
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          key={`table-${selectedListingId}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
          data-ocid="seller.competition.table"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {[
                    "Project",
                    "Price",
                    "Area (sqft)",
                    "₹/sqft",
                    "Days Listed",
                    "Popularity",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-white/40 text-xs font-medium px-4 py-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allRows.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.04 }}
                    className={`border-b border-white/5 ${c.highlight ? "bg-[#D4AF37]/10" : "hover:bg-white/3"} transition-colors`}
                    data-ocid={`seller.competition.row.${i + 1}`}
                  >
                    <td className="px-4 py-3">
                      <p
                        className={`text-sm font-medium ${c.highlight ? "text-[#D4AF37]" : "text-white"}`}
                      >
                        {c.project}
                      </p>
                      {c.highlight && (
                        <span className="text-xs text-[#D4AF37]/60">
                          Your listing
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white font-bold text-sm">
                      ₹{c.price} Cr
                    </td>
                    <td className="px-4 py-3 text-white/60 text-sm">
                      {c.area.toLocaleString()}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold text-sm ${c.highlight ? "text-[#D4AF37]" : "text-white/80"}`}
                    >
                      ₹{c.psf.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm ${c.daysListed > 45 ? "text-red-400" : c.daysListed < 20 ? "text-emerald-400" : "text-white/60"}`}
                      >
                        {c.daysListed}d
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#D4AF37] rounded-full"
                            style={{ width: `${c.popularity}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/50">
                          {c.popularity}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </SellerLayout>
  );
}
