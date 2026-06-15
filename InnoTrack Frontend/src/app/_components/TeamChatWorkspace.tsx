"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from 'next/dynamic';
import { 
  Download, FileText, ChevronDown, Check, AlertCircle, Edit2, Copy, Pin, Reply, Trash2, Smile, ImageIcon, Paperclip, Send, ChevronRight, Clock, MoreHorizontal, X, Loader2
} from "lucide-react";
import { studentApi } from "@/lib/student-api";
import { Theme } from 'emoji-picker-react';
import { motion, AnimatePresence } from "framer-motion";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Sparkles, Lightbulb, PenTool, LayoutTemplate } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false, loading: () => <div className="w-[350px] h-[400px] flex items-center justify-center bg-card rounded-2xl border"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div> });

export interface TeamChatMessage {
  id: string;
  backendId?: number;
  authorId: number;
  author: string;
  initials: string;
  role: "Professor" | "Student" | string;
  content?: string;
  timestamp: string;
  status?: "sending" | "sent" | "error";
  file?: {
    name: string;
    backendFileName: string;
    size: string;
    type: "pdf" | "image" | "document";
  };
  isEdited?: boolean;
  isDeletedForAll?: boolean;
  isPinned?: boolean;
  parentMessageId?: number | null;
  reactions?: { userId: number; emoji: string }[];
}

export interface TeamChatMember {
  id: string;
  name: string;
  initials: string;
  role: "Professor" | "Student" | string;
  online?: boolean;
  lastOnlineAt?: string | null;
  profilePictureUrl?: string | null;
}

