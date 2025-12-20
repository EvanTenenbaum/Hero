import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  Send,
  User,
  Loader2,
  Code,
  FileSearch,
  TestTube,
  Server,
  Lightbulb,
  CheckCircle2,
  Circle,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";

// Agent types matching backend
type AgentType = "pm" | "developer" | "qa" | "devops" | "research";

interface AgentInfo {
  id: AgentType;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const agents: AgentInfo[] = [
  {
    id: "pm",
    name: "PM",
    icon: <Lightbulb className="w-4 h-4" />,
    color: "bg-purple-500",
    description: "Product Manager - Planning & Requirements",
  },
  {
    id: "developer",
    name: "Dev",
    icon: <Code className="w-4 h-4" />,
    color: "bg-blue-500",
    description: "Developer - Code Implementation",
  },
  {
    id: "qa",
    name: "QA",
    icon: <TestTube className="w-4 h-4" />,
    color: "bg-green-500",
    description: "QA Engineer - Testing & Quality",
  },
  {
    id: "devops",
    name: "DevOps",
    icon: <Server className="w-4 h-4" />,
    color: "bg-orange-500",
    description: "DevOps - Infrastructure & Deployment",
  },
  {
    id: "research",
    name: "Research",
    icon: <FileSearch className="w-4 h-4" />,
    color: "bg-cyan-500",
    description: "Research - Analysis & Investigation",
  },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentType?: AgentType;
  timestamp: Date;
}

interface SubTask {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  agentType: AgentType;
}

interface AgentPanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  activeAgentId?: AgentType;
  onAgentChange?: (agentId: AgentType) => void;
}

export function AgentPanel({
  collapsed = false,
  onToggleCollapse,
  activeAgentId = "developer",
  onAgentChange,
}: AgentPanelProps) {
  const [activeAgent, setActiveAgent] = useState<AgentType>(activeAgentId);
  const [messages, setMessages] = useState<Record<AgentType, Message[]>>({
    pm: [],
    developer: [],
    qa: [],
    devops: [],
    research: [],
  });
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current agent's messages
  const currentMessages = messages[activeAgent] || [];

  // Create conversation mutation
  const createConversationMutation = trpc.chat.createConversation.useMutation();

  // Chat mutation
  const chatMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      if (data.content) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.content,
          agentType: activeAgent,
          timestamp: new Date(),
        };
        setMessages((prev) => ({
          ...prev,
          [activeAgent]: [...prev[activeAgent], assistantMessage],
        }));
      }
      setIsStreaming(false);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setIsStreaming(false);
    },
  });

  // Track conversation IDs per agent
  const [conversationIds, setConversationIds] = useState<Record<AgentType, number | null>>({
    pm: null,
    developer: null,
    qa: null,
    devops: null,
    research: null,
  });

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => ({
      ...prev,
      [activeAgent]: [...prev[activeAgent], userMessage],
    }));
    setInputValue("");
    setIsStreaming(true);

    try {
      let convId = conversationIds[activeAgent];
      
      // Create conversation if needed
      if (!convId) {
        const conv = await createConversationMutation.mutateAsync({
          title: `${getAgentInfo(activeAgent)?.name} Chat`,
        });
        convId = conv.id;
        setConversationIds(prev => ({ ...prev, [activeAgent]: convId }));
      }
      
      await chatMutation.mutateAsync({
        conversationId: convId,
        content: inputValue,
        agentType: activeAgent,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsStreaming(false);
    }
  }, [inputValue, isStreaming, activeAgent, currentMessages, chatMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAgentChange = (agentId: AgentType) => {
    setActiveAgent(agentId);
    onAgentChange?.(agentId);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages]);

  // Focus input on agent change
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeAgent]);

  const getAgentInfo = (id: AgentType) => agents.find((a) => a.id === id);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-4 gap-2">
        {agents.map((agent) => (
          <Button
            key={agent.id}
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full",
              activeAgent === agent.id && "bg-muted"
            )}
            onClick={() => {
              handleAgentChange(agent.id);
              onToggleCollapse?.();
            }}
            title={agent.name}
          >
            <div className={cn("p-1.5 rounded-full", agent.color)}>
              {agent.icon}
            </div>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Agent Tabs */}
      <div className="border-b px-2 py-1">
        <div className="flex gap-1 overflow-x-auto">
          {agents.map((agent) => (
            <Button
              key={agent.id}
              variant={activeAgent === agent.id ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2 shrink-0"
              onClick={() => handleAgentChange(agent.id)}
            >
              <div className={cn("p-1 rounded mr-1", agent.color)}>
                {agent.icon}
              </div>
              <span className="text-xs">{agent.name}</span>
              {messages[agent.id].length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {messages[agent.id].length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Agent Info */}
      <div className="px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded", getAgentInfo(activeAgent)?.color)}>
            {getAgentInfo(activeAgent)?.icon}
          </div>
          <div>
            <p className="text-sm font-medium">{getAgentInfo(activeAgent)?.name} Agent</p>
            <p className="text-xs text-muted-foreground">
              {getAgentInfo(activeAgent)?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-3 space-y-4">
          {currentMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Start a conversation with {getAgentInfo(activeAgent)?.name}</p>
              <p className="text-xs mt-1">Ask questions or give instructions</p>
            </div>
          ) : (
            currentMessages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className={cn("p-1.5 rounded h-fit shrink-0", getAgentInfo(activeAgent)?.color)}>
                    {getAgentInfo(activeAgent)?.icon}
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === "assistant" ? (
                    <Streamdown>{message.content}</Streamdown>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  <p className="text-[10px] opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="p-1.5 rounded bg-muted h-fit shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}
          {isStreaming && (
            <div className="flex gap-2">
              <div className={cn("p-1.5 rounded h-fit", getAgentInfo(activeAgent)?.color)}>
                {getAgentInfo(activeAgent)?.icon}
              </div>
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Sub-tasks (if any) */}
      {subTasks.length > 0 && (
        <div className="border-t px-3 py-2">
          <p className="text-xs font-medium mb-2">Active Tasks</p>
          <div className="space-y-1">
            {subTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-xs">
                {task.status === "completed" ? (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                ) : task.status === "running" ? (
                  <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                ) : task.status === "failed" ? (
                  <AlertCircle className="w-3 h-3 text-red-500" />
                ) : (
                  <Circle className="w-3 h-3 text-muted-foreground" />
                )}
                <span className="truncate">{task.title}</span>
              </div>
            ))}
            {subTasks.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{subTasks.length - 3} more tasks
              </p>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${getAgentInfo(activeAgent)?.name}...`}
            disabled={isStreaming}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isStreaming}
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
