import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import LoginModal from "./components/LoginModal";
import RoleSelectModal from "./components/RoleSelectModal";
import { AdminProvider } from "./context/AdminContext";
import { AuthProvider } from "./context/AuthContext";
import AdminApprovalsPage from "./pages/AdminApprovalsPage";
import AdminLeadsPage from "./pages/AdminLeadsPage";
import AdminListingsPage from "./pages/AdminListingsPage";
import AdminPage from "./pages/AdminPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import AdminReraPage from "./pages/AdminReraPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AreaDiscoverPage from "./pages/AreaDiscoverPage";
import AreaIntelligencePage from "./pages/AreaIntelligencePage";
import AuthPage from "./pages/AuthPage";
import BankBulkPage from "./pages/BankBulkPage";
import BankHistoryPage from "./pages/BankHistoryPage";
import BankPortalPage from "./pages/BankPortalPage";
import BankValuationPage from "./pages/BankValuationPage";
import BuyPage from "./pages/BuyPage";
import BuyerCalculatorsPage from "./pages/BuyerCalculatorsPage";
import BuyerComparePage from "./pages/BuyerComparePage";
import BuyerDealFinderPage from "./pages/BuyerDealFinderPage";
import BuyerDealsPage from "./pages/BuyerDealsPage";
import BuyerDiscoverPage from "./pages/BuyerDiscoverPage";
import BuyerIntelligencePage from "./pages/BuyerIntelligencePage";
import BuyerInvestmentScorePage from "./pages/BuyerInvestmentScorePage";
import BuyerMapPage from "./pages/BuyerMapPage";
import BuyerNeighbourhoodPage from "./pages/BuyerNeighbourhoodPage";
import BuyerPortalPage from "./pages/BuyerPortalPage";
import BuyerProjectsPage from "./pages/BuyerProjectsPage";
import BuyerSearchPage from "./pages/BuyerSearchPage";
import BuyerValuationPage from "./pages/BuyerValuationPage";
import HomePage from "./pages/HomePage";
import InfrastructureImpactPage from "./pages/InfrastructureImpactPage";
import InvestmentScoreboardPage from "./pages/InvestmentScoreboardPage";
import ListPropertyPage from "./pages/ListPropertyPage";
import LocalityDataDistributionPage from "./pages/LocalityDataDistributionPage";
import LocationIntelligencePage from "./pages/LocationIntelligencePage";
import MarketPulsePage from "./pages/MarketPulsePage";
import NegotiationAdvisorPage from "./pages/NegotiationAdvisorPage";
import NeighborhoodScorePage from "./pages/NeighborhoodScorePage";
import OffMarketPage from "./pages/OffMarketPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import PriceForecastPage from "./pages/PriceForecastPage";
import ProjectIntelligencePage from "./pages/ProjectIntelligencePage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import PropertySearchPage from "./pages/PropertySearchPage";
import RentDiscoverPage from "./pages/RentDiscoverPage";
import RentPage from "./pages/RentPage";
import RentalYieldPage from "./pages/RentalYieldPage";
import SellDiscoverPage from "./pages/SellDiscoverPage";
import SellerAIPricingPage from "./pages/SellerAIPricingPage";
import SellerAnalyticsPage from "./pages/SellerAnalyticsPage";
import SellerCompetitionPage from "./pages/SellerCompetitionPage";
import SellerDocumentsPage from "./pages/SellerDocumentsPage";
import SellerIntelligencePage from "./pages/SellerIntelligencePage";
import SellerLeadsPage from "./pages/SellerLeadsPage";
import SellerListingsPage from "./pages/SellerListingsPage";
import SellerMarketInsightsPage from "./pages/SellerMarketInsightsPage";
import SellerMarketingPage from "./pages/SellerMarketingPage";
import SellerNotificationsPage from "./pages/SellerNotificationsPage";
import SellerOffersPage from "./pages/SellerOffersPage";
import SellerOptimizePage from "./pages/SellerOptimizePage";
import SellerPerformancePage from "./pages/SellerPerformancePage";
import SellerPipelinePage from "./pages/SellerPipelinePage";
import SellerPortalPage from "./pages/SellerPortalPage";
import SellerVisitsPage from "./pages/SellerVisitsPage";
import SignupPage from "./pages/SignupPage";
import UserDashboardPage from "./pages/UserDashboardPage";
import ValuationEnginePage from "./pages/ValuationEnginePage";

