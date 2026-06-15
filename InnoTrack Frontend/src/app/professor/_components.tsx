import { AlertTriangle, Clock, FileText, CheckCircle2 } from "lucide-react";

export {
  PageHeader,
  ProjectTable,
  SectionCard,
  StatCard as ProfessorStatCard,
  StatusBadge,
} from "@/app/_components/DashboardUI";

export function OriginalityMeter({ score }: { score: number }) {
  const color = score >= 80 ? "#10B981" : score >= 40 ? "#EAB308" : "#EF4444";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="#E5E7EB"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-2xl font-bold text-foreground">
          {score}%
        </span>
      </div>
      <p className="text-xs font-medium text-muted-foreground">Originality Score</p>
    </div>
  );
}

export const statusIcons = {
  draft: FileText,
  "in-progress": Clock,
  submitted: AlertTriangle,
  completed: CheckCircle2,
};
