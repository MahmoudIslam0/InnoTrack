"use client";

import { useEffect, useState, useCallback } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Copy,
  KeyRound,
  MessageSquare,
  MoreVertical,
  Pen,
  Plus,
  ShieldCheck,
  Timer,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  TeamChatMember,
  TeamChatMessage,
  TeamChatWorkspace,
} from "@/app/_components/TeamChatWorkspace";
import { useTeamChat } from "@/hooks/useTeamChat";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageTransition } from "@/components/ui/animated-loaders";
import { AnimatePresence, motion } from "framer-motion";
import MembersGrid from "@/components/Team/MembersGrid";
import PendingRequestsList from "@/components/Team/PendingRequestsList";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MyTeamDto,
  PendingJoinRequestDto,
  studentApi,
} from "@/lib/student-api";
import { api } from "@/lib/api";

type JoinRequest = {
  id: string;
  studentId?: string;
  fullName: string;
  department: string;
  skills?: string[];
};

type Team = {
  id: string;
  name: string;
  leaderId?: string;
  isLeader?: boolean;
  members: { id: number; name: string; profilePictureUrl?: string | null }[];
  supervisorName?: string;
  projectTitle?: string;
  projectTechnologies?: string[];
};

type TeamMember = {
  name: string;
  role: "Leader" | "Member";
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [activeView, setActiveView] = useState<"overview" | "chat">("overview");
  const [showHint, setShowHint] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamMaxSize, setNewTeamMaxSize] = useState("4");
  const [memberContact, setMemberContact] = useState("");
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteCountdown, setInviteCountdown] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState("Me");
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: "default" | "destructive";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "default",
    onConfirm: () => {},
  });

  // Periodic refresh of team data to detect new members joining
  const refreshTeamData = useCallback(async () => {
    try {
      const [teamResult, requestsResult] = await Promise.allSettled([
        studentApi.getMyTeam(),
        studentApi.getPendingJoinRequests(),
      ]);

      if (teamResult.status === "fulfilled" && teamResult.value) {
        const mappedTeam = mapTeam(teamResult.value);
        setTeams([mappedTeam]);
        setTeam(mappedTeam);
      }

      if (requestsResult.status === "fulfilled") {
        setRequests(requestsResult.value.map(mapRequest));
      }
    } catch {}
  }, []);

  const {
    messages: realChatMessages,
    members: realChatMembers,
    sendMessage: realSendMessage,
    editMessage: realEditMessage,
    deleteMessage: realDeleteMessage,
    togglePin: realTogglePin,
    reactToMessage: realReactToMessage,
    replyToMessage: realReplyToMessage,
    uploadFile: realUploadFile,
    isLoading: isChatLoading,
  } = useTeamChat(team ? Number(team.id) : null, refreshTeamData);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.name) setCurrentUserName(u.name);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.allSettled([
      studentApi.getMyTeam(),
      studentApi.getPendingJoinRequests(),
    ]).then(([teamResult, requestsResult]) => {
      if (ignore) return;

      if (teamResult.status === "fulfilled" && teamResult.value) {
        const mappedTeam = mapTeam(teamResult.value);
        setTeams([mappedTeam]);
        setTeam(mappedTeam);
      } else {
        setTeams([]);
        setTeam(null);
      }

      if (requestsResult.status === "fulfilled") {
        setRequests(requestsResult.value.map(mapRequest));
      } else {
        setRequests([]);
      }

      setShowHint(
        localStorage.getItem("teamsWorkspaceHintDismissed") !== "true",
      );
      setIsLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!team) return;
    const interval = setInterval(refreshTeamData, 30000);
    return () => clearInterval(interval);
  }, [team, refreshTeamData]);

  const handleActiveViewChange = (view: "overview" | "chat") => {
    setActiveView(view);
  };

  useEffect(() => {
    if (inviteCountdown <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setInviteCountdown((value) => {
        const next = value - 1;
        if (next <= 0) setInviteCode(null);
        return next;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [inviteCountdown]);

  useEffect(() => {
    queueMicrotask(() => {
      setTeamNameDraft(team?.name || "");
      setIsEditingTeamName(false);
    });
  }, [team?.id, team?.name]);

  const saveTeams = (next: Team[], selectedId?: string) => {
    setTeams(next);

    const nextTeam =
      next.find(
        (existingTeam) => existingTeam.id === (selectedId || team?.id),
      ) ||
      next[0] ||
      null;
    setTeam(nextTeam);
  };

  const hasTeam = Boolean(team);
  const isLeader = hasTeam && Boolean(team?.isLeader);
  const teamName = team?.name || "";
  const supervisorName = team?.supervisorName || "";
  const chatSupervisorName = supervisorName || null;
  const isApproved = Boolean(team?.projectTitle || supervisorName);
  const teamMembers = (team?.members || []).map((m) => ({
    id: m.id,
    name: m.name,
    profilePictureUrl: m.profilePictureUrl,
    role: (m.name === (team?.leaderId || "") ? "Leader" : "Member") as
      | "Leader"
      | "Member",
  }));
  const visibleTeamMembers = teamMembers.map((member) => ({
    ...member,
    name: member.name,
  }));

  const createTeam = async () => {
    const name = newTeamName.trim();
    if (!name) {
      toast.error("Add a team name first.");
      return;
    }

    try {
      await studentApi.createTeam(name, parseInt(newTeamMaxSize, 10));
      const created = await studentApi.getMyTeam();
      if (created) {
        const mappedTeam = mapTeam(created);
        saveTeams([mappedTeam], mappedTeam.id);
      }
      setNewTeamName("");
      handleActiveViewChange("overview");
      toast.success(`Team "${name}" created.`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not create team."));
    }
  };

  const joinByCode = async () => {
    if (!/^\d{6}$/.test(joinCodeInput)) {
      toast.error("Enter a 6-digit join code.");
      return;
    }

    try {
      await studentApi.joinByCode(joinCodeInput);
      const joined = await studentApi.getMyTeam();
      if (joined) {
        const mappedTeam = mapTeam(joined);
        saveTeams([mappedTeam], mappedTeam.id);
      }
      setJoinCodeInput("");
      handleActiveViewChange("overview");
      toast.success("Joined the team workspace.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not join team."));
    }
  };

  const approve = async (id: string) => {
    const req = requests.find((request) => request.id === id);
    if (!req || !team) return;

    try {
      await studentApi.handleJoinRequest(Number(id), true);
      const updatedTeam = await studentApi.getMyTeam();
      if (updatedTeam)
        saveTeams([mapTeam(updatedTeam)], String(updatedTeam.id));
      setRequests(requests.filter((request) => request.id !== id));
      toast.success(`${req.fullName} added to team`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not accept request."));
    }
  };

  const reject = async (id: string) => {
    try {
      await studentApi.handleJoinRequest(Number(id), false);
      setRequests(requests.filter((request) => request.id !== id));
      toast.success("Request rejected");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not reject request."));
    }
  };

  const saveTeamName = async () => {
    if (!team) return;
    const nextName = teamNameDraft.trim();
    if (!nextName) {
      toast.error("Team name cannot be empty.");
      return;
    }

    try {
      await studentApi.renameTeam(nextName);
      const updated = teams.map((existingTeam) =>
        existingTeam.id === team.id
          ? { ...existingTeam, name: nextName }
          : existingTeam,
      );
      saveTeams(updated, team.id);
      setIsEditingTeamName(false);
      toast.success("Team name updated.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not rename team."));
    }
  };

  const removeMember = async (name: string, memberId?: number) => {
    if (!team || !memberId) return;
    if (name === "me" || name === team.leaderId) {
      toast.error("The team leader cannot be removed.");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Remove Member",
      description: `Are you sure you want to remove ${name} from the team?`,
      variant: "destructive",
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await studentApi.removeMember(memberId);

          const updated = teams.map((existingTeam) =>
            existingTeam.id === team.id
              ? {
                  ...existingTeam,
                  members: existingTeam.members.filter(
                    (member) => member.id !== memberId,
                  ),
                }
              : existingTeam,
          );

          saveTeams(updated, team.id);
          toast.success(`${name} removed`);
        } catch (error: unknown) {
          toast.error(getErrorMessage(error, "Could not remove member."));
        }
      },
    });
  };

  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const addMember = async () => {
    if (!team) return;
    const contact = memberContact.trim();
    if (!contact) {
      toast.error("Enter a student name or email.");
      return;
    }

    if (!contact.includes("@")) {
      toast.error("Enter the student's email to send an invite.");
      return;
    }

    try {
      setIsSendingInvite(true);
      await studentApi.inviteByEmail(contact);
      setMemberContact("");
      setIsAddMemberOpen(false);
      toast.success("Invitation email sent.");
    } catch (error: unknown) {
      console.error("Invite error:", error);
      toast.error(getErrorMessage(error, "Could not send invitation."));
    } finally {
      setIsSendingInvite(false);
    }
  };

  const generateInviteCode = async () => {
    try {
      const result = await studentApi.generateJoinCode();
      setInviteCode(result.joinCode || null);
      setInviteCountdown(60);
      setCopied(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not generate join code."));
    }
  };

  const copyInviteCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Join code copied");
  };

  const dismissHint = () => {
    setShowHint(false);
    localStorage.setItem("teamsWorkspaceHintDismissed", "true");
  };

  return (
    <div
      className={`dashboard-page ${hasTeam && activeView === "chat" ? "space-y-4 md:pt-5 md:pb-4 !max-w-[95%]" : "space-y-6"}`}
    >
      {isLoading ? (
        <div className="flex flex-col gap-6">
          <div className="flex justify-center mb-4">
            <Skeleton className="h-11 w-full max-w-[440px] rounded-xl" />
          </div>
          <div className="dashboard-surface p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <div className="mt-8 space-y-4">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        </div>
      ) : !hasTeam ? (
        <NoTeamState
          joinCodeInput={joinCodeInput}
          setJoinCodeInput={setJoinCodeInput}
          joinByCode={joinByCode}
          newTeamName={newTeamName}
          setNewTeamName={setNewTeamName}
          newTeamMaxSize={newTeamMaxSize}
          setNewTeamMaxSize={setNewTeamMaxSize}
          createTeam={createTeam}
        />
      ) : (
        <Tabs
          value={activeView}
          onValueChange={(val) => handleActiveViewChange(val as any)}
          className="w-full"
        >
          <div className="flex justify-center mb-8">
            <TabsList className="grid !h-auto items-stretch w-full max-w-[440px] grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 !p-1">
              <TabsTrigger
                value="overview"
                className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
              >
                <Users className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
              >
                <MessageSquare className="h-4 w-4" />
                Team Chat
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 outline-none">
            <section className="dashboard-surface overflow-hidden">
              <div className="p-5 md:p-6 border-b border-border/50">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    {isEditingTeamName ? (
                      <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          value={teamNameDraft}
                          onChange={(event) =>
                            setTeamNameDraft(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") saveTeamName();
                            if (event.key === "Escape") {
                              setTeamNameDraft(teamName);
                              setIsEditingTeamName(false);
                            }
                          }}
                          className="h-11 text-lg font-semibold md:text-xl"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveTeamName}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setTeamNameDraft(teamName);
                              setIsEditingTeamName(false);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h1 className="truncate text-2xl font-bold tracking-tight text-foreground md:text-3xl flex items-center gap-2">
                          {teamName}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {isLeader ? (
                                <>
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => setIsEditingTeamName(true)}
                                  >
                                    <Pen className="w-4 h-4 mr-2" />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer"
                                    onClick={() => {
                                      setConfirmDialog({
                                        isOpen: true,
                                        title: "Delete Team",
                                        description:
                                          "Are you sure you want to delete this team? This action cannot be undone.",
                                        variant: "destructive",
                                        onConfirm: async () => {
                                          setConfirmDialog((prev) => ({
                                            ...prev,
                                            isOpen: false,
                                          }));
                                          try {
                                            await api.delete("/api/Teams/me");
                                            window.location.reload();
                                          } catch (err: any) {
                                            toast.error(
                                              err.message ||
                                                "Failed to delete team.",
                                            );
                                          }
                                        },
                                      });
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Team
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer"
                                  onClick={() => {
                                    setConfirmDialog({
                                      isOpen: true,
                                      title: "Leave Team",
                                      description:
                                        "Are you sure you want to leave this team?",
                                      variant: "destructive",
                                      onConfirm: async () => {
                                        setConfirmDialog((prev) => ({
                                          ...prev,
                                          isOpen: false,
                                        }));
                                        try {
                                          await studentApi.leaveTeam();
                                          window.location.reload();
                                        } catch (err: any) {
                                          toast.error(
                                            err.message ||
                                              "Failed to leave team.",
                                          );
                                        }
                                      },
                                    });
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Leave Team
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </h1>

                        <div className="flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground font-medium">
                          <span className="bg-muted/60 px-2.5 py-0.5 rounded-md text-xs">
                            {isLeader ? "Leader Access" : "Member"}
                          </span>

                          {team?.projectTitle && (
                            <>
                              <span>•</span>
                              <span>{team.projectTitle}</span>
                            </>
                          )}

                          {supervisorName && (
                            <>
                              <span>•</span>
                              <span>Supervisor: {supervisorName}</span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <MetricCard
                      label="MEMBERS"
                      value={teamMembers.length.toString()}
                      valueColorClass="text-primary dark:text-primary"
                    />
                    <MetricCard
                      label="REQUESTS"
                      value={requests.length.toString()}
                    />
                  </div>
                </div>
              </div>

              {showHint && (
                <div className="border-b border-border px-5 py-4 md:px-6">
                  <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary dark:text-primary">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="leading-5">
                      Manage members, join codes, and requests in Overview. Chat
                      is for team conversation and shared files.
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mr-2 -mt-1 h-7 w-7 shrink-0 hover:bg-primary/10"
                      onClick={dismissHint}
                      aria-label="Dismiss tip"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-5 md:p-6">
                <div className="space-y-8">
                  <div className="space-y-8">
                    <section>
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-foreground">
                            Team Roster
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {isLeader
                              ? "Add, remove, and review members from one place."
                              : "View the current members of your team."}
                          </p>
                        </div>
                        {isLeader && (
                          <Dialog
                            open={isAddMemberOpen}
                            onOpenChange={setIsAddMemberOpen}
                          >
                            <DialogTrigger asChild>
                              <Button className="gap-2 bg-primary text-white hover:bg-primary/90">
                                <UserPlus className="h-4 w-4" />
                                Add Member
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Add Team Member</DialogTitle>
                                <DialogDescription>
                                  Invite a student or generate a temporary code
                                  for this team.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex flex-col gap-6 py-3">
                                <div className="space-y-3">
                                  <h4 className="text-sm font-medium">
                                    Invite via Email
                                  </h4>
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="student@university.edu or student name"
                                      value={memberContact}
                                      onChange={(event) =>
                                        setMemberContact(event.target.value)
                                      }
                                    />
                                    <Button
                                      className="bg-primary text-white hover:bg-primary/90"
                                      onClick={addMember}
                                      disabled={isSendingInvite}
                                    >
                                      {isSendingInvite ? "Sending..." : "Send"}
                                    </Button>
                                  </div>
                                </div>

                                <div className="relative">
                                  <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border/50" />
                                  </div>
                                  <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-popover px-2 text-muted-foreground">
                                      Or use join code
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium">
                                      Generate Temporary Code
                                    </h4>
                                    {inviteCountdown > 0 && (
                                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                                        <Timer className="h-3 w-3" />
                                        {inviteCountdown}s remaining
                                      </span>
                                    )}
                                  </div>

                                  {inviteCode ? (
                                    <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-3">
                                      <span className="text-2xl font-bold tracking-[0.2em] text-primary dark:text-primary">
                                        {inviteCode}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={copyInviteCode}
                                      >
                                        {copied ? (
                                          <Check className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                          <Copy className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      className="w-full"
                                      onClick={generateInviteCode}
                                    >
                                      Generate 6-Digit Code
                                    </Button>
                                  )}

                                  <p className="text-xs text-muted-foreground">
                                    Code expires in 60 seconds.
                                  </p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                      <MembersGrid
                        members={visibleTeamMembers}
                        isLeaderView={isLeader}
                        onRemove={removeMember}
                      />
                    </section>

                    {isLeader && (
                      <section>
                        <div className="mb-4">
                          <h2 className="text-lg font-semibold text-foreground">
                            Pending Requests
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            Review applicants before they join this team.
                          </p>
                        </div>
                        <PendingRequestsList
                          requests={requests}
                          onAccept={approve}
                          onReject={reject}
                        />
                      </section>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="chat" className="mt-0 outline-none">
            <TeamChatWorkspace
              title="Team Chat"
              subtitle={`${team?.projectTitle || "No project yet"} - ${team?.name || ""}`}
              members={realChatMembers as any}
              messages={realChatMessages as any}
              currentUserName={currentUserName}
              currentUserRole="Student"
              onSendMessage={realSendMessage}
              onEditMessage={realEditMessage}
              onDeleteMessage={realDeleteMessage}
              onTogglePin={realTogglePin}
              onReactToMessage={realReactToMessage}
              onReplyToMessage={realReplyToMessage}
              onUploadFile={realUploadFile}
              isLoading={isChatLoading}
              className="h-[calc(100vh-240px)] min-h-[500px] rounded-2xl border border-border/50 shadow-sm"
            />
          </TabsContent>
        </Tabs>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
      />
    </div>
  );
}

function NoTeamState({
  joinCodeInput,
  setJoinCodeInput,
  joinByCode,
  newTeamName,
  setNewTeamName,
  newTeamMaxSize,
  setNewTeamMaxSize,
  createTeam,
}: {
  joinCodeInput: string;
  setJoinCodeInput: (value: string) => void;
  joinByCode: () => void;
  newTeamName: string;
  setNewTeamName: (value: string) => void;
  newTeamMaxSize: string;
  setNewTeamMaxSize: (value: string) => void;
  createTeam: () => void;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl flex flex-col justify-center min-h-[60vh] py-8">
      <div className="dashboard-surface p-8 md:p-12">
        <Tabs defaultValue="join" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid !h-auto items-stretch w-full max-w-[440px] grid-cols-2 rounded-xl border border-border bg-muted/40 !p-1">
              <TabsTrigger
                value="join"
                className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
              >
                Join Team
              </TabsTrigger>

              <TabsTrigger
                value="create"
                className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
              >
                Create Team
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="join" className="mt-0 outline-none">
            <div className="mx-auto mb-6 flex h-25 w-25 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:text-primary">
              <KeyRound className="h-8 w-8" />
            </div>

            <h2 className="text-center text-3xl font-semibold text-foreground">
              Join a team
            </h2>

            <p className="mt-3 text-center text-base leading-relaxed text-muted-foreground">
              Enter the 6-digit code from your team leader to unlock the team
              workspace.
            </p>

            <div className="mt-8 space-y-4">
              <Input
                placeholder="Enter 6-digit code"
                value={joinCodeInput}
                onChange={(event) =>
                  setJoinCodeInput(
                    event.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
                className="h-14 text-center tracking-[0.4em] text-lg bg-background"
                inputMode="numeric"
              />

              <Button
                onClick={joinByCode}
                className="h-14 w-full bg-primary text-base text-white hover:bg-primary/90"
              >
                Join Team
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="create" className="mt-0 outline-none">
            <div className="mx-auto mb-6 flex h-25 w-25 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Plus className="h-12 w-8" />
            </div>

            <h2 className="text-center text-3xl font-semibold text-foreground">
              Create your team
            </h2>

            <p className="mt-3 text-center text-base leading-relaxed text-muted-foreground">
              Start your own team, then invite members and manage requests from
              your Overview dashboard.
            </p>

            <div className="mt-8 space-y-4">
              <Input
                placeholder="Team name"
                value={newTeamName}
                onChange={(event) => setNewTeamName(event.target.value)}
                className="h-14 text-lg bg-background"
              />
              <Input
                placeholder="Max size (default 4)"
                type="number"
                min="2"
                max="11"
                value={newTeamMaxSize}
                onChange={(event) => setNewTeamMaxSize(event.target.value)}
                className="h-14 text-lg bg-background"
              />

              <Button
                onClick={createTeam}
                className="h-14 w-full bg-emerald-600 text-base text-white hover:bg-emerald-700"
              >
                Create Team
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  valueColorClass = "text-foreground",
}: {
  label: string;
  value: string;
  valueColorClass?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-background/50 py-5 min-w-[110px] shadow-sm">
      <p className={`text-[40px] leading-none font-bold ${valueColorClass}`}>
        {value}
      </p>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
        {label}
      </p>
    </div>
  );
}

function initialsFor(name: string | null | undefined) {
  if (!name || typeof name !== "string") return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function parseTeams(value: unknown): Team[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    )
    .map((item) => {
      const leaderId = typeof item.leaderId === "string" ? item.leaderId : "me";
      const members = Array.isArray(item.members)
        ? item.members.filter(
            (member): member is string => typeof member === "string",
          )
        : [];

      return {
        id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
        name: typeof item.name === "string" ? item.name : "Untitled Team",
        leaderId,
        supervisorName:
          typeof item.supervisorName === "string"
            ? item.supervisorName
            : typeof item.supervisor === "string"
              ? item.supervisor
              : undefined,
        members: members.map((m) => ({ id: 0, name: m })),
      };
    });
}

function normalizeTeamMembers(members: string[], leaderId: string) {
  return uniqueNames([leaderId, ...members].filter(Boolean));
}

function mapTeam(value: MyTeamDto): Team {
  const leader = value.members.find((member) =>
    member.role.toLowerCase().includes("leader"),
  );

  return {
    id: String(value.id),
    name: value.name,
    leaderId: leader?.fullName || value.members[0]?.fullName || "",
    isLeader: value.isLeader,
    members: value.members.map((member: any) => ({
      id: member.studentId || member.userId || member.id,
      name: member.fullName,
      profilePictureUrl: member.profilePictureUrl,
    })),
    supervisorName: value.supervisorName ?? undefined,
    projectTitle: value.projectTitle ?? undefined,
    projectTechnologies: value.projectTechnologies ?? [],
  };
}

function mapRequest(value: PendingJoinRequestDto): JoinRequest {
  return {
    id: String(value.id),
    studentId: value.studentId ? String(value.studentId) : undefined,
    fullName: value.studentName,
    department: value.department,
    skills: value.skills || [],
  };
}

function uniqueNames(names: string[]) {
  return names.filter((name, index, list) => list.indexOf(name) === index);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function parseRequests(value: unknown): JoinRequest[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    )
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      fullName:
        typeof item.fullName === "string" ? item.fullName : "Unknown Student",
      department:
        typeof item.department === "string" ? item.department : "Unassigned",
      skills: Array.isArray(item.skills)
        ? item.skills.filter(
            (skill): skill is string => typeof skill === "string",
          )
        : [],
    }));
}
