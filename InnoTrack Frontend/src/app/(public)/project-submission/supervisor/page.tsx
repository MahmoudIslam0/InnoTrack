"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, Send, UserRound, CheckCircle2, Users, AlertCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SupervisorDto, LookupItem, studentApi } from "@/lib/student-api";





export default function SubmitToSupervisor() {
  const router = useRouter();
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorDto[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [proposalData, setProposalData] = useState({
    departmentId: 0,
    message: "",
  });
  const [returnUrl, setReturnUrl] = useState("/project-submission");

  useEffect(() => {
    // Restore the return URL so Back takes the user to the exact page they came from
    const storedReturnUrl = sessionStorage.getItem("supervisorReturnUrl");
    if (storedReturnUrl) setReturnUrl(storedReturnUrl);
  }, []);

  useEffect(() => {
    let ignore = false;
    studentApi.getDepartments().then(res => {
      if (!ignore) setDepartments(res.data);
    }).catch(console.error);
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    
    const depId = proposalData.departmentId || undefined;
    studentApi
      .getSupervisors(depId)
      .then((items) => {
        if (ignore) return;
        setSupervisors(items);
        const activeItems = items.filter(s => s.isActive);
        const firstAvailable = activeItems.find((s) => s.isAvailable) || activeItems[0];
        setSelectedSupervisorId(firstAvailable?.id ?? null);
      })
      .catch(() => {
        if (!ignore) toast.error("Could not load supervisors.");
      });
    return () => { ignore = true; };
  }, [proposalData.departmentId]);

  const activeSupervisors = supervisors.filter(s => s.isActive);
  const filteredSupervisors = activeSupervisors.filter(s => 
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.departmentName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedSupervisor = supervisors.find((s) => s.id === selectedSupervisorId);
  const canSubmit =
    Boolean(proposalData.departmentId) &&
    Boolean(proposalData.message.trim()) &&
    Boolean(selectedSupervisor?.isAvailable);

  const submitProposal = async () => {
    if (!proposalData.departmentId || !proposalData.message) {
      toast.error("Please complete the required proposal details");
      return;
    }
    if (!selectedSupervisor?.isAvailable) {
      toast.error("Please select an available supervisor");
      return;
    }
    const projectId = sessionStorage.getItem("projectSubmissionId");
    if (!projectId) {
      toast.error("Save the project draft before submitting.");
      router.push("/project-submission");
      return;
    }
    try {
      await studentApi.submitProject(projectId, {
        supervisorId: selectedSupervisor.id,
        departmentId: proposalData.departmentId,
        teamMembers: "",
        message: proposalData.message,
      });
      toast.success(`Proposal submitted to ${selectedSupervisor.fullName}`);
      router.push("/project-management");
    } catch (error: any) {
      toast.error(error.message || "Could not submit proposal.");
    }
  };

  return (
    <div className="dashboard-page space-y-0">
      {/* ─── Back Button ─── */}
      <Button
        variant="ghost"
        className="mb-6 -ml-2 gap-2 text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={() => router.push(returnUrl)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Submission
      </Button>

      {/* ─── Page Header ─── */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          Submit to Supervisor
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Choose a supervisor and submit your project proposal
        </p>
      </div>



      {/* ─── Main Grid ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">

        {/* ── Left: Proposal Details ── */}
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="px-6 py-5 border-b border-border/50 shrink-0">
            <h2 className="text-base font-bold text-foreground">Proposal Details</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Fill in the details for your supervisor proposal</p>
          </div>

          <div className="p-6 flex flex-col gap-5 flex-1 min-h-0">
            {/* Department */}
            <div className="space-y-1.5 shrink-0">
              <Label htmlFor="department" className="text-sm font-semibold text-foreground">
                Department <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <select
                  id="department"
                  value={proposalData.departmentId}
                  onChange={(e) =>
                    setProposalData((cur) => ({ ...cur, departmentId: Number(e.target.value) }))
                  }
                  className="h-11 w-full appearance-none rounded-xl border border-border bg-muted/40 px-4 pr-10 text-sm text-foreground outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:bg-background"
                >
                  <option value={0}>Select your department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {/* Proposal Message */}
            <div className="flex flex-col gap-1.5 flex-1 min-h-0">
              <Label htmlFor="proposalMessage" className="text-sm font-semibold text-foreground shrink-0">
                Proposal Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="proposalMessage"
                placeholder="Write a message to the professor explaining why you'd like them to supervise your project. Include your project goals, timeline, and any specific expertise you're seeking..."
                value={proposalData.message}
                onChange={(e) =>
                  setProposalData((cur) => ({ ...cur, message: e.target.value }))
                }
                className="flex-1 min-h-[200px] resize-none rounded-xl border-border bg-muted/40 text-sm p-4 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 focus-visible:bg-background transition-all"
              />
              <p className="text-xs text-muted-foreground shrink-0">
                Be specific about what you hope to achieve and why this professor is a good fit.
              </p>
            </div>

            {/* Submit button (mobile only — also shown in aside on desktop) */}
            <div className="lg:hidden pt-2">
              <Button
                className="h-11 w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={submitProposal}
                disabled={!canSubmit}
              >
                <Send className="h-4 w-4" />
                Submit Proposal
              </Button>
            </div>
          </div>
        </div>

        {/* ── Right: Supervisor Selection ── */}
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-border/50 space-y-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Select Supervisor</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeSupervisors.filter(s => s.isAvailable).length} of {activeSupervisors.length} active supervisors available
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search supervisors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-4 text-sm outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 focus:bg-background"
              />
            </div>
          </div>

          {/* Supervisor list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
            {supervisors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Loading supervisors...</p>
              </div>
            ) : filteredSupervisors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No supervisors found.</p>
              </div>
            ) : (
              filteredSupervisors.map((supervisor) => {
                const isSelected = supervisor.id === selectedSupervisorId;
                const isFull = !supervisor.isAvailable;
                const slotsLeft = supervisor.maxTeamLoad - supervisor.currentTeamLoad;

                return (
                  <button
                    key={supervisor.id}
                    type="button"
                    disabled={isFull}
                    onClick={() => setSelectedSupervisorId(supervisor.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                      isSelected
                        ? "border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/20 ring-1 ring-indigo-400"
                        : "border-border bg-muted/20 hover:border-indigo-200 hover:bg-muted/40"
                    } ${isFull ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isSelected ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" : "bg-muted text-muted-foreground"
                      }`}>
                        <UserRound className="h-5 w-5" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {supervisor.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {supervisor.departmentName}
                        </p>
                      </div>
                      {/* Selection indicator */}
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                      )}
                    </div>

                    {/* Availability badge */}
                    <div className="mt-3 flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className={`text-xs font-medium rounded-full px-2.5 py-0.5 border-0 ${
                          isFull
                            ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                            : slotsLeft <= 2
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        }`}
                      >
                        {isFull ? "Full" : `${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} left`}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {supervisor.currentTeamLoad}/{supervisor.maxTeamLoad} teams
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Submit button (desktop) */}
          <div className="hidden lg:block p-4 border-t border-border/50">
            {selectedSupervisor && (
              <p className="text-xs text-center text-muted-foreground mb-3">
                Submitting to <span className="font-medium text-foreground">{selectedSupervisor.fullName}</span>
              </p>
            )}
            <Button
              className="h-11 w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={submitProposal}
              disabled={!canSubmit}
            >
              <Send className="h-4 w-4" />
              Submit Proposal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
