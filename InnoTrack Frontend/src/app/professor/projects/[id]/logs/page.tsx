"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { History, ArrowLeft, GitCommit, FileText, Activity } from "lucide-react";
import { PageHeader } from "@/app/professor/_components";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { professorApi } from "@/lib/professor-api";
import * as signalR from "@microsoft/signalr";

export default function ProjectLogsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [projectTitle, setProjectTitle] = useState("");
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // Fetch project details for the title
    const fetchProject = async () => {
      try {
        const details = await professorApi.getProjectDetails(id);
        if (details) {
          setProjectTitle(details.title);
        } else {
          setProjectTitle("Adaptive Music Learning Platform for Individuals with Cognitive...");
        }
      } catch (err) {
        console.error("Failed to load project details", err);
        setProjectTitle("Adaptive Music Learning Platform for Individuals with Cognitive...");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await professorApi.getProjectLogs(id);
        if (data && Array.isArray(data)) {
          setLogs(data);
        }
      } catch (err) {
        console.error("Failed to load project logs", err);
      }
    };
    fetchLogs();
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net";
    const hubUrl = `${BASE_URL.replace(/\/$/, '')}/hubs/notifications`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveProjectLog", (log: any) => {
      if (!log) return;
      const logProjectId = log.projectId || log.ProjectId;
      if (logProjectId?.toString() === id.toString()) {
        const typeVal = log.type || log.Type || "update";
        const messageVal = log.message || log.Message || "";
        const timestampVal = log.timestamp || log.Timestamp || new Date().toISOString();
        const actorNameVal = log.actorName || log.ActorName || "System";
        const iconNameVal = log.iconName || log.IconName || "Activity";
        const colorClassVal = log.colorClass || log.ColorClass || "text-blue-500";
        const bgClassVal = log.bgClass || log.BgClass || "bg-blue-500/10";
        const idVal = log.id || log.Id || Date.now();

        setLogs(prev => [
          {
            id: idVal,
            type: typeVal,
            message: messageVal,
            timestamp: timestampVal,
            actorName: actorNameVal,
            iconName: iconNameVal,
            colorClass: colorClassVal,
            bgClass: bgClassVal
          },
          ...prev
        ]);
      }
    });

    connection.start()
      .then(() => console.log("SignalR project logs connected"))
      .catch(err => console.error("SignalR project logs error:", err));

    return () => {
      connection.stop();
    };
  }, [id]);

  return (
    <div className="dashboard-page max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.back()}
          className="rounded-full w-10 h-10 border-border/50 hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Button>
        <PageHeader
          title="Project Activity Logs"
          description={isLoading ? "Viewing history and changes for project activity logs..." : `Viewing history and changes for: ${projectTitle || "Project"}`}
        />
      </div>

      <div className="bg-card text-card-foreground rounded-2xl border border-border shadow-sm p-6 md:p-10 mt-6">
        <div className="relative border-l-2 border-border/60 ml-4 space-y-10">
          {isLoading ? (
            [1, 2, 3].map((idx) => (
              <div key={idx} className="relative pl-8">
                {/* Timeline Node */}
                <div className="absolute -left-[17px] top-1 w-8 h-8 rounded-full bg-muted/65 flex items-center justify-center ring-4 ring-card">
                  <Skeleton className="w-4 h-4 rounded-full" />
                </div>
                
                {/* Log Content */}
                <div className="bg-muted/30 border border-border/50 rounded-xl p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4 rounded-md" />
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <span className="w-1 h-1 rounded-full bg-border/40"></span>
                    <Skeleton className="h-4 w-20 rounded-md" />
                  </div>
                </div>
              </div>
            ))
          ) : logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              No activity logs found for this project.
            </div>
          ) : (
            logs.map((log) => {
              // Determine icon dynamically or fallback
              let Icon = Activity;
              if (log.iconName === 'FileText') Icon = FileText;
              if (log.iconName === 'GitCommit') Icon = GitCommit;
              if (log.iconName === 'History') Icon = History;

              const iconColor = log.colorClass || "text-blue-500";
              const iconBg = log.bgClass || "bg-blue-500/10";

              return (
                <div key={log.id} className="relative pl-8">
                  {/* Timeline Node */}
                  <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full ${iconBg} flex items-center justify-center ring-4 ring-card`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  
                  {/* Log Content */}
                  <div className="bg-muted/30 border border-border/50 rounded-xl p-5 hover:border-primary/20 hover:bg-muted/50 transition-colors">
                    <p className="text-[15px] font-medium text-foreground leading-relaxed">
                      {log.message}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground font-medium">
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                      <span className="w-1 h-1 rounded-full bg-border"></span>
                      <span>By {log.actorName || log.actor || "System"}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
