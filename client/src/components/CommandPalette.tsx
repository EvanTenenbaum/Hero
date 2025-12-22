/**
 * CommandPalette - Sprint 28
 * 
 * Cmd+K quick switcher for fast navigation across projects, files, and boards.
 * Inspired by VS Code's command palette and Raycast.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderGit2,
  MessageSquare,
  LayoutDashboard,
  Settings,
  Bot,
  Search,
  FileCode,
  Kanban,
  HardDrive,
  FileText,
  Home,
  ArrowRight,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  category: "navigation" | "project" | "recent" | "action";
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch data for search
  const { data: projects } = trpc.projects.list.useQuery(undefined, { enabled: open });
  const { data: conversations } = trpc.chat.conversations.useQuery(undefined, { enabled: open });
  const { data: boards } = trpc.kanban.getBoards.useQuery(undefined, { enabled: open });

  // Build command items
  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // Navigation commands
    items.push(
      {
        id: "nav-home",
        title: "Go to Home",
        icon: <Home className="h-4 w-4" />,
        action: () => setLocation("/"),
        category: "navigation",
        keywords: ["dashboard", "main"],
      },
      {
        id: "nav-projects",
        title: "Go to Projects",
        icon: <FolderGit2 className="h-4 w-4" />,
        action: () => setLocation("/projects"),
        category: "navigation",
        keywords: ["repos", "code"],
      },
      {
        id: "nav-chat",
        title: "Go to Chat",
        icon: <MessageSquare className="h-4 w-4" />,
        action: () => setLocation("/chat"),
        category: "navigation",
        keywords: ["ai", "assistant", "conversation"],
      },
      {
        id: "nav-agents",
        title: "Go to Agents",
        icon: <Bot className="h-4 w-4" />,
        action: () => setLocation("/agents"),
        category: "navigation",
        keywords: ["ai", "automation"],
      },
      {
        id: "nav-settings",
        title: "Go to Settings",
        icon: <Settings className="h-4 w-4" />,
        action: () => setLocation("/settings"),
        category: "navigation",
        keywords: ["preferences", "config"],
      }
    );

    // Project commands
    if (projects) {
      projects.slice(0, 5).forEach((project) => {
        items.push({
          id: `project-${project.id}`,
          title: project.name,
          subtitle: project.description || "Project",
          icon: <FolderGit2 className="h-4 w-4" />,
          action: () => setLocation(`/workspace/${project.id}`),
          category: "project",
          keywords: ["project", project.type || ""],
        });
      });
    }

    // Conversation commands
    if (conversations) {
      conversations.slice(0, 5).forEach((conv) => {
        items.push({
          id: `chat-${conv.id}`,
          title: conv.title || "Untitled Chat",
          subtitle: "Conversation",
          icon: <MessageSquare className="h-4 w-4" />,
          action: () => setLocation(`/chat/${conv.id}`),
          category: "recent",
          keywords: ["chat", "conversation"],
        });
      });
    }

    // Board commands
    if (boards) {
      boards.slice(0, 5).forEach((board) => {
        items.push({
          id: `board-${board.id}`,
          title: board.name,
          subtitle: "Kanban Board",
          icon: <Kanban className="h-4 w-4" />,
          action: () => setLocation(`/workspace?board=${board.id}`),
          category: "recent",
          keywords: ["kanban", "board", "tasks"],
        });
      });
    }

    // Action commands
    items.push(
      {
        id: "action-new-project",
        title: "Create New Project",
        icon: <FolderGit2 className="h-4 w-4" />,
        action: () => setLocation("/projects?new=true"),
        category: "action",
        keywords: ["new", "create"],
      },
      {
        id: "action-new-chat",
        title: "Start New Chat",
        icon: <MessageSquare className="h-4 w-4" />,
        action: () => setLocation("/chat"),
        category: "action",
        keywords: ["new", "create", "conversation"],
      }
    );

    return items;
  }, [projects, conversations, boards, setLocation]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter((cmd) => {
      const titleMatch = cmd.title.toLowerCase().includes(lowerQuery);
      const subtitleMatch = cmd.subtitle?.toLowerCase().includes(lowerQuery);
      const keywordMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(lowerQuery));
      return titleMatch || subtitleMatch || keywordMatch;
    });
  }, [commands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      navigation: [],
      project: [],
      recent: [],
      action: [],
    };

    filteredCommands.forEach((cmd) => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Reset query when dialog opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onOpenChange(false);
          }
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [filteredCommands, selectedIndex, onOpenChange]
  );

  const categoryLabels: Record<string, string> = {
    navigation: "Navigation",
    project: "Projects",
    recent: "Recent",
    action: "Actions",
  };

  let flatIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden bg-background border-border">
        {/* Search Input */}
        <div className="flex items-center gap-2 px-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, projects, chats..."
            className="border-0 focus-visible:ring-0 bg-transparent h-12 text-foreground placeholder:text-muted-foreground"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[300px]">
          <div className="p-2">
            {filteredCommands.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found for "{query}"
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, items]) => {
                if (items.length === 0) return null;

                return (
                  <div key={category} className="mb-2">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      {categoryLabels[category]}
                    </div>
                    {items.map((cmd) => {
                      const currentIndex = flatIndex++;
                      const isSelected = currentIndex === selectedIndex;

                      return (
                        <button
                          key={cmd.id}
                          onClick={() => {
                            cmd.action();
                            onOpenChange(false);
                          }}
                          onMouseEnter={() => setSelectedIndex(currentIndex)}
                          className={cn(
                            "w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors",
                            isSelected
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-accent"
                          )}
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                            isSelected ? "bg-primary/20" : "bg-muted"
                          )}>
                            {cmd.icon}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium">{cmd.title}</div>
                            {cmd.subtitle && (
                              <div className="text-xs text-muted-foreground">
                                {cmd.subtitle}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <ArrowRight className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">↑↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">↵</kbd>
            <span>Select</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">esc</kbd>
            <span>Close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manage command palette state with keyboard shortcut
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}

export default CommandPalette;
