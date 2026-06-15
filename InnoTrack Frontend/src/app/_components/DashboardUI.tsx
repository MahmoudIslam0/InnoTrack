import { 
  ArrowRight, 
  Award, 
  LucideIcon, 
  Bell, 
  CheckCircle2, 
  ChevronRight, 
  TrendingUp, 
  Users, 
  Calendar, 
  Clock, 
  FolderKanban 
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type StatusTone =
  | "draft"
  | "in-progress"
  | "submitted"
  | "completed"
  | "approved"
  | "rejected";

export type StatTone = "success" | "info" | "primary" | "warning" | "error";

const statToneMap: Record<StatTone, string> = {
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
  info: "bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400",
  primary: "bg-primary/10 text-primary dark:bg-primary/20",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  error: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
};

const statusToneMap: Record<StatusTone, string> = {
  draft: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
  "in-progress": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
  submitted: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  approved: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
  rejected: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
};

const statusLabelMap: Record<StatusTone, string> = {
  draft: "Draft",
  "in-progress": "In Progress",
  submitted: "Pending",
  completed: "Completed",
  approved: "Approved",
  rejected: "Rejected",
};

export interface ProjectCatalogItem {
  id: string;
  title: string;
  category: string;
  status: StatusTone;
  year: string | number;
  supervisor: string;
  students: string[];
  technologies: string[];
  originality?: number;
}

export interface OriginalProjectItem {
  id: string;
  title: string;
  domain: string;
  description: string;
  originalityScore: number;
  meta: string;
  status: StatusTone;
}

export interface ProjectTableRow {
  id: string;
  title: string;
  subtitle: string;
  team: string;
  status: StatusTone;
  originalityScore: number;
}

export interface NotificationListItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  unread?: boolean;
  type?: string;
  icon: LucideIcon;
  tone: StatTone;
  href?: string;
}

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-normal text-foreground mb-2">
        {title}
      </h1>
      <p className="text-sm md:text-base text-muted-foreground max-w-3xl">
        {description}
      </p>
    </div>
  );
}

export function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="dashboard-surface overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between gap-4 bg-card text-card-foreground">
        <h2 className="text-base md:text-lg font-semibold text-foreground">
          {title}
        </h2>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

