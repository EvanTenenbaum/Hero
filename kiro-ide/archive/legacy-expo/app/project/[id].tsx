import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useProjects } from "@/hooks/use-projects";

type WorkspaceTab = "files" | "roadmap" | "chat" | "agents";

export default function ProjectWorkspaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { getProject } = useProjects();
  
  const project = getProject(id);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("files");

  const tabs: { id: WorkspaceTab; label: string; icon: any }[] = [
    { id: "files", label: "Files", icon: "folder.fill" },
    { id: "roadmap", label: "Roadmap", icon: "list.bullet" },
    { id: "chat", label: "Chat", icon: "bubble.left.fill" },
    { id: "agents", label: "Agents", icon: "cpu.fill" },
  ];

  if (!project) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorState}>
          <IconSymbol name="exclamationmark.triangle.fill" size={48} color={Accent.error} />
          <ThemedText type="subtitle" style={{ marginTop: 16 }}>
            Project not found
          </ThemedText>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
          >
            <ThemedText>Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 12),
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButtonSmall}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerTitle}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {project.name}
            </ThemedText>
            <View style={styles.branchBadge}>
              <IconSymbol name="arrow.triangle.branch" size={12} color={colors.textSecondary} />
              <ThemedText type="small">{project.currentBranch}</ThemedText>
            </View>
          </View>
          <Pressable style={styles.syncButton}>
            <IconSymbol name="arrow.up.arrow.down" size={20} color={Accent.primary} />
          </Pressable>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.id);
              }}
              style={[
                styles.tab,
                activeTab === tab.id && styles.activeTab,
              ]}
            >
              <IconSymbol
                name={tab.icon}
                size={18}
                color={activeTab === tab.id ? Accent.primary : colors.textSecondary}
              />
              <ThemedText
                type="small"
                style={{
                  color: activeTab === tab.id ? Accent.primary : colors.textSecondary,
                }}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "files" && <FilesTab colors={colors} />}
        {activeTab === "roadmap" && <RoadmapTab colors={colors} />}
        {activeTab === "chat" && <ChatTab colors={colors} />}
        {activeTab === "agents" && <AgentsTab colors={colors} />}
      </View>

      {/* Bottom toolbar */}
      <View
        style={[
          styles.toolbar,
          {
            paddingBottom: Math.max(insets.bottom, 8),
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable style={styles.toolbarButton}>
          <IconSymbol name="terminal.fill" size={20} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.toolbarCenter}>
          <View style={[styles.statusDot, { backgroundColor: Accent.success }]} />
          <ThemedText type="small">No changes</ThemedText>
        </View>
        <Pressable style={styles.toolbarButton}>
          <IconSymbol name="sparkles" size={20} color={Accent.primary} />
        </Pressable>
      </View>
    </ThemedView>
  );
}

function FilesTab({ colors }: { colors: typeof Colors.dark }) {
  const files = [
    { name: "src", type: "folder", children: 12 },
    { name: "package.json", type: "file" },
    { name: "tsconfig.json", type: "file" },
    { name: "README.md", type: "file" },
  ];

  return (
    <ScrollView style={styles.tabContent}>
      <View style={styles.fileList}>
        {files.map((file, i) => (
          <Pressable
            key={i}
            style={[styles.fileItem, { backgroundColor: colors.surface }]}
          >
            <IconSymbol
              name={file.type === "folder" ? "folder.fill" : "doc.fill"}
              size={20}
              color={file.type === "folder" ? Accent.warning : colors.textSecondary}
            />
            <ThemedText style={{ flex: 1 }}>{file.name}</ThemedText>
            {file.type === "folder" && (
              <ThemedText type="small">{file.children} items</ThemedText>
            )}
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function RoadmapTab({ colors }: { colors: typeof Colors.dark }) {
  const tasks = [
    { title: "Set up project structure", status: "done", severity: "high" },
    { title: "Implement authentication", status: "in-progress", severity: "critical" },
    { title: "Create API endpoints", status: "todo", severity: "high" },
    { title: "Add database models", status: "todo", severity: "medium" },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return Accent.error;
      case "high": return "#F97316";
      case "medium": return Accent.warning;
      default: return Accent.success;
    }
  };

  return (
    <ScrollView style={styles.tabContent}>
      <View style={styles.roadmapHeader}>
        <ThemedText type="subtitle">Sprint 1</ThemedText>
        <Pressable style={[styles.smartOrderButton, { backgroundColor: Accent.primary + "20" }]}>
          <IconSymbol name="sparkles" size={14} color={Accent.primary} />
          <ThemedText type="small" style={{ color: Accent.primary }}>Smart Order</ThemedText>
        </Pressable>
      </View>
      <View style={styles.taskList}>
        {tasks.map((task, i) => (
          <View key={i} style={[styles.taskCard, { backgroundColor: colors.surface }]}>
            <View style={styles.taskDragHandle}>
              <IconSymbol name="ellipsis" size={16} color={colors.textDisabled} />
            </View>
            <View style={styles.taskContent}>
              <View style={styles.taskHeader}>
                <ThemedText numberOfLines={1} style={{ flex: 1 }}>
                  {task.title}
                </ThemedText>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(task.severity) + "20" },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: getSeverityColor(task.severity) }}
                  >
                    {task.severity}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.taskMeta}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        task.status === "done"
                          ? Accent.success + "20"
                          : task.status === "in-progress"
                          ? Accent.primary + "20"
                          : colors.elevated,
                    },
                  ]}
                >
                  <ThemedText type="small">
                    {task.status.replace("-", " ")}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function ChatTab({ colors }: { colors: typeof Colors.dark }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.emptyTabState}>
        <IconSymbol name="bubble.left.fill" size={48} color={colors.textDisabled} />
        <ThemedText type="subtitle" style={{ color: colors.textSecondary, marginTop: 16 }}>
          Project Chat
        </ThemedText>
        <ThemedText type="caption" style={{ textAlign: "center" }}>
          Chat with AI about this project's context
        </ThemedText>
      </View>
    </View>
  );
}

function AgentsTab({ colors }: { colors: typeof Colors.dark }) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.emptyTabState}>
        <IconSymbol name="cpu.fill" size={48} color={colors.textDisabled} />
        <ThemedText type="subtitle" style={{ color: colors.textSecondary, marginTop: 16 }}>
          Project Agents
        </ThemedText>
        <ThemedText type="caption" style={{ textAlign: "center" }}>
          Spawn agents to work on this project
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  backButtonSmall: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    gap: 4,
  },
  branchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  syncButton: {
    padding: Spacing.sm,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Accent.primary,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: Spacing.md,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  toolbarButton: {
    padding: Spacing.sm,
  },
  toolbarCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  fileList: {
    gap: Spacing.sm,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.md,
  },
  roadmapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  smartOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  taskList: {
    gap: Spacing.sm,
  },
  taskCard: {
    flexDirection: "row",
    borderRadius: Radius.md,
    overflow: "hidden",
  },
  taskDragHandle: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  taskContent: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  severityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  taskMeta: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  emptyTabState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
});
