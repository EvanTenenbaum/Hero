import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAT_HISTORY_KEY = "hero_chat_history";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  model?: string;
  context?: MessageContext;
}

export interface MessageContext {
  projectId?: string;
  fileId?: string;
  selection?: string;
  roadmapTaskId?: string;
}

export function useChatMessages(projectId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentContext, setCurrentContext] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string, context?: MessageContext) => {
      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date(),
        context,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Simulate AI response - in production, this would call the LLM router
        const response = await simulateAIResponse(content, messages);
        
        const aiMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: response,
          timestamp: new Date(),
          model: "auto",
        };

        setMessages((prev) => [...prev, aiMessage]);
        
        // Save to storage
        const storageKey = projectId 
          ? `${CHAT_HISTORY_KEY}_${projectId}` 
          : CHAT_HISTORY_KEY;
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify([...messages, userMessage, aiMessage])
        );
      } catch (error) {
        console.error("Failed to send message:", error);
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, projectId]
  );

  const clearHistory = useCallback(async () => {
    setMessages([]);
    const storageKey = projectId 
      ? `${CHAT_HISTORY_KEY}_${projectId}` 
      : CHAT_HISTORY_KEY;
    await AsyncStorage.removeItem(storageKey);
  }, [projectId]);

  const setContext = useCallback((context: string | null) => {
    setCurrentContext(context);
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    clearHistory,
    currentContext,
    setContext,
  };
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Simulated AI responses for demo - will be replaced with actual LLM integration
async function simulateAIResponse(
  userMessage: string,
  history: ChatMessage[]
): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes("create") && lowerMessage.includes("task")) {
    return "I'll create that task for you. What priority level should it have? (Critical, High, Medium, or Low)\n\nOnce you confirm, I'll add it to your roadmap with the appropriate dependencies.";
  }

  if (lowerMessage.includes("roadmap") || lowerMessage.includes("plan")) {
    return "I can help you create a roadmap! Here's what I suggest:\n\n**Phase 1: Foundation**\n- Set up project structure\n- Configure development environment\n- Initialize version control\n\n**Phase 2: Core Features**\n- Implement main functionality\n- Add data persistence\n- Create API integrations\n\n**Phase 3: Polish**\n- UI/UX improvements\n- Testing and bug fixes\n- Documentation\n\nWould you like me to create tasks for any of these phases?";
  }

  if (lowerMessage.includes("what should i work on") || lowerMessage.includes("next")) {
    return "Based on your current roadmap and dependencies, I recommend:\n\n🎯 **Next Task**: Set up authentication\n- Priority: High\n- No blockers\n- Estimated: 2-3 hours\n\nThis task is a dependency for 3 other tasks, so completing it will unblock significant progress.\n\nWould you like me to assign an agent to this task?";
  }

  if (lowerMessage.includes("smart order") || lowerMessage.includes("reorder")) {
    return "I've analyzed your tasks and suggest this optimized order:\n\n1. **Database schema** (no dependencies)\n2. **API endpoints** (depends on #1)\n3. **Authentication** (can run parallel with #2)\n4. **Frontend components** (depends on #2, #3)\n\nTasks #2 and #3 can be executed in parallel by separate agents. Want me to apply this ordering?";
  }

  if (lowerMessage.includes("sprint")) {
    return "I'll create a sprint based on your priorities and capacity.\n\n**Sprint 1: Core Infrastructure** (1 week)\n\n| Task | Priority | Effort | Parallel |\n|------|----------|--------|----------|\n| Setup CI/CD | High | 4h | Yes |\n| Database models | High | 6h | Yes |\n| Auth system | Critical | 8h | No |\n| API scaffold | Medium | 4h | No |\n\nTotal: 22 hours | 2 parallel tracks available\n\nShall I create this sprint?";
  }

  return "I understand you want to work on your project. I can help you:\n\n• **Create tasks** - \"Add a task for user authentication\"\n• **Plan sprints** - \"Create a sprint for this week\"\n• **Optimize order** - \"Smart order my tasks\"\n• **Get recommendations** - \"What should I work on next?\"\n• **Manage agents** - \"Spawn an agent for the API task\"\n\nWhat would you like to do?";
}
