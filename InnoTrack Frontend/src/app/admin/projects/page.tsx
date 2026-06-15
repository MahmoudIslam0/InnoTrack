"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { adminApi, AdminProjectDto, AdminProfessorDto } from "@/lib/admin-api";
import { DataTable } from "@/app/_components/DataTable";
import { PageHeader } from "@/app/_components/DashboardUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoreHorizontal, AlertTriangle, RefreshCcw, Star, StarOff, PencilRuler, UserPlus, Search } from "lucide-react";
import { normalizeStatusTone, studentApi } from "@/lib/student-api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function AdminProjects() {
  const [data, setData] = useState<AdminProjectDto[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [professors, setProfessors] = useState<AdminProfessorDto[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDomainId, setFilterDomainId] = useState<number | "all">("all");
  const [filterAcademicYearId, setFilterAcademicYearId] = useState<number | "all">("all");

  const [domains, setDomains] = useState<{id: number, name: string}[]>([]);
  const [academicYears, setAcademicYears] = useState<{id: number, name: string}[]>([]);

  // Status Override Modal State
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<AdminProjectDto | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("");

  // Reassign Supervisor State
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignProfId, setReassignProfId] = useState<string>("");

  // Confirmation States
  const [isResetStuckOpen, setIsResetStuckOpen] = useState(false);
  const [projectToShowcase, setProjectToShowcase] = useState<AdminProjectDto | null>(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const result = await adminApi.getProjects({
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: searchTerm || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        domainId: filterDomainId !== "all" ? filterDomainId : undefined,
        academicYearId: filterAcademicYearId !== "all" ? filterAcademicYearId : undefined,
      });
      setData(result.items);
      setPageCount(result.totalPages);
    } catch (error: any) {
      toast.error("Failed to fetch projects", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProjects();
    }, 400);
    return () => clearTimeout(handler);
  }, [pagination.pageIndex, pagination.pageSize, searchTerm, filterStatus, filterDomainId, filterAcademicYearId]);

  useEffect(() => {
    adminApi.getProfessors({ pageSize: 1000 })
      .then(res => setProfessors(res.items.filter((p: any) => p.isActive)))
      .catch(err => console.error("Failed to load professors", err));
      
    studentApi.getDomains().then(res => setDomains(res.data)).catch(console.error);
    adminApi.getAcademicYears({ pageSize: 1000 }).then(res => setAcademicYears(res.items)).catch(console.error);
  }, []);

  const handleResetStuck = async () => {
    setIsResetting(true);
    try {
      await adminApi.resetStuckProjects();
      toast.success("Stuck projects have been reset successfully.");
      fetchProjects();
    } catch (error: any) {
      toast.error("Failed to reset stuck projects", { description: error.message });
    } finally {
      setIsResetting(false);
      setIsResetStuckOpen(false);
    }
  };

  const openOverrideModal = (project: AdminProjectDto) => {
    setSelectedProject(project);
    setOverrideStatus(project.status);
    setOverrideReason("");
    setIsOverrideOpen(true);
  };

  const openReassignModal = (project: AdminProjectDto) => {
    setSelectedProject(project);
    setReassignProfId("");
    setIsReassignOpen(true);
  };

  const submitOverride = async () => {
    if (!selectedProject || !overrideStatus || !overrideReason.trim()) return;
    try {
      await adminApi.overrideProjectStatus(selectedProject.id, overrideStatus, overrideReason);
      toast.success("Project status overridden successfully.");
      setIsOverrideOpen(false);
      fetchProjects();
    } catch (error: any) {
      toast.error("Failed to override status", { description: error.message });
    }
  };

  const handleReassign = async () => {
    if (!selectedProject || !reassignProfId) return;
    try {
      await adminApi.reassignSupervisor(selectedProject.id, reassignProfId);
      toast.success("Supervisor reassigned successfully.");
      setIsReassignOpen(false);
      fetchProjects();
    } catch (error: any) {
      toast.error("Failed to reassign supervisor", { description: error.message });
    }
  };

  const handleToggleShowcase = (project: AdminProjectDto) => {
    setProjectToShowcase(project);
  };

  const handleToggleShowcaseConfirm = async (val: boolean) => {
    if (!projectToShowcase) return;
    try {
      await adminApi.toggleShowcase(projectToShowcase.id, val);
      toast.success(`Project showcase status updated to ${val ? "Showcased" : "Not Showcased"}`);
      fetchProjects();
    } catch (error: any) {
      toast.error("Failed to update showcase status", { description: error.message });
    } finally {
      setProjectToShowcase(null);
    }
  };

  const columns: ColumnDef<AdminProjectDto>[] = [
    {
      accessorKey: "title",
      header: "Project Title",
      cell: ({ row }) => <div className="font-medium text-foreground max-w-[200px] truncate" title={row.getValue("title")}>{row.getValue("title")}</div>,
    },
    {
      accessorKey: "domainName",
      header: "Domain",
    },
    {
      accessorKey: "teamName",
      header: "Team",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const tone = normalizeStatusTone(status);
        const colorClass = 
          tone === "completed" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
          tone === "in-progress" ? "bg-primary/10 text-primary" :
          tone === "submitted" ? "bg-blue-500/10 text-blue-700 dark:text-blue-400" :
          tone === "rejected" ? "bg-destructive/10 text-destructive dark:text-destructive" :
          "bg-secondary/50 text-muted-foreground";

        return <Badge className={`${colorClass} hover:${colorClass}`}>{status}</Badge>;
      },
    },
    {
      accessorKey: "originalityScore",
      header: "Originality",
      cell: ({ row }) => {
        const score = row.getValue("originalityScore") as number;
        if (score === undefined || score === null) return <span className="text-muted-foreground italic">N/A</span>;
        
        let color = "text-emerald-500";
        if (score < 50) color = "text-amber-500";
        if (score < 20) color = "text-destructive";

        return <span className={`font-semibold ${color}`}>{score}%</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const project = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(project.id)}>
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openOverrideModal(project)}>
                <PencilRuler className="w-4 h-4 mr-2" />
                Override Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openReassignModal(project)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Reassign Supervisor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleShowcase(project)}>
                <Star className="w-4 h-4 mr-2" />
                Toggle Showcase
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const possibleStatuses = ["Draft", "Under Review", "In Progress", "Completed", "Abandoned"];

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Projects Management"
        description="Monitor and manage student graduation projects, intervene on stuck projects, and reassign supervisors if needed."
      />
      
      <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-4 items-center">
        <input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPagination({ ...pagination, pageIndex: 0 }); }}
          className="flex h-10 w-full sm:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />

        <select 
          value={filterStatus} 
          onChange={(e) => { setFilterStatus(e.target.value); setPagination({ ...pagination, pageIndex: 0 }); }}
          className="flex h-10 w-full sm:w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">All Statuses</option>
          {possibleStatuses.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <select 
          value={filterDomainId} 
          onChange={(e) => { setFilterDomainId(e.target.value === "all" ? "all" : Number(e.target.value)); setPagination({ ...pagination, pageIndex: 0 }); }}
          className="flex h-10 w-full sm:w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">All Domains</option>
          {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select 
          value={filterAcademicYearId} 
          onChange={(e) => { setFilterAcademicYearId(e.target.value === "all" ? "all" : Number(e.target.value)); setPagination({ ...pagination, pageIndex: 0 }); }}
          className="flex h-10 w-full sm:w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">All Academic Years</option>
          {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>

        <Button 
          variant="outline" 
          onClick={() => setIsResetStuckOpen(true)}
          disabled={isResetting}
          className="h-10"
        >
          <RefreshCcw className={`w-4 h-4 mr-2 ${isResetting ? "animate-spin" : ""}`} />
          Reset Stuck
        </Button>
      </div>

      <div className="mt-8">
        <DataTable
          columns={columns}
          data={data}
          pageCount={pageCount}
          onPaginationChange={setPagination}
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          isLoading={isLoading}
        />
      </div>

      <Dialog open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
        <DialogContent className="sm:max-w-[425px] border-border/50 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Override Project Status</DialogTitle>
            <DialogDescription>
              Force transition project <strong>{selectedProject?.title}</strong> to a new state. This action will be audited.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>New Status</Label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
              >
                {possibleStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Audit Reason</Label>
              <Input 
                value={overrideReason} 
                onChange={(e) => setOverrideReason(e.target.value)} 
                placeholder="e.g. Approved via administrative bypass"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOverrideOpen(false)}>Cancel</Button>
            <Button onClick={submitOverride} disabled={!overrideReason.trim() || overrideStatus === selectedProject?.status}>
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Supervisor</DialogTitle>
            <DialogDescription>
              Assign a new supervisor to <strong>{selectedProject?.title}</strong>. This will notify both the old and new supervisors.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Select New Supervisor</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={reassignProfId}
                onChange={(e) => setReassignProfId(e.target.value)}
              >
                <option value="" disabled>Choose a professor...</option>
                {professors.map(p => (
                  <option key={p.id} value={p.id}>{p.fullName} ({p.departmentName})</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReassignOpen(false)}>Cancel</Button>
            <Button onClick={handleReassign} disabled={!reassignProfId}>Confirm Reassignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={isResetStuckOpen}
        onClose={() => setIsResetStuckOpen(false)}
        onConfirm={handleResetStuck}
        title="Reset Stuck Projects"
        description="This will scan for projects that have been stuck in the Under Review status for over 48 hours and return them to Draft status. Proceed?"
        confirmText="Reset Projects"
        variant="default"
        isLoading={isResetting}
      />

      <Dialog open={!!projectToShowcase} onOpenChange={(open) => !open && setProjectToShowcase(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Project Showcase Status</DialogTitle>
            <DialogDescription>
              Set the showcase visibility for <strong>{projectToShowcase?.title}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => handleToggleShowcaseConfirm(false)}>
              Remove Showcase
            </Button>
            <Button onClick={() => handleToggleShowcaseConfirm(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Star className="w-4 h-4 mr-2" />
              Set as Showcased
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
