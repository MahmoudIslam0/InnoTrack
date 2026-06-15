"use client";

import { Search, Bell, User, Menu, LogOut, PanelLeftClose, PanelLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "./Sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import * as signalR from "@microsoft/signalr";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} d ago`;
  return date.toLocaleDateString();
}

interface TopNavProps {
  title?: string;
  profileName?: string;
  profileSubtitle?: string;
  initials?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  profileHref?: string;
  variant?: "student" | "professor" | "admin";
}

export function TopNav({
  title = "Student Dashboard",
  profileName = "Mahmoud Islam",
  profileSubtitle = "Software Engineering Student",
  initials = "MI",
  showSearch = false,
  showNotifications = false,
  profileHref = "/profile",
  variant = "student",
}: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar } = useSidebar();
  const { isAuthenticated, user: authUser, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const isAdmin = pathname.startsWith("/admin");

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    try {
      setIsChangingPassword(true);
      await api.put("/api/Users/change-password", {
        oldPassword: currentPassword,
        newPassword
      });
      toast.success("Password changed successfully.");
      setIsChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      const isProf = pathname.startsWith("/professor");
      const endpoint = isProf ? "/api/Professor/me" : "/api/Students/me";
      api.get(endpoint)
        .then((data) => {
          setProfile(data);
        })
        .catch((err) => {
          console.error("Failed to load header profile details:", err);
        });
    }
  }, [isAuthenticated, pathname, isAdmin]);

  const finalName = isAdmin 
    ? authUser?.name || "Administrator" 
    : profile
      ? `${profile.firstName} ${profile.lastName}`
      : authUser?.name || profileName;

  const finalSubtitle = isAdmin
    ? "System Administrator"
    : profile
      ? profile.departmentName || (pathname.startsWith("/professor") ? "Faculty Member" : "Student")
      : profileSubtitle;

  const finalInitials = isAdmin
    ? "A"
    : profile
      ? `${profile.firstName ? profile.firstName[0] : ""}${profile.lastName ? profile.lastName[0] : ""}`.toUpperCase()
      : (finalName ? finalName.split(" ").map((n: any) => n[0]).join("").slice(0, 2).toUpperCase() : "U");

  const finalProfileHref = isAdmin 
    ? "#" 
    : pathname.startsWith("/professor") 
      ? "/professor/profile" 
      : "/profile";

  const getBreadcrumbs = () => {
    const isProf = pathname.startsWith("/professor");
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: { label: string; href: string }[] = [];

    let currentPath = "";
    segments.forEach((segment, idx) => {
      // Build the actual URL path correctly segment by segment
      currentPath += isProf && idx === 0 ? `/professor` : `/${segment}`;

      // Skip "professor" segment from visual breadcrumbs
      if (segment === "professor") return;

      // Format label
      let label = segment.charAt(0).toUpperCase() + segment.slice(1);
      if (segment === "project-management") label = "Project Management";
      if (segment === "innochat") label = "InnoChat";
      if (segment === "dashboard") label = "Dashboard";

      // Dynamic IDs
      const isId = !isNaN(Number(segment));
      if (isId) {
        if (segments[idx - 1] === "teams") {
          label = "Team Details";
        } else if (segments[idx - 1] === "projects") {
          label = "Project Details";
        } else {
          label = "Details";
        }
      }

      if (segment === "logs") label = "Activity Logs";

      breadcrumbs.push({
        label,
        href: currentPath,
      });
    });

    return breadcrumbs;
  };

  const fetchNotifications = () => {
    if (showNotifications) {
      api.notifications.getAll()
        .then((data) => {
          setNotifications(data.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            time: timeAgo(n.createdAt),
            unread: !n.isRead,
            referenceId: n.referenceId,
            referenceType: n.referenceType,
          })));
        })
        .catch(console.error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    window.addEventListener("notificationsUpdated", fetchNotifications);
    return () => window.removeEventListener("notificationsUpdated", fetchNotifications);
  }, [showNotifications]);

  const professorTitles: Record<string, string> = {
    "/professor/dashboard": "Professor Dashboard",
    "/professor/projects": "Projects",
    "/professor/project-management": "Project Management",
    "/professor/team-chats": "Team Chats",
    "/professor/innochat": "InnoChat",
    "/professor/feedback": "Feedback",
    "/professor/notifications": "Notifications",
    "/professor/profile": "Profile",
  };
  const displayTitle =
    title === "Professor Dashboard" ? professorTitles[pathname] ?? title : title;
  const notificationsHref = profileHref.startsWith("/professor")
    ? "/professor/notifications"
    : "/notifications";
  const shouldShowSearch = showSearch && pathname !== "/professor/dashboard";

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const markAsRead = async (id: number) => {
    const notif = notifications.find(n => n.id === id);
    if (notif && notif.unread) {
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, unread: false } : n)));
      try {
        await api.notifications.markAsRead(id);
        window.dispatchEvent(new Event("notificationsUpdated"));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const markAllAsRead = async () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
    try {
      await api.notifications.markAllAsRead();
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (err) {
      console.error(err);
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    try {
      await api.notifications.clearAll();
      toast.success("Notifications cleared");
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (err) {
      console.error(err);
      toast.error("Failed to clear notifications");
    }
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const getNotificationHref = (notification: any, isProf: boolean, isAdmin: boolean) => {
    const title = notification.title || "";
    const lower = title.toLowerCase();

    if (isAdmin) {
      if (lower.includes("project") || lower.includes("abandon") || lower.includes("submission") || lower.includes("proposal")) return "/admin/projects";
      if (lower.includes("team") || lower.includes("member") || lower.includes("left")) return "/admin/teams";
      if (lower.includes("professor")) return "/admin/professors";
      if (lower.includes("student")) return "/admin/students";
      return "/admin/dashboard";
    }

    if (notification.referenceId) {
      const refType = notification.referenceType;
      const refId = notification.referenceId;
      
      const isProject = refType === 1 || refType === "Project";
      const isTeam = refType === 2 || refType === "TeamRequest";
      const isChat = refType === 3 || refType === "Chat";

      if (isProf) {
        if (isProject) {
            if (lower.includes("submission") || lower.includes("review")) return `/professor/project-management?tab=underreview&openId=${refId}`;
            if (lower.includes("abandon") || lower.includes("recall")) return "/professor/projects";
            return `/professor/projects/${refId}`;
        }
        if (isTeam) {
            if (lower.includes("left") || lower.includes("remove")) return "/professor/teams";
            return `/professor/teams/${refId}`;
        }
      } else {
        if (isProject) return `/project-management`;
        if (isTeam || isChat) return `/teams`;
      }
    }
    
    if (isProf) {
      if (lower.includes("proposal") || lower.includes("abandon") || lower.includes("project") || lower.includes("recall")) return "/professor/projects";
      if (lower.includes("team") || lower.includes("join") || lower.includes("left") || lower.includes("member")) return "/professor/teams";
      if (lower.includes("feedback")) return "/professor/feedback";
      return "/professor/notifications";
    } else {
      if (lower.includes("team") || lower.includes("message") || lower.includes("left") || lower.includes("member")) return "/teams";
      if (lower.includes("project") || lower.includes("draft") || lower.includes("submission") || lower.includes("similarity") || lower.includes("response") || lower.includes("recall")) return "/project-management";
      return "/notifications";
    }
  };

  useEffect(() => {
    if (!showNotifications || !isAuthenticated) return;

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net";
    const hubUrl = `${BASE_URL.replace(/\/$/, '')}/hubs/notifications`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .configureLogging(signalR.LogLevel.None)
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveNotification", (n: any) => {
      if (!n) return;
      const isReadVal = n.isRead !== undefined ? n.isRead : (n.IsRead !== undefined ? n.IsRead : false);
      const titleVal = n.title || n.Title || "Notification";
      const messageVal = n.message || n.Message || "";
      const idVal = n.id !== undefined ? n.id : (n.Id !== undefined ? n.Id : Date.now());
      const referenceIdVal = n.referenceId !== undefined ? n.referenceId : (n.ReferenceId !== undefined ? n.ReferenceId : undefined);
      const referenceTypeVal = n.referenceType !== undefined ? n.referenceType : (n.ReferenceType !== undefined ? n.ReferenceType : undefined);

      setNotifications(prev => [
        {
          id: idVal,
          title: titleVal,
          message: messageVal,
          time: "Just now",
          unread: !isReadVal,
          referenceId: referenceIdVal,
          referenceType: referenceTypeVal,
        },
        ...prev,
      ]);

      toast.info(titleVal, {
        description: messageVal,
        action: {
          label: "View",
          onClick: () => {
            const isProf = profileHref.startsWith("/professor");
            const href = getNotificationHref({
              title: titleVal,
              referenceId: referenceIdVal,
              referenceType: referenceTypeVal
            }, isProf, isAdmin);
            router.push(href);
          }
        },
        style: {
          background: "rgba(30, 64, 175, 0.08)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(59, 130, 246, 0.25)",
          borderRadius: "12px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
        },
        classNames: {
          title: "text-blue-600 dark:text-blue-400 font-semibold text-sm",
          description: "text-muted-foreground/90 dark:text-gray-300 text-xs mt-0.5 leading-relaxed",
          actionButton: "!bg-blue-600 hover:!bg-blue-700 !text-white font-medium text-xs px-3 py-1.5 rounded-lg border-0 transition-colors"
        }
      });
    });

    let isMounted = true;

    connection.start()
      .then(() => {
        if (!isMounted) {
          connection.stop();
        } else {
          console.log("SignalR Notifications Connected");
        }
      })
      .catch((err) => {
        if (err && err.message && err.message.includes("stopped during negotiation")) {
          return; // Ignore error from fast unmounting (StrictMode)
        }
        console.error("SignalR Notifications Connection Error: ", err);
      });

    return () => {
      isMounted = false;
      connection.stop();
    };
  }, [showNotifications, profileHref, router, isAuthenticated]);

  return (
    <header className={`fixed top-0 left-0 ${isSidebarCollapsed ? 'md:left-20' : 'md:left-64'} right-0 h-16 bg-background/90 backdrop-blur-md border-b border-border z-40 transition-all duration-300 ease-in-out`}>
      <div className="h-full px-4 md:px-8 flex items-center justify-between">
        {/* Mobile Menu Button & Page Title */}
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <button className="md:hidden p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-xl transition-colors">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-background/80 backdrop-blur-xl border-border/50">
              <SidebarContent variant={isAdmin ? "admin" : (pathname.startsWith("/professor") ? "professor" : "student")} />
            </SheetContent>
          </Sheet>

          <button
            onClick={toggleSidebar}
            className="hidden md:flex p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-xl transition-colors"
          >
            {isSidebarCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          <nav className="flex items-center gap-1.5 text-sm font-medium" aria-label="Breadcrumb">
            {getBreadcrumbs().map((crumb, idx, arr) => {
              const isLast = idx === arr.length - 1;
              return (
                <div key={crumb.href} className="flex items-center gap-1.5 font-semibold">
                  {idx > 0 && <span className="text-muted-foreground/40 text-[10px] select-none font-normal">/</span>}
                  {isLast ? (
                    <span className="text-foreground truncate max-w-[120px] sm:max-w-none">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[100px] sm:max-w-none font-medium"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {shouldShowSearch && (
          <div className="hidden lg:block flex-1 max-w-md mx-8">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search projects, teams, students..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-muted border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:bg-background transition-all duration-300"
              />
            </div>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-3 md:gap-4">
          <ThemeToggle />

          {isAuthenticated ? (
            <>
              {showNotifications && (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="relative p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-xl transition-colors"
                      aria-label="Open notifications"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background animate-pulse" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-96 p-0 border-border/50 bg-background/95 backdrop-blur-xl shadow-xl">
                    <DropdownMenuLabel className="px-4 py-3 border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          Notifications
                        </span>
                        <div className="flex items-center gap-2">
                          <button onClick={markAllAsRead} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Read all</button>
                          <span className="text-muted-foreground/30 text-xs">|</span>
                          <button onClick={clearAllNotifications} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Clear all</button>
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-1">
                            {unreadCount} new
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <div className="py-1 max-h-[300px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                          No new notifications
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <Link
                            key={notification.id}
                            href={getNotificationHref(notification, profileHref.startsWith("/professor"), isAdmin)}
                            className={`block px-4 py-3 hover:bg-accent cursor-pointer transition-colors group relative ${notification.unread ? 'bg-muted/30' : ''}`}
                            onMouseEnter={() => markAsRead(notification.id)}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-2 font-medium">
                                  {notification.time}
                                </p>
                              </div>
                              {notification.unread && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                    <div className="p-2 border-t border-border/50 bg-accent/30">
                      <Link
                        href={notificationsHref}
                        className="flex h-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                      >
                        View all notifications
                      </Link>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl py-2.5 px-4 hover:bg-accent transition-all duration-200 cursor-pointer focus:outline-none">
                    <Avatar className="w-8 h-8 border border-border/50 shadow-sm shrink-0">
                      {profile?.profilePictureUrl && (
                        <AvatarImage src={`${process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net"}${profile.profilePictureUrl}`} className="object-cover" />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {finalInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start text-left ml-1 shrink-0">
                      <span className="text-sm font-semibold text-foreground leading-none">{finalName}</span>
                      <span className="text-xs text-muted-foreground leading-none mt-1">{finalSubtitle}</span>
                    </div>
                    <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-muted-foreground/75 ml-1 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 p-0 pb-3 border border-border/40 bg-background/95 backdrop-blur-xl shadow-xl rounded-2xl overflow-hidden">
                  {/* User Profile Header */}
                  <div className="p-4 flex items-center gap-3 bg-gradient-to-b from-accent/40 to-transparent border-b border-border/40">
                    <Avatar className="w-12 h-12 border-2 border-background shadow-md shrink-0">
                      {profile?.profilePictureUrl && (
                        <AvatarImage src={`${process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net"}${profile.profilePictureUrl}`} className="object-cover" />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                        {finalInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left min-w-0">
                      <span className="text-base font-bold text-foreground leading-tight truncate w-full">{finalName}</span>
                      <span className="text-xs text-muted-foreground leading-tight mt-0.5 truncate w-full">{finalSubtitle}</span>
                      {!isAdmin && (
                        <span className="mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                          {pathname.startsWith("/professor") ? "Professor" : "Student"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-4 pt-3 pb-2">
                    <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest">
                      Account
                    </span>
                  </div>

                  {!isAdmin && (
                    <>
                      <DropdownMenuItem asChild className="cursor-pointer rounded-xl bg-accent/30 hover:bg-accent/60 focus:bg-accent/60 border border-border/20 px-4 py-3 mx-3 transition-all duration-200 text-foreground hover:text-foreground focus:text-foreground">
                        <Link href={finalProfileHref} className="flex items-center w-full">
                          <User className="w-4.5 h-4.5 text-primary shrink-0 mr-3" />
                          <span className="font-semibold text-sm">View Profile</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/60 ml-auto shrink-0" />
                        </Link>
                      </DropdownMenuItem>

                      <div className="my-2 mx-3 border-t border-border/50" />
                    </>
                  )}

                  {isAdmin && (
                    <>
                      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
                        <DialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="cursor-pointer rounded-xl bg-accent/30 hover:bg-accent/60 focus:bg-accent/60 border border-border/20 px-4 py-3 mx-3 transition-all duration-200 text-foreground hover:text-foreground focus:text-foreground"
                          >
                            <div className="flex items-center w-full">
                              <User className="w-4.5 h-4.5 text-primary shrink-0 mr-3" />
                              <span className="font-semibold text-sm">Change Password</span>
                            </div>
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Change Password</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleChangePassword} className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label htmlFor="current-password">Current Password</Label>
                              <Input
                                id="current-password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new-password">New Password</Label>
                              <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirm-password">Confirm New Password</Label>
                              <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                              />
                            </div>
                            <DialogFooter className="pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsChangePasswordOpen(false)}
                                disabled={isChangingPassword}
                              >
                                Cancel
                              </Button>
                              <Button type="submit" disabled={isChangingPassword}>
                                {isChangingPassword ? "Saving..." : "Change Password"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>

                      <div className="my-2 mx-3 border-t border-border/50" />
                    </>
                  )}

                  <DropdownMenuItem
                    onClick={handleLogout}
                    variant="destructive"
                    className="cursor-pointer rounded-xl text-destructive hover:text-destructive focus:text-destructive hover:bg-destructive/10 focus:bg-destructive/10 border border-transparent px-4 py-3 mx-3 transition-all duration-200"
                  >
                    <div className="flex items-center w-full">
                      <LogOut className="w-4.5 h-4.5 shrink-0 mr-3 text-destructive" />
                      <span className="font-semibold text-sm">Sign Out</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-accent"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-primary text-primary-foreground hover:bg-indigo-700 transition-colors px-4 py-2 rounded-lg shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
