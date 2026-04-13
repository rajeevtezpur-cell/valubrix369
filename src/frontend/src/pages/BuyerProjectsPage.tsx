import BuyerLayout from "../components/BuyerLayout";
import ProjectIntelligenceView from "../components/ProjectIntelligenceView";

export default function BuyerProjectsPage() {
  return (
    <BuyerLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Project Intelligence
          </h1>
          <p className="text-white/60 text-sm mt-1">
            150 Bangalore projects with AI scoring, map view, and market
            insights
          </p>
        </div>
        <ProjectIntelligenceView mode="portal" />
      </div>
    </BuyerLayout>
  );
}
