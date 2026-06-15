"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { OriginalityMeter, StatusBadge } from "./_components";
import { Project, teams } from "./_data";
import Link from "next/link";
import { formatPercent } from "@/lib/student-api";

type DecisionMode =
  | "approve-proposal"
  | "reject-proposal"
  | "accept-submission"
  | "reject-submission";

interface ProjectDetailsDialogProps {
  project: Project | null;
  onOpenChange: (open: boolean) => void;
  onApproveProposal: (projectId: string, feedback: string) => void;
  onRejectProposal: (projectId: string, feedback: string) => void;
  onAcceptSubmission: (projectId: string, feedback: string) => void;
  onRejectSubmission: (projectId: string, feedback: string) => void;
}

const decisionCopy = {
  "approve-proposal": {
    label: "Approve Proposal",
    helper: "Optional feedback will be attached to the proposal approval.",
    confirm: "Confirm Approval",
    required: false,
  },
  "reject-proposal": {
    label: "Reject Proposal",
    helper: "Feedback is required when a proposal is rejected.",
    confirm: "Confirm Rejection",
    required: true,
  },
  "accept-submission": {
    label: "Accept Submission",
    helper: "Optional feedback will be attached to the final acceptance.",
    confirm: "Confirm Acceptance",
    required: false,
  },
  "reject-submission": {
    label: "Reject Submission",
    helper: "Feedback is required when a final submission is rejected.",
    confirm: "Confirm Rejection",
    required: true,
  },
};

export function ProjectDetailsDialog({
  project,
  onOpenChange,
  onApproveProposal,
  onRejectProposal,
  onAcceptSubmission,
  onRejectSubmission,
}: ProjectDetailsDialogProps) {
  const [decisionMode, setDecisionMode] = useState<DecisionMode | null>(null);
  const [feedback, setFeedback] = useState("");
  const [teamSizeLimit, setTeamSizeLimit] = useState("4");

  const team = project ? teams.find(t => t.projectId === project.id) : null;
  const isRejecting =
    decisionMode === "reject-proposal" || decisionMode === "reject-submission";
  const cannotConfirm = isRejecting && !feedback.trim();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDecisionMode(null);
      setFeedback("");
    }
    onOpenChange(open);
  };

  const completeDecision = () => {
    if (!project || !decisionMode || cannotConfirm) return;

    if (decisionMode === "approve-proposal") {
      onApproveProposal(project.id, feedback);
    }
    if (decisionMode === "reject-proposal") {
      onRejectProposal(project.id, feedback);
    }
    if (decisionMode === "accept-submission") {
      onAcceptSubmission(project.id, feedback);
    }
    if (decisionMode === "reject-submission") {
      onRejectSubmission(project.id, feedback);
    }

    setDecisionMode(null);
    setFeedback("");
  };

  return (
    <Dialog open={Boolean(project)} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(1180px,calc(100vw-48px))] sm:max-w-none max-h-[92vh] overflow-y-auto border-border/50 p-0 shadow-xl">
        {project && (
          <>
            <DialogHeader className="px-8 pt-7 pb-6 border-b border-border/50 bg-muted/50">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <DialogTitle className="text-xl font-semibold text-foreground">
                    {project.title}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-muted-foreground">
                    {project.team} - {project.domain}
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {project.originalityScore !== undefined && (
                    <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
                      <span className="text-2xl font-bold text-primary leading-none">{Math.round(project.originalityScore || 0)}%</span>
                      <span className="text-[10px] font-bold text-primary/70 uppercase tracking-widest mt-1.5">Score</span>
                    </div>
                  )}
                  <StatusBadge status={project.status} />
                </div>
              </div>
            </DialogHeader>

            <div className="px-8 pt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
              <div className="lg:col-span-2 space-y-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    Description
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    {project.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    Abstract
                  </h3>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    {project.abstract}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    Technologies
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((technology) => (
                      <span
                        key={technology}
                        className="px-2.5 py-1 bg-muted text-foreground text-sm rounded-md font-medium"
                      >
                        {technology}
                      </span>
                    ))}
                  </div>
                </div>

                {team && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      Team Members
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {team.members.map((member) => (
                        <div key={member.id} className="flex items-center gap-3 p-3 bg-muted/30 border border-border/50 rounded-xl">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary/90 dark:text-primary flex items-center justify-center font-bold">
                            {member.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              <div className="space-y-5">


                {/* Team Management */}
                <div className="p-4 bg-card text-card-foreground rounded-xl border border-border/50 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Team Management
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="team-size" className="text-xs">Max Team Size</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="team-size" 
                          type="number" 
                          min="1" 
                          max="10" 
                          className="h-9" 
                          value={teamSizeLimit}
                          onChange={(e) => setTeamSizeLimit(e.target.value)}
                        />
                        <Button 
                          size="sm" 
                          className="h-9 bg-primary hover:bg-primary/90 text-white"
                          onClick={() => {
                            toast.success(`Team size limit updated to ${teamSizeLimit} members.`);
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {project.status === "draft" && (
                  <div className="p-4 bg-card text-card-foreground rounded-xl border border-border/50 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground mb-3">
                      Proposal Decision
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        className="bg-primary hover:bg-primary/90 text-white"
                        onClick={() => setDecisionMode("approve-proposal")}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve Proposal
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/10"
                        onClick={() => setDecisionMode("reject-proposal")}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Proposal
                      </Button>
                    </div>
                  </div>
                )}

                {project.status === "submitted" && (
                  <div className="p-4 bg-card text-card-foreground rounded-xl border border-border/50 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground mb-3">
                      Final Submission Decision
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        className="bg-primary hover:bg-primary/90 text-white"
                        onClick={() => setDecisionMode("accept-submission")}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Accept Submission
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/10"
                        onClick={() => setDecisionMode("reject-submission")}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Submission
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-8 pt-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Similar Projects
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.similarProjects.map((similarProject) => (
                  <Link
                    target="_blank"
                    href="/professor/projects"
                    key={similarProject.title}
                    className="block p-4 bg-muted rounded-xl border border-border/50 hover:bg-muted/80 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {similarProject.title}
                      </p>
                      <Badge variant="outline">
                        {formatPercent(similarProject.similarity)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {similarProject.reason}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {decisionMode && (
              <div className="mx-8 mt-8 p-5 bg-muted rounded-xl border border-border/50">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {decisionCopy[decisionMode].label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {decisionCopy[decisionMode].helper}
                    </p>
                  </div>
                  {decisionCopy[decisionMode].required && (
                    <Badge
                      variant="secondary"
                      className="bg-red-500/20 text-red-700 dark:text-red-400"
                    >
                      Required
                    </Badge>
                  )}
                </div>
                <Label htmlFor="decision-feedback">Decision Feedback</Label>
                <Textarea
                  id="decision-feedback"
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder={
                    decisionCopy[decisionMode].required
                      ? "Explain what the team must revise..."
                      : "Add optional notes for the team..."
                  }
                  className="mt-2 min-h-36 resize-none"
                />
                {cannotConfirm && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    Feedback is required before confirming this rejection.
                  </p>
                )}
              </div>
            )}

            <DialogFooter className="px-8 py-5 mt-8 border-t border-border/50 bg-muted/50">
              {decisionMode ? (
                <>
                  <Button variant="outline" onClick={() => setDecisionMode(null)}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-white"
                    onClick={completeDecision}
                    disabled={cannotConfirm}
                  >
                    {isRejecting ? (
                      <AlertTriangle className="w-4 h-4 mr-2" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    {decisionCopy[decisionMode].confirm}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
