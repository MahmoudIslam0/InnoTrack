"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { adminApi, AdminProfessorDto } from "@/lib/admin-api";
import { studentApi } from "@/lib/student-api";
import { DataTable } from "@/app/_components/DataTable";
import { PageHeader } from "@/app/_components/DashboardUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoreHorizontal, ShieldOff, KeyRound, Plus, Users, LayoutDashboard, Trash, Search } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AdminProfessors() {
  const [data, setData] = useState<AdminProfessorDto[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provisionData, setProvisionData] = useState({
    fullName: "",
    email: "",
    departmentId: 1,
    maxTeamLoad: 5,
    password: "",
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProfId, setEditingProfId] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    firstName: "",
    lastName: "",
    departmentId: 1,
    maxTeamLoad: 5,
  });

  const [searchTerm, setSearchTerm] = useState("");
  
  const [filterDepartmentId, setFilterDepartmentId] = useState<number | "all">("all");
  const [filterIsActive, setFilterIsActive] = useState<boolean | "all">("all");
  const [filterHasCapacity, setFilterHasCapacity] = useState<boolean | "all">("all");
  const [departments, setDepartments] = useState<{id: number, name: string}[]>([]);

  const [professorToDelete, setProfessorToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProfessors = async () => {
    setIsLoading(true);
    try {
      const result = await adminApi.getProfessors({
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: searchTerm || undefined,
        departmentId: filterDepartmentId !== "all" ? filterDepartmentId : undefined,
        isActive: filterIsActive !== "all" ? filterIsActive : undefined,
        hasCapacity: filterHasCapacity !== "all" ? filterHasCapacity : undefined,
      });
      setData(result.items);
      setPageCount(result.totalPages);
    } catch (error: any) {
      toast.error("Failed to fetch professors", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    studentApi.getDepartments().then(res => setDepartments(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProfessors();
    }, 400);
    return () => clearTimeout(handler);
  }, [pagination.pageIndex, pagination.pageSize, searchTerm, filterDepartmentId, filterIsActive, filterHasCapacity]);


  const confirmDelete = async () => {
    if (!professorToDelete) return;
    setIsDeleting(true);
    try {
      await adminApi.deleteProfessor(professorToDelete);
      toast.success("Professor deleted successfully");
      fetchProfessors();
    } catch (error: any) {
      toast.error("Failed to delete professor", { description: error.message });
    } finally {
      setIsDeleting(false);
      setProfessorToDelete(null);
    }
  };

  const handleDelete = (id: string) => {
    setProfessorToDelete(id);
  };

  const handleToggleStatus = async (prof: AdminProfessorDto) => {
    try {
      await adminApi.updateProfessorStatus(prof.id, !prof.isActive);
      toast.success(`Professor ${!prof.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchProfessors();
    } catch (error: any) {
      toast.error("Failed to update status", { description: error.message });
    }
  };

  const handleResetPassword = async (id: string) => {
    const newPassword = prompt("Enter new password (leave blank for random generation):");
    if (newPassword === null) return; // cancelled
    try {
      await adminApi.resetProfessorPassword(id, newPassword || undefined);
      toast.success("Password reset successfully. Active sessions invalidated.");
    } catch (error: any) {
      toast.error("Password reset failed", { description: error.message });
    }
  };

  const handleProvision = async () => {
    try {
      const names = provisionData.fullName.trim().split(" ");
      const firstName = names[0] || "";
      const lastName = names.slice(1).join(" ") || "Professor";

      await adminApi.provisionProfessor({
        firstName,
        lastName,
        email: provisionData.email,
        departmentId: provisionData.departmentId,
        maxTeamLoad: provisionData.maxTeamLoad,
        password: provisionData.password || undefined,
      });
      toast.success("Professor provisioned successfully");
      setIsProvisionOpen(false);
      setProvisionData({ fullName: "", email: "", departmentId: 1, maxTeamLoad: 5, password: "" });
      fetchProfessors();
    } catch (error: any) {
      toast.error("Failed to provision professor", { description: error.message });
    }
  };

  const handleOpenEdit = (prof: AdminProfessorDto) => {
    const names = prof.fullName.trim().split(" ");
    setEditingProfId(prof.id);
    setEditData({
      firstName: names[0] || "",
      lastName: names.slice(1).join(" ") || "",
      departmentId: prof.departmentId || 1,
      maxTeamLoad: prof.maxTeamLoad || 5,
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingProfId) return;
    try {
      await adminApi.updateProfessor(editingProfId, editData);
      toast.success("Professor updated successfully");
      setIsEditOpen(false);
      fetchProfessors();
    } catch (error: any) {
      toast.error("Failed to update professor", { description: error.message });
    }
  };

  const columns: ColumnDef<AdminProfessorDto>[] = [
    {
      accessorKey: "fullName",
      header: "Full Name",
      cell: ({ row }) => <div className="font-medium text-foreground">{row.getValue("fullName")}</div>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <div className="text-muted-foreground">{row.getValue("email")}</div>,
    },
    {
      accessorKey: "departmentName",
      header: "Department",
    },
    {
      accessorKey: "maxTeamLoad",
      header: "Load Capacity",
      cell: ({ row }) => {
        const capacity = row.getValue("maxTeamLoad") as number;
        const current = row.original.currentTeamLoad;
        const isFull = current >= capacity;
        return (
          <div className="flex items-center gap-2">
            <span className={isFull ? "text-destructive font-medium" : ""}>
              {current} / {capacity}
            </span>
            {isFull && <Badge variant="destructive" className="text-[10px] uppercase">Full</Badge>}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return isActive ? (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20">Active</Badge>
        ) : (
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">Inactive</Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const prof = row.original;
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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(prof.id)}>
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleOpenEdit(prof)}>
                <Users className="w-4 h-4 mr-2" />
                Edit Professor
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleToggleStatus(prof)}>
                <ShieldOff className="w-4 h-4 mr-2" />
                {prof.isActive ? 'Deactivate Account' : 'Activate Account'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleResetPassword(prof.id)}>
                <KeyRound className="w-4 h-4 mr-2" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(prof.id)} className="text-destructive focus:text-destructive">
                <Trash className="w-4 h-4 mr-2" />
                Delete Professor
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
        title="Professor Management"
        description="Monitor system supervisors, handle accounts, and adjust individual workloads."
      />
      
      <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-4 items-center">
        <input
          placeholder="Search professors..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPagination({ ...pagination, pageIndex: 0 }); }}
          className="flex h-10 w-full sm:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />

        <select 
          value={filterDepartmentId} 
          onChange={(e) => { setFilterDepartmentId(e.target.value === "all" ? "all" : Number(e.target.value)); setPagination({ ...pagination, pageIndex: 0 }); }}
          className="flex h-10 w-full sm:w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select 
          value={filterIsActive as any} 
          onChange={(e) => { setFilterIsActive(e.target.value === "all" ? "all" : e.target.value === "true"); setPagination({ ...pagination, pageIndex: 0 }); }}
          className="flex h-10 w-full sm:w-40 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">All Statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        <select 
          value={filterHasCapacity as any} 
          onChange={(e) => { setFilterHasCapacity(e.target.value === "all" ? "all" : e.target.value === "true"); setPagination({ ...pagination, pageIndex: 0 }); }}
          className="flex h-10 w-full sm:w-40 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">Any Capacity</option>
          <option value="true">Has Available Slots</option>
          <option value="false">Full Load</option>
        </select>

          <Dialog open={isProvisionOpen} onOpenChange={setIsProvisionOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Provision Professor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border-border/50 bg-background/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle>Provision New Professor</DialogTitle>
              <DialogDescription>
                Professor accounts cannot be self-registered. Create one here.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={provisionData.fullName} onChange={e => setProvisionData({...provisionData, fullName: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={provisionData.email} onChange={e => setProvisionData({...provisionData, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dept">Department ID</Label>
                  <Input id="dept" type="number" value={provisionData.departmentId} onChange={e => setProvisionData({...provisionData, departmentId: parseInt(e.target.value) || 1})} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input id="capacity" type="number" value={provisionData.maxTeamLoad} onChange={e => setProvisionData({...provisionData, maxTeamLoad: parseInt(e.target.value) || 5})} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pass">Initial Password (Optional)</Label>
                <Input id="pass" type="password" placeholder="Auto-generated if blank" value={provisionData.password} onChange={e => setProvisionData({...provisionData, password: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProvisionOpen(false)}>Cancel</Button>
              <Button type="submit" onClick={handleProvision}>Create Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[425px] border-border/50 bg-background/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle>Edit Professor</DialogTitle>
              <DialogDescription>
                Update professor details and capacity.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-firstname">First Name</Label>
                  <Input id="edit-firstname" value={editData.firstName} onChange={e => setEditData({...editData, firstName: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-lastname">Last Name</Label>
                  <Input id="edit-lastname" value={editData.lastName} onChange={e => setEditData({...editData, lastName: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-dept">Department ID</Label>
                  <Input id="edit-dept" type="number" value={editData.departmentId} onChange={e => setEditData({...editData, departmentId: parseInt(e.target.value) || 1})} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-capacity">Capacity</Label>
                  <Input id="edit-capacity" type="number" value={editData.maxTeamLoad} onChange={e => setEditData({...editData, maxTeamLoad: parseInt(e.target.value) || 5})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" onClick={handleEditSubmit}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          isOpen={!!professorToDelete}
          onClose={() => setProfessorToDelete(null)}
          onConfirm={confirmDelete}
          title="Delete Professor"
          description="Are you sure you want to delete this professor? Deletion is blocked if they are supervising teams with active projects."
          confirmText="Delete"
          variant="destructive"
          isLoading={isDeleting}
        />

      <div className="mt-8">
        <DataTable 
          columns={columns} 
          data={data} 
          pageCount={pageCount}
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          onPaginationChange={setPagination}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