function RootLayout() {
  return (
    <>
      <LoginModal />
      <RoleSelectModal />
      <Outlet />
      <Toaster />
    </>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});
const areaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/area/$locationId",
  component: AreaIntelligencePage,
});
const areaIntelligenceNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/area/intelligence",
  component: AreaIntelligencePage,
});
// /area-intelligence renders LocationIntelligencePage directly (has full working data + map)
const areaIntelligenceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/area-intelligence",
  component: LocationIntelligencePage,
});
const locationIntelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/location-intelligence",
  component: LocationIntelligencePage,
});
const valuationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/valuation",
  component: ValuationEnginePage,
});
const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: AuthPage,
});
const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/signup",
  component: SignupPage,
});
const resetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/reset",
  component: PasswordResetPage,
});
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: UserDashboardPage,
});
const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: PropertySearchPage,
});
const propertyDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/property/$id",
  component: PropertyDetailPage,
});
const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectIntelligencePage,
});

// Buy & Rent portal routes
const buyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buy",
  component: BuyPage,
});
const rentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rent",
  component: RentPage,
});

// Discover flow routes
const buyerDiscoverRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/discover",
  component: BuyerDiscoverPage,
});
const rentDiscoverRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rent/discover",
  component: RentDiscoverPage,
});
const areaDiscoverRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/area/discover",
  component: AreaDiscoverPage,
});
const sellDiscoverRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sell/discover",
  component: SellDiscoverPage,
});

// /sell alias → SellerPortalPage
const sellRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sell",
  component: SellerPortalPage,
});

// Seller Portal
const sellerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller",
  component: SellerPortalPage,
});
const listPropertyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/list-property",
  component: ListPropertyPage,
});
const sellerListingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/listings",
  component: SellerListingsPage,
});
const sellerLeadsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/leads",
  component: SellerLeadsPage,
});
const sellerVisitsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/visits",
  component: SellerVisitsPage,
});
const sellerOffersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/offers",
  component: SellerOffersPage,
});
const sellerOptimizeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/optimize",
  component: SellerOptimizePage,
});
const sellerPerformanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/performance",
  component: SellerPerformancePage,
});
const sellerAnalyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/analytics",
  component: SellerAnalyticsPage,
});
const sellerMarketInsightsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/market-insights",
  component: SellerMarketInsightsPage,
});
const sellerMarketingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/marketing",
  component: SellerMarketingPage,
});
const sellerAIPricingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/ai-pricing",
  component: SellerAIPricingPage,
});
const sellerCompetitionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/competition",
  component: SellerCompetitionPage,
});
const sellerPipelineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/pipeline",
  component: SellerPipelinePage,
});
const sellerDocumentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/documents",
  component: SellerDocumentsPage,
});
const sellerNotificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/notifications",
  component: SellerNotificationsPage,
});
const sellerIntelligenceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/seller/intelligence",
  component: SellerIntelligencePage,
});

