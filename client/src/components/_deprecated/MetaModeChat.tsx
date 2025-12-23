/**
 * MetaModeChat - Chat interface for the self-modifying IDE
 */

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChangePreviewPanel } from "../ChangePreviewPanel";
import { 
  Send, 
  Sparkles, 
  Code, 
  History, 
  AlertCircle,
  CheckCircle,
  Loader2 
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  codeBlocks?: { language: string; code: string }[];
  timestamp: Date;
}

interface MetaModeChatProps {
  currentFile?: string;
  selectedCode?: string;
  onFileChange?: (filePath: string) => void;
}

export function MetaModeChat({
  currentFile,
  selectedCode,
  onFileChange,
}: MetaModeChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isMetaMode, setIsMetaMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<any[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.meta.chat.useMutation();
  const previewMutation = trpc.meta.previewChanges.useMutation();
  const applyMutation = trpc.meta.applyChanges.useMutation();
  const historyQuery = trpc.meta.getModificationHistory.useQuery({ limit: 10 });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await chatMutation.mutateAsync({
        message: input,
        context: {
          currentFile,
          selectedCode,
        },
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
        codeBlocks: response.codeBlocks,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If there are code blocks and meta mode is on, offer to preview changes
      if (response.suggestedChanges && isMetaMode && response.codeBlocks.length > 0) {
        // Parse file paths from the response and prepare changes
        // This is a simplified version - in production you'd parse the actual file paths
        toast.info("Code suggestions available. Click 'Preview Changes' to see the diff.");
      }
    } catch (error) {
      toast.error("Failed to get response from Meta Agent");
    }
  };

  const handlePreviewChanges = async (codeBlocks: { language: string; code: string }[]) => {
    if (!currentFile || codeBlocks.length === 0) {
      toast.error("No file selected or no code to apply");
      return;
    }

    try {
      const changes = codeBlocks.map((block) => ({
        filePath: currentFile,
        newContent: block.code,
        changeType: "modify" as const,
      }));

      const result = await previewMutation.mutateAsync({ changes });
      setPendingChanges(result.previews);
    } catch (error) {
      toast.error("Failed to preview changes");
    }
  };

  const handleApplyChanges = async (confirmedProtectedFiles: string[]) => {
    if (!pendingChanges) return;

    try {
      const changes = pendingChanges.map((p) => ({
        filePath: p.filePath,
        newContent: "", // Would need to get from the preview
        changeType: p.changeType,
      }));

      const result = await applyMutation.mutateAsync({
        changes,
        confirmedProtectedFiles,
      });

      if (result.success) {
        toast.success(`Applied changes to ${result.appliedChanges.length} files`);
        setPendingChanges(null);
        historyQuery.refetch();
      } else {
        toast.error(`Failed to apply changes: ${result.failedChanges.map((f) => f.error).join(", ")}`);
      }
    } catch (error: any) {
      if (error.data?.cause?.unconfirmedProtected) {
        toast.error("Please confirm all protected files before applying");
      } else {
        toast.error("Failed to apply changes");
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-lg">Meta Agent</h2>
          {isMetaMode && (
            <Badge className="bg-primary/10 text-primary">
              Meta Mode Active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="meta-mode"
              checked={isMetaMode}
              onCheckedChange={setIsMetaMode}
            />
            <Label htmlFor="meta-mode" className="text-sm">
              Meta Mode
            </Label>
          </div>
        </div>
      </div>

      {/* Context indicator */}
      {(currentFile || selectedCode) && (
        <div className="px-4 py-2 bg-muted/50 border-b text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Code className="h-4 w-4" />
            {currentFile && <span>File: {currentFile}</span>}
            {selectedCode && <span>• {selectedCode.length} chars selected</span>}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Welcome to Meta Agent</p>
              <p className="text-sm mt-1">
                {isMetaMode
                  ? "Ask me to modify Hero IDE. I can add features, fix bugs, and update the design."
                  : "Enable Meta Mode to modify the IDE, or ask questions about the codebase."}
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.role === "assistant" ? (
                  <Streamdown>{message.content}</Streamdown>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}

                {/* Code blocks with apply button */}
                {message.codeBlocks && message.codeBlocks.length > 0 && isMetaMode && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handlePreviewChanges(message.codeBlocks!)}
                      disabled={previewMutation.isPending}
                    >
                      {previewMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Code className="h-4 w-4 mr-1" />
                      )}
                      Preview Changes
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Change preview panel */}
      {pendingChanges && (
        <div className="p-4 border-t">
          <ChangePreviewPanel
            previews={pendingChanges}
            onApply={handleApplyChanges}
            onCancel={() => setPendingChanges(null)}
            isApplying={applyMutation.isPending}
          />
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isMetaMode
                ? "Describe what you want to change in Hero IDE..."
                : "Ask about the codebase..."
            }
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className="self-end"
          >
            {chatMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Recent modifications */}
      {isMetaMode && historyQuery.data && historyQuery.data.length > 0 && (
        <div className="p-4 border-t bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Recent Modifications</span>
          </div>
          <div className="space-y-1">
            {historyQuery.data.slice(0, 3).map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                {log.level === "info" ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-destructive" />
                )}
                <span className="truncate">{log.event}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
