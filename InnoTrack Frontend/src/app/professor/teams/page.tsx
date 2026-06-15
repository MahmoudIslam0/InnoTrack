"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, MessageSquare, ChevronRight, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../_components";
import { professorApi } from "@/lib/professor-api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfessorTeams() {
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivities, setLastActivities] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const data = await professorApi.getSupervisedTeams();
        setTeams(data || []);
      } catch (err) {
        console.error("Failed to load teams:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    if (teams.length === 0) return;

    const fetchLastActivities = async () => {
      const activities: Record<number, string> = {};
      await Promise.all(
        teams.map(async (team) => {
          try {
            const chatData = await professorApi.getTeamChat(team.id);
            const messages = chatData.messages || [];
            if (messages.length > 0) {
              const lastMsg = messages[messages.length - 1];
              const msgDate = new Date(lastMsg.sentAt || lastMsg.timestamp);
              
              const now = new Date();
              const isToday = msgDate.toDateString() === now.toDateString();
              
              const yesterday = new Date(now);
              yesterday.setDate(now.getDate() - 1);
              const isYesterday = msgDate.toDateString() === yesterday.toDateString();
              
              const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              if (isToday) {
                activities[team.id] = `Today, ${timeStr}`;
              } else if (isYesterday) {
                activities[team.id] = `Yesterday, ${timeStr}`;
              } else {
                const dateStr = msgDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                activities[team.id] = `${dateStr}, ${timeStr}`;
              }
            } else {
              activities[team.id] = "No messages yet";
            }
          } catch (err) {
            console.error(`Failed to load last activity for team ${team.id}:`, err);
            activities[team.id] = "No messages yet";
          }
        })
      );
      setLastActivities(activities);
    };

    fetchLastActivities();
  }, [teams]);

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Supervised Teams"
        description="Manage your assigned teams, monitor their progress, and collaborate via direct team chats."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="bg-card text-card-foreground rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col justify-between"
            >
              <div className="p-8 flex flex-col justify-between flex-1 space-y-6">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-6 w-3/4 rounded-md" />
                      <Skeleton className="h-4 w-1/2 rounded-md" />
                    </div>
                    <Skeleton className="h-10 w-12 rounded-xl" />
                  </div>

                  {/* Members */}
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2.5 overflow-hidden">
                      {[1, 2, 3].map((mIdx) => (
                        <Skeleton
                          key={mIdx}
                          className="inline-flex h-10 w-10 rounded-full ring-2 ring-card"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-24 rounded-lg" />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-border/50">
                  <Skeleton className="h-4 w-16 rounded-md" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-20 rounded-xl" />
                    <Skeleton className="h-10 w-28 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl mt-6 shadow-sm">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">No Teams Assigned</h3>
          <p className="text-muted-foreground mt-3 max-w-md text-center leading-relaxed">
            You are not currently supervising any teams. Once students submit project proposals and you approve them, their teams will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {teams.map((team) => {
            const leader = (team.members || []).find((m: any) => m.role?.toLowerCase().includes("leader") || m.isLeader);
            const leaderName = leader?.fullName || "No Leader";
            const leaderInitials = leaderName !== "No Leader"
              ? leaderName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
              : "NL";

            const getStatusStyles = (status: string) => {
              const lower = (status || "").toLowerCase().replace("_", " ");
              if (lower.includes("progress") || lower.includes("approved") || lower.includes("completed")) {
                return { bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600", dot: "bg-emerald-500" };
              }
              if (lower.includes("review") || lower.includes("pending")) {
                return { bg: "bg-amber-500/10 border-amber-500/20 text-amber-600", dot: "bg-amber-500" };
              }
              if (lower.includes("reject") || lower.includes("abandon")) {
                return { bg: "bg-red-500/10 border-red-500/20 text-red-600", dot: "bg-red-500" };
              }
              return { bg: "bg-slate-500/10 border-slate-500/20 text-slate-600", dot: "bg-slate-500" };
            };
            const statusStyles = getStatusStyles(team.projectStatus || "Draft");

            return (
              <div 
                key={team.id} 
                className="bg-card text-card-foreground rounded-3xl border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/25 transition-all duration-300 overflow-hidden group flex flex-col justify-between"
              >
                {/* Top accent bar */}
                <div className="h-1.5 w-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-6 flex flex-col justify-between flex-1">
                  <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      {/* Initials box */}
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0 shadow-sm">
                        {team.name ? team.name.slice(0, 2).toUpperCase() : "GP"}
                      </div>
                      
                      {/* Name, Title, and Leader/Status */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-extrabold text-foreground tracking-tight truncate">{team.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 font-semibold truncate leading-snug">
                          {team.projectTitle || "No project assigned"}
                        </p>
                        
                        {/* Leader & Status Row */}
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <div className="flex items-center gap-1.5 bg-muted/60 border border-border/50 px-2 py-0.5 rounded-full text-xs text-muted-foreground font-medium">
                            <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold">
                              {leaderInitials}
                            </div>
                            <span className="truncate max-w-[100px]">{leaderName}</span>
                            <span className="text-[10px] text-muted-foreground/60 font-normal ml-0.5">Lead</span>
                          </div>
                          
                          {team.projectStatus && (
                            <>
                              <div className="w-[1px] h-3 bg-border/80" />
                              <div className={`flex items-center gap-1.5 px-2.5 py-0.5 border rounded-full text-[11px] font-bold ${statusStyles.bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusStyles.dot} animate-pulse`} />
                                <span className="capitalize">{team.projectStatus.toLowerCase().replace("_", " ")}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Member Count block (Right side) */}
                      <div className="flex flex-col items-center justify-center shrink-0 border border-blue-100/50 dark:border-blue-950/40 bg-blue-50/30 dark:bg-blue-950/20 rounded-[20px] p-3 text-center w-[80px] h-[80px]">
                        <Users className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xl font-black text-primary leading-none mt-1">{team.members?.length || 0}</span>
                        <span className="text-[8px] text-muted-foreground/80 font-black uppercase mt-1 tracking-widest leading-none">
                          {team.members?.length === 1 ? 'MEMBER' : 'MEMBERS'}
                        </span>
                      </div>
                    </div>

                    {/* Details Container (Created & Last Activity, without Field) */}
                    <div className="bg-muted/30 border border-border/40 rounded-2xl p-4 grid grid-cols-2 gap-4 mt-2">
                      {/* Created Date */}
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col text-left min-w-0">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Created</span>
                          <span className="text-xs font-semibold text-foreground truncate mt-0.5">
                            {team.submittedAt 
                              ? new Date(team.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "May 12, 2025"}
                          </span>
                        </div>
                      </div>

                      {/* Last Activity (Last message sent time) */}
                      <div className="flex items-center gap-3 border-l border-border/60 pl-4">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col text-left min-w-0">
                          <span className="text-[10px] text-muted-foreground/80 font-bold uppercase tracking-wider">Last Activity</span>
                          <span className="text-xs font-semibold text-foreground truncate mt-0.5">
                            {lastActivities[team.id] || "No messages yet"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Section */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-5 mt-5 border-t border-border/50 relative z-10">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase font-bold tracking-wider">
                      <Users className="w-3.5 h-3.5" />
                      <span>Team</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {team.projectStatus !== "UnderReview" ? (
                        <Link href={`/professor/teams/${team.id}?view=chat`}>
                          <Button 
                            variant="outline"
                            size="default"
                            className="h-10 text-muted-foreground hover:text-primary hover:border-primary/30 border-border/50 rounded-xl px-4 text-xs font-semibold shadow-sm transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-2" />
                            Chat
                          </Button>
                        </Link>
                      ) : (
                        <Button 
                          variant="outline"
                          size="default"
                          disabled
                          className="h-10 text-muted-foreground/50 border-border/50 rounded-xl px-4 text-xs font-semibold shadow-sm"
                          title="Chat is disabled until project is approved"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-2" />
                          Chat
                        </Button>
                      )}
                      <Link href={`/professor/teams/${team.id}`}>
                        <Button 
                          size="default"
                          className="bg-primary hover:bg-primary/95 text-white h-10 gap-2 rounded-xl px-4 text-xs font-semibold shadow-md shadow-primary/15 transition-all"
                        >
                          Overview
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
