"use client";

import { CheckCircle2, ClipboardList, FolderKanban, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { professorApi } from "@/lib/professor-api";
import { studentApi, normalizeStatusTone } from "@/lib/student-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OriginalProjectItem } from "@/app/_components/DashboardUI";
import { PopularProjects } from "@/app/_components/PopularProjects";
import { TrendingTechnologies } from "@/app/_components/TrendingTechnologies";
import {
  PageHeader,
  ProjectTable,
  ProfessorStatCard,
  SectionCard,
} from "../_components";

export default function ProfessorDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await professorApi.getDashboard();
        setDashboardData(data);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const {
    totalSupervisedTeams = 0,
    pendingReviewCount = 0,
    activeProjectCount = 0,
    approvedCount = 0,
    rejectedCount = 0,
    averageOriginalityScore = 0,
    recentTeams = [],
  } = dashboardData || {};

  const projectRows = recentTeams.map((team: any) => ({
    id: team.projectId || team.id?.toString(),
    title: team.projectTitle || "No Project",
    subtitle: team.projectDomain || "General",
    team: team.name,
    status: normalizeStatusTone(team.projectStatus) as any,
    originalityScore: team.originalityScore || 0,
  }));

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Professor Dashboard"
        description="Monitor supervised teams, proposal approvals, originality alerts, and recent updates."
      />

      <div className="bg-primary/10 rounded-2xl p-6 md:p-8 border border-border/50 shadow-sm mb-8 backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                Review professor approvals
              </h2>
              {isLoading ? (
                <Skeleton className="h-6 w-20 rounded-md" />
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900"
                >
                  {pendingReviewCount} Pending
                </Badge>
              )}
            </div>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              Approve proposals when originality and scope are ready, or send
              targeted feedback before teams move from draft to in-progress.
            </p>
          </div>
          <Link href="/professor/project-management">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
              <ClipboardList className="w-4 h-4 mr-2" />
              Open Review Queue
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ProfessorStatCard
          title="Assigned Teams"
          value={String(activeProjectCount + approvedCount)}
          subtitle="Across current graduation cycle"
          icon={Users}
          tone="primary"
          isLoading={isLoading}
        />
        <ProfessorStatCard
          title="Projects Supervised"
          value={String(activeProjectCount + approvedCount)}
          subtitle="Active and approved projects"
          icon={FolderKanban}
          tone="info"
          isLoading={isLoading}
        />
        <ProfessorStatCard
          title="Pending Approvals"
          value={String(pendingReviewCount)}
          subtitle="Draft proposals need decision"
          icon={CheckCircle2}
          tone="warning"
          isLoading={isLoading}
        />
      </div>

      <div className="space-y-8">
          <SectionCard
            title="Projects Under Supervision"
            action={
              <Link href="/professor/project-management?tab=inprogress">
                <Button
                  variant="ghost"
                  className="text-primary dark:text-primary hover:bg-primary/10"
                >
                  View All
                </Button>
              </Link>
            }
          >
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/40 bg-card/40"
                  >
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                      <div className="flex flex-col space-y-2">
                        <Skeleton className="h-5 w-48 rounded-md" />
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Skeleton className="h-3.5 w-3.5 rounded-full animate-pulse" />
                            <Skeleton className="h-3.5 w-24 rounded-md" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <Skeleton className="h-6 w-16 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ProjectTable rows={projectRows} />
            )}
          </SectionCard>

          <PopularProjects
            actionLabel="Open Review"
            viewAllHref="/professor/projects"
            hrefPrefix="/professor/projects"
          />

          <TrendingTechnologies />
      </div>
    </div>
  );
}
