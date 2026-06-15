"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, TrendingUp } from "lucide-react";

import { StatCard } from "./DashboardUI";
import { formatStatus, normalizeOriginalityPercent, studentApi } from "@/lib/student-api";

export function StatsCards() {
  const [originality, setOriginality] = useState<{
    currentProjectOriginality?: number | null;
    projectTitle?: string | null;
  } | null>(null);
  const [status, setStatus] = useState<{
    projectStatus?: string | null;
    statusDescription?: string | null;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    Promise.allSettled([
      studentApi.getCurrentOriginalityWidget(),
      studentApi.getProjectStatusWidget(),
    ]).then(([originalityResult, statusResult]) => {
      if (ignore) return;
      if (originalityResult.status === "fulfilled") setOriginality(originalityResult.value);
      if (statusResult.status === "fulfilled") setStatus(statusResult.value);
      setIsLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, []);

  const score = originality?.currentProjectOriginality;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <StatCard
        title="Current Project Originality"
        value={typeof score === "number" ? `${normalizeOriginalityPercent(score)}%` : "Not checked"}
        subtitle={originality?.projectTitle || "No active project yet"}
        icon={TrendingUp}
        tone="success"
        isLoading={isLoading}
      />
      <StatCard
        title="Project Status"
        value={formatStatus(status?.projectStatus || "No Project")}
        subtitle={status?.statusDescription || "Start a submission to begin tracking progress"}
        icon={CheckCircle2}
        tone="info"
        isLoading={isLoading}
      />
    </div>
  );
}