import { SearchLoader } from "@/components/ui/animated-loaders";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
  isLoading,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: StatTone;
  isLoading?: boolean;
}) {
  return (
    <div className="dashboard-card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24 mb-1" />
          ) : (
            <p className="text-2xl font-semibold text-foreground">{value}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${statToneMap[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-4 w-48" />
      ) : (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: StatusTone }) {
  return (
    <Badge variant="outline" className={statusToneMap[status]}>
      {statusLabelMap[status]}
    </Badge>
  );
}

export function TechChips({
  technologies,
  limit = 3,
}: {
  technologies: string[];
  limit?: number;
}) {
  const visibleTech = technologies.slice(0, limit);
  const remaining = technologies.length - visibleTech.length;

  return (
    <div className="flex flex-wrap gap-2">
      {visibleTech.map((technology) => (
        <span
          key={technology}
          className="px-2.5 py-1 bg-muted text-foreground text-xs rounded-md font-medium"
        >
          {technology}
        </span>
      ))}
      {remaining > 0 && (
        <span className="px-2.5 py-1 bg-muted text-foreground text-xs rounded-md font-medium">
          +{remaining}
        </span>
      )}
    </div>
  );
}

export function ProjectCatalogCard({
  project,
  actionLabel = "View",
  onAction,
  href,
  secondaryActionLabel,
  onSecondaryAction,
}: {
  project: ProjectCatalogItem;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}) {
  const scoreColor =
    project.originality !== undefined
      ? "bg-primary/10 border-primary/20 text-primary dark:text-primary"
      : "";

  return (
    <div className="dashboard-card hover:border-primary/50 flex flex-col h-full p-6">
      <div className="flex items-start justify-between mb-4">
        <Badge
          variant="outline"
          className="bg-primary/10 text-primary dark:text-primary border-primary/30"
        >
          {project.category}
        </Badge>
        <div className="flex items-center gap-2">
          {project.originality !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold ${scoreColor}`}>
              <Award className="w-3 h-3" />
              <span>{project.originality}%</span>
            </div>
          )}
          <StatusBadge status={project.status} />
        </div>
      </div>

      <h4 className="text-lg font-semibold text-foreground mb-3 line-clamp-2" title={project.title}>
        {project.title}
      </h4>

      <div className="space-y-2 mb-4 flex-1">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Year:</span> {project.year}
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Supervisor:</span>{" "}
          {project.supervisor}
        </p>
        <p className="text-sm text-muted-foreground line-clamp-1" title={project.students?.join(", ") || ""}>
          <span className="font-medium">Students:</span>{" "}
          {project.students && project.students.length > 0
            ? project.students.length > 4
              ? `${project.students.slice(0, 4).join(", ")} and ${project.students.length - 4} more`
              : project.students.join(", ")
            : "None"}
        </p>
      </div>

      <div className="mb-5 min-h-[28px]">
        {project.technologies && project.technologies.length > 0 && (
          <TechChips technologies={project.technologies} />
        )}
      </div>

      <div className="flex items-center gap-3 mt-auto">
        {href ? (
          <Button
            variant="outline"
            className="flex-1 text-primary dark:text-primary hover:bg-primary/10 hover:text-primary dark:text-primary border-primary/30"
            asChild
          >
            <Link href={href}>
              {actionLabel}
            </Link>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="flex-1 text-primary dark:text-primary hover:bg-primary/10 hover:text-primary dark:text-primary border-primary/30"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <Button
            variant="secondary"
            className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/10 dark:hover:bg-primary/20 dark:text-primary border border-primary/30 dark:border-primary/20"
            onClick={onSecondaryAction}
          >
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";

export function OriginalProjectCard({
  project,
  actionLabel = "View",
  onAction,
  href,
}: {
  project: OriginalProjectItem;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
}) {
  return (
    <div className="dashboard-card hover:border-primary/50 group">
      <div className="flex items-start justify-between mb-3">
        <Badge
          variant="outline"
          className="bg-primary/10 text-primary dark:text-primary border-primary/30"
        >
          {project.domain}
        </Badge>
        <div className="flex items-center gap-1.5 border border-primary/20 bg-primary/10 px-2.5 py-1 rounded-lg">
          <Award className="w-3.5 h-3.5 text-primary dark:text-primary" />
          <span className="text-sm font-semibold text-primary dark:text-primary">
            {project.originalityScore}%
          </span>
        </div>
      </div>

      <h4 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary dark:text-primary transition-colors">
        {project.title}
      </h4>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {project.description}
      </p>

      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-muted-foreground">{project.meta}</span>
        <StatusBadge status={project.status} />
      </div>

      {href ? (
        <Button variant="ghost" className="w-full text-primary dark:text-primary hover:bg-primary/10 hover:text-primary dark:text-primary" asChild>
          <Link href={href}>
            {actionLabel}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      ) : (
        <Button
          variant="ghost"
          className="w-full text-primary dark:text-primary hover:bg-primary/10 hover:text-primary dark:text-primary"
          onClick={onAction}
        >
          {actionLabel}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
}

export function ProjectTable({
  rows,
  actionLabel = "Review",
  onAction,
}: {
  rows: ProjectTableRow[];
  actionLabel?: string;
  onAction?: (projectId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-xl border border-dashed border-border/60">
        <FolderKanban className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <h3 className="text-sm font-medium text-foreground">No projects</h3>
        <p className="text-xs text-muted-foreground mt-1">There are no projects to display here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        return (
          <div
            key={row.id}
            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/40 bg-card/40 hover:bg-card hover:shadow-sm hover:border-primary/50 transition-all duration-200"
          >
            <div className="flex items-center gap-4 mb-3 sm:mb-0">
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary dark:group-hover:text-primary transition-colors line-clamp-1">
                  {row.title}
                </h3>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span className="font-medium">{row.team || "No team"}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 self-end sm:self-auto">
              {row.originalityScore !== undefined && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary dark:text-primary font-semibold text-xs border border-primary/20">
                  <Award className="w-3.5 h-3.5" />
                  {Math.round((row.originalityScore || 0) * 100)}%
                </div>
              )}
              {onAction && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 dark:text-primary dark:hover:bg-primary/10"
                  onClick={() => onAction(row.id)}
                >
                  {actionLabel}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function NotificationList({
  items,
  onRead,
}: {
  items: NotificationListItem[];
  onRead?: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-xl border border-dashed border-border/60 mx-6 mb-6">
        <Bell className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <h3 className="text-sm font-medium text-foreground">No notifications</h3>
        <p className="text-xs text-muted-foreground mt-1">You're all caught up! There are no system notifications right now.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-border/50">
      {items.map((notification) => {
        const Icon = notification.icon;

        const content = (
          <div
            className={`px-6 py-5 flex items-start gap-4 hover:bg-muted/50 transition-colors ${notification.unread ? 'bg-muted/20' : ''}`}
            onMouseEnter={() => notification.unread && onRead?.(notification.id)}
          >
            <div
              className={`p-3 rounded-xl ${statToneMap[notification.tone]} shrink-0`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary dark:group-hover:text-primary transition-colors">
                      {notification.title}
                    </p>
                    {notification.type && (
                      <Badge variant="outline">{notification.type}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {notification.message}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {notification.unread && (
                    <span className="h-2.5 w-2.5 rounded-full bg-primary dark:bg-primary shrink-0" />
                  )}
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {notification.timestamp}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

        if (notification.href) {
          return (
            <Link key={notification.id} href={notification.href} className="block group">
              {content}
            </Link>
          );
        }

        return <div key={notification.id} className="group">{content}</div>;
      })}
    </div>
  );
}
