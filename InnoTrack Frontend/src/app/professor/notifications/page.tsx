"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle2, MessageSquare, UserPlus, FileText, AlertTriangle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NotificationList } from "@/app/_components/DashboardUI";
import { PageHeader, SectionCard } from "../_components";
import { api } from "@/lib/api";

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

function getIconForType(type: string) {
  switch (type?.toLowerCase()) {
    case 'success': return CheckCircle2;
    case 'error': return AlertTriangle;
    case 'warning': return FileText;
    default: return Bell;
  }
}

function getToneForType(type: string) {
  switch (type?.toLowerCase()) {
    case 'success': return 'success';
    case 'error': return 'error';
    case 'warning': return 'warning';
    default: return 'info';
  }
}

export default function ProfessorNotifications() {
  const [items, setItems] = useState<any[]>([]);

  const fetchNotifications = () => {
    api.notifications.getAll()
      .then((data) => {
        setItems(data.map((n: any) => ({
          id: String(n.id),
          title: n.title,
          message: n.message,
          timestamp: timeAgo(n.createdAt),
          icon: getIconForType(n.type),
          tone: getToneForType(n.type),
          type: n.type,
          unread: !n.isRead,
          referenceId: n.referenceId,
          referenceType: n.referenceType,
        })));
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchNotifications();
    window.addEventListener("notificationsUpdated", fetchNotifications);
    return () => window.removeEventListener("notificationsUpdated", fetchNotifications);
  }, []);

  const markAllRead = async () => {
    setItems((currentItems) =>
      currentItems.map((item) => ({ ...item, unread: false })),
    );
    try {
      await api.notifications.markAllAsRead();
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (err) {
      console.error(err);
    }
  };

  const clearAllNotifications = async () => {
    setItems([]);
    try {
      await api.notifications.clearAll();
      window.dispatchEvent(new Event("notificationsUpdated"));
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (item && item.unread) {
      setItems((currentItems) =>
        currentItems.map((i) =>
          i.id === id ? { ...i, unread: false } : i
        )
      );
      try {
        await api.notifications.markAsRead(id);
        window.dispatchEvent(new Event("notificationsUpdated"));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getNotificationHref = (notification: any) => {
    const title = notification.title || "";
    const lower = title.toLowerCase();

    if (notification.referenceId) {
      const refType = notification.referenceType;
      const refId = notification.referenceId;
      
      const isProject = refType === 1 || refType === "Project";
      const isTeam = refType === 2 || refType === "TeamRequest";

      if (isProject) {
          if (lower.includes("abandon") || lower.includes("recall")) return "/professor/projects";
          return `/professor/projects/${refId}`;
      }
      if (isTeam) {
          if (lower.includes("left") || lower.includes("remove")) return "/professor/teams";
          return `/professor/teams/${refId}`;
      }
    }

    if (lower.includes("proposal") || lower.includes("abandon") || lower.includes("project") || lower.includes("recall")) return "/professor/projects";
    if (lower.includes("team") || lower.includes("join") || lower.includes("left") || lower.includes("member")) return "/professor/teams";
    if (lower.includes("feedback")) return "/professor/feedback";
    return "/professor/notifications";
  };

  return (
    <div className="dashboard-page">
      <PageHeader
        title="Notifications"
        description="Track project updates, join requests, feedback alerts, and read history."
      />

      <SectionCard
        title="System Notifications"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-primary text-primary hover:bg-primary/5"
              onClick={markAllRead}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/5"
              onClick={clearAllNotifications}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        }
      >
        <div className="-m-6">
          <NotificationList
            items={items.map((notification) => ({
              ...notification,
              href: getNotificationHref(notification),
            }))}
            onRead={markAsRead}
          />
        </div>
      </SectionCard>
    </div>
  );
}
