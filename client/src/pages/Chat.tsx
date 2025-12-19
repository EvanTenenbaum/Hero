import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { MessageSquare, Plus, Send, Loader2, Bot, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface Message {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
}

export default function Chat() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const conversationId = params.id ? parseInt(params.id) : null;
  
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    onSuccess: () => {
      refetchMessages();
      setIsStreaming(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsStreaming(false);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNewChat = () => {
    createConversation.mutate({ title: "New Chat" });
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    let targetConversationId = conversationId;

    if (!targetConversationId) {
      // Create new conversation first
      const result = await createConversation.mutateAsync({ title: input.slice(0, 50) });
      targetConversationId = result.id;
    }

    const messageContent = input;
    setInput("");
    setIsStreaming(true);

    sendMessage.mutate({
      conversationId: targetConversationId,
      content: messageContent,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Conversation List */}
        <div className="w-64 border-r border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <Button onClick={handleNewChat} className="w-full bg-violet-600 hover:bg-violet-700 gap-2">
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
                      ? "bg-violet-600/20 text-violet-300"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="truncate">{conv.title || "New Chat"}</span>
                  </div>
                </button>
              ))}
              {(!conversations || conversations.length === 0) && (
                <p className="text-slate-500 text-sm text-center py-4">No conversations yet</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {conversationId ? (
            <>
              {/* Messages */}
              <ScrollArea ref={scrollRef} className="flex-1 p-4">
                <div className="max-w-3xl mx-auto space-y-4">
                  {messages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%] ${
                          msg.role === "user"
                            ? "bg-violet-600 text-white"
                            : "bg-slate-800 text-slate-200"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <Streamdown>{msg.content}</Streamdown>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="h-8 w-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isStreaming && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-slate-800 rounded-lg px-4 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t border-slate-800">
                <div className="max-w-3xl mx-auto flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    disabled={isStreaming}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                    className="bg-violet-600 hover:bg-violet-700"
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
              <Card className="bg-slate-900/50 border-slate-800 max-w-md">
                <CardContent className="flex flex-col items-center py-12">
                  <div className="h-16 w-16 rounded-full bg-violet-500/20 flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Start a Conversation</h3>
                  <p className="text-slate-400 text-sm text-center mb-4">
                    Chat with Hero IDE's AI assistant for help with coding, debugging, and more.
                  </p>
                  <Button onClick={handleNewChat} className="bg-violet-600 hover:bg-violet-700 gap-2">
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