// Buyer Portal
const buyerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer",
  component: BuyerPortalPage,
});
const buyerValuationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/valuation",
  beforeLoad: () => {
    throw redirect({ to: "/valuation" });
  },
});
const marketPulseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/market-pulse",
  component: MarketPulsePage,
});
const offMarketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/off-market",
  component: OffMarketPage,
});
const buyerSearchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/search",
  component: BuyerSearchPage,
});
const buyerMapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/map",
  component: BuyerMapPage,
});
const buyerDealsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/deals",
  component: BuyerDealsPage,
});
const buyerCompareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/compare",
  component: BuyerComparePage,
});
const buyerCalculatorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/calculators",
  component: BuyerCalculatorsPage,
});
const buyerIntelligenceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/intelligence",
  component: BuyerIntelligencePage,
});
const negotiationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/negotiation",
  component: NegotiationAdvisorPage,
});
const neighborhoodRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/neighborhood",
  component: NeighborhoodScorePage,
});
const infrastructureRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/infrastructure",
  component: InfrastructureImpactPage,
});
const priceForecastRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/price-forecast",
  component: PriceForecastPage,
});
const rentalYieldRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/rental-yield",
  component: RentalYieldPage,
});
const investmentScoreboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/investment-scoreboard",
  component: InvestmentScoreboardPage,
});
const buyerProjectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/projects",
  component: BuyerProjectsPage,
});
const buyerDealFinderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/deal-finder",
  component: BuyerDealFinderPage,
});
const buyerInvestmentScoreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/investment-score/$area",
  component: BuyerInvestmentScorePage,
});
const buyerNeighbourhoodRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/buyer/neighbourhood/$area",
  component: BuyerNeighbourhoodPage,
});

// Bank / Banker Portal
const bankRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bank",
  component: BankPortalPage,
});
// /banker alias
const bankerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/banker",
  beforeLoad: () => {
    throw redirect({ to: "/bank" });
  },
});
const bankValuationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bank/valuation",
  beforeLoad: () => {
    throw redirect({ to: "/valuation" });
  },
});
const bankBulkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bank/bulk",
  component: BankBulkPage,
});
const bankHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bank/history",
  component: BankHistoryPage,
});

// Admin
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});
const adminUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/users",
  component: AdminUsersPage,
});
const adminApprovalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/approvals",
  component: AdminApprovalsPage,
});
const adminListingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/listings",
  component: AdminListingsPage,
});
const adminReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/reports",
  component: AdminReportsPage,
});

const adminDataDistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/data-distribution",
  component: LocalityDataDistributionPage,
});

const adminReraRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/rera",
  component: AdminReraPage,
});

const adminLeadsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/leads",
  component: AdminLeadsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  areaRoute,
  areaIntelligenceNewRoute,
  areaIntelligenceRoute,
  locationIntelRoute,
  valuationRoute,
  authRoute,
  signupRoute,
  resetRoute,
  dashboardRoute,
  searchRoute,
  propertyDetailRoute,
  projectsRoute,
  buyRoute,
  rentRoute,
  buyerDiscoverRoute,
  rentDiscoverRoute,
  areaDiscoverRoute,
  sellDiscoverRoute,
  sellRoute,
  sellerRoute,
  listPropertyRoute,
  sellerListingsRoute,
  sellerLeadsRoute,
  sellerVisitsRoute,
  sellerOffersRoute,
  sellerOptimizeRoute,
  sellerPerformanceRoute,
  sellerAnalyticsRoute,
  sellerMarketInsightsRoute,
  sellerMarketingRoute,
  sellerAIPricingRoute,
  sellerCompetitionRoute,
  sellerPipelineRoute,
  sellerDocumentsRoute,
  sellerNotificationsRoute,
  sellerIntelligenceRoute,
  buyerRoute,
  buyerValuationRoute,
  marketPulseRoute,
  offMarketRoute,
  buyerSearchRoute,
  buyerMapRoute,
  buyerDealsRoute,
  buyerCompareRoute,
  buyerCalculatorsRoute,
  buyerIntelligenceRoute,
  negotiationRoute,
  neighborhoodRoute,
  infrastructureRoute,
  priceForecastRoute,
  rentalYieldRoute,
  investmentScoreboardRoute,
  buyerProjectsRoute,
  buyerDealFinderRoute,
  buyerInvestmentScoreRoute,
  buyerNeighbourhoodRoute,
  bankRoute,
  bankerRoute,
  bankValuationRoute,
  bankBulkRoute,
  bankHistoryRoute,
  adminRoute,
  adminUsersRoute,
  adminApprovalsRoute,
  adminListingsRoute,
  adminReportsRoute,
  adminDataDistRoute,
  adminReraRoute,
  adminLeadsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <AdminProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AdminProvider>
  );
}
