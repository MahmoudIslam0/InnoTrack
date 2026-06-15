"use client";

import { useState, useEffect } from "react";
import {
  Lightbulb,
  FolderOpen,
  ArrowRight,
  FileText,
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  Award,
  ShieldCheck,
  Users,
  ChevronDown,
  ChevronRight,
  Download,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import { toast } from "sonner";
import { MyProjectDto, MyTeamDto, ProjectDraftDto, normalizeOriginalityPercent, studentApi } from "@/lib/student-api";

// Mock data — current user is team leader
interface ActiveProject {
  id: string;
  title: string;
  team: string;
  supervisor: string;
  status: "approved" | "in-progress" | "submitted" | "draft" | "cancelled";
  originalityScore: number;
  submittedAt: string;
  approvedAt: string;
  technologies: string[];
  members: { name: string; role: "Leader" | "Member" }[];
}

interface Draft {
  id: string;
  title: string;
  originalityScore: number;
  lastEdited: string;
  canEdit: boolean;
}

interface StoredTeam {
  id: string;
  name: string;
  leaderId?: string;
  members?: string[];
  supervisorName?: string;
  isLeader?: boolean;
}

function getProjectStatusLabel(status: ActiveProject["status"]) {
  if (status === "cancelled") return "Cancelled";
  if (status === "in-progress") return "In Progress";
  if (status === "submitted") return "Pending";
  if (status === "draft") return "Draft";
  return "Approved";
}

function getProjectStatusClasses(status: ActiveProject["status"]) {
  if (status === "cancelled") {
    return "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20";
  }
  if (status === "draft") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20";
  }
  if (status === "submitted") {
    return "bg-primary/10 text-primary/90 dark:text-primary border border-primary/20";
  }

  return status === "in-progress"
    ? "bg-primary/10 text-blue-700 dark:text-blue-400 border border-primary/20"
    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20";
}

