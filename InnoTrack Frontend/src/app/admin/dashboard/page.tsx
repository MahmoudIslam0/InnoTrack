"use client";

import { CheckCircle2, ClipboardList, FolderKanban, Users, ShieldAlert, AlertTriangle, RefreshCcw, Lock, LogOut as LogOutIcon, CalendarPlus, Activity } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/admin-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PageHeader,
  StatCard as ProfessorStatCard,
  SectionCard,
} from "@/app/_components/DashboardUI";

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<number | "">("");
  const [isOpeningYear, setIsOpeningYear] = useState(false);
  
  const [isResettingStuck, setIsResettingStuck] = useState(false);
  const [isClosingYear, setIsClosingYear] = useState(false);
  const [isForcingLogout, setIsForcingLogout] = useState(false);

  const fetchData = async () => {
    try {
      const data = await adminApi.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenYearModal = async () => {
    setIsYearModalOpen(true);
    try {
      const res = await adminApi.getAcademicYears({ pageNumber: 1, pageSize: 100 });
      setAcademicYears(res.items.filter((y: any) => !y.isActive));
    } catch (err) {
      toast.error("Failed to fetch academic years");
    }
  };

  const submitOpenYear = async () => {
    if (!selectedYearId) return;
    setIsOpeningYear(true);
    try {
      await adminApi.openAcademicYear(Number(selectedYearId));
      toast.success("Academic year opened successfully.");
      setIsYearModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to open academic year");
    } finally {
      setIsOpeningYear(false);
    }
  };

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    action: (() => Promise<any>) | null;
    successMsg: string;
    setLoader: ((val: boolean) => void) | null;
    title: string;
    description: string;
    confirmText: string;
    variant: "default" | "destructive";
    isLoading: boolean;
  }>({
    isOpen: false,
    action: null,
    successMsg: "",
    setLoader: null,
    title: "",
    description: "",
    confirmText: "Execute",
    variant: "default",
    isLoading: false,
  });

  const handleQuickAction = (
    action: () => Promise<any>,
    successMsg: string,
    setLoader: (val: boolean) => void,
    title: string,
    description: string,
    confirmText: string = "Execute",
    variant: "default" | "destructive" = "default"
  ) => {
    setConfirmState({
      isOpen: true,
      action,
      successMsg,
      setLoader,
      title,
      description,
      confirmText,
      variant,
      isLoading: false,
    });
  };

  const executeConfirmAction = async () => {
    if (!confirmState.action || !confirmState.setLoader) return;
    
    setConfirmState(prev => ({ ...prev, isLoading: true }));
    confirmState.setLoader(true);
    try {
      await confirmState.action();
      toast.success(confirmState.successMsg);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      confirmState.setLoader(false);
      setConfirmState(prev => ({ ...prev, isOpen: false, isLoading: false }));
    }
  };

  const {
    totalStudents = 0,
    totalProfessors = 0,
    totalTeams = 0,
    teamsWithoutSupervisor = 0,
    totalProjects = 0,
    draftCount = 0,
    underReviewCount = 0,
    completedCount = 0,
    totalTechnologies = 0,
    totalDomains = 0,
    averageOriginalityScore = 0,
    stuckProjectsCount = 0,
    canCloseAcademicYear = false,
    projectsByStatus = [],
    projectsByDomain = [],
    alerts = [],
    recentActivity = [],
  } = dashboardData || {};

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Admin Dashboard"
        description="Monitor system health, view key metrics, and manage university operations."
      />

      {alerts.length > 0 && (
        <div className="bg-destructive/10 rounded-2xl p-6 border border-destructive/20 shadow-sm mb-8 backdrop-blur-xl flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-destructive w-6 h-6" />
            <h2 className="text-lg font-semibold text-destructive">System Health Alerts</h2>
          </div>
          <ul className="list-disc list-inside space-y-1 text-destructive/90 ml-2">
            {alerts.map((alert: any, idx: number) => (
              <li key={idx}>{alert.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Users & Teams */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Users & Teams</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProfessorStatCard
            title="Total Students"
            value={String(totalStudents)}
            subtitle="Registered in system"
            icon={Users}
            tone="primary"
            isLoading={isLoading}
          />
          <ProfessorStatCard
            title="Total Professors"
            value={String(totalProfessors)}
            subtitle="Registered supervisors"
            icon={ClipboardList}
            tone="info"
            isLoading={isLoading}
          />
          <ProfessorStatCard
            title="Total Teams"
            value={String(totalTeams)}
            subtitle="Across all departments"
            icon={Users}
            tone="warning"
            isLoading={isLoading}
          />
          <ProfessorStatCard
            title="No Supervisor"
            value={String(teamsWithoutSupervisor)}
            subtitle="Teams missing supervisor"
            icon={AlertTriangle}
            tone="error"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Projects Overview */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">Projects Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProfessorStatCard
            title="Projects"
            value={String(totalProjects)}
            subtitle={`Avg score: ${averageOriginalityScore}%`}
            icon={FolderKanban}
            tone="success"
            isLoading={isLoading}
          />
          <ProfessorStatCard
            title="Drafts"
            value={String(draftCount)}
            subtitle="Projects in draft"
            icon={FolderKanban}
            tone="info"
            isLoading={isLoading}
          />
          <ProfessorStatCard
            title="Under Review"
            value={String(underReviewCount)}
            subtitle="Awaiting approval"
            icon={FolderKanban}
            tone="warning"
            isLoading={isLoading}
          />
          <ProfessorStatCard
            title="Completed Projects"
            value={String(completedCount)}
            subtitle="Successfully finished"
            icon={CheckCircle2}
            tone="success"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* System Context */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-4">System Context</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProfessorStatCard
            title="Total Technologies"
            value={String(totalTechnologies)}
            subtitle="System wide"
            icon={ClipboardList}
            tone="primary"
            isLoading={isLoading}
          />
          <ProfessorStatCard
            title="Total Domains"
            value={String(totalDomains)}
            subtitle="System wide"
            icon={ClipboardList}
            tone="info"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* CHARTS SECTION */}
      {!isLoading && (projectsByStatus.length > 0 || projectsByDomain.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {projectsByStatus.length > 0 && (
            <SectionCard title="Projects by Status">
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectsByStatus}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      paddingAngle={5}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {projectsByStatus.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`${value} projects`, 'Count']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          )}

          {projectsByDomain.length > 0 && (
            <SectionCard title="Projects by Domain">
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectsByDomain} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--accent))' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* QUICK ACTIONS SECTION */}
      <SectionCard title="Quick Actions">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
          {/* Action 1: Reset Stuck Projects */}
          <div className="flex flex-col gap-2 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCcw className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Reset Stuck Projects</h3>
            </div>
            <p className="text-xs text-muted-foreground flex-1">
              Revert projects stuck in Under Review for 48+ hours back to Draft.
            </p>
            <div className="mt-2 flex items-center justify-between">
              <Badge variant={stuckProjectsCount > 0 ? "destructive" : "secondary"}>
                {stuckProjectsCount} Stuck
              </Badge>
              <Button 
                size="sm" 
                variant="outline" 
                disabled={stuckProjectsCount === 0 || isResettingStuck}
                onClick={() => handleQuickAction(
                  adminApi.resetStuckProjects, 
                  "Stuck projects reset.", 
                  setIsResettingStuck,
                  "Reset Stuck Projects",
                  "Are you sure you want to reset projects that have been stuck in review for over 48 hours? They will be returned to Draft status.",
                  "Reset",
                  "destructive"
                )}
              >
                {isResettingStuck ? "Resetting..." : "Execute"}
              </Button>
            </div>
          </div>

          {/* Action 2: Close Academic Year */}
          <div className="flex flex-col gap-2 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-orange-500" />
              <h3 className="font-semibold text-sm">Close Academic Year</h3>
            </div>
            <p className="text-xs text-muted-foreground flex-1">
              Deactivate current year. Prevents new project drafts from being created.
            </p>
            <div className="mt-2 flex justify-end">
              <Button 
                size="sm" 
                variant="outline" 
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-950"
                disabled={!canCloseAcademicYear || isClosingYear}
                onClick={() => handleQuickAction(
                  adminApi.closeAcademicYear, 
                  "Academic year closed.", 
                  setIsClosingYear,
                  "Close Academic Year",
                  "Are you sure you want to close the current academic year? This will prevent any new project drafts from being created.",
                  "Close Year",
                  "destructive"
                )}
              >
                {isClosingYear ? "Closing..." : "Close Year"}
              </Button>
            </div>
          </div>

          {/* Action 3: Open Academic Year */}
          <div className="flex flex-col gap-2 p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <CalendarPlus className="w-4 h-4 text-green-500" />
              <h3 className="font-semibold text-sm">Open Academic Year</h3>
            </div>
            <p className="text-xs text-muted-foreground flex-1">
              Activate an inactive academic year for the new cycle.
            </p>
            <div className="mt-2 flex justify-end">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleOpenYearModal}
              >
                Open Year
              </Button>
            </div>
          </div>

          {/* Action 4: Force Logout All */}
          <div className="flex flex-col gap-2 p-4 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <LogOutIcon className="w-4 h-4 text-destructive" />
              <h3 className="font-semibold text-sm text-destructive">Force Logout All</h3>
            </div>
            <p className="text-xs text-destructive/80 flex-1">
              Invalidate sessions for all non-admin users. Use for security incidents.
            </p>
            <div className="mt-2 flex justify-end">
              <Button 
                size="sm" 
                variant="destructive" 
                disabled={isForcingLogout}
                onClick={() => handleQuickAction(
                  adminApi.forceLogoutAll, 
                  "All users force logged out.", 
                  setIsForcingLogout,
                  "Force Logout All Users",
                  "Are you sure you want to invalidate all non-admin sessions? All students and professors will be immediately logged out.",
                  "Force Logout",
                  "destructive"
                )}
              >
                {isForcingLogout ? "Executing..." : "Force Logout"}
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Open Academic Year Modal */}
      <Dialog open={isYearModalOpen} onOpenChange={setIsYearModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Open Academic Year</DialogTitle>
            <DialogDescription>
              Select an inactive academic year to activate. This will automatically deactivate any currently active year.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Available Academic Years</label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(Number(e.target.value))}
            >
              <option value="" disabled>Select an academic year...</option>
              {academicYears.length === 0 && <option disabled>No inactive years found.</option>}
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsYearModalOpen(false)} disabled={isOpeningYear}>
              Cancel
            </Button>
            <Button onClick={submitOpenYear} disabled={!selectedYearId || isOpeningYear}>
              {isOpeningYear ? "Opening..." : "Activate Year"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-8">
        <SectionCard
          title="Recent Audit Logs"
          action={
            <Link href="/admin/audit-logs">
              <Button
                variant="ghost"
                className="text-primary dark:text-primary hover:bg-primary/10"
              >
                View Full Logs
              </Button>
            </Link>
          }
        >
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border/40 bg-card/40 flex items-center justify-between">
                  <Skeleton className="h-5 w-64 rounded-md" />
                  <Skeleton className="h-5 w-24 rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {recentActivity.map((log: any) => (
                <div key={log.id} className="p-4 rounded-xl border border-border/40 bg-card/40 hover:bg-accent/5 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {log.actorName}
                    </span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className="p-6 text-center text-muted-foreground">No recent audit logs.</div>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Quick Action Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeConfirmAction}
        title={confirmState.title}
        description={confirmState.description}
        confirmText={confirmState.confirmText}
        variant={confirmState.variant}
        isLoading={confirmState.isLoading}
      />
    </div>
  );
}
