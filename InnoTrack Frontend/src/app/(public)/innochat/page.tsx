"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Lightbulb,
  FileText,
  TrendingUp,
  ArrowLeft,
  FolderKanban,
  Settings,
  Package,
  Globe,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { studentApi, MyTeamDto, SaveDraftPayload, LookupItem, readPagedData } from "@/lib/student-api";
import { toast } from "sonner";

const AI_CHAT_URL = "https://innotrack-graduation-project-v1-2.hf.space/chat";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  draftId?: number;
}

interface ProjectContext {
  title?: string;
  category?: string;
  technologies?: string;
  abstract?: string;
  description?: string;
  problemStatement?: string;
  proposedSolution?: string;
  objectives?: string;
}

const getSuggestedPrompts = (projectTitle?: string) => [
  {
    icon: Lightbulb,
    text: "Brainstorm new project ideas",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  {
    icon: Settings,
    text: projectTitle ? `Suggest smart features for "${projectTitle}"` : "Suggest smart features for my project",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  {
    icon: Package,
    text: "Generate a full project specification",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  {
    icon: Globe,
    text: "Show me the top project domains",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
];

function StaggeredTextFade({ text }: { text: string }) {
  const tokens = text.split(/(\s+)/);
  let wordCount = 0;
  return (
    <span className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90 block">
      {tokens.map((token, i) => {
        if (token.trim() !== "") wordCount++;
        return (
          <span
            key={i}
            className="animate-in fade-in fill-mode-backwards"
            style={{ animationDuration: "500ms", animationDelay: `${wordCount * 30}ms` }}
          >
            {token}
          </span>
        );
      })}
    </span>
  );
}

function parseProjectData(content: string): Partial<SaveDraftPayload> {
  const data: any = {};
  const lines = content.split('\n');
  let currentField = '';
  let currentValue = '';

  for (const line of lines) {
    const l = line.trim();
    if (l.match(/Project Title:/i)) {
      if (currentField) data[currentField] = currentValue.trim();
      currentField = 'title';
      currentValue = l.replace(/.*Project Title:/i, '');
    } else if (l.match(/Category:/i)) {
      if (currentField) data[currentField] = currentValue.trim();
      currentField = 'domain';
      currentValue = l.replace(/.*Category:/i, '');
    } else if (l.match(/Technologies:/i)) {
      if (currentField) data[currentField] = currentValue.trim();
      currentField = 'technologies';
      currentValue = l.replace(/.*Technologies:/i, '');
    } else if (l.match(/Abstract:/i)) {
      if (currentField) data[currentField] = currentValue.trim();
      currentField = 'abstract';
      currentValue = l.replace(/.*Abstract:/i, '');
    } else if (l.match(/Detailed Description:/i)) {
      if (currentField) data[currentField] = currentValue.trim();
      currentField = 'detailedDescription';
      currentValue = l.replace(/.*Detailed Description:/i, '');
    } else if (l.match(/Problem Statement:/i)) {
      if (currentField) data[currentField] = currentValue.trim();
      currentField = 'problemStatement';
      currentValue = l.replace(/.*Problem Statement:/i, '');
    } else if (l.match(/Proposed Solution:/i)) {
      if (currentField) data[currentField] = currentValue.trim();
      currentField = 'proposedSolution';
      currentValue = l.replace(/.*Proposed Solution:/i, '');
    } else if (l.match(/Objectives:/i)) {
      if (currentField) data[currentField] = currentValue.trim();
      currentField = 'objectives';
      currentValue = l.replace(/.*Objectives:/i, '');
    } else if (l.match(/👉/i) || l.match(/What's next\?/i) || l.match(/You can say/i)) {
      break; // Stop parsing fields when reaching conversational footer
    } else {
      if (currentField) currentValue += '\n' + l;
    }
  }
  if (currentField) data[currentField] = currentValue.trim();

  for (const key in data) {
    if (typeof data[key] === 'string') {
      data[key] = data[key]
        .replace(/\*\*/g, '')
        .replace(/^[:-]\s*/, '')
        .replace(/_{3,}/g, '')
        .replace(/-{4,}/g, '') // match long dashes, avoiding normal dashes
        .trim();
    }
  }

  if (data.technologies) {
    data.technologies = data.technologies.split(',').map((t: string) => t.trim()).filter(Boolean);
  }

  return data;
}

function MessageContent({
  content,
  onOptionClick,
  onSendToSubmission,
  hasTeam,
}: {
  content: string;
  onOptionClick: (text: string) => void;
  onSendToSubmission: (data: any) => void;
  hasTeam: boolean;
}) {

  const elements: React.ReactNode[] = [];
  let textBuffer: string[] = [];
  let optionCount = 0;
  let isInteractiveSection = false;
  const router = useRouter();

  let cleanContent = content;
  const hasInlineOptions = content.includes("1️⃣") || content.includes("2️⃣") || content.match(/\[1\]/);

  if (hasInlineOptions) {
    cleanContent = cleanContent.replace(/Would you like me to.*?(?:specification\?|it\?)/i, "").trim();
  }
  cleanContent = cleanContent.replace(/👉?\s*Do you want to submit this project\?\s*\(Yes\/No\)/i, "").trim();

  const parsedProject = parseProjectData(cleanContent);
  const isFullProject = parsedProject.title && parsedProject.abstract && parsedProject.problemStatement;


  const flushText = (key: string) => {
    if (textBuffer.length > 0) {
      // Filter out garbage lines like "_____________________" or "None"
      const cleanedBuffer = textBuffer.filter(line => !line.match(/^_{3,}$/) && line.trim() !== "None");

      while (cleanedBuffer.length > 0 && cleanedBuffer[cleanedBuffer.length - 1].trim() === "") {
        cleanedBuffer.pop();
      }

      if (cleanedBuffer.length > 0) {
        const markdownText = cleanedBuffer.join("\n");
        elements.push(
          <div key={key} className="space-y-1 animate-in fade-in duration-700 fill-mode-backwards">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ node, ...props }) => <p className="text-[15px] leading-relaxed mb-3 last:mb-0 text-foreground/90 whitespace-pre-wrap" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1.5 marker:text-primary" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-5 mb-3 space-y-1.5 marker:text-primary" {...props} />,
                li: ({ node, ...props }) => <li className="text-[15px] leading-relaxed text-foreground/90" {...props} />,
                h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-5 mb-2 text-foreground" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-lg font-semibold mt-4 mb-2 text-foreground" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-[15px] font-semibold mt-3 mb-1 text-foreground" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                a: ({ node, ...props }) => <a className="text-primary hover:underline" {...props} />,
                code: ({ node, inline, ...props }: any) => 
                  inline ? (
                    <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                  ) : (
                    <pre className="bg-muted text-foreground p-3 rounded-xl overflow-x-auto text-sm font-mono border border-border/50 mb-3" {...props} />
                  ),
              }}
            >
              {markdownText}
            </ReactMarkdown>
          </div>
        );
      }
      textBuffer = [];
    }
  };

  const lines = cleanContent.split("\n");

  lines.forEach((line, idx) => {
    const lowerLine = line.toLowerCase();
    const isListItem = line.match(/^[-*•]\s+(.+)$/u) || line.match(/^(?:\d[.):\]]|\[\d\])\s+(.+)$/u) || line.match(/^(?:\d️⃣)\s+(.+)$/u);

    if (!isListItem) {
      if (lowerLine.includes("project idea") || lowerLine.includes("choose what you want") || lowerLine.includes("you can also type")) {
        isInteractiveSection = true;
      } else if (lowerLine.includes("feature") || lowerLine.includes("requirement") || lowerLine.includes("step") || lowerLine.match(/abstract:/i)) {
        isInteractiveSection = false;
      }
    }

    const emojiMatch = line.match(/^(?:\d️⃣)\s+(.+)$/u);
    const bulletMatch = isInteractiveSection ? line.match(/^[-*•]\s+(.+)$/u) : null;
    const numberMatch = isInteractiveSection ? line.match(/^(?:\d[.):\]]|\[\d\])\s+(.+)$/u) : null;
    
    const match = emojiMatch || bulletMatch || numberMatch;

    if (match) {
      flushText(`text-${idx}`);
      optionCount++;
      const num = optionCount;
      const rawLabel = match[1].trim();
      let displayLabel = rawLabel.replace(/\*\*/g, "");
      let commandToSend = rawLabel.replace(/\*\*/g, "");

      if (rawLabel.toLowerCase().includes("type **idea**") || rawLabel.toLowerCase().includes("type idea")) {
        displayLabel = "Generate graduation project ideas by domain";
        commandToSend = "idea";
      } else if (rawLabel.toLowerCase().includes("project title")) {
        displayLabel = "Generate smart features for a specific project title";
        commandToSend = "My project title is ";
      } else if (rawLabel.toLowerCase().includes("generate full project")) {
        displayLabel = "Generate a complete PRD and project specification";
        commandToSend = "generate full project";
      } else if (rawLabel.includes("→") || rawLabel.includes("->")) {
        const parts = rawLabel.split(/→|->/);
        commandToSend = parts[0].replace(/Type/i, "").replace(/\*\*/g, "").trim();
        displayLabel = parts[1].replace(/\*\*/g, "").trim();
        // Capitalize first letter of displayLabel
        if (displayLabel.length > 0) {
          displayLabel = displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1);
        }
      }

      elements.push(
        <button
          key={`opt-${idx}`}
          onClick={() => onOptionClick(commandToSend)}
          className="flex items-center gap-3.5 w-full text-left mt-2 px-4 py-3 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 group shadow-sm hover:shadow-md"
        >
          <span className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 text-[13px] font-bold flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 group-hover:bg-primary/20 transition-all">
            {num}
          </span>
          <span className="text-[14.5px] font-semibold text-foreground/90 group-hover:text-primary transition-colors">{displayLabel}</span>
        </button>
      );
    } else {
      textBuffer.push(line);
    }
  });

  flushText("text-end");

  // Handle inline options extracted from the text
  if (hasInlineOptions && optionCount === 0) {
    const inlineMatches = [
      { label: "Generate features for it", command: "Generate features for it" },
      { label: "Generate the full project specification", command: "Generate the full project specification" },
      { label: "Generate features", command: "Generate features" },
      { label: "Generate full project", command: "Generate full project" },
    ];
    let matchedOptions = 0;
    inlineMatches.forEach((opt) => {
      if (content.toLowerCase().includes(opt.label.toLowerCase()) && matchedOptions < 2) {
        matchedOptions++;
        elements.push(
          <button
            key={`inline-opt-${matchedOptions}`}
            onClick={() => onOptionClick(opt.command)}
            className="flex items-center gap-3.5 w-full text-left mt-2 px-4 py-3 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 group shadow-sm hover:shadow-md"
          >
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 text-[13px] font-bold flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 group-hover:bg-primary/20 transition-all">
              {matchedOptions}
            </span>
            <span className="text-[14.5px] font-semibold text-foreground/90 group-hover:text-primary transition-colors">{opt.label}</span>
          </button>
        );
      }
    });
  }

  // Handle Full Project Generated -> Save to a draft
  if (isFullProject) {
    elements.push(
      <div key="submit-project-option" className="mt-5 p-4 border border-green-500/30 bg-green-500/5 rounded-2xl">
        <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-3">
          I've generated the full project details! Would you like to save this to a draft and review it on the submission page?
        </p>
        <Button
          onClick={() => {
            if (!hasTeam) {
              toast.error("You must be part of a team to save a project draft!", {
                action: {
                  label: "Go to Teams",
                  onClick: () => router.push("/teams")
                }
              });
              return;
            }
            onSendToSubmission(parsedProject);
          }}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
        >
          <FolderKanban className="w-4 h-4 mr-2" />
          Save to a draft
        </Button>
      </div>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function InnoChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [userId, setUserId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [myTeam, setMyTeam] = useState<MyTeamDto | null>(null);
  const [domains, setDomains] = useState<LookupItem[]>([]);
  const [technologies, setTechnologies] = useState<LookupItem[]>([]);

  useEffect(() => {
    studentApi.getMyTeam().then(team => setMyTeam(team)).catch(() => {});
    studentApi.getDomains().then(d => setDomains(readPagedData(d))).catch(() => {});
    studentApi.getTechnologies().then(t => setTechnologies(readPagedData(t))).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const payload = JSON.parse(jsonPayload);
          const id = payload.nameid || payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || payload.sub;
          if (id) {
            setUserId(id.toString());
          }
        } catch (e) {
          console.error("Failed to parse token payload:", e);
        }
      }
    }
  }, []);

  const projectContextRaw = searchParams.get("context");
  const projectContext = projectContextRaw
    ? JSON.parse(projectContextRaw)
    : null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isTypingGreeting, setIsTypingGreeting] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (!userId) return;

    const savedSessionId = localStorage.getItem(`innoChatSessionId_${userId}`);
    const savedMessages = localStorage.getItem(`innoChatMessages_${userId}`);

    if (savedSessionId && savedMessages && !projectContext?.title) {
      // Load from cache if no project context is provided (meaning a regular chat, not coming from submission)
      try {
        const parsed = JSON.parse(savedMessages).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(parsed);
        setSessionId(savedSessionId);
        setIsTypingGreeting(false);
        return;
      } catch (e) {
        console.error("Failed to parse saved chat", e);
      }
    }

    setSessionId(Math.random().toString(36).substring(7));
    
    const greetingText = projectContext?.title
      ? `Hello! I'm InnoChat, your AI assistant for graduation projects. I can see you're working on "${projectContext.title}". How can I help you today? I can:\n\n• Provide feedback on your project idea\n• Suggest improvements to increase originality\n• Help refine your problem statement and objectives\n• Recommend relevant technologies\n• Check for similar existing projects\n\nWhat would you like to discuss?`
      : "Hello! I'm InnoChat, your AI assistant for graduation projects. I can help you brainstorm ideas, refine your proposal, check originality, and provide guidance throughout your project journey. How can I assist you today?";

    // Show initial typing indicator
    setIsTyping(true);

    const timer = setTimeout(() => {
      setIsTyping(false);
      
      const greetingId = "1";
      setMessages([
        {
          id: greetingId,
          role: "assistant",
          content: greetingText,
          timestamp: new Date(),
        },
      ]);
      
      setIsTypingGreeting(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [projectContext?.title, userId]);

  useEffect(() => {
    if (!userId) return;
    if (messages.length > 0) {
      localStorage.setItem(`innoChatMessages_${userId}`, JSON.stringify(messages));
    }
    if (sessionId) {
      localStorage.setItem(`innoChatSessionId_${userId}`, sessionId);
    }
  }, [messages, sessionId, userId]);

  const handleSend = async (directMessage?: string | React.MouseEvent | React.KeyboardEvent) => {
    const isDirectString = typeof directMessage === 'string';
    const textToSend = isDirectString ? directMessage : input;
    
    if (!textToSend.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    
    // Only clear input if we are sending what's in the input box
    if (!isDirectString || directMessage === input) {
      setInput("");
    }
    
    setIsTyping(true);

    const isFirstUserMessage = !messages.some((m) => m.role === "user");
    let apiMessage = textToSend;
    if (isFirstUserMessage && projectContext?.title) {
      apiMessage = `[System Context: The student is working on a project titled "${projectContext.title}". Category: "${projectContext.category || ""}". Technologies: "${projectContext.technologies || ""}". Description: "${projectContext.description || ""}". Problem Statement: "${projectContext.problemStatement || ""}". Objectives: "${projectContext.objectives || ""}". Please keep this project details in mind.]\n\nQuestion: ${textToSend}`;
    }

    if (!AI_CHAT_URL) {
      setIsTyping(false);
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Error: AI Chat URL is not configured. Please define NEXT_PUBLIC_AI_CHAT_URL in your environment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      return;
    }

    try {
      const response = await fetch(AI_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: `${userId || authUser?.name || "anonymous"}_${sessionId}`,
          message: apiMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from AI");
      }

      const data = await response.json();
      let rawContent = data.response || "Sorry, I couldn't generate a response.";
      
      const typeIndex = rawContent.toLowerCase().indexOf("you can also type");
      if (typeIndex !== -1) {
        const beforeType = rawContent.substring(0, typeIndex);
        const lastNewline = beforeType.lastIndexOf("\n");
        if (lastNewline !== -1) {
           rawContent = rawContent.substring(0, lastNewline).trim();
        } else {
           rawContent = beforeType.trim();
        }
        rawContent = rawContent.replace(/👉\s*$/, "").trim();
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: rawContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (err) {
      console.error("InnoChat API Error:", err);
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I am having trouble connecting to InnoChat right now. Please check your connection or try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestedPrompt = (promptText: string) => {
    if (promptText === "My project title is ") {
      setInput(promptText);
      textareaRef.current?.focus();
    } else {
      handleSend(promptText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 top-16 md:left-64 flex flex-col bg-background">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl"></div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col m-4 md:m-6 backdrop-blur-xl bg-card/70 dark:bg-card/40 rounded-2xl border border-border/50 shadow-2xl relative overflow-hidden">
        {/* Subtle overlay */}
        <div className="absolute inset-0 bg-white/30 dark:bg-transparent pointer-events-none"></div>

        {/* Header */}
        <div className="px-6 py-5 border-b border-border/50 backdrop-blur-sm flex items-center gap-3 relative z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mr-2 hover:bg-muted/40 dark:bg-muted/20 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground truncate">
              {projectContext?.title ? `InnoChat - ${projectContext.title}` : "InnoChat"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {projectContext?.title ? "AI Assistant analyzing your draft" : "AI Assistant for Graduation Projects"}
            </p>
          </div>
          <div className="ml-auto shrink-0">
            <Button
              variant="default"
              onClick={() => {
                const newSessionId = Math.random().toString(36).substring(7);
                setSessionId(newSessionId);
                const initialGreeting = messages.length > 0 ? messages[0] : null;
                const newMessages = initialGreeting ? [initialGreeting] : [];
                setMessages(newMessages);
                if (userId) {
                  localStorage.setItem(`innoChatSessionId_${userId}`, newSessionId);
                  localStorage.setItem(`innoChatMessages_${userId}`, JSON.stringify(newMessages));
                }
                toast.success("Started a new chat session!");
              }}
              className="bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transition-all rounded-xl px-6 py-5 text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Chat
            </Button>
          </div>
        </div>

        {/* Draft Context Banner */}
        {projectContext?.title && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-3 flex items-start sm:items-center gap-3 relative z-10">
            <div className="mt-0.5 sm:mt-0 p-1.5 bg-amber-500/20 rounded-lg shrink-0">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Draft Context Loaded
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                The AI is currently analyzing your draft for <strong>"{projectContext.title}"</strong>
                {projectContext.originalityScore !== undefined ? ` (Originality: ${projectContext.originalityScore}%)` : ""}. Any advice will be tailored to your work.
              </p>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 relative z-10">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                    message.role === "assistant"
                      ? "bg-primary"
                      : "bg-gray-800"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <Bot className="w-5 h-5 text-white" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message Content */}
                <div
                  className={`flex-1 ${message.role === "user" ? "flex justify-end" : ""}`}
                >
                  <div
                    className={`inline-block max-w-[85%] backdrop-blur-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-md shadow-lg"
                        : "bg-card/80 dark:bg-card/60 text-foreground rounded-2xl rounded-tl-md border border-border/50 shadow-md"
                    } px-5 py-3.5`}
                  >
                    {message.role === "assistant" ? (
                      message.id === "1" ? (
                        <StaggeredTextFade text={message.content} />
                      ) : (
                        <MessageContent
                          content={message.content}
                          hasTeam={!!myTeam}
                          onSendToSubmission={async (data) => {
                            try {
                              toast.loading("Saving your project draft...");
                              
                              let domainId = 1;
                              if (data.domain && domains.length > 0) {
                                const matchedDomain = domains.find(d => d.name.toLowerCase() === data.domain?.toLowerCase());
                                if (matchedDomain) domainId = matchedDomain.id;
                                else domainId = domains[0].id;
                              }

                              const techIds: number[] = [];
                              if (data.technologies && technologies.length > 0) {
                                const allTechsString = data.technologies.join(' ').toLowerCase();
                                for (const tech of technologies) {
                                  if (allTechsString.includes(tech.name.toLowerCase())) {
                                    techIds.push(tech.id);
                                  }
                                }
                              }
                              if (techIds.length === 0 && technologies.length > 0) {
                                techIds.push(technologies[0].id);
                              }

                              const payload: SaveDraftPayload = {
                                title: data.title || "Generated Project",
                                studentNames: myTeam?.members?.map((m: any) => m.fullName || m.name || m.email).join(", ") || "",
                                year: new Date().getFullYear(),
                                abstract: data.abstract || "",
                                description: data.detailedDescription || ((data.problemStatement || "") + "\n\n" + (data.proposedSolution || "")).trim(),
                                domainId,
                                technologyIds: techIds,
                                problemStatement: data.problemStatement || null,
                                proposedSolution: data.proposedSolution || null,
                                objectives: data.objectives || null,
                              };

                              const allDrafts = await studentApi.getMyDrafts();
                              
                              // 1. Check if the draftId saved in the chat message still exists
                              let existingDraft = null;
                              if (message.draftId) {
                                existingDraft = allDrafts.find((d: any) => d.id === message.draftId);
                              }
                              
                              // 2. Fallback: Check if a draft exists with the exact same title
                              if (!existingDraft) {
                                existingDraft = allDrafts.find((d: any) => d.title.toLowerCase() === payload.title.toLowerCase());
                              }
                              
                              let draftId = 0;
                              if (existingDraft) {
                                await studentApi.updateDraft(existingDraft.id, payload);
                                draftId = existingDraft.id;
                              } else {
                                const draft = await studentApi.saveDraft(payload);
                                draftId = draft.id;
                              }
                              
                              // Update the message so we know it has a draft associated
                              setMessages(prev => prev.map(m => m.id === message.id ? { ...m, draftId } : m));
                              
                              toast.dismiss();
                              toast.success("Draft saved! Redirecting...");
                              router.push(`/project-submission?draft=${draftId}`);
                            } catch (e: any) {
                              toast.dismiss();
                              const errMessage = e?.response?.data?.message || e.message || "Failed to save draft. Please try again.";
                              toast.error(errMessage);
                            }
                          }}
                          onOptionClick={(text) => {
                            setInput(text);
                            textareaRef.current?.focus();
                          }}
                        />
                      )
                    ) : (
                      <p className="text-[15px] whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary shadow-lg">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="bg-card/80 dark:bg-card/60 backdrop-blur-sm rounded-2xl rounded-tl-md px-5 py-3.5 border border-border/50 shadow-md">
                  <div className="flex gap-1.5">
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-primary/70 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Suggested Prompts (shown when no user messages yet) */}
            {messages.length === 1 && messages[0].role === "assistant" && !isTypingGreeting && (
              <div className="mt-8">
                <p className="text-sm font-medium text-muted-foreground mb-4 text-center animate-in fade-in duration-700">
                  Suggested prompts:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getSuggestedPrompts(projectContext?.title).map((prompt, index) => {
                    const Icon = prompt.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => handleSuggestedPrompt(prompt.text)}
                        className="backdrop-blur-sm bg-card/60 dark:bg-card/40 hover:bg-card/80 dark:bg-card/60 border border-border/50 rounded-xl p-4 text-left hover:shadow-lg transition-all animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both"
                        style={{ animationDelay: `${index * 120}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg ${prompt.bg} flex items-center justify-center`}
                          >
                            <Icon className={`w-4 h-4 ${prompt.color}`} />
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {prompt.text}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="px-6 py-5 border-t border-border/50 bg-card/50 backdrop-blur-md relative z-10 mt-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative min-w-0">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isTypingGreeting ? "Please wait while InnoChat initializes..." : "Ask me anything..."}
                  className="!h-[60px] overflow-y-auto resize-none py-[18px] pl-4 pr-4 sm:pl-6 sm:pr-32 backdrop-blur-sm bg-card/80 dark:bg-card/60 border-border/50 shadow-md"
                  style={{ fieldSizing: "fixed", height: "60px" } as any}
                  rows={1}
                  disabled={isTypingGreeting}
                />
                <div className="hidden sm:block absolute bottom-3 right-3 text-xs text-muted-foreground bg-card/60 dark:bg-card/40 px-2 py-1 rounded">
                  Press Enter to send
                </div>
              </div>
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping || isTypingGreeting}
                className="bg-blue-600 hover:bg-blue-700 text-white h-[60px] px-6 shadow-lg"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              InnoChat can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InnoChat() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading chat...</div>}>
      <InnoChatContent />
    </Suspense>
  );
}
