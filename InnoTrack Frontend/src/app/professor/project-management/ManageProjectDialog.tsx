"use client";

import { useState } from "react";
import { Target, FileText, BookOpen, Lightbulb, CheckCircle2, XCircle, Users, Save, Info, Award, X, Clock, AlertTriangle, ChevronRight, Activity, MessageSquare, AlertCircle, FileSearch, Trash2, Edit2, PlayCircle, Lock, UserMinus, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { OriginalityMeter, StatusBadge } from "../_components";
import { Project, teams as initialTeams } from "../_data";
import { formatPercent, normalizeStatusTone, normalizeOriginalityPercent } from "@/lib/student-api";
import { professorApi } from "@/lib/professor-api";

interface ManageProjectDialogProps {
  project: any | null;
  teams: any[];
  defaultTab?: "overview" | "team" | "logs";
  onOpenChange: (open: boolean) => void;
  onApproveProposal: (id: string, feedback: string) => void;
  onRejectProposal: (id: string, feedback: string) => void;
  onAcceptSubmission: (id: string, feedback: string) => void;
  onRejectSubmission: (id: string, feedback: string) => void;
  onCancelSupervision?: (id: string, reason: string) => void;
  onRequestRevision?: (id: string, feedback: string) => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  by: string;
  type: "approval" | "rejection" | "edit" | "member" | "info" | "revision";
}

const initialLogs: Record<string, LogEntry[]> = {
  p1: [
    { id: "l1", timestamp: "2026-04-29 11:05", action: "Proposal rejected — needs revision.", by: "Dr. Leila Hassan", type: "rejection" },
    { id: "l2", timestamp: "2026-04-29 09:00", action: "Project submitted for proposal review.", by: "John Smith", type: "info" },
  ],
  p2: [
    { id: "l3", timestamp: "2026-04-24 09:45", action: "Proposal approved.", by: "Dr. Leila Hassan", type: "approval" },
    { id: "l4", timestamp: "2026-04-21 10:00", action: "Project submitted for proposal review.", by: "Mohammed Ali", type: "info" },
  ],
  p3: [
    { id: "l5", timestamp: "2026-04-30 14:20", action: "Final submission accepted.", by: "Dr. Leila Hassan", type: "approval" },
    { id: "l6", timestamp: "2026-04-26 08:30", action: "Final submission uploaded.", by: "Amira Saleh", type: "info" },
  ],
  p4: [
    { id: "l7", timestamp: "2026-04-30 09:00", action: "Project submitted for proposal review.", by: "Care Loop Leader", type: "info" },
  ],
};

export function ManageProjectDialog({
  project,
  teams,
  defaultTab = "team",
  onOpenChange,
  onApproveProposal,
  onRejectProposal,
  onAcceptSubmission,
  onRejectSubmission,
  onCancelSupervision,
  onRequestRevision,
}: ManageProjectDialogProps) {
  const [teamSizeLimit, setTeamSizeLimit] = useState("4");
  const [feedback, setFeedback] = useState("");
  const [decisionMode, setDecisionMode] = useState<string | null>(null);
  const [localTeams, setLocalTeams] = useState(teams);
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>(initialLogs);
  const [generalFeedback, setGeneralFeedback] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const team = project ? teams.find((t: any) => t.projectId === project.id) : null;
  const projectLogs = project ? (logs[project.id] ?? []) : [];

  const isRejecting = decisionMode === "reject-proposal" || decisionMode === "reject-submission" || decisionMode === "cancel-supervision" || decisionMode === "request-revision";
  const cannotConfirm = isRejecting && !feedback.trim();

  const addLog = (projectId: string, action: string, type: LogEntry["type"]) => {
    const entry: LogEntry = {
      id: `l${Date.now()}`,
      timestamp: new Date().toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }),
      action,
      by: "Dr. Leila Hassan",
      type,
    };
    setLogs(prev => ({ ...prev, [projectId]: [entry, ...(prev[projectId] ?? [])] }));
  };

  const handleClose = () => {
    setDecisionMode(null);
    setFeedback("");
    onOpenChange(false);
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!project) return;
    setLocalTeams(prev =>
      prev.map((t: any) =>
        t.projectId === project.id
          ? { ...t, members: t.members.filter((m: any) => m.id !== memberId) }
          : t
      )
    );
    addLog(project.id, `Member "${memberName}" removed from team.`, "member");
    toast.success(`${memberName} has been removed from the team.`);
  };

  const handleSaveTeamSize = () => {
    if (!project) return;
    toast.success(`Team size limit set to ${teamSizeLimit}.`);
    addLog(project.id, `Max team size updated to ${teamSizeLimit}.`, "edit");
  };

  const handleDecision = () => {
    if (!project || !decisionMode || cannotConfirm) return;
    if (decisionMode === "approve-proposal") {
      onApproveProposal(project.id, feedback);
      addLog(project.id, `Proposal approved.${feedback ? ` Feedback: ${feedback}` : ""}`, "approval");
    } else if (decisionMode === "reject-proposal") {
      onRejectProposal(project.id, feedback);
      addLog(project.id, `Proposal rejected. Feedback: ${feedback}`, "rejection");
    } else if (decisionMode === "accept-submission") {
      onAcceptSubmission(project.id, feedback);
      addLog(project.id, `Final submission accepted.${feedback ? ` Feedback: ${feedback}` : ""}`, "approval");
    } else if (decisionMode === "reject-submission") {
      onRejectSubmission(project.id, feedback);
      addLog(project.id, `Final submission rejected. Feedback: ${feedback}`, "rejection");
    } else if (decisionMode === "cancel-supervision") {
      onCancelSupervision?.(project.id, feedback);
      addLog(project.id, `Supervision cancelled. Reason: ${feedback}`, "rejection");
    } else if (decisionMode === "request-revision") {
      onRequestRevision?.(project.id, feedback);
      addLog(project.id, `Revision requested. Reason: ${feedback}`, "revision");
    }
    setDecisionMode(null);
    setFeedback("");
  };

  const logIcon = (type: LogEntry["type"]) => {
    if (type === "approval") return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    if (type === "rejection") return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
    if (type === "member") return <Users className="w-4 h-4 text-purple-500 shrink-0" />;
    if (type === "edit") return <Save className="w-4 h-4 text-primary shrink-0" />;
    if (type === "revision") return <FileText className="w-4 h-4 text-orange-500 shrink-0" />;
    return <Info className="w-4 h-4 text-muted-foreground shrink-0" />;
  };

  const handleSendGeneralFeedback = async () => {
    if (!project || !generalFeedback.trim()) return;
    setIsSendingFeedback(true);
    try {
      await professorApi.addFeedback(project.id, generalFeedback);
      toast.success("Feedback sent to the team successfully.");
      addLog(project.id, `General feedback sent to team: "${generalFeedback}"`, "info");
      setGeneralFeedback("");
    } catch (e) {
      toast.error("Failed to send feedback.");
    } finally {
      setIsSendingFeedback(false);
    }
  };

  return (
    <Dialog open={Boolean(project)} onOpenChange={handleClose}>
      <DialogContent className="w-[min(1100px,calc(100vw-32px))] sm:max-w-none max-h-[90vh] bg-[#f8f9fa] dark:bg-slate-950 p-0 shadow-2xl flex flex-col [&>button]:hidden overflow-hidden rounded-3xl border-0 ring-1 ring-black/5">
        {project && (
          <>
            {/* Header */}
            <DialogHeader className="px-8 pt-8 pb-6 border-b border-slate-200/60 dark:border-slate-800 shrink-0 bg-transparent">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="space-y-4 max-w-3xl">
                  <DialogTitle className="text-[26px] font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    <span className="text-slate-500 dark:text-slate-400 font-medium mr-2">Project:</span>
                    {project.title}
                  </DialogTitle>
                  <div className="flex flex-wrap items-center gap-4 text-[15px] text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Team: <span className="font-semibold text-slate-700 dark:text-slate-300">{project.teamName || "No team"}</span></span>
                    </div>
                    <div className="hidden sm:block text-slate-300 dark:text-slate-700">|</div>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      <span>Domain: <span className="font-semibold text-slate-700 dark:text-slate-300">{project.domain}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {project.originalityScore !== undefined && (
                    <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
                      <span className="text-2xl font-bold text-primary leading-none">{normalizeOriginalityPercent(project.originalityScore)}%</span>
                      <span className="text-[10px] font-bold text-primary/70 uppercase tracking-widest mt-1.5">Score</span>
                    </div>
                  )}
                  <StatusBadge status={normalizeStatusTone(project.status) as any} />
                  <button
                    onClick={handleClose}
                    className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </DialogHeader>

            {/* Tabs */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
              <Tabs defaultValue={defaultTab}>
                {/* Removed TabsList */}

                {/* ── OVERVIEW TAB ── */}
                <TabsContent value="overview" className="m-0">
                  <div className="flex flex-col gap-6 p-8 max-w-5xl mx-auto">

                    {/* Team Members */}
                    {((team && team.members && team.members.length > 0) || (project.members && project.members.length > 0)) && (
                      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm space-y-5">
                        <h4 className="text-sm font-bold flex items-center gap-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          <Users className="w-4 h-4" />
                          Team Members
                        </h4>
                        <div className="flex flex-wrap gap-4">
                          {(team?.members || project.members).map((member: any) => {
                            const displayName = member.name || member.fullName || "Unknown";
                            return (
                              <div key={member.id || member.studentId || Math.random()} className="w-64 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-4 bg-[#f8f9fa] dark:bg-slate-950">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-primary/40 text-primary dark:text-indigo-300 flex items-center justify-center text-sm font-bold shrink-0">
                                  {displayName.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
                                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">{member.role || "Member"}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Proposal Details */}
                    {(project.proposalDepartment || project.proposalMessage) && (
                      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm space-y-4">
                        <h4 className="text-sm font-bold flex items-center gap-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          <MessageSquare className="w-4 h-4" />
                          Proposal Details
                        </h4>
                        {project.proposalDepartment && (
                           <div className="mb-3">
                             <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Department: </span>
                             <span className="text-[15px] text-slate-700 dark:text-slate-200 font-medium ml-2">{project.proposalDepartment}</span>
                           </div>
                        )}
                        {project.proposalMessage && (
                           <div>
                             <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Message from team:</p>
                             <div className="p-4 bg-[#f8f9fa] dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
                               <p className="text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{project.proposalMessage}</p>
                             </div>
                           </div>
                        )}
                      </div>
                    )}

                    {/* Abstract */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm space-y-4">
                      <h4 className="text-sm font-bold flex items-center gap-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        <BookOpen className="w-4 h-4" />
                        Abstract
                      </h4>
                      <p className="text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{project.abstract}</p>
                    </div>

                    {/* Description */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm space-y-4">
                      <h4 className="text-sm font-bold flex items-center gap-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        <FileText className="w-4 h-4" />
                        Project Description
                      </h4>
                      <p className="text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{project.description}</p>
                    </div>

                    {/* Problem Statement */}
                    {(project.problemStatement || true) && (
                      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm space-y-4">
                        <h4 className="text-sm font-bold flex items-center gap-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          <AlertCircle className="w-4 h-4" />
                          Problem Statement
                        </h4>
                        <p className="text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{project.problemStatement || "No problem statement provided."}</p>
                      </div>
                    )}

                    {/* Solution */}
                    {(project.proposedSolution || true) && (
                      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm space-y-4">
                        <h4 className="text-sm font-bold flex items-center gap-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          <Lightbulb className="w-4 h-4" />
                          Proposed Solution
                        </h4>
                        <p className="text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{project.proposedSolution || "No proposed solution provided."}</p>
                      </div>
                    )}

                    {/* Objectives */}
                    {(project.objectives || true) && (
                      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm space-y-4">
                        <h4 className="text-sm font-bold flex items-center gap-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          <Target className="w-4 h-4" />
                          Objectives
                        </h4>
                        {project.objectives ? (
                          <p className="text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{project.objectives}</p>
                        ) : (
                          <p className="text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed">No objectives provided.</p>
                        )}
                      </div>
                    )}

                    {/* Technologies */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm space-y-5">
                      <h4 className="text-sm font-bold flex items-center gap-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        <Award className="w-4 h-4" />
                        Technologies
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {(project.technologies || []).map((t: string) => (
                          <span key={t} className="px-4 py-1.5 bg-[#f8f9fa] dark:bg-slate-950 text-primary/90 dark:text-primary font-semibold text-[13px] rounded-lg border border-indigo-100 dark:border-primary/30">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Proposal Decision */}
                    {normalizeStatusTone(project.status) === "submitted" && !decisionMode && (
                      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm space-y-6">
                        <h4 className="text-sm font-bold flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          Proposal Decision
                        </h4>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          <Button className="w-full sm:w-[240px] h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm" onClick={() => setDecisionMode("approve-proposal")}>
                            <CheckCircle2 className="w-5 h-5" /> Approve Proposal
                          </Button>
                          <Button variant="outline" className="w-full sm:w-[240px] h-12 bg-background text-red-600 dark:text-red-500 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm" onClick={() => setDecisionMode("reject-proposal")}>
                            <XCircle className="w-5 h-5" /> Reject Proposal
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Decision feedback form */}
                    {decisionMode && (
                      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm space-y-5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            {decisionMode.replace(/-/g, " ")}
                          </h4>
                          <button
                            onClick={() => { setDecisionMode(null); setFeedback(""); }}
                            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div>
                          <Textarea
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            placeholder={isRejecting ? "Explain what needs to be revised (required)..." : "Add optional notes for the team..."}
                            className="min-h-[120px] resize-none text-[15px] bg-[#f8f9fa] dark:bg-slate-950 rounded-xl border-slate-200 dark:border-slate-800 focus:ring-primary"
                          />
                          {cannotConfirm && (
                            <p className="text-sm text-red-500 mt-2 font-medium">Feedback is required for rejection.</p>
                          )}
                          <Button
                            className={`w-full max-w-[320px] mx-auto h-12 mt-5 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm ${isRejecting ? "bg-red-600 hover:bg-red-700 text-white" : "bg-primary hover:bg-primary/90 text-primary-foreground"}`}
                            onClick={handleDecision}
                            disabled={cannotConfirm}
                          >
                            {isRejecting
                              ? <AlertTriangle className="w-5 h-5" />
                              : <CheckCircle2 className="w-5 h-5" />
                            }
                            Confirm Decision
                          </Button>
                        </div>
                      </div>
                    )}

                  </div>
                </TabsContent>



              </Tabs>
            </div>


          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