export default function ProjectManagement() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [project, setProject] = useState<ActiveProject | null>(null);
  const [myProject, setMyProject] = useState<MyProjectDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("projectManagementActiveTab") || "submit-idea";
    }
    return "submit-idea";
  });

  const [isSavedDraftsOpen, setIsSavedDraftsOpen] = useState(true);
  const [isAbandonDialogOpen, setIsAbandonDialogOpen] = useState(false);
  const [abandonReason, setAbandonReason] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [isRemoveMemberDialogOpen, setIsRemoveMemberDialogOpen] = useState(false);
  const router = useRouter();

  const [teams, setTeams] = useState<StoredTeam[]>([]);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamMaxSize, setNewTeamMaxSize] = useState("4");
  const [newTeamMembers, setNewTeamMembers] = useState(""); // comma-separated names
  const activeTeam = teams.find((team) => team.id === currentTeamId) || teams[0] || null;
  const projectTeamName = activeTeam?.name || project?.team || "My Team";
  const projectMembers =
    activeTeam
      ? normalizeTeamMembers(activeTeam.members || [], activeTeam.leaderId || "me").map((memberName) => ({
        name: displayMemberName(memberName),
        role: memberName === activeTeam.leaderId ? ("Leader" as const) : ("Member" as const),
      }))
      : project?.members || [];
  const isTeamLeader = activeTeam ? Boolean(activeTeam.isLeader) : false;
  const hasBlockingProject = Boolean(project && project.status !== "cancelled");

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("projectManagementActiveTab", value);
    }
  };

  // Load teams from localStorage on mount
  useEffect(() => {
    let ignore = false;

    Promise.allSettled([
      studentApi.getMyTeam(),
      studentApi.getMyProject(),
      studentApi.getMyDrafts(),
    ]).then(([teamResult, projectResult, draftsResult]) => {
      if (ignore) return;

      if (teamResult.status === "fulfilled" && teamResult.value) {
        const mappedTeam = mapBackendTeam(teamResult.value);
        setTeams([mappedTeam]);
        setCurrentTeamId(mappedTeam.id);
      }

      let hasActiveOrDraft = false;
      if (projectResult.status === "fulfilled" && projectResult.value) {
        const mappedProject = mapBackendProject(projectResult.value);
        if (mappedProject.status === "cancelled") {
          setMyProject(null);
          setProject(null);
        } else {
          setMyProject(projectResult.value);
          setProject(mappedProject);
          hasActiveOrDraft = true;
        }
      } else {
        setMyProject(null);
        setProject(null);
      }
      if (draftsResult.status === "fulfilled") {
        setDrafts(draftsResult.value.map(mapBackendDraft));
        if (draftsResult.value.length > 0) hasActiveOrDraft = true;
      } else {
        setDrafts([]);
      }
      if (hasActiveOrDraft) {
        const currentTab = sessionStorage.getItem("projectManagementActiveTab");
        if (!currentTab || currentTab === "submit-idea") {
          const newTab = (projectResult.status === "fulfilled" && projectResult.value && mapBackendProject(projectResult.value).status === "submitted") 
            ? "submitted-projects" 
            : "my-projects";
          setActiveTab(newTab);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("projectManagementActiveTab", newTab);
          }
        }
      } else {
        if (typeof window !== "undefined" && !sessionStorage.getItem("projectManagementActiveTab")) {
          setActiveTab("submit-idea");
        }
      }
      setIsLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, []);

  const handleCreateTeam = async () => {
    const name = newTeamName.trim();
    if (!name) {
      toast.error("Please provide a team name.");
      return;
    }

    try {
      await studentApi.createTeam(name, parseInt(newTeamMaxSize, 10));
      const created = await studentApi.getMyTeam();
      if (created) {
        const mappedTeam = mapBackendTeam(created);
        setTeams([mappedTeam]);
        setCurrentTeamId(mappedTeam.id);
      }
      setIsCreateTeamOpen(false);
      setNewTeamName("");
      setNewTeamMembers("");
      toast.success(`Team "${name}" created.`);
      return;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create team.");
      return;
    }

    const id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const members = newTeamMembers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Enforce one-team-per-student
    const memberToTeam: Record<string, string> = {};
    teams.forEach((t) => {
      (t.members || []).forEach((m) => {
        memberToTeam[m] = t.name;
      });
    });

    const conflicts = members.filter((m) => !!memberToTeam[m]);
    if (conflicts.length > 0) {
      toast.error(`Cannot add ${conflicts.join(", ")} — already in another team.`);
      return;
    }

    const teamObj = { id, name, leaderId: "me", members: normalizeTeamMembers(members, "me") };
    const updated = [...teams, teamObj];
    setTeams(updated);
    localStorage.setItem("teams", JSON.stringify(updated));
    setIsCreateTeamOpen(false);
    setNewTeamName("");
    setNewTeamMembers("");
    setCurrentTeamId(id);
    toast.success(`Team "${name}" created.`);
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      await studentApi.deleteDraft(draftId);
      setDrafts(drafts.filter((d) => d.id !== draftId));
      toast.success("Draft deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete draft.");
    }
  };

  const handleRemoveMember = (memberName: string) => {
    setMemberToRemove(memberName);
    setIsRemoveMemberDialogOpen(true);
  };

  const handleConfirmRemoveMember = () => {
    if (!memberToRemove) return;

    const leaderName = activeTeam?.leaderId ? displayMemberName(activeTeam.leaderId) : "John Smith";
    if (memberToRemove !== leaderName) {
      if (activeTeam) {
        const updatedTeams = teams.map((team) =>
          team.id === activeTeam.id
            ? {
              ...team,
              members: (team.members || []).filter(
                (member) => displayMemberName(member) !== memberToRemove,
              ),
            }
            : team,
        );
        setTeams(updatedTeams);
        localStorage.setItem("teams", JSON.stringify(updatedTeams));
      } else {
        setProject(prev => prev ? ({
          ...prev,
          members: prev.members.filter(m => m.name !== memberToRemove)
        }) : prev);
      }

      // Also remove from team chat
      const removedMembers = JSON.parse(localStorage.getItem("removedTeamMembers") || "[]");
      removedMembers.push(memberToRemove);
      localStorage.setItem("removedTeamMembers", JSON.stringify(removedMembers));

      toast.success(`${memberToRemove} has been removed from the team and team chat.`);
      setIsRemoveMemberDialogOpen(false);
      setMemberToRemove(null);
    } else if (memberToRemove === leaderName) {
      toast.error("Cannot remove the team leader.");
    }
  };

  const handleAbandonProject = async () => {
    if (!abandonReason.trim()) {
      toast.error("Please provide a reason for abandoning the project.");
      return;
    }

    if (!myProject?.projectId) {
      toast.error("No active project found to abandon.");
      return;
    }

    try {
      await studentApi.abandonProject(myProject.projectId, abandonReason);
      toast.success("Project abandoned. Your supervisor has been notified with your reason.");
      setIsAbandonDialogOpen(false);
      setAbandonReason("");
      setMyProject(null);
      setProject(null);
      return;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not abandon project.");
      return;
    }
  };

  const handleRecallSubmission = async () => {
    if (!myProject?.projectId) {
      toast.error("No submitted project found to recall.");
      return;
    }

    try {
      await studentApi.recallSubmission(myProject.projectId);
      const draftsResult = await studentApi.getMyDrafts();
      setDrafts(draftsResult.map(mapBackendDraft));
      setMyProject(null);
      setProject(null);
      handleTabChange("my-projects");
      toast.success("Submission recalled and moved back to drafts.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not recall submission.");
    }
  };

  const [isDownloadingReport, setIsDownloadingReport] = useState(false);

  const handleDownloadOriginalityReport = async () => {
    if (!project || project.id === "current") return;
    try {
      setIsDownloadingReport(true);
      toast.info("Generating Originality Report...");
      const blob = await studentApi.downloadOriginalityReport(project.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Originality_Report_${project.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Report downloaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download originality report. Make sure you are the team leader.");
    } finally {
      setIsDownloadingReport(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-2">
          Project Management
        </h1>
        <p className="text-muted-foreground">
          Submit new ideas or manage your existing projects and drafts
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="grid !h-auto items-stretch w-full max-w-[660px] grid-cols-1 sm:grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 !p-1">
            <TabsTrigger
              value="submit-idea"
              className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
            >
              <Lightbulb className="w-4 h-4" />
              New Idea
            </TabsTrigger>
            <TabsTrigger
              value="my-projects"
              className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
            >
              <FolderOpen className="w-4 h-4" />
              My Projects
            </TabsTrigger>
            <TabsTrigger
              value="submitted-projects"
              className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
            >
              <ShieldCheck className="w-4 h-4" />
              Submitted
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ─── Tab 3: Submit New Idea ─── */}
        <TabsContent value="submit-idea">
          <div className="bg-card text-card-foreground rounded-xl border border-border/50 shadow-sm p-8 md:p-10 text-center max-w-2xl mx-auto">
            <div className="w-40 h-25 bg-primary/10 rounded-2xl mx-auto flex items-center justify-center mb-6">
              <Lightbulb className="w-8 h-8 text-primary dark:text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              Submit a New Project Idea
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
              Share your innovative graduation project idea and get instant
              feedback on originality. Our AI-powered system helps you avoid
              redundancy and ensures your project stands out.
            </p>
            <div>
              <Button
                className="bg-primary hover:bg-primary/90 text-white h-12 px-8 text-base"
                disabled={hasBlockingProject}
                onClick={() => {
                  if (hasBlockingProject) {
                    toast.error("You cannot submit a new idea while your team has an active or submitted project.");
                    return;
                  }
                  if (!teams || teams.length === 0) {
                    toast.error("You must be on a team first to submit a project.");
                    router.push("/teams");
                  } else {
                    const tid = currentTeamId || teams[0].id;
                    router.push(`/project-submission?teamId=${tid}`);
                  }
                }}
              >
                <Lightbulb className="w-5 h-5 mr-2" />
                Start New Submission
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {hasBlockingProject ? (
                <p className="text-sm text-muted-foreground mt-3">
                  Finish, recall, or abandon the current project before starting another idea.
                </p>
              ) : (!teams || teams.length === 0) ? (
                <p className="text-sm text-muted-foreground mt-3">
                  You must be on a team before submitting a project.
                  <button className="ml-1 underline text-sm text-primary hover:text-primary/90" onClick={() => router.push("/teams")}>Go to Teams page</button>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-3">
                  Submitting as <strong>{teams.find(t => t.id === currentTeamId)?.name || teams[0].name}</strong> — you can change teams later.
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ─── Tab 1: My Projects ─── */}
        <TabsContent value="my-projects">
          <div className="space-y-8">
            {/* Active Project */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Active Project
              </h2>
              {isLoading ? (
                <div className="bg-card text-card-foreground rounded-xl border border-border/50 shadow-sm overflow-hidden p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-64 bg-muted/60 animate-pulse rounded-md" />
                        <div className="h-6 w-20 bg-muted/60 animate-pulse rounded-md" />
                      </div>
                      <div className="h-4 w-48 bg-muted/60 animate-pulse rounded-md" />
                    </div>
                    <div className="h-12 w-32 bg-muted/60 animate-pulse rounded-lg" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="h-5 w-full bg-muted/60 animate-pulse rounded-md" />
                    <div className="h-5 w-full bg-muted/60 animate-pulse rounded-md" />
                    <div className="h-5 w-full bg-muted/60 animate-pulse rounded-md" />
                  </div>
                  <div className="h-24 w-full bg-muted/60 animate-pulse rounded-xl mb-6" />
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-border/50">
                    <div className="h-10 w-36 bg-muted/60 animate-pulse rounded-md" />
                    <div className="h-10 w-40 bg-muted/60 animate-pulse rounded-md" />
                  </div>
                </div>
              ) : !project || project.status === "submitted" || project.status === "draft" || project.status === "cancelled" ? (
                <div className="bg-card text-card-foreground rounded-xl border border-border/50 p-8 text-center">
                  <p className="text-muted-foreground">
                    No active project found for your team.
                  </p>
                </div>
              ) : (
                <div className="bg-card text-card-foreground rounded-xl border border-border/50 shadow-sm overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-foreground">
                            {project.title}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={getProjectStatusClasses(project.status)}
                          >
                            {getProjectStatusLabel(project.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Team: {projectTeamName} · Supervisor:{" "}
                          {project.supervisor}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                        <Award className="w-4 h-4 text-primary dark:text-primary" />
                        <span className="text-lg font-bold text-primary dark:text-primary">
                          {project.originalityScore}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Originality
                        </span>
                      </div>
                    </div>

                    {/* Project meta */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                          Submitted:{" "}
                          {new Date(
                            project.submittedAt
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span>
                          Approved:{" "}
                          {new Date(
                            project.approvedAt
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{projectMembers.length} members</span>
                      </div>
                    </div>

                    {/* Technologies */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {project.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="px-2.5 py-1 bg-muted text-foreground text-xs rounded-md font-medium"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* Team Members */}
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                      {projectMembers.map((member) => (
                        <div
                          key={member.name}
                          className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50 group"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary/90 dark:text-primary flex items-center justify-center text-xs font-bold">
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {member.name}
                          </span>
                          {member.role === "Leader" ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-primary/10 border-primary/20 text-primary/90 dark:text-primary"
                            >
                              Leader
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 text-muted-foreground"
                              >
                                Member
                              </Badge>
                              {isTeamLeader && (
                                <button
                                  onClick={() => handleRemoveMember(member.name)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                                  title="Remove member"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500 hover:text-red-600" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    {isTeamLeader && (
                      <div className="flex flex-wrap gap-3 pt-4 border-t border-border/50">
                        <Button asChild className="bg-primary hover:bg-primary/90 text-white">
                          <Link
                            href={`/project-submission?edit=${project.id}&mode=details-only`}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit Project Details
                          </Link>
                        </Button>
                        <Button variant="outline" asChild>
                          <Link href={`/projects/${project.id}`}>
                            <FileText className="w-4 h-4 mr-2" />
                            View Full Project
                          </Link>
                        </Button>
                        <Button 
                          variant="secondary" 
                          onClick={handleDownloadOriginalityReport}
                          disabled={isDownloadingReport || project.originalityScore == null}
                          title={project.originalityScore == null ? "Originality score must be calculated first" : "Download Report"}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {isDownloadingReport ? "Downloading..." : "Originality Report"}
                        </Button>
                        <Dialog open={isAbandonDialogOpen} onOpenChange={setIsAbandonDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="destructive" className="ml-auto">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Abandon Project
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-red-600">Abandon Project</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to abandon this project? This action cannot be undone and all progress will be marked as abandoned.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <Label htmlFor="abandon-reason" className="text-foreground font-medium mb-2">
                                  Reason for abandoning (required)
                                </Label>
                                <Textarea
                                  id="abandon-reason"
                                  placeholder="Please explain why you're abandoning this project..."
                                  value={abandonReason}
                                  onChange={(e) => setAbandonReason(e.target.value)}
                                  className="mt-2 min-h-[100px]"
                                />
                              </div>
                            </div>
                            <div className="flex gap-3 justify-end">
                              <Button variant="outline" onClick={() => setIsAbandonDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleAbandonProject}
                                disabled={!abandonReason.trim()}
                              >
                                Yes, Abandon Project
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                    {!isTeamLeader && (
                      <div className="pt-4 border-t border-border/50">
                        <p className="text-sm text-muted-foreground italic">
                          Only the team leader can edit project details.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Saved Drafts */}
            <section>
              <button
                className="flex items-center gap-2 w-full text-left focus:outline-none group mb-4"
                onClick={() => setIsSavedDraftsOpen(!isSavedDraftsOpen)}
              >
                <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 flex-1">
                  Saved Drafts
                  <span className="text-sm font-normal text-muted-foreground">
                    ({drafts.length})
                  </span>
                </h2>
                <div className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                  {isSavedDraftsOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
              </button>

              {isSavedDraftsOpen && (
                <>
                  {drafts.length === 0 ? (
                    <div className="bg-card text-card-foreground rounded-xl border border-border/50 p-8 text-center">
                      <p className="text-muted-foreground">
                        No saved drafts. Start a new idea!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {drafts.map((draft) => (
                        <div
                          key={draft.id}
                          className="bg-card text-card-foreground rounded-xl border border-border/50 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/30 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate">
                              {draft.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Edited {draft.lastEdited}
                              </span>
                              {draft.originalityScore > 0 && (
                                <span className="text-xs font-medium text-primary dark:text-primary">
                                  {draft.originalityScore}% originality
                                </span>
                              )}
                              {draft.originalityScore === 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30"
                                >
                                  Not checked
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:shrink-0">
                            {draft.canEdit ? (
                              <>
                                <Button asChild variant="outline" size="sm" className="h-9">
                                  <Link href={`/project-submission?edit=${draft.id}`}>
                                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                                    Resume
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                                  onClick={() => handleDeleteDraft(draft.id)}
                                  aria-label="Delete draft"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <Button asChild variant="outline" size="sm" className="h-9">
                                <Link href={`/project-submission?edit=${draft.id}&mode=view`}>
                                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                                  View Draft
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </TabsContent>

        {/* ─── Tab 2: Submitted Projects ─── */}
        <TabsContent value="submitted-projects">
          <div className="space-y-4">
            {isLoading ? (
              <div className="bg-card text-card-foreground rounded-xl border border-border/50 shadow-sm p-6">
                <div className="h-24 animate-pulse rounded-lg bg-muted/40" />
              </div>
            ) : !project || project.status !== "submitted" ? (
              <div className="bg-card text-card-foreground rounded-xl border border-border/50 p-8 text-center">
                <p className="text-muted-foreground">
                  No submitted project found for your team.
                </p>
              </div>
            ) : (
              <div className="bg-card text-card-foreground rounded-xl border border-border/50 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-foreground">{project.title}</h3>
                      <Badge variant="secondary" className={getProjectStatusClasses(project.status)}>
                        {getProjectStatusLabel(project.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Submitted to {project.supervisor} on{" "}
                      {new Date(project.submittedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isTeamLeader && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleDownloadOriginalityReport}
                        disabled={isDownloadingReport || project.originalityScore == null}
                        title={project.originalityScore == null ? "Originality score must be calculated first" : "Download Report"}
                      >
                        <Download className="w-3 h-3 mr-1.5" />
                        {isDownloadingReport ? "Downloading..." : "Report"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
                      onClick={handleRecallSubmission}
                    >
                      Unsend Submission
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/projects/${project.id}`}>View Project</Link>
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Originality Score</p>
                    <p className="text-sm font-semibold text-primary dark:text-primary">{project.originalityScore}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Team</p>
                    <p className="text-sm font-medium text-foreground">{projectTeamName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-medium text-primary dark:text-primary">
                      {getProjectStatusLabel(project.status)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Team Dialog */}
      <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a Team</DialogTitle>
            <DialogDescription>
              Create a team to manage members and submit projects as a group.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="team-name" className="mb-2 block">Team Name</Label>
              <Input id="team-name" placeholder="e.g. Nova Path" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="max-size" className="mb-2 block">Max Size</Label>
              <Input id="max-size" type="number" min="1" max="10" value={newTeamMaxSize} onChange={(e) => setNewTeamMaxSize(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="team-members" className="mb-2 block">Team Members (comma-separated)</Label>
              <Textarea id="team-members" placeholder="John Smith, Sarah Ahmed" value={newTeamMembers} onChange={(e) => setNewTeamMembers(e.target.value)} className="min-h-[80px]" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateTeamOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTeam}>Create Team</Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Remove Member Dialog */}
      <Dialog open={isRemoveMemberDialogOpen} onOpenChange={setIsRemoveMemberDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{memberToRemove}</strong> from the team? They will lose access to the project.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-6">
            <Button variant="outline" onClick={() => setIsRemoveMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemoveMember}
            >
              Remove Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function displayMemberName(name: string) {
  if (name === "me") return "John Smith";
  return name;
}

function normalizeStoredTeam(value: unknown): StoredTeam {
  const item =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const leaderId = typeof item.leaderId === "string" ? item.leaderId : "me";
  const members = Array.isArray(item.members)
    ? item.members.filter((member): member is string => typeof member === "string")
    : [];

  return {
    id: typeof item.id === "string" ? item.id : `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    name: typeof item.name === "string" ? item.name : "Untitled Team",
    leaderId,
    supervisorName:
      typeof item.supervisorName === "string"
        ? item.supervisorName
        : typeof item.supervisor === "string"
          ? item.supervisor
          : undefined,
    members: normalizeTeamMembers(members, leaderId),
  };
}

function normalizeTeamMembers(members: string[], leaderId: string) {
  return [...new Set([leaderId, ...members].filter(Boolean))];
}

function mapBackendTeam(team: MyTeamDto): StoredTeam {
  const leader = team.members.find((member) =>
    member.role.toLowerCase().includes("leader"),
  );

  return {
    id: String(team.id),
    name: team.name,
    leaderId: leader?.fullName || team.members[0]?.fullName || "me",
    members: team.members.map((member) => member.fullName),
    isLeader: team.isLeader,
  };
}

function mapBackendDraft(draft: ProjectDraftDto): Draft {
  const editedAt = draft.updatedAt || draft.createdAt;

  return {
    id: String(draft.id),
    title: draft.title,
    originalityScore: normalizeOriginalityPercent(draft.originalityScore),
    lastEdited: new Date(editedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    canEdit: draft.canEdit,
  };
}

function mapBackendProject(project: MyProjectDto): ActiveProject {
  const normalizedStatus = (project.status || "").toLowerCase();

  return {
    id: String(project.projectId || "current"),
    title: project.title || "Untitled Project",
    team: project.teamName || "My Team",
    supervisor: project.supervisorName || "Not assigned",
    status: normalizedStatus.includes("cancel") || normalizedStatus.includes("abandon")
      ? "cancelled"
      : normalizedStatus.includes("review")
        ? "submitted"
        : normalizedStatus.includes("draft")
          ? "draft"
          : normalizedStatus.includes("progress")
            ? "in-progress"
            : normalizedStatus.includes("approve")
              ? "approved"
              : "approved",
    originalityScore: normalizeOriginalityPercent(project.originalityScore),
    submittedAt: project.submittedAt || project.createdAt || new Date().toISOString(),
    approvedAt: project.submittedAt || project.createdAt || new Date().toISOString(),
    technologies: project.technologies || [],
    members: (project.members || []).map((member) => ({
      name: member.name,
      role: member.role.toLowerCase().includes("leader") ? "Leader" : "Member",
    })),
  };
}
