"use client";

import { useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { adminApi, AuditLogDto } from "@/lib/admin-api";
import { DataTable } from "@/app/_components/DataTable";
import { PageHeader } from "@/app/_components/DashboardUI";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function AdminAuditLogs() {
  const [data, setData] = useState<AuditLogDto[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 15 });
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionInput, setActionInput] = useState("");
  const [actionTerm, setActionTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const result = await adminApi.getAuditLogs({
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: searchTerm || undefined,
        action: actionTerm || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setData(result.items);
      setPageCount(result.totalPages);
    } catch (error: any) {
      toast.error("Failed to fetch audit logs", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [pagination, searchTerm, actionTerm, fromDate, toDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setActionTerm(actionInput);
    setPagination({ ...pagination, pageIndex: 0 });
  };

  const columns: ColumnDef<AuditLogDto>[] = [
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => <div className="text-muted-foreground whitespace-nowrap">{new Date(row.getValue("timestamp")).toLocaleString()}</div>,
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => <div className="font-medium text-foreground uppercase text-xs">{row.getValue("action")}</div>,
    },
    {
      accessorKey: "userFullName",
      header: "User",
      cell: ({ row }) => <div>{row.getValue("userFullName") || <span className="text-muted-foreground italic">System</span>}</div>,
    },
    {
      accessorKey: "details",
      header: "Details",
      cell: ({ row }) => <div className="max-w-[400px] truncate" title={row.getValue("details")}>{row.getValue("details")}</div>,
    },
    {
      accessorKey: "ipAddress",
      header: "IP Address",
      cell: ({ row }) => <div className="text-muted-foreground text-xs font-mono">{row.getValue("ipAddress") || "N/A"}</div>,
    },
  ];

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Audit Logs"
        description="Comprehensive timeline of system events, security actions, and data mutations."
      />

      <div className="flex flex-col gap-4 mt-4 mb-2">
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-3 items-end">
          <div className="flex-1 w-full relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input 
              placeholder="Search actor, action, or details..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <div className="w-full lg:w-64">
            <Input 
              placeholder="Filter by Action (e.g. UPDATE)" 
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-48">
            <Input 
              type="date"
              placeholder="From Date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPagination({ ...pagination, pageIndex: 0 }); }}
            />
          </div>
          <div className="w-full lg:w-48">
            <Input 
              type="date"
              placeholder="To Date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPagination({ ...pagination, pageIndex: 0 }); }}
            />
          </div>
          <Button type="submit" className="w-full lg:w-auto">Search</Button>
        </form>
      </div>

      <div className="mt-4">
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
    </div>
  );
}
