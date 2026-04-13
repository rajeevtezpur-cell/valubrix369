import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { BANGALORE_PROJECTS } from "../data/bangaloreProjects";
import { addSaleFeedbackAndRetrain } from "../engines/linearRegressionEngine";
import { useActor } from "../hooks/useActor";
import { filterBuildersByLocality } from "../utils/projectFilter";
import LocalityDropdown from "./LocalityDropdown";
import ProjectLinkedDropdown from "./ProjectLinkedDropdown";

interface Props {
  open: boolean;
  onClose: () => void;
  initialLocality?: string;
  initialPropertyType?: string;
}

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "villa", label: "Villa" },
  { value: "plot", label: "Plot / Land" },
  { value: "commercial", label: "Commercial" },
] as const;

type PropertyType = "apartment" | "villa" | "plot" | "commercial" | "";

export default function SubmitSoldPriceModal({
  open,
  onClose,
  initialLocality = "",
  initialPropertyType = "",
}: Props) {
  const { actor } = useActor();
  const [locality, setLocality] = useState(initialLocality);
  const [propertyType, setPropertyType] = useState<PropertyType>(
    (PROPERTY_TYPES.some((t) => t.value === initialPropertyType)
      ? initialPropertyType
      : "") as PropertyType,
  );
  const [builder, setBuilder] = useState("");
  const [project, setProject] = useState("");
  const [sqft, setSqft] = useState("");
  const [actualSoldPrice, setActualSoldPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleBuilderChange(val: string) {
    if (val === "__clear__") {
      setBuilder("");
      return;
    }
    setBuilder(val);
    if (project) {
      const proj = BANGALORE_PROJECTS.find((p) => p.name === project);
      if (proj && proj.builder !== val) setProject("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locality || !propertyType || !sqft || !actualSoldPrice) {
      toast.error("Please fill in all required fields.");
      return;
    }
    const sqftNum = Number.parseFloat(sqft);
    const soldNum = Number.parseFloat(actualSoldPrice);
    if (sqftNum <= 0 || soldNum <= 0) {
      toast.error("Please enter valid numbers.");
      return;
    }
    setSubmitting(true);
    addSaleFeedbackAndRetrain(
      locality,
      sqftNum,
      propertyType,
      soldNum,
      builder || undefined,
      project || undefined,
    );

    // Check if this submission triggered a 50-sample retraining cycle (non-blocking)
    try {
      const storedSales = localStorage.getItem("valubrix_user_sales");
      if (storedSales) {
        const parsedSales: unknown[] = JSON.parse(storedSales);
        if (parsedSales.length > 0 && parsedSales.length % 50 === 0) {
          setTimeout(() => {
            toast.success("AI model updated with new data", {
              description: `${parsedSales.length} user submissions incorporated into the model`,
              duration: 5000,
            });
          }, 500);
        }
      }
    } catch (_e) {
      // localStorage unavailable — skip
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actorAny: any = actor;
    if (actorAny?.submitSaleRecord) {
      actorAny
        .submitSaleRecord(
          locality,
          BigInt(Math.round(sqftNum)),
          propertyType,
          BigInt(Math.round(soldNum)),
        )
        .then((r: string) => console.log(`[ValuBrix] Backend: ${r}`))
        .catch((err: unknown) =>
          console.warn("[ValuBrix] Backend persist failed:", err),
        );
    }
    toast.success("Thank you! Your data helps improve AI accuracy.");
    setLocality(initialLocality);
    setPropertyType(
      (PROPERTY_TYPES.some((t) => t.value === initialPropertyType)
        ? initialPropertyType
        : "") as PropertyType,
    );
    setBuilder("");
    setProject("");
    setSqft("");
    setActualSoldPrice("");
    setSubmitting(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#0f0f1a] border border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">
            Submit Sold Price
          </DialogTitle>
          <DialogDescription className="text-amber-400 font-medium">
            Help improve AI accuracy
          </DialogDescription>
        </DialogHeader>
        <p className="text-white/50 text-sm -mt-2">
          Share real transaction data to improve ValuBrix AI valuation accuracy.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Locality */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">Locality *</Label>
            <LocalityDropdown
              value={locality}
              onChange={setLocality}
              placeholder="e.g. Koramangala, Bangalore"
              className="w-full"
            />
          </div>

          {/* Property Type */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">Property Type *</Label>
            <Select
              value={propertyType}
              onValueChange={(v) => setPropertyType(v as PropertyType)}
            >
              <SelectTrigger
                data-ocid="submit_sold.property_type.select"
                className="bg-white/5 border-white/10 text-white"
              >
                <SelectValue placeholder="Select property type" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Builder (optional) */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">
              Builder <span className="text-white/30">(optional)</span>
            </Label>
            <Select
              value={builder || "__none__"}
              onValueChange={handleBuilderChange}
            >
              <SelectTrigger
                data-ocid="submit_sold.builder.select"
                className="bg-white/5 border-white/10 text-white"
              >
                <SelectValue placeholder="Select builder (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10 text-white max-h-60">
                <SelectItem value="__clear__">— Clear selection —</SelectItem>
                {filterBuildersByLocality(locality).map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project (optional) */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">
              Project <span className="text-white/30">(optional)</span>
            </Label>
            <ProjectLinkedDropdown
              locality={locality}
              builder={builder}
              value={project}
              onChange={(projectName, builderName) => {
                setProject(projectName);
                if (builderName && !builder) setBuilder(builderName);
              }}
              placeholder="Select project (optional)"
              className="w-full"
            />
          </div>

          {/* Sqft */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">Area (sqft) *</Label>
            <Input
              data-ocid="submit_sold.sqft.input"
              type="number"
              min="100"
              value={sqft}
              onChange={(e) => setSqft(e.target.value)}
              placeholder="e.g. 1200"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          {/* Sold Price */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">
              Actual Sold Price (₹) *
            </Label>
            <Input
              data-ocid="submit_sold.sold_price.input"
              type="number"
              min="100000"
              value={actualSoldPrice}
              onChange={(e) => setActualSoldPrice(e.target.value)}
              placeholder="e.g. 8500000"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              data-ocid="submit_sold.cancel_button"
              className="text-white/50 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              data-ocid="submit_sold.submit_button"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              Submit Sale Data
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
