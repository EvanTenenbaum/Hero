/**
 * CloudChatPanel Component
 * 
 * A chat interface that uses cloud sandbox execution for a specific project.
 * Integrates with CloudExecutionEngine for real tool execution.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  User,
  Send,
  Loader2,
  Cloud,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Play,
  Pause,
  Terminal,
  FileCode,
  GitBranch,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Streamdown } from 'streamdown';

type AgentType = 'pm' | 'developer' | 'qa' | 'devops' | 'research';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'running' | 'success' | 'error';
}

interface CloudChatPanelProps {
  projectId: number;
  projectName: string;
}

const AGENT_CONFIG: Record<AgentType, { label: string; icon: React.ReactNode }> = {
  pm: { label: 'PM Agent', icon: <Bot className="h-4 w-4" /> },
  developer: { label: 'Developer', icon: <FileCode className="h-4 w-4" /> },
  qa: { label: 'QA Agent', icon: <CheckCircle className="h-4 w-4" /> },
  devops: { label: 'DevOps', icon: <Terminal className="h-4 w-4" /> },
  research: { label: 'Research', icon: <GitBranch className="h-4 w-4" /> },
};

export default function CloudChatPanel({ projectId, projectName }: CloudChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('developer');
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    tool: string;
    args: Record<string, unknown>;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Query execution status
  const { data: executionStatus, refetch: refetchStatus } = 
    trpc.chatAgent.getExecutionStatus.useQuery(
      { projectId },
      { 
        enabled: isExecuting,
        refetchInterval: isExecuting ? 1000 : false,
      }
    );

  // Execute in cloud mutation
  const executeInCloud = trpc.chatAgent.executeInCloud.useMutation({
    onSuccess: (result) => {
      setIsExecuting(false);
      
      // Add assistant response
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.response || 'Execution completed.',
        timestamp: new Date(),
        toolCalls: result.toolCalls?.map((tc: { toolName: string; status: string; output?: unknown }) => ({
          tool: tc.toolName,
          args: {},
          result: tc.output ? String(tc.output) : undefined,
          status: tc.status === 'success' ? 'success' as const : 'error' as const,
        })),
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (result.error) {
        toast.error(result.error);
      }
    },
    onError: (error) => {
      setIsExecuting(false);
      toast.error(`Execution failed: ${error.message}`);
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  // Confirm tool execution mutation
  const confirmExecution = trpc.chatAgent.confirmToolExecution.useMutation({
    onSuccess: () => {
      setPendingConfirmation(null);
      toast.success('Execution approved');
    },
    onError: (error) => {
      toast.error(`Failed to confirm: ${error.message}`);
    },
  });

  // Cancel execution mutation
  const cancelExecution = trpc.chatAgent.cancelExecution.useMutation({
    onSuccess: () => {
      setIsExecuting(false);
      setPendingConfirmation(null);
      toast.info('Execution cancelled');
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Check for pending confirmations
  useEffect(() => {
    if (executionStatus?.pendingConfirmation) {
      // Map CloudExecutionStep to the expected pendingConfirmation format
      const step = executionStatus.pendingConfirmation;
      setPendingConfirmation({
        tool: step.toolName,
        args: step.input,
      });
    }
  }, [executionStatus]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isExecuting) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsExecuting(true);

    // Build conversation history
    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    executeInCloud.mutate({
      message: input,
      agentType: selectedAgent,
      projectId,
      conversationHistory,
    });
  }, [input, isExecuting, messages, selectedAgent, projectId, executeInCloud]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConfirm = (approved: boolean) => {
    if (!pendingConfirmation) return;
    confirmExecution.mutate({
      projectId,
      toolName: pendingConfirmation.tool,
      approved,
    });
  };

  return (
    <Card className="bg-card border-border h-[600px] flex flex-col">
      <CardHeader className="pb-2 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            Cloud Chat - {projectName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedAgent} onValueChange={(v) => setSelectedAgent(v as AgentType)}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AGENT_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isExecuting && (
              <Badge variant="outline" className="animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Executing
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Start a conversation with the cloud agent.</p>
                <p className="text-sm">Your code will execute in an isolated E2B sandbox.</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {msg.role !== 'user' && (
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <Streamdown>{msg.content}</Streamdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {/* Tool Calls */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {msg.toolCalls.map((tc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs bg-secondary/50 rounded px-2 py-1"
                        >
                          {tc.status === 'success' ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : tc.status === 'error' ? (
                            <XCircle className="h-3 w-3 text-red-500" />
                          ) : (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          <span className="font-mono">{tc.tool}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isExecuting && (
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

        {/* Confirmation Dialog */}
        {pendingConfirmation && (
          <div className="border-t border-border p-4 bg-yellow-500/10">
            <div className="flex items-center gap-2 text-yellow-500 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Confirmation Required</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              The agent wants to execute: <code className="bg-secondary px-1 rounded">{pendingConfirmation.tool}</code>
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleConfirm(true)}
                disabled={confirmExecution.isPending}
              >
                <Play className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleConfirm(false)}
                disabled={confirmExecution.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${AGENT_CONFIG[selectedAgent].label} to help with your project...`}
              disabled={isExecuting}
              className="bg-secondary border-border"
            />
            {isExecuting ? (
              <Button
                variant="destructive"
                onClick={() => cancelExecution.mutate({ projectId })}
              >
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
