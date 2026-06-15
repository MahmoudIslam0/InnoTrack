"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OriginalProjectCard, OriginalProjectItem } from "./DashboardUI";
import { normalizeOriginalityPercent, normalizeStatusTone, studentApi } from "@/lib/student-api";

export function PopularProjects({
  actionLabel = "View Details",
  viewAllHref = "/projects",
  hrefPrefix = "/projects"
}: {
  actionLabel?: string;
  viewAllHref?: string;
  hrefPrefix?: string;
}) {
  const [thisYearProjects, setThisYearProjects] = useState<OriginalProjectItem[]>([]);
  const [allTimeProjects, setAllTimeProjects] = useState<OriginalProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    Promise.all([
      studentApi.getMostOriginalProjects(true, 4),
      studentApi.getMostOriginalProjects(false, 4),
    ])
      .then(([thisYear, allTime]) => {
        if (ignore) return;
        setThisYearProjects(thisYear.map(mapOriginalProject));
        setAllTimeProjects(allTime.map(mapOriginalProject));
      })
      .catch(() => {
        if (ignore) return;
        setThisYearProjects([]);
        setAllTimeProjects([]);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Most Original Projects</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((item) => (
            <div key={item} className="dashboard-card group">
              <div className="flex items-start justify-between mb-3">
                <div className="h-6 w-24 bg-muted/60 animate-pulse rounded-md" />
                <div className="h-6 w-16 bg-muted/60 animate-pulse rounded-md" />
              </div>
              <div className="h-6 w-3/4 bg-muted/60 animate-pulse rounded-md mb-2 mt-1" />
              <div className="space-y-2 mb-4 mt-3">
                <div className="h-4 w-full bg-muted/60 animate-pulse rounded-md" />
                <div className="h-4 w-4/5 bg-muted/60 animate-pulse rounded-md" />
              </div>
              <div className="flex items-center gap-3 mb-5 mt-1">
                <div className="h-4 w-12 bg-muted/60 animate-pulse rounded-md" />
                <div className="h-5 w-20 bg-muted/60 animate-pulse rounded-md" />
              </div>
              <div className="h-10 w-full bg-muted/60 animate-pulse rounded-md" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <OriginalProjectsSection
      thisYearProjects={thisYearProjects}
      allTimeProjects={allTimeProjects}
      actionLabel={actionLabel}
      viewAllHref={viewAllHref}
      hrefPrefix={hrefPrefix}
    />
  );
}

export function OriginalProjectsSection({
  thisYearProjects,
  allTimeProjects,
  actionLabel = "View Details",
  viewAllHref = "/projects",
  hrefPrefix = "/projects",
}: {
  thisYearProjects: OriginalProjectItem[];
  allTimeProjects: OriginalProjectItem[];
  actionLabel?: string;
  viewAllHref?: string;
  hrefPrefix?: string;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          Most Original Projects
        </h3>
        <Link href={viewAllHref}>
          <Button
            variant="ghost"
            className="text-primary dark:text-primary hover:text-primary dark:hover:text-primary hover:bg-primary/10"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="this-year" className="w-full">
        <TabsList className="w-full justify-start mb-6 bg-muted/50">
          <TabsTrigger value="this-year">This Year</TabsTrigger>
          <TabsTrigger value="all-time">All Time</TabsTrigger>
        </TabsList>

        <TabsContent value="this-year">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {thisYearProjects.map((project) => (
              <OriginalProjectCard
                key={project.id}
                project={project}
                actionLabel={actionLabel}
                href={`${hrefPrefix}/${project.id}`}
              />
            ))}
          </div>
          {thisYearProjects.length === 0 && (
            <p className="text-sm text-muted-foreground">No original projects found for this year.</p>
          )}
        </TabsContent>

        <TabsContent value="all-time">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {allTimeProjects.map((project) => (
              <OriginalProjectCard
                key={project.id}
                project={project}
                actionLabel={actionLabel}
                href={`${hrefPrefix}/${project.id}`}
              />
            ))}
          </div>
          {allTimeProjects.length === 0 && (
            <p className="text-sm text-muted-foreground">No original projects found yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

function mapOriginalProject(project: {
  id: number;
  domain: string;
  originalityScore: number;
  title: string;
  abstract: string;
  year: number;
  status: string;
}): OriginalProjectItem {
  return {
    id: String(project.id),
    title: project.title,
    domain: project.domain,
    description: project.abstract,
    originalityScore: normalizeOriginalityPercent(project.originalityScore),
    meta: String(project.year),
    status: normalizeStatusTone(project.status) as OriginalProjectItem["status"],
  };
}
