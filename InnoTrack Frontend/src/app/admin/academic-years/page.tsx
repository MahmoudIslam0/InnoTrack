"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { adminApi, AcademicYearDto } from "@/lib/admin-api";
import { DataTable } from "@/app/_components/DataTable";
import { PageHeader } from "@/app/_components/DashboardUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoreHorizontal, Plus, CheckCircle, Trash, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";

export default function AdminAcademicYears() {
  const [data, setData] = useState<AcademicYearDto[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterIsActive, setFilterIsActive] = useState<boolean | "all">("all");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({
    name: "",
    startDate: "",
    endDate: "",
  });

  const [yearToDelete, setYearToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [yearToActivate, setYearToActivate] = useState<number | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const fetchAcademicYears = async () => {
    setIsLoading(true);
    try {
      const result = await adminApi.getAcademicYears({
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: searchTerm || undefined,
        isActive: filterIsActive !== "all" ? filterIsActive : undefined,
      });
      setData(result.items);
      setPageCount(result.totalPages);
    } catch (error: any) {
      toast.error("Failed to fetch academic years", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchAcademicYears();
    }, 400);
    return () => clearTimeout(handler);
  }, [pagination.pageIndex, pagination.pageSize, searchTerm, filterIsActive]);


  const handleActivate = (id: number) => {
    setYearToActivate(id);
  };

  const confirmActivate = async () => {
    if (!yearToActivate) return;
    setIsActivating(true);
    try {
      await adminApi.activateAcademicYear(yearToActivate);
      toast.success("Academic year activated successfully");
      fetchAcademicYears();
    } catch (error: any) {
      toast.error("Failed to activate academic year", { description: error.message });
    } finally {
      setIsActivating(false);
      setYearToActivate(null);
    }
  };

  const handleDelete = (id: number) => {
    setYearToDelete(id);
  };

  const confirmDelete = async () => {
    if (!yearToDelete) return;
    setIsDeleting(true);
    try {
      await adminApi.deleteAcademicYear(yearToDelete);
      toast.success("Academic year deleted successfully");
      fetchAcademicYears();
    } catch (error: any) {
      toast.error("Failed to delete academic year", { description: error.message });
    } finally {
      setIsDeleting(false);
      setYearToDelete(null);
    }
  };

  const handleCreate = async () => {
    try {
      await adminApi.createAcademicYear({
        name: createData.name,
        startDate: new Date(createData.startDate).toISOString(),
        endDate: new Date(createData.endDate).toISOString(),
      });
      toast.success("Academic year created successfully");
      setIsCreateOpen(false);
      setCreateData({ name: "", startDate: "", endDate: "" });
      fetchAcademicYears();
    } catch (error: any) {
      toast.error("Failed to create academic year", { description: error.message });
    }
  };

  const columns: ColumnDef<AcademicYearDto>[] = [
    {
      accessorKey: "name",
      header: "Year Name",
      cell: ({ row }) => <div className="font-medium text-foreground">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => <div>{new Date(row.getValue("startDate")).toLocaleDateString()}</div>,
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => <div>{new Date(row.getValue("endDate")).toLocaleDateString()}</div>,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("isActive") as boolean;
        return isActive ? (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Active Current</Badge>
        ) : (
          <Badge variant="outline">Inactive</Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const year = row.original;
        if (year.isActive) return null; // No actions needed if it's already active (unless editing)
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
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleActivate(year.id)}>
                <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />
                Set as Active
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(year.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash className="w-4 h-4 mr-2" />
                Delete Academic Year
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
        title="Academic Years"
        description="Manage graduation cycles. Only one year can be active at a time."
      />
      
      <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-4 items-center">
        <input
          placeholder="Search academic years..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPagination({ ...pagination, pageIndex: 0 }); }}
          className="flex h-10 w-full sm:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />

        <select 
          value={filterIsActive as any} 
          onChange={(e) => { setFilterIsActive(e.target.value === "all" ? "all" : e.target.value === "true"); setPagination({ ...pagination, pageIndex: 0 }); }}
          className="flex h-10 w-full sm:w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="all">All Statuses</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Academic Year
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] border-border/50 bg-background/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle>Create Academic Year</DialogTitle>
              <DialogDescription>
                Define a new cycle. New years are inactive by default until explicitly activated.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Cycle Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. 2024-2025" 
                  value={createData.name} 
                  onChange={e => setCreateData({...createData, name: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start">Start Date</Label>
                  <Input 
                    id="start" 
                    type="date" 
                    value={createData.startDate} 
                    onChange={e => setCreateData({...createData, startDate: e.target.value})} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end">End Date</Label>
                  <Input 
                    id="end" 
                    type="date" 
                    value={createData.endDate} 
                    onChange={e => setCreateData({...createData, endDate: e.target.value})} 
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button 
                type="submit" 
                onClick={handleCreate}
                disabled={!createData.name || !createData.startDate || !createData.endDate}
              >
                Create Year
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>

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

      <ConfirmDialog
        isOpen={!!yearToDelete}
        onClose={() => setYearToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Academic Year"
        description="Are you sure you want to delete this academic year? It cannot be deleted if it contains registered projects."
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={!!yearToActivate}
        onClose={() => setYearToActivate(null)}
        onConfirm={confirmActivate}
        title="Activate Academic Year"
        description="Are you sure you want to set this as the active academic year? Other years will be deactivated."
        confirmText="Activate"
        variant="default"
        isLoading={isActivating}
      />
    </div>
  );
}
