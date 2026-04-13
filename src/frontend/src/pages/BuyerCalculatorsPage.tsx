import { useState } from "react";
import BuyerLayout from "../components/BuyerLayout";

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  ocid,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  ocid?: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-white/60 text-sm">{label}</span>
        <span className="text-[#D4AF37] font-mono font-bold text-sm">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-ocid={ocid}
        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#D4AF37]"
      />
    </div>
  );
}

function ResultCard({
  label,
  value,
  color = "text-[#D4AF37]",
}: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
      <p className="text-white/50 text-xs mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}

function EMICalculator() {
  const [loan, setLoan] = useState(5000000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);

  const r = rate / 100 / 12;
  const n = tenure * 12;
  const emi = loan > 0 ? (loan * r * (1 + r) ** n) / ((1 + r) ** n - 1) : 0;
  const totalPay = emi * n;
  const totalInterest = totalPay - loan;

  return (
    <div className="space-y-5">
      <SliderField
        label="Loan Amount"
        value={loan}
        min={1000000}
        max={50000000}
        step={100000}
        onChange={setLoan}
        format={formatINR}
        ocid="buyer_calc.loan_amount.input"
      />
      <SliderField
        label="Interest Rate"
        value={rate}
        min={6}
        max={16}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v.toFixed(1)}%`}
        ocid="buyer_calc.interest_rate.input"
      />
      <SliderField
        label="Tenure"
        value={tenure}
        min={5}
        max={30}
        step={1}
        onChange={setTenure}
        format={(v) => `${v} yrs`}
        ocid="buyer_calc.tenure.input"
      />
      <div className="grid grid-cols-3 gap-3 pt-2">
        <ResultCard label="Monthly EMI" value={formatINR(emi)} />
        <ResultCard
          label="Total Interest"
          value={formatINR(totalInterest)}
          color="text-red-300"
        />
        <ResultCard
          label="Total Amount"
          value={formatINR(totalPay)}
          color="text-white"
        />
      </div>
    </div>
  );
}

function AffordabilityCalculator() {
  const [income, setIncome] = useState(200000);
  const [expenses, setExpenses] = useState(80000);
  const [downPayment, setDownPayment] = useState(2000000);
  const [rate, setRate] = useState(8.5);

  const monthlyRate = rate / 100 / 12;
  const emi = (income - expenses) * 0.4;
  const n = 240;
  const maxLoan =
    emi > 0
      ? (emi * ((1 + monthlyRate) ** n - 1)) /
        (monthlyRate * (1 + monthlyRate) ** n)
      : 0;
  const maxProperty = maxLoan + downPayment;

  return (
    <div className="space-y-5">
      <SliderField
        label="Monthly Income"
        value={income}
        min={50000}
        max={1000000}
        step={5000}
        onChange={setIncome}
        format={formatINR}
        ocid="buyer_calc.income.input"
      />
      <SliderField
        label="Monthly Expenses"
        value={expenses}
        min={10000}
        max={500000}
        step={5000}
        onChange={setExpenses}
        format={formatINR}
        ocid="buyer_calc.expenses.input"
      />
      <SliderField
        label="Down Payment"
        value={downPayment}
        min={500000}
        max={10000000}
        step={100000}
        onChange={setDownPayment}
        format={formatINR}
        ocid="buyer_calc.down_payment.input"
      />
      <SliderField
        label="Interest Rate"
        value={rate}
        min={6}
        max={16}
        step={0.1}
        onChange={setRate}
        format={(v) => `${v.toFixed(1)}%`}
        ocid="buyer_calc.afford_rate.input"
      />
      <div className="grid grid-cols-2 gap-3 pt-2">
        <ResultCard label="Max Loan Eligible" value={formatINR(maxLoan)} />
        <ResultCard
          label="Max Property Price"
          value={formatINR(maxProperty)}
          color="text-green-300"
        />
      </div>
    </div>
  );
}

function RentalYieldCalculator() {
  const [propValue, setPropValue] = useState(10000000);
  const [monthlyRent, setMonthlyRent] = useState(35000);
  const [annualExpenses, setAnnualExpenses] = useState(50000);

  const annualRent = monthlyRent * 12;
  const grossYield = (annualRent / propValue) * 100;
  const netYield = ((annualRent - annualExpenses) / propValue) * 100;
  const payback = netYield > 0 ? (100 / netYield).toFixed(1) : "—";

  return (
    <div className="space-y-5">
      <SliderField
        label="Property Value"
        value={propValue}
        min={2000000}
        max={50000000}
        step={500000}
        onChange={setPropValue}
        format={formatINR}
        ocid="buyer_calc.prop_value.input"
      />
      <SliderField
        label="Monthly Rent"
        value={monthlyRent}
        min={5000}
        max={200000}
        step={1000}
        onChange={setMonthlyRent}
        format={formatINR}
        ocid="buyer_calc.monthly_rent.input"
      />
      <SliderField
        label="Annual Expenses"
        value={annualExpenses}
        min={0}
        max={500000}
        step={5000}
        onChange={setAnnualExpenses}
        format={formatINR}
        ocid="buyer_calc.annual_expenses.input"
      />
      <div className="grid grid-cols-3 gap-3 pt-2">
        <ResultCard
          label="Gross Yield"
          value={`${grossYield.toFixed(2)}%`}
          color="text-green-300"
        />
        <ResultCard label="Net Yield" value={`${netYield.toFixed(2)}%`} />
        <ResultCard
          label="Payback Period"
          value={`${payback} yrs`}
          color="text-blue-300"
        />
      </div>
    </div>
  );
}

function FlipProfitCalculator() {
  const [purchase, setPurchase] = useState(8000000);
  const [renovation, setRenovation] = useState(1000000);
  const [sellPrice, setSellPrice] = useState(12000000);
  const [holding, setHolding] = useState(2);

  const totalCost = purchase + renovation;
  const taxes = sellPrice * 0.08;
  const grossProfit = sellPrice - totalCost;
  const netProfit = grossProfit - taxes;
  const roi = (((netProfit / totalCost) * 100) / holding).toFixed(1);

  return (
    <div className="space-y-5">
      <SliderField
        label="Purchase Price"
        value={purchase}
        min={2000000}
        max={50000000}
        step={500000}
        onChange={setPurchase}
        format={formatINR}
        ocid="buyer_calc.purchase_price.input"
      />
      <SliderField
        label="Renovation Cost"
        value={renovation}
        min={0}
        max={5000000}
        step={100000}
        onChange={setRenovation}
        format={formatINR}
        ocid="buyer_calc.renovation.input"
      />
      <SliderField
        label="Expected Sell Price"
        value={sellPrice}
        min={2000000}
        max={50000000}
        step={500000}
        onChange={setSellPrice}
        format={formatINR}
        ocid="buyer_calc.sell_price.input"
      />
      <SliderField
        label="Holding Period"
        value={holding}
        min={1}
        max={5}
        step={1}
        onChange={setHolding}
        format={(v) => `${v} yr${v > 1 ? "s" : ""}`}
        ocid="buyer_calc.holding.input"
      />
      <div className="grid grid-cols-2 gap-3 pt-2">
        <ResultCard
          label="Gross Profit"
          value={formatINR(grossProfit)}
          color={grossProfit >= 0 ? "text-green-300" : "text-red-400"}
        />
        <ResultCard
          label="Est. Taxes (8%)"
          value={formatINR(taxes)}
          color="text-red-300"
        />
        <ResultCard
          label="Net Profit"
          value={formatINR(netProfit)}
          color={netProfit >= 0 ? "text-[#D4AF37]" : "text-red-400"}
        />
        <ResultCard
          label="Annualized ROI"
          value={`${roi}%`}
          color="text-blue-300"
        />
      </div>
    </div>
  );
}

const TABS = [
  { id: "emi", label: "EMI Calculator", ocid: "buyer_calc.emi.tab" },
  { id: "afford", label: "Affordability", ocid: "buyer_calc.afford.tab" },
  { id: "rental", label: "Rental Yield", ocid: "buyer_calc.rental.tab" },
  { id: "flip", label: "Flip Profit", ocid: "buyer_calc.flip.tab" },
];

export default function BuyerCalculatorsPage() {
  const [activeTab, setActiveTab] = useState("emi");

  return (
    <BuyerLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            Financial Calculators
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            Real-time calculations for smarter property decisions
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-ocid={tab.ocid}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                activeTab === tab.id
                  ? "bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          {activeTab === "emi" && <EMICalculator />}
          {activeTab === "afford" && <AffordabilityCalculator />}
          {activeTab === "rental" && <RentalYieldCalculator />}
          {activeTab === "flip" && <FlipProfitCalculator />}
        </div>
      </div>
    </BuyerLayout>
  );
}
