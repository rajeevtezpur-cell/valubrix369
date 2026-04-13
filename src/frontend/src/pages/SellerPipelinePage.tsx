import { motion } from "motion/react";
import { useEffect, useState } from "react";
import SellerLayout from "../components/SellerLayout";

const STAGES = [
  {
    label: "Offer Accepted",
    color: "border-[#D4AF37]",
    headerColor: "text-[#D4AF37]",
  },
  {
    label: "Agreement Signed",
    color: "border-blue-500",
    headerColor: "text-blue-400",
  },
  {
    label: "Loan Processing",
    color: "border-purple-500",
    headerColor: "text-purple-400",
  },
  {
    label: "Registration",
    color: "border-orange-500",
    headerColor: "text-orange-400",
  },
  {
    label: "Completed Sale",
    color: "border-emerald-500",
    headerColor: "text-emerald-400",
  },
];

const INITIAL_DEALS = [
  {
    id: 1,
    buyer: "Arjun Mehta",
    property: "Prestige Park 3BHK, Whitefield",
    value: 1.28,
    daysInStage: 3,
    stage: "Offer Accepted",
  },
  {
    id: 2,
    buyer: "Priya Sharma",
    property: "Sobha Villa, Sarjapur",
    value: 2.4,
    daysInStage: 7,
    stage: "Agreement Signed",
  },
  {
    id: 3,
    buyer: "Ravi Kumar",
    property: "Prestige Park 3BHK, Whitefield",
    value: 1.28,
    daysInStage: 12,
    stage: "Loan Processing",
  },
  {
    id: 4,
    buyer: "Deepa Iyer",
    property: "Brigade Apartment, Sarjapur",
    value: 0.95,
    daysInStage: 5,
    stage: "Registration",
  },
  {
    id: 5,
    buyer: "Suresh Babu",
    property: "Godrej Commercial, Electronic City",
    value: 1.72,
    daysInStage: 2,
    stage: "Completed Sale",
  },
  {
    id: 6,
    buyer: "Kavya Nair",
    property: "Tata Carnatica 2BHK",
    value: 0.88,
    daysInStage: 8,
    stage: "Loan Processing",
  },
];

const STAGE_BG: Record<string, string> = {
  "Offer Accepted": "bg-[#D4AF37]/10",
  "Agreement Signed": "bg-blue-500/10",
  "Loan Processing": "bg-purple-500/10",
  Registration: "bg-orange-500/10",
  "Completed Sale": "bg-emerald-500/10",
};

export default function SellerPipelinePage() {
  const [deals, setDeals] = useState(() => {
    try {
      const saved = localStorage.getItem("valubrix_pipeline_deals");
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_DEALS;
  });
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const totalValue = deals.reduce((s, d) => s + d.value, 0);

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (draggingId !== null) {
      setDeals((prev) => {
        const updated = prev.map((d) =>
          d.id === draggingId
            ? { ...d, stage: targetStage, daysInStage: 0 }
            : d,
        );
        try {
          localStorage.setItem(
            "valubrix_pipeline_deals",
            JSON.stringify(updated),
          );
        } catch {}
        return updated;
      });
    }
    setDraggingId(null);
    setDragOverStage(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverStage(null);
  };

  return (
    <SellerLayout>
      <div className="max-w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Deals <span className="text-[#D4AF37]">Pipeline</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">
              {deals.length} active deals · ₹{totalValue.toFixed(2)} Cr total
              value
            </p>
          </div>
          <p className="text-white/30 text-xs">
            Drag cards between stages to update
          </p>
        </div>

        <div className="grid grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage.label);
            const isOver = dragOverStage === stage.label;
            return (
              <div
                key={stage.label}
                onDragOver={(e) => handleDragOver(e, stage.label)}
                onDrop={(e) => handleDrop(e, stage.label)}
                onDragLeave={() => setDragOverStage(null)}
                className={`min-h-[300px] rounded-2xl border-2 p-3 transition-all duration-200 ${
                  isOver
                    ? `${stage.color} bg-white/5`
                    : "border-white/10 bg-white/3"
                }`}
              >
                <div className="mb-3">
                  <h3
                    className={`font-bold text-xs uppercase tracking-wide ${stage.headerColor}`}
                  >
                    {stage.label}
                  </h3>
                  <p className="text-white/30 text-xs">
                    {stageDeals.length} deal{stageDeals.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="space-y-2">
                  {stageDeals.map((deal) => (
                    <motion.div
                      key={deal.id}
                      draggable
                      onDragStart={(e) =>
                        handleDragStart(
                          e as unknown as React.DragEvent,
                          deal.id,
                        )
                      }
                      onDragEnd={handleDragEnd}
                      whileHover={{ scale: 1.02 }}
                      className={`p-3 rounded-xl cursor-grab active:cursor-grabbing border border-white/10 transition-all ${
                        draggingId === deal.id
                          ? "opacity-40"
                          : STAGE_BG[deal.stage]
                      }`}
                    >
                      <p className="text-white font-medium text-xs">
                        {deal.buyer}
                      </p>
                      <p className="text-white/40 text-xs truncate mt-0.5">
                        {deal.property}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[#D4AF37] font-bold text-xs">
                          ₹{deal.value} Cr
                        </span>
                        <span className="text-white/30 text-xs">
                          {deal.daysInStage}d
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  {stageDeals.length === 0 && isOver && (
                    <div className="h-16 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
                      <p className="text-white/30 text-xs">Drop here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SellerLayout>
  );
}
