import { Button } from "@/components/ui/button";
/**
 * Stub pages for secondary routes
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Construction, Loader2 } from "lucide-react";
import { useState } from "react";
import { GlassCard } from "../components/GlassCard";
import { PropertyCard } from "../components/PropertyCard";
import { SAMPLE_LISTINGS } from "../data/intelligence";
import { CITIES, LOCALITIES_BY_CITY } from "../data/locations";
import { useGetMyListings, useSearchProperties } from "../hooks/useQueries";

function StubPage({
  title,
  backTo = "/",
  description,
}: { title: string; backTo?: string; description?: string }) {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to={backTo}>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        </div>
        <GlassCard className="text-center py-16">
          <Construction className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-3">{title}</h2>
          <p className="text-muted-foreground">
            {description ||
              "This feature is coming soon. Stay tuned for updates."}
          </p>
        </GlassCard>
      </div>
    </div>
  );
}

export function BuyerValuationPage() {
  const navigate = useNavigate();
  navigate({ to: "/valuation" });
  return (
    <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin gold-text" />
    </div>
  );
}

export function BuyerSearchPage() {
  const navigate = useNavigate();
  navigate({ to: "/search" });
  return (
    <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin gold-text" />
    </div>
  );
}

export function BuyerMapPage() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/buyer">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" /> Buyer Portal
            </Button>
          </Link>
          <div className="h-5 w-px bg-border" />
          <h1 className="font-display text-2xl font-bold">City Zone Map</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Explore property markets by city and zone.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CITIES.map((city) => (
            <Link
              key={city}
              to="/area/$locationId"
              params={{ locationId: city }}
            >
              <div className="portal-card-buyer rounded-card p-6 hover:scale-[1.02] transition-transform cursor-pointer">
                <h3 className="font-display text-xl font-bold mb-1">{city}</h3>
                <p className="text-sm text-muted-foreground">
                  {LOCALITIES_BY_CITY[city]?.length || 0}+ localities
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {LOCALITIES_BY_CITY[city]?.slice(0, 3).map((l) => (
                    <span
                      key={l}
                      className="text-xs px-2 py-0.5 rounded-full border border-border/50 text-muted-foreground"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BuyerDealsPage() {
  const { data: listings } = useSearchProperties({});
  const display = listings && listings.length > 0 ? listings : SAMPLE_LISTINGS;
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/buyer">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="font-display text-2xl font-bold">Best Deals</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {display
            .slice(0, 6)
            .map((item, i) =>
              "seller" in item ? (
                <PropertyCard key={item.id} listing={item} index={i + 1} />
              ) : (
                <PropertyCard
                  key={item.id}
                  sampleListing={item}
                  index={i + 1}
                />
              ),
            )}
        </div>
      </div>
    </div>
  );
}

export function BuyerComparePage() {
  return (
    <StubPage
      title="Property Comparison"
      backTo="/buyer"
      description="Compare up to 3 properties side-by-side. This feature is in development."
    />
  );
}

export function BuyerCalculatorsPage() {
  const [loanAmount, setLoanAmount] = useState("");
  const [rate, setRate] = useState("8.5");
  const [tenure, setTenure] = useState("20");

  const P = Number.parseFloat(loanAmount) || 0;
  const r = Number.parseFloat(rate) / 100 / 12;
  const n = Number.parseFloat(tenure) * 12;
  const emi = P > 0 && r > 0 ? (P * r * (1 + r) ** n) / ((1 + r) ** n - 1) : 0;

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/buyer">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="font-display text-2xl font-bold">
            EMI & Affordability Calculator
          </h1>
        </div>
        <GlassCard>
          <h3 className="font-semibold mb-4">Home Loan EMI Calculator</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1.5 block">
                Loan Amount (₹)
              </p>
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                placeholder="e.g. 5000000"
                className="w-full bg-secondary/60 border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none"
                data-ocid="calculator.loan.input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1.5 block">
                  Interest Rate (%)
                </p>
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full bg-secondary/60 border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none"
                  data-ocid="calculator.rate.input"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1.5 block">
                  Tenure (years)
                </p>
                <input
                  type="number"
                  value={tenure}
                  onChange={(e) => setTenure(e.target.value)}
                  className="w-full bg-secondary/60 border border-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none"
                  data-ocid="calculator.tenure.input"
                />
              </div>
            </div>
            {emi > 0 && (
              <div className="glass-card p-5 text-center border border-gold/25">
                <p className="text-muted-foreground text-sm mb-1">
                  Monthly EMI
                </p>
                <p className="font-display text-3xl font-bold gold-text">
                  ₹{Math.round(emi).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Interest: ₹
                  {Math.round(emi * n - P).toLocaleString("en-IN")}
                </p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export function BuyerIntelligencePage() {
  return (
    <StubPage
      title="Market Intelligence"
      backTo="/buyer"
      description="Deep market trends, supply-demand analysis, and investment grade data. Coming soon."
    />
  );
}

export function MarketPulsePage() {
  return (
    <StubPage
      title="Market Pulse"
      backTo="/buyer"
      description="Real-time market activity, transaction volumes, and price momentum indicators."
    />
  );
}

export function PriceForecastPage() {
  return (
    <StubPage
      title="Price Forecast"
      backTo="/buyer"
      description="AI-powered 12-month price forecasts for localities across India."
    />
  );
}

export function RentalYieldPage() {
  return (
    <StubPage
      title="Rental Yield Calculator"
      backTo="/buyer"
      description="Calculate expected rental yields and investment returns for any property."
    />
  );
}

export function InvestmentScoreboardPage() {
  return (
    <StubPage
      title="Investment Scoreboard"
      backTo="/buyer"
      description="Ranked list of best investment micro-markets by ROI, yield, and growth potential."
    />
  );
}

export function NeighborhoodScorePage() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/buyer">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="font-display text-2xl font-bold">
            Neighborhood Scores
          </h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            "Koramangala",
            "Whitefield",
            "Indiranagar",
            "Baner",
            "Koregaon Park",
            "Gachibowli",
          ].map((locality, i) => (
            <div
              key={locality}
              className="glass-card-hover p-5"
              data-ocid={`neighborhood.item.${i + 1}`}
            >
              <h3 className="font-semibold mb-1">{locality}</h3>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-secondary/60 rounded-full h-2">
                  <div
                    className="bg-gold rounded-full h-2"
                    style={{ width: `${70 + i * 5}%` }}
                  />
                </div>
                <span className="text-sm gold-text font-semibold">
                  {70 + i * 5}/100
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                <span>Schools: {8 - i}/10</span>
                <span>Hospitals: {7 + i}/10</span>
                <span>Metro: {6 + i}/10</span>
                <span>Safety: {9 - i}/10</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InfrastructureImpactPage() {
  return (
    <StubPage
      title="Infrastructure Impact"
      backTo="/buyer"
      description="How upcoming metro lines, roads, and tech parks affect property prices nearby."
    />
  );
}

export function BuyerProjectsPage() {
  return (
    <StubPage
      title="New Projects"
      backTo="/buyer"
      description="Browse new launches and under-construction projects by top builders."
    />
  );
}

export function BuyerDealFinderPage() {
  return (
    <StubPage
      title="Deal Finder"
      backTo="/buyer"
      description="Properties priced below FMV. New below-market deals updated daily."
    />
  );
}

export function OffMarketPage() {
  return (
    <StubPage
      title="Off-Market Properties"
      backTo="/buyer"
      description="Exclusive off-market listings. Available to verified buyers only."
    />
  );
}

export function SellerListingsPage() {
  const { data: myListings, isLoading } = useGetMyListings();
  const display = myListings && myListings.length > 0 ? myListings : [];
  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/seller">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="font-display text-2xl font-bold">My Listings</h1>
        </div>
        {isLoading ? (
          <div
            className="glass-card p-10 text-center"
            data-ocid="seller_listings.loading_state"
          >
            <Loader2 className="w-8 h-8 animate-spin gold-text mx-auto" />
          </div>
        ) : display.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {display.map((listing, i) => (
              <PropertyCard key={listing.id} listing={listing} index={i + 1} />
            ))}
          </div>
        ) : (
          <GlassCard
            className="text-center py-16"
            data-ocid="seller_listings.empty_state"
          >
            <p className="text-muted-foreground mb-4">No listings yet.</p>
            <Link to="/seller/list-property">
              <Button className="btn-gold">List Your First Property</Button>
            </Link>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

export function SellerLeadsPage() {
  return (
    <StubPage
      title="Leads & Inquiries"
      backTo="/seller"
      description="Track buyer inquiries and manage your leads pipeline."
    />
  );
}

export function SellerAnalyticsPage() {
  return (
    <StubPage
      title="Listing Analytics"
      backTo="/seller"
      description="Views, inquiries, and performance metrics for your listings."
    />
  );
}

export function SellerPerformancePage() {
  return (
    <StubPage
      title="Performance Dashboard"
      backTo="/seller"
      description="Compare your listing performance against market benchmarks."
    />
  );
}

export function SellerAIPricingPage() {
  return (
    <StubPage
      title="AI Pricing Engine"
      backTo="/seller"
      description="Get AI-recommended pricing strategies to maximize sale value."
    />
  );
}

export function SellerMarketInsightsPage() {
  return (
    <StubPage
      title="Market Insights"
      backTo="/seller"
      description="Local market conditions, competition analysis, and pricing trends."
    />
  );
}

export function SellerCompetitionPage() {
  return (
    <StubPage
      title="Competition Analysis"
      backTo="/seller"
      description="See competing listings in your micro-market and how yours compares."
    />
  );
}

export function SellerDocumentsPage() {
  return (
    <StubPage
      title="Document Manager"
      backTo="/seller"
      description="Upload, organize, and share property documents with buyers."
    />
  );
}

export function SellerNotificationsPage() {
  return (
    <StubPage
      title="Notifications"
      backTo="/seller"
      description="Stay updated on inquiries, price changes, and market alerts."
    />
  );
}

export function SellerOptimizePage() {
  return (
    <StubPage
      title="Optimize Listing"
      backTo="/seller"
      description="AI-powered suggestions to improve your listing and attract more buyers."
    />
  );
}

export function SellerPipelinePage() {
  return (
    <StubPage
      title="Sales Pipeline"
      backTo="/seller"
      description="Track potential buyers from inquiry to closing."
    />
  );
}

export function SellerVisitsPage() {
  return (
    <StubPage
      title="Site Visits"
      backTo="/seller"
      description="Manage scheduled site visits and track their status."
    />
  );
}

export function SellerOffersPage() {
  return (
    <StubPage
      title="Offers"
      backTo="/seller"
      description="Review and respond to offers from interested buyers."
    />
  );
}

export function SellerMarketingPage() {
  return (
    <StubPage
      title="Marketing Tools"
      backTo="/seller"
      description="Promote your listing with targeted campaigns and boosted visibility."
    />
  );
}

export function SellerIntelligencePage() {
  return (
    <StubPage
      title="Seller Intelligence"
      backTo="/seller"
      description="Strategic insights to position your property for maximum value."
    />
  );
}

export function BankValuationPage() {
  const navigate = useNavigate();
  navigate({ to: "/bank" });
  return (
    <div className="min-h-screen bg-background pt-20 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin gold-text" />
    </div>
  );
}

export function BankBulkPage() {
  const [rows, setRows] = useState<
    Array<{ city: string; locality: string; area: string }>
  >([
    { city: "", locality: "", area: "" },
    { city: "", locality: "", area: "" },
  ]);

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/bank">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <h1 className="font-display text-2xl font-bold">Bulk Valuation</h1>
        </div>
        <GlassCard>
          <p className="text-muted-foreground mb-4">
            Enter up to 5 properties for simultaneous valuation:
          </p>
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div
                key={`row-${String(i)}`}
                className="grid grid-cols-3 gap-3"
                data-ocid={`bank.bulk.item.${i + 1}`}
              >
                <select
                  value={row.city}
                  onChange={(e) =>
                    setRows(
                      rows.map((r, j) =>
                        j === i ? { ...r, city: e.target.value } : r,
                      ),
                    )
                  }
                  className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
                >
                  <option value="">City</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={row.locality}
                  onChange={(e) =>
                    setRows(
                      rows.map((r, j) =>
                        j === i ? { ...r, locality: e.target.value } : r,
                      ),
                    )
                  }
                  className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
                  disabled={!row.city}
                >
                  <option value="">Locality</option>
                  {(row.city ? LOCALITIES_BY_CITY[row.city] || [] : []).map(
                    (l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ),
                  )}
                </select>
                <input
                  type="number"
                  placeholder="Area (sqft)"
                  value={row.area}
                  onChange={(e) =>
                    setRows(
                      rows.map((r, j) =>
                        j === i ? { ...r, area: e.target.value } : r,
                      ),
                    )
                  }
                  className="bg-secondary/60 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
                />
              </div>
            ))}
          </div>
          {rows.length < 5 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border-border"
              onClick={() =>
                setRows([...rows, { city: "", locality: "", area: "" }])
              }
              data-ocid="bank.bulk.add_row.button"
            >
              + Add Property
            </Button>
          )}
          <Button
            className="btn-gold w-full mt-4"
            data-ocid="bank.bulk.submit_button"
          >
            Run Bulk Valuation
          </Button>
        </GlassCard>
      </div>
    </div>
  );
}

export function BankHistoryPage() {
  return (
    <StubPage
      title="Valuation History"
      backTo="/bank"
      description="Your previous valuation reports will appear here. No reports generated yet."
    />
  );
}

export function AdminPage() {
  return (
    <StubPage
      title="Admin Dashboard"
      backTo="/"
      description="Platform administration, user management, and system metrics."
    />
  );
}

export function AdminUsersPage() {
  return (
    <StubPage
      title="User Management"
      backTo="/admin"
      description="Manage users, roles, and access permissions."
    />
  );
}

export function AdminListingsPage() {
  return (
    <StubPage
      title="Listing Management"
      backTo="/admin"
      description="Review, approve, and moderate property listings."
    />
  );
}

export function AdminReportsPage() {
  return (
    <StubPage
      title="Reports"
      backTo="/admin"
      description="Platform-wide analytics, revenue metrics, and activity logs."
    />
  );
}

export function ProjectIntelligencePage() {
  return (
    <StubPage
      title="Project Intelligence"
      backTo="/"
      description="Deep-dive into specific builder projects — delivery history, RERA filings, buyer reviews."
    />
  );
}
