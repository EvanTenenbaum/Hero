import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { 
  MessageSquare, Plus, Send, Loader2, Bot, User, 
  Copy, Check, Shield, AlertTriangle, Clock,
  Code, TestTube, Server, Search, Briefcase
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

type AgentType = "pm" | "developer" | "qa" | "devops" | "research";

interface Message {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
  blocked?: boolean;
  safetyReason?: string;
}

const AGENT_CONFIG: Record<AgentType, { label: string; icon: React.ReactNode; description: string }> = {
  pm: { 
    label: "PM Agent", 
    icon: <Briefcase className="h-4 w-4" />,
    description: "Project planning, requirements, coordination"
  },
  developer: { 
    label: "Developer", 
    icon: <Code className="h-4 w-4" />,
    description: "Code generation, debugging, refactoring"
  },
  qa: { 
    label: "QA Agent", 
    icon: <TestTube className="h-4 w-4" />,
    description: "Testing, quality assurance, bug detection"
  },
  devops: { 
    label: "DevOps", 
    icon: <Server className="h-4 w-4" />,
    description: "Infrastructure, deployment, CI/CD"
  },
  research: { 
    label: "Research", 
    icon: <Search className="h-4 w-4" />,
    description: "Documentation, learning, exploration"
  },
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Copied!" : "Copy message"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function Chat() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const conversationId = params.id ? parseInt(params.id) : null;
  
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("pm");
  const [optimisticMessage, setOptimisticMessage] = useState<Message | null>(null);
  const [streamingContent, setStreamingContent] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const utils = trpc.useUtils();
  const { data: conversations, refetch: refetchConversations } = trpc.chat.conversations.useQuery();
  const { data: messages, refetch: refetchMessages } = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId }
  );

  const createConversation = trpc.chat.createConversation.useMutation({
    onSuccess: (data) => {
      setLocation(`/chat/${data.id}`);
      refetchConversations();
    },
  });

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onMutate: async (variables) => {
      // Optimistic update - show user message immediately
      const tempMessage: Message = {
        id: Date.now(),
        role: "user",
        content: variables.content,
        createdAt: new Date(),
      };
      setOptimisticMessage(tempMessage);
    },
    onSuccess: (response) => {
      setOptimisticMessage(null);
      refetchMessages();
      setIsStreaming(false);

      // Handle safety check responses
      if (response.blocked) {
        toast.error(
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-400" />
            <span>Message blocked: {response.safetyReason || "Safety violation detected"}</span>
          </div>,
          { duration: 5000 }
        );
      } else if (response.requiresConfirmation) {
        toast.warning(
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <span>This action requires confirmation</span>
          </div>,
          { duration: 5000 }
        );
      }
    },
    onError: (error) => {
      setOptimisticMessage(null);
      toast.error(error.message);
      setIsStreaming(false);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, optimisticMessage]);

  const handleNewChat = () => {
    createConversation.mutate({ title: "New Chat" });
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    let targetConversationId = conversationId;

    if (!targetConversationId) {
      const result = await createConversation.mutateAsync({ title: input.slice(0, 50) });
      targetConversationId = result.id;
    }

    const messageContent = input;
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    
    // Show user message optimistically
    const tempMessage: Message = {
      id: Date.now(),
      role: "user",
      content: messageContent,
      createdAt: new Date(),
    };
    setOptimisticMessage(tempMessage);

    // Use streaming endpoint via fetch with SSE
    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch('/api/trpc/chat.sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          json: {
            conversationId: targetConversationId,
            content: messageContent,
            agentType: selectedAgent,
          }
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();
      
      // Handle safety check responses
      if (result.result?.data?.json?.blocked) {
        toast.error(
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-400" />
            <span>Message blocked: {result.result?.data?.json?.safetyReason || "Safety violation detected"}</span>
          </div>,
          { duration: 5000 }
        );
      } else if (result.result?.data?.json?.requiresConfirmation) {
        toast.warning(
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <span>This action requires confirmation</span>
          </div>,
          { duration: 5000 }
        );
      }
      
      setOptimisticMessage(null);
      setStreamingContent("");
      refetchMessages();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled
        return;
      }
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Combine real messages with optimistic message and streaming content
  const displayMessages = [
    ...(messages || []),
    ...(optimisticMessage ? [optimisticMessage] : []),
    ...(isStreaming && streamingContent ? [{
      id: Date.now() + 1,
      role: "assistant" as const,
      content: streamingContent,
      createdAt: new Date(),
    }] : []),
  ];

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Conversation List */}
        <div className="w-64 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <Button onClick={handleNewChat} className="w-full bg-primary hover:bg-primary/90 gap-2">
              <Plus className="h-4 w-4" /> New Chat
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations?.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setLocation(`/chat/${conv.id}`)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    conversationId === conv.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="truncate">{conv.title || "New Chat"}</span>
                  </div>
                </button>
              ))}
              {(!conversations || conversations.length === 0) && (
                <p className="text-muted-foreground text-sm text-center py-4">No conversations yet</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {conversationId ? (
            <>
              {/* Agent Selector Header */}
              <div className="px-4 py-2 border-b border-border bg-card/50">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bot className="h-4 w-4" />
                    <span>Active Agent:</span>
                  </div>
                  <Select value={selectedAgent} onValueChange={(v) => setSelectedAgent(v as AgentType)}>
                    <SelectTrigger className="w-[180px] h-8 bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-secondary border-border">
                      {Object.entries(AGENT_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key} className="text-foreground">
                          <div className="flex items-center gap-2">
                            {config.icon}
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="max-w-3xl mx-auto text-xs text-muted-foreground mt-1">
                  {AGENT_CONFIG[selectedAgent].description}
                </p>
              </div>

              {/* Messages */}
              <ScrollArea ref={scrollRef} className="flex-1 p-4">
                <div className="max-w-3xl mx-auto space-y-4">
                  {displayMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`group flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      <div className="flex flex-col gap-1 max-w-[80%]">
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "blocked" in msg && msg.blocked
                              ? "bg-red-900/50 text-red-200 border border-red-700"
                              : "bg-secondary text-foreground"
                          }`}
                        >
                          {"blocked" in msg && msg.blocked && (
                            <div className="flex items-center gap-2 text-red-400 text-xs mb-2">
                              <Shield className="h-3 w-3" />
                              <span>Blocked: {"safetyReason" in msg ? msg.safetyReason : "Safety violation"}</span>
                            </div>
                          )}
                          {msg.role === "assistant" ? (
                            <Streamdown>{msg.content}</Streamdown>
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(msg.createdAt)}
                          </span>
                          {msg.role === "assistant" && <CopyButton text={msg.content} />}
                        </div>
                      </div>
                      {msg.role === "user" && (
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isStreaming && !streamingContent && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-secondary rounded-lg px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="max-w-3xl mx-auto flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask ${AGENT_CONFIG[selectedAgent].label}...`}
                    disabled={isStreaming}
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isStreaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Card className="bg-card/50 border-border max-w-lg">
                <CardContent className="flex flex-col items-center py-12">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Start a Conversation</h3>
                  <p className="text-muted-foreground text-sm text-center mb-6">
                    Chat with Hero IDE's specialized AI agents for help with coding, planning, testing, and more.
                  </p>
                  
                  {/* Agent Quick Select */}
                  <div className="grid grid-cols-2 gap-2 w-full mb-6">
                    {Object.entries(AGENT_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedAgent(key as AgentType);
                          handleNewChat();
                        }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          {config.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{config.label}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{config.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <Button onClick={handleNewChat} className="bg-primary hover:bg-primary/90 gap-2">
                    <Plus className="h-4 w-4" /> New Chat
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
