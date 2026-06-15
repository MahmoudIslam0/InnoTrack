"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Award, Users, Clock, CheckCircle2,
  FileText, AlertTriangle, ChevronRight, Layers, ExternalLink, Loader2, BellOff, Bell, History
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "../_components";
import { ManageProjectDialog } from "./ManageProjectDialog";
import { professorApi } from "@/lib/professor-api";
import { toast } from "sonner";
import { normalizeStatusTone, normalizeOriginalityPercent } from "@/lib/student-api";

function ProjectCard({ project, onManage, onViewDetails }: { project: any; onManage: () => void; onViewDetails: () => void }) {
  const scoreColor = "text-primary dark:text-primary";
  const scoreBg = "bg-primary/10 border-primary/20";
  const [isMuted, setIsMuted] = useState(project.isMuted ?? false);
  const [isMuteLoading, setIsMuteLoading] = useState(false);

  useEffect(() => {
    setIsMuted(project.isMuted ?? false);
  }, [project.isMuted]);

  const handleToggleMute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuteLoading(true);
    try {
      await professorApi.toggleProjectMute(project.id);
      setIsMuted(!isMuted);
      toast.success(isMuted ? "Notifications enabled" : "Notifications muted");
    } catch (err) {
      console.error("Failed to toggle mute", err);
      toast.error("Failed to update notification preference");
    } finally {
      setIsMuteLoading(false);
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 overflow-hidden group flex flex-col h-full">
      {/* Top accent bar */}
      <div className="h-1 w-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      <div className="p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-foreground truncate">{project.title}</h3>
              <div className="shrink-0">
                <StatusBadge status={normalizeStatusTone(project.status) as any} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{project.teamName || "No team"} · {project.domain}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shrink-0 ${scoreBg}`}>
            <Award className={`w-3.5 h-3.5 ${scoreColor}`} />
            <span className={`text-sm font-bold ${scoreColor}`}>{normalizeOriginalityPercent(project.originalityScore)}%</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{project.description}</p>

        {/* Technologies */}
        <div className="flex flex-wrap gap-1.5 mb-4 shrink-0 min-h-[24px]">
          {(project.technologies || []).slice(0, 3).map((tech: string) => (
            <span key={tech} className="px-2 py-0.5 bg-muted text-foreground text-xs rounded-md font-medium">
              {tech}
            </span>
          ))}
          {project.technologies?.length > 3 && (
            <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md">
              +{project.technologies.length - 3}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-border/50 mt-auto shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>Team Project</span>
            {project.submittedAt && (
              <>
                <span className="text-border">·</span>
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(project.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {project.status === "InProgress" || project.status === "In_Progress" ? (
              <>
                <Link href={`/professor/projects/${project.id}/logs`} onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-8 h-8 rounded-full border-border/50 hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
                    title="View Activity Log"
                  >
                    <History className="w-3.5 h-3.5" />
                  </Button>
                </Link>
                <Button
                  size="icon"
                  variant="outline"
                  className="w-8 h-8 rounded-full border-border/50 hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
                  title={isMuted ? "Enable notifications" : "Mute notifications"}
                  disabled={isMuteLoading}
                  onClick={handleToggleMute}
                >
                  {isMuteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isMuted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5 text-primary" />}
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white h-8 gap-1.5"
                  onClick={onViewDetails}
                >
                  View Details
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white h-8 gap-1.5"
                onClick={onManage}
              >
                Review
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfessorProjectManagement() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("inprogress");
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [dialogTab, setDialogTab] = useState<"overview" | "team" | "logs">("team");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    
    if (tab && (tab === "inprogress" || tab === "underreview")) {
      setStatusFilter(tab);
      localStorage.setItem("professor_pm_tab", tab);
    } else {
      const savedTab = localStorage.getItem("professor_pm_tab");
      if (savedTab && (savedTab === "inprogress" || savedTab === "underreview")) {
        setStatusFilter(savedTab);
      }
    }

    const fetchAll = async () => {
      try {
        const [projRes, teamRes] = await Promise.all([
          professorApi.getSupervisedProjects(),
          professorApi.getSupervisedTeams()
        ]);
        const normalized = (projRes || []).map((p: any) => ({
          ...p,
          status: p.status === "In_Progress" ? "InProgress" : p.status
        }));
        setProjects(normalized);
        setTeams(teamRes || []);

        const openId = searchParams.get('openId');
        if (openId) {
          const projectToOpen = normalized.find((p: any) => p.id === Number(openId) || p.id === openId);
          if (projectToOpen) {
            professorApi.getProjectDetails(projectToOpen.id).then(detail => {
              setSelectedProject({ ...projectToOpen, ...detail });
              setDialogTab("overview");
            }).catch(e => {
              console.error(e);
              setSelectedProject(projectToOpen);
              setDialogTab("overview");
            });
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  const openManage = async (project: any) => {
    try {
      const detail = await professorApi.getProjectDetails(project.id);
      setSelectedProject({ ...project, ...detail });
      setDialogTab("overview");
    } catch (e) {
      toast.error("Failed to load full project details.");
      setSelectedProject(project); // Fallback to partial project
      setDialogTab("overview");
    }
  };

  const openViewDetails = (project: any) => {
    router.push(`/professor/projects/${project.id}`);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter(p => {
      const matchesSearch = !q || p.title?.toLowerCase().includes(q) || p.teamName?.toLowerCase().includes(q) || p.domain?.toLowerCase().includes(q);
      const matchesStatus = p.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const counts = {
    all: projects.length,
    "in-progress": projects.filter(p => p.status === "InProgress").length,
    "underreview": projects.filter(p => p.status === "UnderReview").length,
    completed: projects.filter(p => p.status === "Completed").length,
    draft: projects.filter(p => p.status === "Draft").length,
  };

  const setSystemStatus = async (projectId: string, status: string, isApproval: boolean, feedback: string) => {
    try {
      if (isApproval) {
         await professorApi.reviewProject(projectId, status === "InProgress" || status === "In_Progress");
      }
      if (feedback) {
        await professorApi.addFeedback(projectId, feedback);
      }
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status } : p));
      setSelectedProject((prev: any) => prev?.id === projectId ? { ...prev, status } : prev);
      toast.success("Project updated successfully.");
    } catch (e) {
      toast.error("Failed to update project status.");
      console.error(e);
    }
  };

  const statusFilters = [
    { key: "inprogress", label: "In Progress" },
    { key: "underreview", label: "Under Review" },
  ];

  const handleRejectProposal = async (projectId: string, feedback: string) => {
    try {
      await professorApi.requestRevision(projectId, feedback);
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: "Draft" } : p));
      setSelectedProject((prev: any) => prev?.id === projectId ? { ...prev, status: "Draft" } : prev);
      toast.success("Project rejected and returned to draft.");
    } catch (e) {
      toast.error("Failed to reject project.");
      console.error(e);
    }
  };

  const handleCancelSupervision = async (projectId: string, reason: string) => {
    try {
      await professorApi.cancelSupervision(projectId);
      if (reason) {
        await professorApi.addFeedback(projectId, reason);
      }
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setSelectedProject(null);
      toast.success("Successfully cancelled supervision.");
    } catch (e) {
      toast.error("Failed to cancel supervision.");
      console.error(e);
    }
  };

  const handleRequestRevision = async (projectId: string, reason: string) => {
    try {
      await professorApi.requestRevision(projectId, reason);
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: "Draft" } : p));
      setSelectedProject((prev: any) => prev?.id === projectId ? { ...prev, status: "Draft" } : prev);
      toast.success("Successfully requested revision.");
    } catch (e) {
      toast.error("Failed to request revision.");
      console.error(e);
    }
  };

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Project Management"
        description="Manage your assigned projects, review submissions, and oversee team progress."
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {isLoading ? (
          [1, 2].map((idx) => (
            <div key={idx} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card/40">
              <Skeleton className="w-5 h-5 shrink-0 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-6 w-12 rounded-md" />
                <Skeleton className="h-3.5 w-24 rounded-md" />
              </div>
            </div>
          ))
        ) : (
          [
            { label: "Awaiting Review", value: counts["underreview"], icon: AlertTriangle, color: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400" },
            { label: "In Progress", value: counts["in-progress"], icon: Clock, color: "bg-primary/10 border-primary/20 text-blue-700 dark:text-blue-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`flex items-center gap-3 p-4 rounded-xl border ${color} bg-opacity-50`}>
              <Icon className="w-5 h-5 shrink-0" />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs font-medium">{label}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Search + filters */}
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects, teams, or domains..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-muted border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-indigo-300 transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map(f => (
            <button
              key={f.key}
              onClick={() => {
                setStatusFilter(f.key);
                localStorage.setItem("professor_pm_tab", f.key);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                statusFilter === f.key
                  ? "bg-primary text-white border-primary"
                  : "bg-muted text-muted-foreground border-border/50 hover:border-indigo-300"
              }`}
            >
              {f.label} {counts[f.key as keyof typeof counts] > 0 && `(${counts[f.key as keyof typeof counts]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Projects grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="bg-card text-card-foreground rounded-2xl border border-border/50 p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-5 w-3/4 rounded-md" />
                    <Skeleton className="h-4 w-1/2 rounded-md" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
                {/* Description */}
                <Skeleton className="h-10 w-full rounded-md" />
                {/* Tech chips */}
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-12 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-14 rounded-md" />
                </div>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <Skeleton className="h-4 w-28 rounded-md" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No projects match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
          {filtered.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onManage={() => openManage(project)}
              onViewDetails={() => openViewDetails(project)}
            />
          ))}
        </div>
      )}

      <ManageProjectDialog
        project={selectedProject}
        teams={teams}
        defaultTab={dialogTab}
        onOpenChange={open => !open && setSelectedProject(null)}
        onApproveProposal={(id, feedback) => setSystemStatus(id, "InProgress", true, feedback)}
        onRejectProposal={handleRejectProposal}
        onAcceptSubmission={(id, feedback) => setSystemStatus(id, "Completed", false, feedback)}
        onRejectSubmission={(id, feedback) => setSystemStatus(id, "InProgress", false, feedback)}
        onCancelSupervision={handleCancelSupervision}
        onRequestRevision={handleRequestRevision}
      />
    </div>
  );
}
