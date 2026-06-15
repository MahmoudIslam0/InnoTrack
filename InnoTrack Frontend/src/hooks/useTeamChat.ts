import { useState, useEffect, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { studentApi, ChatMessageDetailDto, ChatMemberDto } from "@/lib/student-api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export interface TeamChatMessage {
  id: string;
  backendId?: number;
  authorId: number;
  author: string;
  initials: string;
  role: string;
  content: string;
  timestamp: string;
  status?: "sending" | "sent" | "error";
  isEdited?: boolean;
  isDeletedForAll?: boolean;
  isPinned?: boolean;
  parentMessageId?: number | null;
  reactions?: { userId: number; emoji: string }[];
  file?: {
    name: string;
    backendFileName: string;
    size: string;
    type: "pdf" | "image" | "document";
  };
}

export interface TeamChatMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  online?: boolean;
}

export function useTeamChat(teamId: number | null, onTeamUpdated?: () => void) {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [members, setMembers] = useState<TeamChatMember[]>([]);
  const [projectTitle, setProjectTitle] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const membersRef = useRef<TeamChatMember[]>([]);

  const fetchTeamData = useCallback(async (isMounted: boolean = true) => {
    try {
      setIsLoading(true);
      const data = await studentApi.getTeamChat();
      if (isMounted) {
        let currentUserId = 0;
        try {
          const u = JSON.parse(localStorage.getItem("user") || "{}");
          currentUserId = u.id || 0;
        } catch (e) { }

        const formattedMembers: TeamChatMember[] = data.members.map(m => {
          const existing = membersRef.current.find(ref => ref.id === m.id.toString());
          const isCurrentUser = m.id === currentUserId;
          return {
            id: m.id.toString(),
            name: m.fullName,
            initials: m.initials,
            role: (m.role as "Professor" | "Student") || "Student",
            online: isCurrentUser ? true : (existing?.online || false),
            lastOnlineAt: m.lastOnlineAt,
            profilePictureUrl: m.profilePictureUrl
          };
        });
        setMembers(formattedMembers);
        membersRef.current = formattedMembers;
        setProjectTitle(data.projectTitle || "");

        const formattedMessages: TeamChatMessage[] = data.messages.map(msg => {
          const member = data.members.find(m => m.id === msg.authorId);
          return {
            id: msg.id.toString(),
            backendId: msg.id,
            authorId: msg.authorId,
            author: msg.authorName,
            initials: member?.initials || msg.authorName.substring(0, 2).toUpperCase(),
            role: (member?.role as "Professor" | "Student") || "Student",
            content: msg.content,
            timestamp: new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: "sent",
            isEdited: msg.isEdited,
            isDeletedForAll: msg.isDeletedForAll,
            isPinned: msg.isPinned,
            parentMessageId: msg.parentMessageId,
            reactions: msg.reactions || [],
            file: msg.attachment ? {
              name: msg.attachment.originalName,
              backendFileName: msg.attachment.fileName,
              size: `${Math.round(msg.attachment.fileSize / 1024)} KB`,
              type: msg.attachment.contentType.includes("image") ? "image" : msg.attachment.contentType.includes("pdf") ? "pdf" : "document",
            } : undefined
          };
        });
        setMessages(formattedMessages);
      }
    } catch (err) {
      console.error("Failed to load chat history", err);
      toast.error("Failed to load chat history");
    } finally {
      if (isMounted) setIsLoading(false);
    }
  }, []);

  // Load initial history
  useEffect(() => {
    let isMounted = true;
    if (teamId) {
      fetchTeamData(isMounted);
    } else {
      setIsLoading(false);
    }

    return () => { isMounted = false; };
  }, [teamId]);

  // Establish SignalR connection
  useEffect(() => {
    if (!teamId) return;

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

    setConnection(newConnection);

    return () => {
      newConnection.stop();
    };
  }, [teamId]);

  // Manage connection lifecycle and events
  useEffect(() => {
    if (!connection) return;

    connection.on("ReceiveMessage", (...args: any[]) => {
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
        status: "sent",
        parentMessageId: data.parentMessageId,
        file: attachment ? {
          name: attachment.originalName || attachment.OriginalName,
          backendFileName: attachment.fileName || attachment.FileName,
          size: `${Math.round((attachment.fileSize || attachment.FileSize || 0) / 1024)} KB`,
          type: (attachment.contentType || attachment.ContentType || "").includes("image") ? "image" : (attachment.contentType || attachment.ContentType || "").includes("pdf") ? "pdf" : "document",
        } : undefined
      };

      setMessages(prev => {
        const duplicateIdx = prev.findIndex(m => m.content === newMsg.content && !m.backendId);
        if (duplicateIdx !== -1) {
          const arr = [...prev];
          arr[duplicateIdx] = { ...arr[duplicateIdx], backendId: newMsg.backendId, timestamp: newMsg.timestamp, status: "sent" };
          return arr;
        }
        if (newMsg.backendId && prev.some(m => m.backendId === newMsg.backendId)) return prev;
        return [...prev, newMsg];
      });
    });

    connection.on("MessageEdited", (messageId: number, newContent: string) => {
      setMessages(prev => prev.map(m => m.backendId === messageId ? { ...m, content: newContent, isEdited: true } : m));
    });

    connection.on("MessageDeleted", (messageId: number) => {
      setMessages(prev => prev.map(m => m.backendId === messageId ? { ...m, isDeletedForAll: true, content: "This message was deleted", isPinned: false } : m));
    });

    connection.on("MessagePinned", (messageId: number) => {
      setMessages(prev => prev.map(m => m.backendId === messageId ? { ...m, isPinned: !m.isPinned } : m));
    });

    connection.on("ReactionAdded", (messageId: number, userId: number, emoji: string) => {
      setMessages(prev => prev.map(m => {
        if (m.backendId === messageId) {
          const reactions = m.reactions ? [...m.reactions] : [];
          const existingIdx = reactions.findIndex(r => r.userId === userId && r.emoji === emoji);
          if (existingIdx >= 0) {
            reactions.splice(existingIdx, 1); // Remove toggle
          } else {
            reactions.push({ userId, emoji });
          }
          return { ...m, reactions };
        }
        return m;
      }));
    });

    let isMounted = true;
    const joinTeamChat = async () => {
      try {
        let currentUserId = 0;
        try {
          const u = JSON.parse(localStorage.getItem("user") || "{}");
          currentUserId = u.id || 0;
        } catch (e) { }

        const onlineUserIds = (await connection.invoke<number[]>("JoinTeamChat", teamId)) || [];

        // Update members with actual online status
        setMembers(prev => prev.map(m => ({
          ...m,
          online: m.id === currentUserId.toString() || onlineUserIds.includes(parseInt(m.id))
        })));
        membersRef.current = membersRef.current.map(m => ({
          ...m,
          online: m.id === currentUserId.toString() || onlineUserIds.includes(parseInt(m.id))
        }));

        if (isMounted) setIsConnected(true);
      } catch (e) {
        console.error("Failed to join team chat room", e);
        toast.error("Failed to connect to live chat");
      }
    };

    if (connection.state === signalR.HubConnectionState.Connected) {
      joinTeamChat();
    } else {
      connection.start().then(() => {
        if (!isMounted) {
          connection.stop();
        } else {
          joinTeamChat();
        }
      }).catch((err) => {
        if (err && err.message && err.message.includes("stopped during negotiation")) {
          return; // Ignore StrictMode fast unmounting
        }
        console.error("SignalR Connection Error: ", err);
        toast.error("Failed to connect to chat server");
      });
    }

    connection.onreconnected(() => {
      joinTeamChat();
    });

    connection.on("UserOnline", (userId: number) => {
      setMembers(prev => prev.map(m => m.id === userId.toString() ? { ...m, online: true } : m));
      membersRef.current = membersRef.current.map(m => m.id === userId.toString() ? { ...m, online: true } : m);
    });

    connection.on("UserOffline", (userId: number) => {
      const now = new Date().toISOString();
      setMembers(prev => prev.map(m => m.id === userId.toString() ? { ...m, online: false, lastOnlineAt: now } : m));
      membersRef.current = membersRef.current.map(m => m.id === userId.toString() ? { ...m, online: false, lastOnlineAt: now } : m);
    });

    connection.on("MemberRemoved", (removedMemberId: number) => {
      let currentUserId = 0;
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        currentUserId = u.id || 0;
      } catch (e) { }

      if (currentUserId === removedMemberId) {
        toast.error("You have been removed from the team.");
        router.push("/dashboard");
      } else {
        setMembers(prev => prev.filter(m => m.id !== removedMemberId.toString()));
        membersRef.current = membersRef.current.filter(m => m.id !== removedMemberId.toString());
        if (onTeamUpdated) onTeamUpdated();
      }
    });

    connection.on("TeamUpdated", () => {
      fetchTeamData(true);
      if (onTeamUpdated) onTeamUpdated();
    });

    connection.on("TeamRenamed", (newName: string) => {
      setProjectTitle(newName);
      if (onTeamUpdated) onTeamUpdated();
    });

    connection.on("TeamDeleted", () => {
      toast.error("The team has been deleted by the leader.");
      router.push("/dashboard");
    });

    connection.onreconnecting(() => setIsConnected(false));

    return () => {
      isMounted = false;
      connection.off("ReceiveMessage");
      connection.off("MessageEdited");
      connection.off("MessageDeleted");
      connection.off("MessagePinned");
      connection.off("ReactionAdded");
      connection.off("UserOnline");
      connection.off("UserOffline");
      connection.off("MemberRemoved");
      connection.off("TeamUpdated");
      connection.off("TeamRenamed");
      connection.off("TeamDeleted");
    };
  }, [connection, teamId, fetchTeamData, router]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Optimistic UI update so the sender sees it instantly
    const currentUserStr = localStorage.getItem("user");
    let authorName = "Me";
    let authorId = 0;
    if (currentUserStr) {
      try {
        const u = JSON.parse(currentUserStr);
        authorName = u.name || "Me";
        authorId = u.id || 0;
      } catch (e) { }
    }

    let userRole = "Member";
    const currentMember = membersRef.current.find(m => m.id === authorId.toString());
    if (currentMember) {
      userRole = currentMember.role;
    }

    const msgId = `msg-${Date.now()}-${Math.random()}`;
    const newMsg: TeamChatMessage = {
      id: msgId,
      authorId,
      author: authorName,
      initials: authorName.substring(0, 2).toUpperCase(),
      role: userRole,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "sending",
    };
    setMessages(prev => [...prev, newMsg]);

    try {
      if (connection && isConnected) {
        await connection.invoke("SendMessage", teamId, content);
      } else {
        // Fallback to REST
        await studentApi.sendChatMessage(content);
      }

      // Artificial delay to let the sending indicator show longer
      await new Promise(resolve => setTimeout(resolve, 800));

      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "sent" } : m));
    } catch (err) {
      console.error("Failed to send message", err);
      toast.error("Failed to send message. Please check your connection.");
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: "error" } : m));
    }
  }, [connection, isConnected, teamId]);

  const editMessage = useCallback(async (messageId: number, newContent: string) => {
    if (!newContent.trim() || !connection || !isConnected) return;
    try {
      await connection.invoke("EditMessage", teamId, messageId, newContent);
    } catch (e) {
      toast.error("Failed to edit message");
    }
  }, [connection, isConnected, teamId]);

  const deleteMessage = useCallback(async (messageId: number, deleteForAll: boolean) => {
    if (!connection || !isConnected) return;
    try {
      if (!deleteForAll) {
        // Optimistically hide for me
        setMessages(prev => prev.filter(m => m.backendId !== messageId));
      }
      await connection.invoke("DeleteMessage", teamId, messageId, deleteForAll);
    } catch (e) {
      toast.error("Failed to delete message");
    }
  }, [connection, isConnected, teamId]);

  const togglePin = useCallback(async (messageId: number) => {
    if (!connection || !isConnected) return;
    try {
      await connection.invoke("TogglePin", teamId, messageId);
    } catch (e) {
      toast.error("Failed to pin message");
    }
  }, [connection, isConnected, teamId]);

  const reactToMessage = useCallback(async (messageId: number, emoji: string) => {
    if (!connection || !isConnected) return;
    try {
      await connection.invoke("ReactToMessage", teamId, messageId, emoji);
    } catch (e) {
      toast.error("Failed to react");
    }
  }, [connection, isConnected, teamId]);

  const replyToMessage = useCallback(async (parentMessageId: number, content: string) => {
    if (!content.trim() || !connection || !isConnected) return;
    try {
      await connection.invoke("ReplyToMessage", teamId, parentMessageId, content);
    } catch (e) {
      toast.error("Failed to reply");
    }
  }, [connection, isConnected, teamId]);

  const uploadFile = useCallback(async (file: File) => {
    if (!teamId) return;
    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
      await studentApi.uploadChatFile(teamId, file);
      toast.success("File uploaded successfully", { id: toastId });
      // The SignalR broadcast will deliver the message via ReceiveMessage handler
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload file", { id: toastId });
    }
  }, [teamId]);

  return {
    messages,
    members,
    projectTitle,
    isConnected,
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
