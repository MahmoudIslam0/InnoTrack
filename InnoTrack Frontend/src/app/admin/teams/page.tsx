"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { adminApi, AdminTeamDto, AdminProfessorDto } from "@/lib/admin-api";
import { DataTable } from "@/app/_components/DataTable";
import { PageHeader } from "@/app/_components/DashboardUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoreHorizontal, UserMinus, UserPlus, Trash, Search } from "lucide-react";
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

export default function AdminTeams() {
  const [data, setData] = useState<AdminTeamDto[]>([]);
  const [professors, setProfessors] = useState<AdminProfessorDto[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [filterHasSupervisor, setFilterHasSupervisor] = useState<boolean | "all">("all");
  const [filterProjectStatus, setFilterProjectStatus] = useState<string>("all");

  // Assignment Modal State
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<AdminTeamDto | null>(null);
  const [selectedProfId, setSelectedProfId] = useState<string>("");

  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);

  const [teamToRemoveSupervisor, setTeamToRemoveSupervisor] = useState<string | null>(null);
  const [isRemovingSupervisor, setIsRemovingSupervisor] = useState(false);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const result = await adminApi.getTeams({
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: searchTerm || undefined,
        hasSupervisor: filterHasSupervisor !== "all" ? filterHasSupervisor : undefined,
        projectStatus: filterProjectStatus !== "all" ? filterProjectStatus : undefined,
      });
      setData(result.items);
      setPageCount(result.totalPages);
    } catch (error: any) {
      toast.error("Failed to fetch teams", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfessors = async () => {
    try {
      const result = await adminApi.getProfessors({ pageSize: 1000 });
      setProfessors(result.items.filter((p: any) => p.isActive));
    } catch (error) {
      console.error("Failed to load professors:", error);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchTeams();
    }, 400);
    return () => clearTimeout(handler);
  }, [pagination.pageIndex, pagination.pageSize, searchTerm, filterHasSupervisor, filterProjectStatus]);


  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    setIsDeletingTeam(true);
    try {
      await adminApi.deleteTeam(teamToDelete);
      toast.success("Team deleted successfully");
      fetchTeams();
    } catch (error: any) {
      toast.error("Failed to delete team", { description: error.message });
    } finally {
      setIsDeletingTeam(false);
      setTeamToDelete(null);
    }
  };

  const handleDeleteTeam = (id: string) => {
    setTeamToDelete(id);
  };

  useEffect(() => {
    fetchProfessors();
  }, []);

  const confirmRemoveSupervisor = async () => {
    if (!teamToRemoveSupervisor) return;
    setIsRemovingSupervisor(true);
    try {
      await adminApi.removeSupervisor(teamToRemoveSupervisor);
      toast.success("Supervisor removed successfully");
      fetchTeams();
    } catch (error: any) {
      toast.error("Failed to remove supervisor", { description: error.message });
    } finally {
      setIsRemovingSupervisor(false);
      setTeamToRemoveSupervisor(null);
    }
  };

  const handleRemoveSupervisor = (teamId: string) => {
    setTeamToRemoveSupervisor(teamId);
  };

  const handleAssignSupervisor = async () => {
    if (!selectedTeam || !selectedProfId) return;
    try {
      await adminApi.assignSupervisor(selectedTeam.id, selectedProfId);
      toast.success("Supervisor assigned successfully");
      setIsAssignOpen(false);
      fetchTeams();
    } catch (error: any) {
      toast.error("Assignment failed", { description: error.message });
    }
  };

  const openAssignModal = (team: AdminTeamDto) => {
    setSelectedTeam(team);
    setSelectedProfId("");
    setIsAssignOpen(true);
  };

  const columns: ColumnDef<AdminTeamDto>[] = [
    {
      accessorKey: "name",
      header: "Team Name",
      cell: ({ row }) => <div className="font-medium text-foreground">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "memberCount",
      header: "Members",
      cell: ({ row }) => <div>{row.getValue("memberCount")}</div>,
    },
    {
      accessorKey: "supervisorName",
      header: "Supervisor",
      cell: ({ row }) => {
        const supName = row.getValue("supervisorName") as string;
        const supActive = row.original.supervisorIsActive;
        if (!supName) return <span className="text-muted-foreground italic">Unassigned</span>;
        return (
          <div className="flex items-center gap-2">
            <span>{supName}</span>
            {supActive === false && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
          </div>
        );
      },
    },
    {
      accessorKey: "projectStatus",
      header: "Project Status",
      cell: ({ row }) => {
        const status = row.getValue("projectStatus") as string;
        if (!status) return <span className="text-muted-foreground italic">No Project</span>;
        return <Badge variant="outline">{status}</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const team = row.original;
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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(team.id)}>
                Copy Team ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openAssignModal(team)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Assign Supervisor
              </DropdownMenuItem>
              {team.supervisorId && (
                <DropdownMenuItem onClick={() => handleRemoveSupervisor(team.id)} className="focus:bg-destructive/10">
                  <UserMinus className="w-4 h-4 mr-2" />
                  Remove Supervisor
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDeleteTeam(team.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash className="w-4 h-4 mr-2" />
                Delete Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Teams Management"
        description="Monitor student teams, supervise capacities, and reassign advisors."
      />
      
      <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-4 items-center">
        <input
          placeholder="Search teams..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPagination({ ...pagination, pageIndex: 0 }); }}
          className="flex h-10 w-full sm:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />

        <select 
          value={filterHasSupervisor as any} 
          onChange={(e) => { setFilterHasSupervisor(e.target.value === "all" ? "all" : e.target.value === "true"); setPagination({ ...pagination, pageIndex: 0 }); }}
          className="flex h-10 w-full sm:w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">All Assignments</option>
          <option value="true">Assigned</option>
          <option value="false">Unassigned</option>
        </select>

        <select 
          value={filterProjectStatus} 
          onChange={(e) => { setFilterProjectStatus(e.target.value); setPagination({ ...pagination, pageIndex: 0 }); }}
          className="flex h-10 w-full sm:w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">All Project Statuses</option>
          <option value="No Project">No Project</option>
          <option value="Draft">Draft</option>
          <option value="Under Review">Under Review</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Abandoned">Abandoned</option>
        </select>
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

      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-[425px] border-border/50 bg-background/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Assign Supervisor</DialogTitle>
            <DialogDescription>
              Assign an active professor to supervise team <strong>{selectedTeam?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <select 
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedProfId}
              onChange={(e) => setSelectedProfId(e.target.value)}
            >
              <option value="" disabled>Select a professor...</option>
              {professors.map(p => (
                <option key={p.id} value={p.id} disabled={p.currentTeamLoad >= p.maxTeamLoad}>
                  {p.fullName} ({p.currentTeamLoad}/{p.maxTeamLoad} teams) {p.currentTeamLoad >= p.maxTeamLoad ? ' - FULL' : ''}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignSupervisor} disabled={!selectedProfId}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!teamToDelete}
        onClose={() => setTeamToDelete(null)}
        onConfirm={confirmDeleteTeam}
        title="Delete Team"
        description="Are you sure you want to delete this team? This action is irreversible. Deletion is blocked if the team has an Active or Completed project."
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeletingTeam}
      />

      <ConfirmDialog
        isOpen={!!teamToRemoveSupervisor}
        onClose={() => setTeamToRemoveSupervisor(null)}
        onConfirm={confirmRemoveSupervisor}
        title="Remove Supervisor"
        description="Are you sure you want to remove the supervisor from this team?"
        confirmText="Remove"
        variant="destructive"
        isLoading={isRemovingSupervisor}
      />
    </div>
  );
}
