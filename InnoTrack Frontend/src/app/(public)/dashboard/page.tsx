import { HeroCard } from "@/app/_components/HeroCard";
import { PopularProjects } from "@/app/_components/PopularProjects";
import { StatsCards } from "@/app/_components/StatsCards";
import { TrendingTechnologies } from "@/app/_components/TrendingTechnologies";

export default function Dashboard() {
  return (
    <div className="dashboard-page">
      {/* Hero Card - Submit Idea */}
      <div className="mb-8">
        <HeroCard />
      </div>

      {/* Stats Cards */}
      <div className="mb-8">
        <StatsCards />
      </div>

      {/* Most Original Projects */}
      <div className="mb-8">
        <PopularProjects />
      </div>

      {/* Trending Technologies */}
      <div className="mb-8">
        <TrendingTechnologies />
      </div>
    </div>
  );
}
