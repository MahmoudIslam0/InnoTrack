"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { adminApi, AdminStudentDto } from "@/lib/admin-api";
import { DataTable } from "@/app/_components/DataTable";
import { PageHeader } from "@/app/_components/DashboardUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoreHorizontal, ShieldOff, KeyRound, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminStudents() {
  const [data, setData] = useState<AdminStudentDto[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [hasTeam, setHasTeam] = useState<string>("all");
  const [isActive, setIsActive] = useState<string>("all");
  const [departments, setDepartments] = useState<any[]>([]);

  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    import("@/lib/api").then(({ api }) => {
      api.get("/api/Departments", { params: { pageSize: 100 } })
        .then((res: any) => setDepartments(res.items || res.data || []))
        .catch(console.error);
    });
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      };
      if (searchQuery) params.search = searchQuery;
      if (departmentId !== "") params.departmentId = departmentId;
      if (hasTeam !== "all") params.hasTeam = hasTeam === "true";
      if (isActive !== "all") params.isActive = isActive === "true";

      const result = await adminApi.getStudents(params);
      setData(result.items);
      setPageCount(result.totalPages);
    } catch (error: any) {
      toast.error("Failed to fetch students", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchStudents();
    }, 400);
    return () => clearTimeout(handler);
  }, [pagination.pageIndex, pagination.pageSize, searchQuery, departmentId, hasTeam, isActive]);

  const handleToggleStatus = async (student: AdminStudentDto) => {
    try {
      await adminApi.updateStudentStatus(student.id, !student.isActive);
      toast.success(`Student ${!student.isActive ? 'activated' : 'deactivated'} successfully`);
      fetchStudents();
    } catch (error: any) {
      toast.error("Failed to update status", { description: error.message });
    }
  };

  const handleDelete = (id: string) => {
    setStudentToDelete(id);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      await adminApi.deleteStudent(studentToDelete);
      toast.success("Student deleted successfully");
      fetchStudents();
    } catch (error: any) {
      toast.error("Delete failed", { description: error.message });
    } finally {
      setIsDeleting(false);
      setStudentToDelete(null);
    }
  };

  const handleResetPassword = async (id: string) => {
    const newPassword = prompt("Enter new password (leave blank for random generation):");
    if (newPassword === null) return; // cancelled
    try {
      await adminApi.resetStudentPassword(id, newPassword || undefined);
      toast.success("Password reset successfully. Active sessions invalidated.");
    } catch (error: any) {
      toast.error("Password reset failed", { description: error.message });
    }
  };

  const columns: ColumnDef<AdminStudentDto>[] = [
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
      accessorKey: "teamName",
      header: "Team",
      cell: ({ row }) => {
        const teamName = row.getValue("teamName") as string;
        const isLeader = row.original.isTeamLeader;
        if (!teamName) return <span className="text-muted-foreground italic">None</span>;
        return (
          <div className="flex items-center gap-2">
            <span>{teamName}</span>
            {isLeader && <Badge variant="outline" className="text-[10px] uppercase">Leader</Badge>}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        const isDeleted = row.original.isDeleted;
        if (isDeleted) return <Badge variant="destructive">Deleted</Badge>;
        return isActive ? (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20">Active</Badge>
        ) : (
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">Suspended</Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const student = row.original;
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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(student.id)}>
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleToggleStatus(student)}>
                <ShieldOff className="w-4 h-4 mr-2" />
                {student.isActive ? 'Deactivate Account' : 'Activate Account'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleResetPassword(student.id)}>
                <KeyRound className="w-4 h-4 mr-2" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(student.id)} className="text-destructive focus:bg-destructive/10">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Student
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
        title="Student Management"
        description="View and manage all registered student accounts."
      />

      <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-4 items-center">
        <input
          placeholder="Search name or email..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setPagination(p => ({ ...p, pageIndex: 0 })); }}
          className="flex h-10 w-full sm:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <select
          value={departmentId}
          onChange={e => { setDepartmentId(e.target.value ? Number(e.target.value) : ""); setPagination(p => ({ ...p, pageIndex: 0 })); }}
          className="flex h-10 w-full sm:w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={hasTeam}
          onChange={e => { setHasTeam(e.target.value); setPagination(p => ({ ...p, pageIndex: 0 })); }}
          className="flex h-10 w-full sm:w-40 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">Any Team Status</option>
          <option value="true">Has Team</option>
          <option value="false">No Team</option>
        </select>
        <select
          value={isActive}
          onChange={e => { setIsActive(e.target.value); setPagination(p => ({ ...p, pageIndex: 0 })); }}
          className="flex h-10 w-full sm:w-40 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">Any Status</option>
          <option value="true">Active Only</option>
          <option value="false">Suspended</option>
        </select>
      </div>

      <div className="mt-6">
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

      <ConfirmDialog
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Student"
        description="Are you sure you want to soft-delete this student? They will lose access, but their records will remain in the database."
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
      />
    </div>
  );
}
