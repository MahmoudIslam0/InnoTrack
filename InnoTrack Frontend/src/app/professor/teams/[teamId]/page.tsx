"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Users, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { professorApi } from "@/lib/professor-api";
import { useProfessorTeamChat } from "@/hooks/useProfessorTeamChat";
import { TeamChatWorkspace } from "@/app/_components/TeamChatWorkspace";
import MembersGrid from "@/components/Team/MembersGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/ui/animated-loaders";
import { AnimatePresence } from "framer-motion";

export default function ProfessorTeamDetail() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const teamId = Number(params.teamId);
  const [team, setTeam] = useState<any>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  
  const [activeView, setActiveView] = useState<"overview" | "chat">(
    (searchParams.get("view") as "overview" | "chat") || "overview"
  );
  
  const [currentUserName, setCurrentUserName] = useState("Professor");

  const {
    messages,
    members: chatMembers,
    isLoading: isChatLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    togglePin,
    reactToMessage,
    replyToMessage,
    uploadFile,
  } = useProfessorTeamChat(teamId);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.name) setCurrentUserName(u.name);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const teams = await professorApi.getSupervisedTeams();
        const found = teams?.find((t: any) => t.id === teamId);
        setTeam(found || null);
      } catch (error) {
        console.error("Failed to load team details:", error);
      } finally {
        setIsLoadingTeam(false);
      }
    };
    fetchTeam();
  }, [teamId]);

  const handleActiveViewChange = (view: "overview" | "chat") => {
    setActiveView(view);
    router.replace(`/professor/teams/${teamId}?view=${view}`, { scroll: false });
  };

  if (!isLoadingTeam && !team) {
    return (
      <div className="dashboard-page flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-xl font-bold mb-2">Team Not Found</h2>
        <p className="text-muted-foreground mb-4">You may not have access to this team.</p>
        <Button onClick={() => router.push("/professor/teams")}>Back to Teams</Button>
      </div>
    );
  }

  const visibleTeamMembers = team
    ? (team.members || []).map((m: any) => ({
        id: m.id,
        name: m.fullName,
        role: m.role,
        email: m.email,
        gpa: m.gpa,
        skills: m.skills || []
      }))
    : [];

  return (
    <div className={`dashboard-page flex flex-col ${activeView === "chat" ? "space-y-3 md:pt-5 !max-w-[95%]" : "space-y-6"}`}>
      <div className={`relative flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 ${activeView === "chat" ? "mb-2" : "mb-8"}`}>
        <div className="flex items-center gap-4 w-full md:w-[calc(50%-230px)] shrink-0 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push("/professor/teams")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            {isLoadingTeam ? (
              <div className="space-y-2">
                <Skeleton className="h-7 w-48 rounded-md" />
                <Skeleton className="h-4 w-36 rounded-md" />
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground truncate">{team.name}</h1>
                <p className="text-sm text-muted-foreground truncate">{team.projectTitle || "No Project"}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex w-full md:w-auto justify-center md:absolute md:left-1/2 md:-translate-x-1/2">
          <div className="grid w-full md:w-[440px] grid-cols-2 rounded-xl border border-border bg-muted/40 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => handleActiveViewChange("overview")}
              className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
                activeView === "overview"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Overview
            </button>
            <button
              type="button"
              onClick={() => handleActiveViewChange("chat")}
              className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
                activeView === "chat"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Team Chat
            </button>
          </div>
        </div>
      </div>

      {isLoadingTeam ? (
        <section className="dashboard-surface p-6 flex-1 overflow-auto">
          <div className="mb-4 space-y-2">
            <Skeleton className="h-6 w-32 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="bg-card text-card-foreground rounded-2xl border border-border/50 p-6 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-24 rounded-md" />
                      <Skeleton className="h-4 w-32 rounded-md" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-4 w-2/3 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <AnimatePresence mode="wait">
          <PageTransition key={activeView} className="flex-1 flex flex-col">
            {activeView === "overview" ? (
              <section className="dashboard-surface p-6 flex-1 overflow-auto">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Team Roster</h2>
            <p className="text-sm text-muted-foreground">View the current members of this team.</p>
          </div>
          <MembersGrid
            members={visibleTeamMembers}
            isLeaderView={false} // Professor can't remove members from here directly
            onRemove={() => {}}
          />
        </section>
      ) : (
        <TeamChatWorkspace
          title="Team Chat"
          subtitle={`${team?.projectTitle || "No project yet"} - ${team?.name || ""}`}
          members={chatMembers as any}
          messages={messages as any}
          currentUserName={currentUserName}
          currentUserRole="Professor"
          onSendMessage={sendMessage}
          onEditMessage={editMessage}
          onDeleteMessage={deleteMessage}
          onTogglePin={togglePin}
          onReactToMessage={reactToMessage}
          onReplyToMessage={replyToMessage}
          onUploadFile={uploadFile}
          isLoading={isChatLoading}
          className="h-[calc(100vh-240px)] min-h-[500px] rounded-2xl border border-border/50 shadow-sm"
        />
            )}
          </PageTransition>
        </AnimatePresence>
      )}
    </div>
  );
}