export function TeamChatWorkspace({
  title,
  subtitle,
  members = [],
  messages = [],
  currentUserName,
  currentUserRole,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onTogglePin,
  onReactToMessage,
  onReplyToMessage,
  onUploadFile,
  isLoading = false,
  className,
}: {
  title: string;
  subtitle: string;
  members: TeamChatMember[];
  messages: TeamChatMessage[];
  currentUserName: string;
  currentUserRole: "Professor" | "Student" | string;
  onSendMessage?: (content: string) => void;
  onEditMessage?: (messageId: number, newContent: string) => void;
  onDeleteMessage?: (messageId: number, deleteForAll: boolean) => void;
  onTogglePin?: (messageId: number) => void;
  onReactToMessage?: (messageId: number, emoji: string) => void;
  onReplyToMessage?: (parentMessageId: number, content: string) => void;
  onUploadFile?: (file: File) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}) {
  const [draftMessage, setDraftMessage] = useState("");
  const [isSharedFilesOpen, setIsSharedFilesOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<TeamChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<TeamChatMessage | null>(null);
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState<number | null>(null);
  const [isAsideOpen, setIsAsideOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  // Compute last message timestamp per member
  const lastActivityByMember = useMemo(() => {
    const map: Record<string, string> = {};
    for (const msg of messages) {
      if (!msg.isDeletedForAll && msg.timestamp) {
        map[msg.author] = msg.timestamp;
      }
    }
    return map;
  }, [messages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadFile) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File is too large! Maximum allowed size is 25MB.");
      e.target.value = "";
      return;
    }

    // Reset so same file can be re-selected
    e.target.value = "";
    setIsUploading(true);
    try {
      await onUploadFile(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadFile = async (backendFileName: string, originalName: string) => {
    if (!backendFileName) return;
    try {
      toast.info(`Downloading ${originalName}...`);
      const blob = await studentApi.downloadChatFile(backendFileName);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download file:", err);
      toast.error("Failed to download file");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      queueMicrotask(() => {
        const abandonmentInfo = localStorage.getItem("projectAbandonment");
        if (abandonmentInfo) {
          try {
            toast.error("Project has been abandoned by the team!");
            localStorage.removeItem("projectAbandonment");
          } catch (e) {
            console.error(e);
          }
        }
        const removedMembers = JSON.parse(localStorage.getItem("removedTeamMembers") || "[]");
        if (removedMembers.length > 0) {
          localStorage.removeItem("removedTeamMembers");
          toast.info(`${removedMembers.length} member(s) removed from team chat`);
        }
      });
    }
  }, []);

  const sendMessage = () => {
    const content = draftMessage.trim();
    if (!content) return;

    if (editingMessage) {
      if (onEditMessage && editingMessage.backendId) {
        onEditMessage(editingMessage.backendId, content);
      }
      setEditingMessage(null);
    } else if (replyingTo) {
      if (onReplyToMessage && replyingTo.backendId) {
        onReplyToMessage(replyingTo.backendId, content);
      }
      setReplyingTo(null);
    } else {
      if (onSendMessage) {
        onSendMessage(content);
      }
    }
    setDraftMessage("");
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Message copied!");
  };

  const pinnedMessages = messages.filter(m => m.isPinned);

  return (
    <section 
      id="chat-workspace-container"
      className={cn("dashboard-surface flex h-[calc(100vh-148px)] flex-col overflow-hidden bg-background/50", className)}
    >
      <div className="bg-card/40 backdrop-blur-xl border-b border-border/50 px-5 py-3 flex items-center justify-between z-10 shadow-sm">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1 font-medium">{subtitle}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsAsideOpen(!isAsideOpen)}
          className="hidden lg:flex items-center gap-2"
        >
          <span className="text-muted-foreground">{isAsideOpen ? "Hide" : "Show"} Members</span>
          <ChevronRight className={cn("w-4 h-4 transition-transform", isAsideOpen ? "rotate-0" : "rotate-180")} />
        </Button>
      </div>

      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        <div className="flex flex-1 min-w-0 flex-col border-r border-border/50 relative bg-gradient-to-b from-transparent to-muted/10">
          
          <AnimatePresence>
            {pinnedMessages.length > 0 && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div 
                  className="bg-primary/10 backdrop-blur-md border-b border-primary/20 px-3 py-2 text-xs flex items-center gap-2 shadow-sm cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => {
                    const targetId = `message-${pinnedMessages[pinnedMessages.length - 1].backendId}`;
                    const el = document.getElementById(targetId);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.style.backgroundColor = 'rgba(99, 102, 241, 0.15)';
                      el.style.borderRadius = '1rem';
                      el.style.transition = 'background-color 0.5s ease';
                      setTimeout(() => {
                        el.style.backgroundColor = 'transparent';
                      }, 2000);
                    }
                  }}
                >
                  <div className="p-1.5 bg-primary/20 rounded-full text-primary">
                    <Pin className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 truncate">
                    <span className="font-semibold text-primary dark:text-primary mr-2">Pinned</span>
                    <span className="text-foreground/90">{pinnedMessages[pinnedMessages.length - 1].content}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 min-h-0 space-y-1 overflow-y-auto p-3 scroll-smooth" onClick={() => setShowEmojiPickerFor(null)}>
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-primary/70">
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-70">
                <div className="bg-muted/50 p-4 rounded-full mb-3">
                  <Send className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium">No messages yet.</p>
                <p className="text-xs">Send a message to start the conversation!</p>
              </div>
            ) : (
            <AnimatePresence initial={false}>
              {messages.map((message) => {
                const isOwnMessage = message.author === currentUserName;
                const parentMsg = message.parentMessageId ? messages.find(m => m.backendId === message.parentMessageId) : null;
                const quickEmojis = ["👍", "❤️", "😂", "😮", "😢"];
                const authorMember = members.find(m => m.id === message.authorId?.toString() || m.name === message.author);

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    layout="position"
                    key={message.id} 
                    id={`message-${message.backendId}`}
                    className={`flex items-end gap-3 group p-1 ${isOwnMessage ? "justify-end" : ""}`}
                  >
                    {!isOwnMessage && (
                      <Avatar className="h-8 w-8 shrink-0 shadow-sm border border-border/50 mb-1">
                        {authorMember?.profilePictureUrl && (
                          <AvatarImage src={`${process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net"}${authorMember.profilePictureUrl}`} alt={message.author} className="object-cover" />
                        )}
                        <AvatarFallback className="bg-muted/80 text-foreground font-semibold text-xs">
                          {message.initials}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className={`flex max-w-[85%] lg:max-w-[75%] flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
                      {message.isPinned && (
                        <div className={`flex items-center gap-1 mb-1 px-2 text-[11px] font-semibold ${isOwnMessage ? 'text-primary' : 'text-muted-foreground'}`}>
                          <Pin className="w-3 h-3" fill="currentColor" /> Pinned
                        </div>
                      )}
                      
                      <div className={`relative group/message flex items-center gap-2 w-full ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                        
                        {/* Actions for Own Message (Left side of bubble) */}
                        {isOwnMessage && message.backendId && (
                          <div className="opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center gap-1 shrink-0 relative z-20">
                             <div className="flex items-center px-1 bg-card/80 backdrop-blur-md border border-border/50 rounded-full shadow-sm">
                               {quickEmojis.slice(0, 3).map(e => (
                                 <motion.button 
                                   whileHover={{ scale: 1.2, y: -2 }} 
                                   key={e} 
                                   className="h-7 w-7 text-sm flex items-center justify-center hover:bg-muted/50 rounded-full transition-colors" 
                                   onClick={() => onReactToMessage?.(message.backendId!, e)}
                                 >
                                   {e}
                                 </motion.button>
                               ))}
                               <div className="w-[1px] h-3 bg-border/50 mx-0.5"></div>
                               <button className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:bg-muted/50 rounded-full transition-colors" onClick={(e) => { e.stopPropagation(); setShowEmojiPickerFor(message.backendId!); }}>
                                 <Smile className="w-3.5 h-3.5" />
                               </button>
                             </div>
                             
                             <AnimatePresence>
                               {showEmojiPickerFor === message.backendId && (
                                 <motion.div 
                                   initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                   animate={{ opacity: 1, scale: 1, y: 0 }}
                                   exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                   className="absolute top-10 right-0 z-50 shadow-2xl rounded-2xl border border-border/50 overflow-hidden" 
                                   onClick={e => e.stopPropagation()}
                                 >
                                   <EmojiPicker theme={Theme.AUTO} onEmojiClick={(e) => { onReactToMessage?.(message.backendId!, e.emoji); setShowEmojiPickerFor(null); }} />
                                 </motion.div>
                               )}
                             </AnimatePresence>
                          </div>
                        )}

                        <div className="flex flex-col relative z-10 max-w-full">                          {message.file && !message.isDeletedForAll ? (
                            <div className={`relative flex flex-col min-w-[280px] p-2 border shadow-sm backdrop-blur-md transition-all rounded-2xl
                              ${isOwnMessage ? "bg-primary border-primary/20 text-white rounded-br-sm" : "bg-card border-border/50 text-foreground rounded-bl-sm"}
                            `}>
                                {parentMsg && (
                                  <div 
                                    onClick={() => {
                                      const el = document.getElementById(`message-${parentMsg.backendId}`);
                                      if (el) {
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        el.classList.add('ring-2', 'ring-primary/50', 'bg-muted/30', 'rounded-xl', 'transition-all', 'duration-500');
                                        setTimeout(() => el.classList.remove('ring-2', 'ring-primary/50', 'bg-muted/30'), 1500);
                                      }
                                    }}
                                    className={`cursor-pointer text-xs px-3 py-2 rounded-r-xl rounded-l-[3px] mb-2 border-l-4 transition-all opacity-90 hover:opacity-100 ${isOwnMessage ? 'bg-black/15 border-primary/40' : 'bg-black/5 dark:bg-white/5 border-emerald-500'}`}
                                  >
                                    <div className={`font-bold mb-0.5 ${isOwnMessage ? 'text-white/80' : 'text-emerald-600 dark:text-emerald-400'}`}>{parentMsg.author}</div>
                                    <div className="truncate opacity-80">{parentMsg.isDeletedForAll ? "This message was deleted" : parentMsg.content}</div>
                                  </div>
                                )}
                                <div className="flex items-center gap-3 px-2 pb-2">
                                  <div className={`rounded-xl border p-3 ${isOwnMessage ? "border-primary/30 bg-white/10 text-white" : "border-border/50 bg-muted/50 text-muted-foreground"}`}>
                                  {message.file.type === "image" ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium">{message.file.name}</p>
                                  <div className={`flex items-center gap-2 text-[11px] font-medium mt-0.5 ${isOwnMessage ? 'text-white/70' : 'text-muted-foreground'}`}>
                                    <span>{message.file.size}</span>
                                    <span className="opacity-50">•</span>
                                    <span>{message.timestamp}</span>
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(message.file!.backendFileName, message.file!.name)} className={`rounded-xl ${isOwnMessage ? "text-white hover:bg-white/20" : "text-muted-foreground hover:bg-muted/80"}`}>
                                  <Download className="h-4 w-4" />
                                </Button>
                                </div>
                                {message.backendId && (
                                  <div className="absolute top-2 right-2">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className={`p-1 rounded-full transition-colors opacity-0 group-hover/message:opacity-100 focus:opacity-100 ${isOwnMessage ? 'hover:bg-black/20 text-white' : 'hover:bg-muted text-muted-foreground'}`}>
                                          <ChevronDown className="w-4 h-4" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align={isOwnMessage ? "end" : "start"} className="w-52 p-2 rounded-2xl shadow-2xl border-border/40 bg-card/95 backdrop-blur-xl ring-1 ring-black/5">
                                        <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium transition-colors hover:bg-muted focus:bg-muted" onClick={() => onTogglePin?.(message.backendId!)}>
                                          <Pin className="w-4 h-4 mr-3 opacity-70" /> {message.isPinned ? "Unpin Message" : "Pin Message"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium transition-colors hover:bg-muted focus:bg-muted" onClick={() => { setReplyingTo(message); inputRef.current?.focus(); }}>
                                          <Reply className="w-4 h-4 mr-3 opacity-70" /> Reply to Message
                                        </DropdownMenuItem>
                                        {isOwnMessage && <DropdownMenuSeparator className="bg-border/40 my-1.5" />}
                                        {isOwnMessage && (
                                          <>
                                            <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-red-500 focus:text-red-600 hover:bg-red-500/10 focus:bg-red-500/10 transition-colors" onClick={() => onDeleteMessage?.(message.backendId!, false)}>
                                              <Trash2 className="w-4 h-4 mr-3 opacity-80" /> Delete for me
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-red-500 focus:text-red-600 hover:bg-red-500/10 focus:bg-red-500/10 transition-colors" onClick={() => onDeleteMessage?.(message.backendId!, true)}>
                                              <Trash2 className="w-4 h-4 mr-3 opacity-80" /> Delete for everyone
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                            </div>
                          ) : (
                            <div className={`relative px-4 py-2.5 text-[15px] leading-relaxed shadow-sm transition-all max-w-full rounded-2xl
                              ${message.isDeletedForAll ? "italic text-muted-foreground bg-muted/30 border border-border/30" : 
                              isOwnMessage ? "bg-primary text-primary-foreground border border-primary/20 shadow-primary/10 rounded-br-sm" : "bg-card border border-border/50 text-foreground rounded-bl-sm"}
                            `}>
                              
                              {parentMsg && (
                                <div 
                                  onClick={() => {
                                    const el = document.getElementById(`message-${parentMsg.backendId}`);
                                    if (el) {
                                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      el.classList.add('ring-2', 'ring-primary/50', 'bg-muted/30', 'rounded-xl', 'transition-all', 'duration-500');
                                      setTimeout(() => el.classList.remove('ring-2', 'ring-primary/50', 'bg-muted/30'), 1500);
                                    }
                                  }}
                                  className={`cursor-pointer text-xs px-3 py-2 rounded-r-xl rounded-l-[3px] mb-1.5 border-l-4 transition-all opacity-90 hover:opacity-100 ${isOwnMessage ? 'bg-black/15 border-primary/40' : 'bg-black/5 dark:bg-white/5 border-emerald-500'}`}
                                >
                                  <div className={`font-bold mb-0.5 ${isOwnMessage ? 'text-white/80' : 'text-emerald-600 dark:text-emerald-400'}`}>{parentMsg.author}</div>
                                  <div className="truncate opacity-80">{parentMsg.isDeletedForAll ? "This message was deleted" : parentMsg.content}</div>
                                </div>
                              )}


                              {!isOwnMessage && !message.isDeletedForAll && (
                                <div className="flex items-center gap-2 mb-1 pr-2">
                                  <span className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">{message.author}</span>
                                  {message.role && (
                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none px-1 py-0 rounded-[4px] text-[9px] uppercase font-bold tracking-wider">
                                      {message.role === 'Professor' ? 'Prof' : message.role}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              <div className="flex flex-wrap items-end gap-x-2 gap-y-1 w-full">
                                <div className="break-words overflow-hidden w-full [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&_strong]:font-bold [&_em]:italic [&_code]:bg-black/10 [&_code]:dark:bg-white/10 [&_code]:px-1 [&_code]:rounded-md [&_pre]:bg-black/10 [&_pre]:dark:bg-white/10 [&_pre]:p-2 [&_pre]:rounded-md [&_a]:text-blue-500 [&_a]:underline">
                                  {message.isDeletedForAll ? (
                                    <span className="italic">This message was deleted</span>
                                  ) : message.author.includes("Graduation Project Assistant") && message.content?.includes("Here's how to get started") ? (
                                    <div className="flex flex-col space-y-4 pt-1">
                                      <div className="flex items-center gap-2 text-primary font-medium mb-1">
                                        <Sparkles className="w-4 h-4" />
                                        <p>Here's how I can help you:</p>
                                      </div>
                                      <div className="grid gap-2">
                                        <button 
                                          onClick={() => { setDraftMessage("idea"); setTimeout(sendMessage, 50); }}
                                          className="flex items-center gap-3 p-3 text-left rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group"
                                        >
                                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary group-hover:scale-110 transition-transform">
                                            <Lightbulb className="w-4 h-4" />
                                          </div>
                                          <div>
                                            <span className="font-semibold block text-sm text-foreground">Generate project ideas by domain</span>
                                            <span className="text-xs text-muted-foreground">Discover exciting topics for your graduation project</span>
                                          </div>
                                        </button>
                                        <button 
                                          onClick={() => { setDraftMessage("My project title is "); inputRef.current?.focus(); }}
                                          className="flex items-center gap-3 p-3 text-left rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group"
                                        >
                                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary group-hover:scale-110 transition-transform">
                                            <LayoutTemplate className="w-4 h-4" />
                                          </div>
                                          <div>
                                            <span className="font-semibold block text-sm text-foreground">Generate smart features</span>
                                            <span className="text-xs text-muted-foreground">Get feature suggestions based on your title</span>
                                          </div>
                                        </button>
                                        <button 
                                          onClick={() => { setDraftMessage("generate full project"); setTimeout(sendMessage, 50); }}
                                          className="flex items-center gap-3 p-3 text-left rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group"
                                        >
                                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary group-hover:scale-110 transition-transform">
                                            <PenTool className="w-4 h-4" />
                                          </div>
                                          <div>
                                            <span className="font-semibold block text-sm text-foreground">Generate complete specification</span>
                                            <span className="text-xs text-muted-foreground">Create a full PRD for your chosen idea</span>
                                          </div>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {message.content || ""}
                                    </ReactMarkdown>
                                  )}
                                </div>
                                
                                <div className={`flex items-center gap-1 shrink-0 ml-auto text-[10px] pb-0.5 ${isOwnMessage ? 'text-white/70' : 'text-muted-foreground/70'}`}>
                                  {message.isEdited && !message.isDeletedForAll && <span className="mr-1 italic opacity-80">edited</span>}
                                  <span>{message.timestamp}</span>
                                  {isOwnMessage && message.status === "sending" && <Check className="w-3.5 h-3.5 text-white/50" />}
                                  {isOwnMessage && message.status === "sent" && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                  {isOwnMessage && message.status === "error" && <AlertCircle className="w-3.5 h-3.5 text-red-300" />}
                                  
                                  {/* ChevronDown inside the bubble */}
                                  {message.backendId && (
                                    <div className="ml-0.5 w-4 h-4 flex items-center justify-center">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button className={`p-0.5 rounded-full transition-colors opacity-0 group-hover/message:opacity-100 focus:opacity-100 ${isOwnMessage ? 'hover:bg-black/20 text-white' : 'hover:bg-muted text-muted-foreground'}`}>
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align={isOwnMessage ? "end" : "start"} className="w-52 p-2 rounded-2xl shadow-2xl border-border/40 bg-card/95 backdrop-blur-xl ring-1 ring-black/5">
                                          {!message.isDeletedForAll && (
                                            <>
                                              {isOwnMessage && (
                                                <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium transition-colors hover:bg-muted focus:bg-muted" onClick={() => { setEditingMessage(message); setDraftMessage(message.content || ""); inputRef.current?.focus(); }}>
                                                  <Edit2 className="w-4 h-4 mr-3 opacity-70" /> Edit Message
                                                </DropdownMenuItem>
                                              )}
                                              <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium transition-colors hover:bg-muted focus:bg-muted" onClick={() => handleCopy(message.content || "")}>
                                                <Copy className="w-4 h-4 mr-3 opacity-70" /> Copy Text
                                              </DropdownMenuItem>
                                              <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium transition-colors hover:bg-muted focus:bg-muted" onClick={() => onTogglePin?.(message.backendId!)}>
                                                <Pin className="w-4 h-4 mr-3 opacity-70" /> {message.isPinned ? "Unpin Message" : "Pin Message"}
                                              </DropdownMenuItem>
                                              <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium transition-colors hover:bg-muted focus:bg-muted" onClick={() => { setReplyingTo(message); inputRef.current?.focus(); }}>
                                                <Reply className="w-4 h-4 mr-3 opacity-70" /> Reply to Message
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator className="bg-border/40 my-1.5" />
                                            </>
                                          )}
                                          <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-red-500 focus:text-red-600 hover:bg-red-500/10 focus:bg-red-500/10 transition-colors" onClick={() => onDeleteMessage?.(message.backendId!, false)}>
                                            <Trash2 className="w-4 h-4 mr-3 opacity-80" /> Delete for me
                                          </DropdownMenuItem>
                                          {isOwnMessage && !message.isDeletedForAll && (
                                            <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-red-500 focus:text-red-600 hover:bg-red-500/10 focus:bg-red-500/10 transition-colors" onClick={() => onDeleteMessage?.(message.backendId!, true)}>
                                              <Trash2 className="w-4 h-4 mr-3 opacity-80" /> Delete for everyone
                                            </DropdownMenuItem>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Reactions */}
                          {!message.isDeletedForAll && message.reactions && message.reactions.length > 0 && (
                            <div className={`flex flex-wrap gap-1.5 mt-2 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                              {(() => {
                                const totalCount = message.reactions!.length;
                                const uniqueEmojis = Array.from(new Set(message.reactions!.map(r => r.emoji)));
                                
                                return (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <motion.button 
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="text-[13px] bg-card/80 backdrop-blur-md shadow-sm hover:shadow border border-border/50 rounded-full px-2.5 py-1 flex items-center gap-1.5 transition-shadow transition-colors"
                                      >
                                        <div className="flex -space-x-0.5">
                                          {uniqueEmojis.slice(0, 3).map(emoji => (
                                            <span key={emoji} className="z-10 text-[12px]">{emoji}</span>
                                          ))}
                                        </div>
                                        <span className="font-semibold text-foreground/80 text-[11px] ml-0.5">{totalCount}</span>
                                      </motion.button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden gap-0 border-border/40 bg-card/95 backdrop-blur-xl">
                                      <div className="p-4 border-b bg-muted/20">
                                        <DialogTitle className="text-base font-semibold">Message Reactions</DialogTitle>
                                      </div>
                                      <Tabs defaultValue="all" className="w-full">
                                        <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden h-auto bg-transparent gap-0 border-b rounded-none p-0 px-2 scrollbar-none">
                                          <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 font-medium transition-colors">
                                            All <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{totalCount}</span>
                                          </TabsTrigger>
                                          {uniqueEmojis.map(emoji => {
                                            const count = message.reactions!.filter(r => r.emoji === emoji).length;
                                            return (
                                              <TabsTrigger key={emoji} value={emoji} className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 font-medium transition-colors">
                                                {emoji} <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{count}</span>
                                              </TabsTrigger>
                                            );
                                          })}
                                        </TabsList>
                                        
                                        <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
                                          <TabsContent value="all" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                                            <div className="flex flex-col">
                                              {message.reactions!.map((r, i) => {
                                                const member = members.find(m => m.id === r.userId.toString());
                                                return (
                                                  <div key={i} className="flex items-center justify-between group p-2 hover:bg-muted/50 rounded-xl transition-colors">
                                                    <div className="flex items-center gap-3">
                                                      <Avatar className="w-9 h-9 border border-border/40 shadow-sm">
                                                        <AvatarFallback className="text-[10px] font-semibold bg-primary/5 text-primary">
                                                          {member?.initials || "U"}
                                                        </AvatarFallback>
                                                      </Avatar>
                                                      <span className="text-[14px] font-medium text-foreground/90">{member?.name || "Unknown User"}</span>
                                                    </div>
                                                    <span className="text-[18px] mr-2">{r.emoji}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </TabsContent>
                                          {uniqueEmojis.map(emoji => (
                                            <TabsContent key={emoji} value={emoji} className="m-0 focus-visible:outline-none focus-visible:ring-0">
                                              <div className="flex flex-col">
                                                {message.reactions!.filter(r => r.emoji === emoji).map((r, i) => {
                                                  const member = members.find(m => m.id === r.userId.toString());
                                                  return (
                                                    <div key={i} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-xl transition-colors">
                                                      <Avatar className="w-9 h-9 border border-border/40 shadow-sm">
                                                        <AvatarFallback className="text-[10px] font-semibold bg-primary/5 text-primary">
                                                          {member?.initials || "U"}
                                                        </AvatarFallback>
                                                      </Avatar>
                                                      <span className="text-[14px] font-medium text-foreground/90">{member?.name || "Unknown User"}</span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </TabsContent>
                                          ))}
                                        </div>
                                      </Tabs>
                                    </DialogContent>
                                  </Dialog>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Actions for Others (Right side of bubble) */}
                        {!isOwnMessage && message.backendId && (
                           <div className="opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center gap-1 shrink-0 relative z-20">
                             <div className="flex items-center px-1 bg-card/80 backdrop-blur-md border border-border/50 rounded-full shadow-sm">
                               {quickEmojis.slice(0, 3).map(e => (
                                 <motion.button 
                                   whileHover={{ scale: 1.2, y: -2 }} 
                                   key={e} 
                                   className="h-7 w-7 text-sm flex items-center justify-center hover:bg-muted/50 rounded-full transition-colors" 
                                   onClick={() => onReactToMessage?.(message.backendId!, e)}
                                 >
                                   {e}
                                 </motion.button>
                               ))}
                               <div className="w-[1px] h-3 bg-border/50 mx-0.5"></div>
                               <button className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:bg-muted/50 rounded-full transition-colors" onClick={(e) => { e.stopPropagation(); setShowEmojiPickerFor(message.backendId!); }}>
                                 <Smile className="w-3.5 h-3.5" />
                               </button>
                             </div>
                             
                             <AnimatePresence>
                               {showEmojiPickerFor === message.backendId && (
                                 <motion.div 
                                   initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                   animate={{ opacity: 1, scale: 1, y: 0 }}
                                   exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                   className="absolute top-10 left-0 z-50 shadow-2xl rounded-2xl border border-border/50 overflow-hidden" 
                                   onClick={e => e.stopPropagation()}
                                 >
                                   <EmojiPicker theme={Theme.AUTO} onEmojiClick={(e) => { onReactToMessage?.(message.backendId!, e.emoji); setShowEmojiPickerFor(null); }} />
                                 </motion.div>
                               )}
                             </AnimatePresence>
                          </div>
                        )}

                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-border/50 bg-card/40 backdrop-blur-xl p-2 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.1)] z-10 relative">
            <AnimatePresence>
              {replyingTo && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: 10, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-between bg-muted/50 border border-border/50 rounded-xl p-3 mb-3 backdrop-blur-sm shadow-sm">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground truncate">
                      <div className="bg-primary/20 p-1.5 rounded-full">
                        <Reply className="w-4 h-4 text-primary" />
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-foreground mr-2">{replyingTo.author}</span>
                        <span className="truncate">{replyingTo.content}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full shrink-0 hover:bg-muted" onClick={() => setReplyingTo(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <AnimatePresence>
              {editingMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: 10, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-3 backdrop-blur-sm shadow-sm">
                    <div className="flex items-center gap-3 text-sm text-amber-600 dark:text-amber-400 truncate">
                      <div className="bg-amber-500/20 p-1.5 rounded-full">
                        <Edit2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="font-medium">Editing message...</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full shrink-0 hover:bg-amber-500/20" onClick={() => { setEditingMessage(null); setDraftMessage(""); }}>
                      <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 relative">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                onChange={handleFileChange}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 shrink-0 text-muted-foreground hover:bg-muted/80 rounded-2xl hover:shadow-sm transition-all"
                disabled={isUploading || !onUploadFile}
                onClick={() => fileInputRef.current?.click()}
                title="Attach a file"
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Paperclip className="h-6 w-6" />
                )}
              </Button>
              <Input
                ref={inputRef}
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }}
                placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
                className="h-14 rounded-2xl border border-border/60 bg-background/50 px-5 text-[15px] text-foreground shadow-sm focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50 backdrop-blur-sm transition-all"
              />
              <Button
                size="icon"
                className="h-14 w-14 shrink-0 rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all group flex items-center justify-center"
                onClick={sendMessage}
              >
                <Send className="h-6 w-6 group-hover:scale-110 transition-transform" />
              </Button>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
        {isAsideOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-card/20 flex flex-col min-h-0 border-l border-border/50 hidden lg:flex relative overflow-hidden shrink-0"
          >
            <div className="w-[288px] p-4 flex flex-col h-full">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/5 pointer-events-none" />
          <div className="mb-4 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-bold text-foreground uppercase tracking-widest">Team Members</h3>
              <Badge className="bg-muted/60 text-muted-foreground border-none shadow-sm">{members.length}</Badge>
            </div>
          </div>
          <div className="space-y-2 overflow-y-auto min-h-[80px] flex-1 pr-2 relative z-10 scroll-smooth custom-scrollbar">
            <AnimatePresence>
              {members.map((member) => (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={member.id} 
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors cursor-default"
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 shadow-sm border border-border/50">
                      {member.profilePictureUrl && (
                        <AvatarImage 
                          src={`${process.env.NEXT_PUBLIC_API_URL || "https://innotrack-aneshpdxd6habnd6.uaenorth-01.azurewebsites.net"}${member.profilePictureUrl}`} 
                          alt={member.name} 
                          className="object-cover" 
                        />
                      )}
                      <AvatarFallback className="bg-muted/80 text-foreground font-semibold">{member.initials}</AvatarFallback>
                    </Avatar>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[2.5px] border-background ${member.online ? "bg-emerald-500" : "bg-slate-400"}`} />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-foreground/90">{member.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">{member.role}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {member.online 
                        ? "Online"
                        : member.lastOnlineAt
                          ? `Last online at ${new Date(member.lastOnlineAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : "Offline"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="pt-3 mt-auto border-t border-border/50 relative z-10 flex flex-col shrink-0 max-h-[50%]">
            <button className="flex items-center gap-2 w-full text-left focus:outline-none group mb-2 p-2 rounded-xl hover:bg-muted/40 transition-colors shrink-0" onClick={() => setIsSharedFilesOpen(!isSharedFilesOpen)}>
              <h3 className="text-[13px] font-bold text-foreground uppercase tracking-widest flex-1">Shared Files</h3>
              <div className="text-muted-foreground group-hover:text-foreground transition-colors bg-muted/50 p-1 rounded-lg">
                <motion.div animate={{ rotate: isSharedFilesOpen ? 0 : -90 }}>
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </div>
            </button>
            
            <AnimatePresence>
              {isSharedFilesOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="overflow-hidden flex flex-col min-h-0"
                >
                  <div className="overflow-y-auto pr-1 pb-4 space-y-3 custom-scrollbar flex-1">
                    {messages.filter((m) => m.file && !m.isDeletedForAll).map((message) => (
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        key={`file-${message.id}`} 
                        className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/50 bg-card/60 shadow-sm hover:shadow-md hover:bg-card transition-shadow transition-colors backdrop-blur-md cursor-pointer"
                      >
                        <div className="rounded-xl border border-border/50 bg-muted/50 p-2.5 text-muted-foreground shrink-0 shadow-sm">
                          {message.file?.type === "image" ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-foreground/90">{message.file?.name}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 font-medium">{message.file?.size} • {message.author} • {message.timestamp}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(message.file!.backendFileName, message.file!.name)} className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary shrink-0 rounded-lg">
                          <Download className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                    {messages.filter((m) => m.file && !m.isDeletedForAll).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 px-4 text-center border border-dashed border-border/60 rounded-2xl bg-muted/20 mt-2">
                        <FileText className="w-6 h-6 text-muted-foreground/50 mb-2" />
                        <p className="text-xs text-muted-foreground font-medium">No files shared yet</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
            </div>
          </motion.aside>
        )}
        </AnimatePresence>
      </div>
    </section>
  );
}
