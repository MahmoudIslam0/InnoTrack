import { useEffect, useState, useRef, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { professorApi } from "@/lib/professor-api";
import { toast } from "sonner";
import { TeamChatMessage, TeamChatMember } from "@/app/_components/TeamChatWorkspace";
import { studentApi } from "@/lib/student-api";
export function useProfessorTeamChat(teamId: number | null) {
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [members, setMembers] = useState<TeamChatMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const membersRef = useRef<TeamChatMember[]>([]);

  const fetchChat = useCallback(async () => {
    if (!teamId) return;
    setIsLoading(true);
    try {
      const data = await professorApi.getTeamChat(teamId);
      const formattedMembers: TeamChatMember[] = (data.members || []).map((m: any) => ({
        id: m.id.toString(),
        name: m.fullName,
        initials: m.initials,
        role: m.role || "Student",
        online: true,
      }));
      setMembers(formattedMembers);
      membersRef.current = formattedMembers;

      const formattedMessages: TeamChatMessage[] = (data.messages || []).map((msg: any) => {
        const member = formattedMembers.find(m => m.id === msg.authorId?.toString());
        return {
          id: msg.id.toString(),
          backendId: msg.id,
          authorId: msg.authorId,
          author: msg.authorName || "Unknown",
          initials: member?.initials || (msg.authorName || "Unknown").substring(0, 2).toUpperCase(),
          role: member?.role || "Student",
          content: msg.content,
          timestamp: new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: "sent",
          isEdited: msg.isEdited,
          isDeletedForAll: msg.isDeletedForAll,
          isPinned: msg.isPinned,
          parentMessageId: msg.parentMessageId,
          reactions: msg.reactions || [],
          file: msg.attachment ? {
            name: msg.attachment.originalName || msg.attachment.OriginalName,
            backendFileName: msg.attachment.fileName || msg.attachment.FileName,
            size: `${Math.round((msg.attachment.fileSize || msg.attachment.FileSize || 0) / 1024)} KB`,
            type: (msg.attachment.contentType || msg.attachment.ContentType || "").includes("image") ? "image" : (msg.attachment.contentType || msg.attachment.ContentType || "").includes("pdf") ? "pdf" : "document",
          } : undefined
        };
      });
      setMessages(formattedMessages);
    } catch (error) {
      console.error("Failed to fetch chat:", error);
      toast.error("Failed to load chat history.");
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchChat();
  }, [fetchChat]);

  useEffect(() => {
    if (!teamId) return;

    let isSubscribed = true;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net";
    const hubUrl = `${BASE_URL.replace(/\/$/, '')}/hubs/chat`;

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => token,
      })
      .configureLogging(signalR.LogLevel.None)
      .withAutomaticReconnect()
      .build();

    connectionRef.current = newConnection;

    newConnection.on("ReceiveMessage", (...args: any[]) => {
      if (!isSubscribed) return;

      let data = args[0];
      if (args.length >= 3 && typeof args[0] === 'number') {
        data = { senderId: args[0], content: args[1], sentAt: args[2] };
      }
      if (!data) return;

      const senderId = data.senderId || data.SenderId;
      const content = data.content || data.Content;
      const sentAt = data.sentAt || data.SentAt || new Date().toISOString();

      const member = membersRef.current.find(m => m.id === senderId?.toString());

      const authorName = member?.name || data.authorName || data.AuthorName || "Unknown";
      const attachment = data.attachment || data.Attachment;

      const newMsg: TeamChatMessage = {
        id: (data.id || `msg-${Date.now()}-${Math.random()}`).toString(),
        backendId: data.id,
        authorId: senderId,
        author: authorName,
        initials: member?.initials || authorName.substring(0, 2).toUpperCase(),
        role: member?.role || "Professor",
        content: content,
        timestamp: new Date(sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isEdited: data.isEdited,
        isDeletedForAll: data.isDeletedForAll,
        isPinned: data.isPinned,
        parentMessageId: data.parentMessageId,
        reactions: data.reactions || [],
        file: attachment ? {
          name: attachment.originalName || attachment.OriginalName,
          backendFileName: attachment.fileName || attachment.FileName,
          size: `${Math.round((attachment.fileSize || attachment.FileSize || 0) / 1024)} KB`,
          type: (attachment.contentType || attachment.ContentType || "").includes("image") ? "image" : (attachment.contentType || attachment.ContentType || "").includes("pdf") ? "pdf" : "document",
        } : undefined
      };

      setMessages((prev) => {
        const duplicateIdx = prev.findIndex(m => m.content === newMsg.content && !m.backendId);
        if (duplicateIdx !== -1) {
          const arr = [...prev];
          arr[duplicateIdx] = { ...arr[duplicateIdx], backendId: newMsg.backendId, timestamp: newMsg.timestamp, status: "sent" };
          return arr;
        }
        if (newMsg.backendId && prev.some((m) => m.backendId === newMsg.backendId)) return prev;
        return [...prev, newMsg];
      });
    });

    newConnection.on("MessageEdited", (messageId: number, newContent: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.backendId === messageId ? { ...m, content: newContent, isEdited: true } : m))
      );
    });

    newConnection.on("MessageDeleted", (messageId: number) => {
      setMessages((prev) =>
        prev.map((m) => (m.backendId === messageId ? { ...m, isDeletedForAll: true, content: "This message was deleted", isPinned: false } : m))
      );
    });

    newConnection.on("MessagePinned", (messageId: number) => {
      setMessages((prev) => prev.map((m) => (m.backendId === messageId ? { ...m, isPinned: !m.isPinned } : m)));
    });

    newConnection.on("ReactionAdded", (messageId: number, userId: number, emoji: string) => {
      setMessages(prev => prev.map(m => {
        if (m.backendId === messageId) {
          const reactions = m.reactions ? [...m.reactions] : [];
          const existingIdx = reactions.findIndex(r => r.userId === userId && r.emoji === emoji);
          if (existingIdx >= 0) {
            reactions.splice(existingIdx, 1);
          } else {
            reactions.push({ userId, emoji });
          }
          return { ...m, reactions };
        }
        return m;
      }));
    });

    newConnection.on("UserOnline", (userId: number) => {
      setMembers(prev => prev.map(m => m.id === userId.toString() ? { ...m, online: true } : m));
    });

    newConnection.on("UserOffline", (userId: number) => {
      setMembers(prev => prev.map(m => m.id === userId.toString() ? { ...m, online: false } : m));
    });

    const startConnection = async () => {
      try {
        await newConnection.start();
        if (teamId) {
          const onlineUserIds = (await newConnection.invoke<number[]>("JoinTeamChat", teamId)) || [];
          setMembers(prev => prev.map(m => ({
            ...m,
            online: onlineUserIds.includes(parseInt(m.id))
          })));
        }
      } catch (err: any) {
        if (err && err.message && err.message.includes("stopped during negotiation")) {
          return; // Ignore fast unmount error
        }
        console.error("SignalR Connection Error:", err);
      }
    };

    startConnection();

    newConnection.onreconnected(async () => {
      if (teamId) {
        try {
          const onlineUserIds = (await newConnection.invoke<number[]>("JoinTeamChat", teamId)) || [];
          setMembers(prev => prev.map(m => ({
            ...m,
            online: onlineUserIds.includes(parseInt(m.id))
          })));
        } catch (e) {
          console.error("Failed to rejoin group after reconnect", e);
        }
      }
    });

    return () => {
      isSubscribed = false;
      newConnection.stop();
    };
  }, [teamId]);

  const sendMessage = async (content: string) => {
    if (!teamId || !content.trim()) return;

    // Optimistic UI update
    const userStr = localStorage.getItem("user");
    let authorName = "Professor";
    let authorId = 0;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        authorName = u.name || "Professor";
        authorId = u.id || 0;
      } catch (e) { }
    }

    const currentMember = membersRef.current.find((m) => m.id === authorId.toString());
    const initials = currentMember?.initials || authorName.substring(0, 2).toUpperCase();

    const tempId = `msg-${Date.now()}-${Math.random()}`;
    const optimisticMsg: TeamChatMessage = {
      id: tempId,
      authorId,
      author: authorName,
      initials,
      role: "Professor",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sending",
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const data = await professorApi.sendChatMessage(teamId, content);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, backendId: data.id, status: "sent" } : m))
      );
    } catch (error) {
      console.error("Send message error:", error);
      toast.error("Failed to send message.");
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "error" } : m)));
    }
  };

  const editMessage = async (messageId: number, newContent: string) => {
    if (!newContent.trim() || !connectionRef.current) return;
    try {
      await connectionRef.current.invoke("EditMessage", teamId, messageId, newContent);
    } catch (e) {
      toast.error("Failed to edit message");
    }
  };

  const deleteMessage = async (messageId: number, deleteForAll: boolean) => {
    if (!connectionRef.current) return;
    try {
      if (!deleteForAll) {
        setMessages((prev) => prev.filter((m) => m.backendId !== messageId));
      }
      await connectionRef.current.invoke("DeleteMessage", teamId, messageId, deleteForAll);
    } catch (e) {
      toast.error("Failed to delete message");
    }
  };

  const togglePin = async (messageId: number) => {
    if (!connectionRef.current) return;
    try {
      await connectionRef.current.invoke("TogglePin", teamId, messageId);
    } catch (e) {
      toast.error("Failed to pin message");
    }
  };

  const reactToMessage = async (messageId: number, emoji: string) => {
    if (!connectionRef.current) return;
    try {
      await connectionRef.current.invoke("ReactToMessage", teamId, messageId, emoji);
    } catch (e) {
      toast.error("Failed to react");
    }
  };

  const replyToMessage = async (parentMessageId: number, content: string) => {
    if (!content.trim() || !connectionRef.current) return;
    try {
      await connectionRef.current.invoke("ReplyToMessage", teamId, parentMessageId, content);
    } catch (e) {
      toast.error("Failed to reply");
    }
  };

  const uploadFile = async (file: File) => {
    if (!teamId) return;
    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
      await studentApi.uploadChatFile(teamId, file);
      toast.success("File uploaded successfully", { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload file", { id: toastId });
    }
  };

  return {
    messages,
    members,
    isLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    togglePin,
    reactToMessage,
    replyToMessage,
    uploadFile,
  };
}
