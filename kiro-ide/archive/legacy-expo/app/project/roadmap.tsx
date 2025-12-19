import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState, useMemo } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRoadmap } from "@/hooks/use-roadmap";
import { Task, TaskStatus, TaskPriority, TaskType, SprintSuggestion } from "@/lib/roadmap";

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: "#6B7280",
  todo: "#3B82F6",
  in_progress: "#F59E0B",
  in_review: "#8B5CF6",
  blocked: "#EF4444",
  done: "#22C55E",
  cancelled: "#9CA3AF",
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: "#EF4444",
  high: "#F59E0B",
  medium: "#3B82F6",
  low: "#6B7280",
};

const TYPE_ICONS: Record<TaskType, IconSymbolName> = {
  feature: "sparkles",
  bug: "ladybug.fill",
  refactor: "arrow.triangle.2.circlepath",
  documentation: "doc.text.fill",
  test: "checkmark.circle.fill",
  chore: "wrench.fill",
  spike: "magnifyingglass",
};

export default function RoadmapScreen() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const {
    tasks,
    sprints,
    backlogTasks,
    activeSprint,
    sprintTasks,
    criticalPathTasks,
    tasksByStatus,
    stats,
    loading,
    addTask,
    editTask,
    deleteTask,
    setTaskStatus,
    setTaskPriority,
    getSuggestedSprint,
    applySprintSuggestion,
    executeNaturalLanguageCommand,
  } = useRoadmap(projectId || "default");

  const [viewMode, setViewMode] = useState<"board" | "list" | "timeline">("board");
  const [showAddTask, setShowAddTask] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState<SprintSuggestion | null>(null);
  const [commandInput, setCommandInput] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<TaskType>("feature");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("medium");

  const handleAddTask = useCallback(async () => {
    if (!newTaskTitle.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addTask({
      title: newTaskTitle,
      type: newTaskType,
      priority: newTaskPriority,
    });
    setNewTaskTitle("");
    setShowAddTask(false);
  }, [newTaskTitle, newTaskType, newTaskPriority, addTask]);

  const handleSuggestSprint = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const suggested = getSuggestedSprint({ maxPoints: 20, maxTasks: 8 });
    setSuggestion(suggested);
    setShowSuggestion(true);
  }, [getSuggestedSprint]);

  const handleApplySuggestion = useCallback(async () => {
    if (!suggestion) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await applySprintSuggestion(suggestion);
    setShowSuggestion(false);
    setSuggestion(null);
  }, [suggestion, applySprintSuggestion]);

  const handleCommand = useCallback(async () => {
    if (!commandInput.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await executeNaturalLanguageCommand(commandInput);
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setCommandInput("");
  }, [commandInput, executeNaturalLanguageCommand]);

  const renderTaskCard = useCallback(
    (task: Task, showStatus = false) => (
      <Pressable
        key={task.id}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // Navigate to task detail
        }}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          // Show context menu
        }}
        style={({ pressed }) => [
          styles.taskCard,
          { backgroundColor: colors.surface },
          pressed && styles.taskCardPressed,
        ]}
      >
        <View style={styles.taskHeader}>
          <View style={[styles.typeIcon, { backgroundColor: PRIORITY_COLORS[task.priority] + "20" }]}>
            <IconSymbol
              name={TYPE_ICONS[task.type] || "doc.fill"}
              size={14}
              color={PRIORITY_COLORS[task.priority]}
            />
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[task.priority] }]}>
            <ThemedText style={styles.priorityText}>{task.priority[0].toUpperCase()}</ThemedText>
          </View>
        </View>
        <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.taskTitle}>
          {task.title}
        </ThemedText>
        {task.description && (
          <ThemedText type="caption" numberOfLines={2} style={styles.taskDescription}>
            {task.description}
          </ThemedText>
        )}
        <View style={styles.taskFooter}>
          {showStatus && (
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[task.status] + "20" }]}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[task.status] }]} />
              <ThemedText type="small" style={{ color: STATUS_COLORS[task.status] }}>
                {task.status.replace("_", " ")}
              </ThemedText>
            </View>
          )}
          {task.storyPoints && (
            <View style={styles.pointsBadge}>
              <ThemedText type="small">{task.storyPoints}pt</ThemedText>
            </View>
          )}
          {task.dependsOn.length > 0 && (
            <View style={styles.depsBadge}>
              <IconSymbol name="link" size={10} color={colors.textSecondary} />
              <ThemedText type="small">{task.dependsOn.length}</ThemedText>
            </View>
          )}
        </View>
      </Pressable>
    ),
    [colors]
  );

  const renderKanbanColumn = useCallback(
    (status: TaskStatus, title: string) => {
      const columnTasks = tasksByStatus[status];
      return (
        <View style={styles.kanbanColumn}>
          <View style={styles.columnHeader}>
            <View style={[styles.columnDot, { backgroundColor: STATUS_COLORS[status] }]} />
            <ThemedText type="defaultSemiBold">{title}</ThemedText>
            <View style={styles.columnCount}>
              <ThemedText type="small">{columnTasks.length}</ThemedText>
            </View>
          </View>
          <ScrollView
            style={styles.columnContent}
            showsVerticalScrollIndicator={false}
          >
            {columnTasks.map((task) => renderTaskCard(task))}
          </ScrollView>
        </View>
      );
    },
    [tasksByStatus, renderTaskCard]
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header Stats */}
      <View style={[styles.statsBar, { backgroundColor: colors.surface }]}>
        <View style={styles.statItem}>
          <ThemedText type="title" style={{ fontSize: 24 }}>{stats.total}</ThemedText>
          <ThemedText type="caption">Total</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText type="title" style={{ fontSize: 24, color: "#22C55E" }}>{stats.done}</ThemedText>
          <ThemedText type="caption">Done</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText type="title" style={{ fontSize: 24, color: "#F59E0B" }}>{stats.inProgress}</ThemedText>
          <ThemedText type="caption">In Progress</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText type="title" style={{ fontSize: 24, color: "#EF4444" }}>{stats.blocked}</ThemedText>
          <ThemedText type="caption">Blocked</ThemedText>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${stats.completion}%` }]} />
        </View>
      </View>

      {/* Natural Language Command Input */}
      <View style={[styles.commandBar, { backgroundColor: colors.surface }]}>
        <IconSymbol name="sparkles" size={18} color={Accent.primary} />
        <TextInput
          value={commandInput}
          onChangeText={setCommandInput}
          onSubmitEditing={handleCommand}
          placeholder="Tell the PM what to do... (e.g., 'add task fix login bug')"
          placeholderTextColor={colors.textSecondary}
          style={[styles.commandInput, { color: colors.text }]}
          returnKeyType="send"
        />
        <Pressable onPress={handleCommand} style={styles.commandSend}>
          <IconSymbol name="paperplane.fill" size={18} color={Accent.primary} />
        </Pressable>
      </View>

      {/* View Mode Tabs */}
      <View style={styles.viewTabs}>
        {(["board", "list", "timeline"] as const).map((mode) => (
          <Pressable
            key={mode}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode(mode);
            }}
            style={[
              styles.viewTab,
              viewMode === mode && { backgroundColor: Accent.primary + "20" },
            ]}
          >
            <IconSymbol
              name={mode === "board" ? "square.grid.2x2.fill" : mode === "list" ? "list.bullet" : "calendar"}
              size={16}
              color={viewMode === mode ? Accent.primary : colors.textSecondary}
            />
            <ThemedText
              type="small"
              style={{ color: viewMode === mode ? Accent.primary : colors.textSecondary }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </ThemedText>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={handleSuggestSprint}
          style={[styles.suggestButton, { backgroundColor: Accent.primary }]}
        >
          <IconSymbol name="sparkles" size={14} color="#FFFFFF" />
          <ThemedText style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>
            Smart Sprint
          </ThemedText>
        </Pressable>
      </View>

      {/* Kanban Board View */}
      {viewMode === "board" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.kanbanContainer,
            { paddingBottom: insets.bottom + 80 },
          ]}
        >
          {renderKanbanColumn("todo", "To Do")}
          {renderKanbanColumn("in_progress", "In Progress")}
          {renderKanbanColumn("in_review", "In Review")}
          {renderKanbanColumn("done", "Done")}
        </ScrollView>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderTaskCard(item, true)}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: insets.bottom + 80 },
          ]}
        />
      )}

      {/* Timeline View - Critical Path */}
      {viewMode === "timeline" && (
        <ScrollView
          contentContainerStyle={[
            styles.timelineContainer,
            { paddingBottom: insets.bottom + 80 },
          ]}
        >
          <ThemedText type="subtitle" style={styles.timelineTitle}>
            Critical Path
          </ThemedText>
          <ThemedText type="caption" style={styles.timelineSubtitle}>
            Tasks that determine project completion time
          </ThemedText>
          {criticalPathTasks.map((task, index) => (
            <View key={task.id} style={styles.timelineItem}>
              <View style={styles.timelineLine}>
                <View style={[styles.timelineDot, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
                {index < criticalPathTasks.length - 1 && (
                  <View style={[styles.timelineConnector, { backgroundColor: colors.border }]} />
                )}
              </View>
              {renderTaskCard(task, true)}
            </View>
          ))}
          {criticalPathTasks.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol name="checkmark.circle.fill" size={48} color={colors.textSecondary} />
              <ThemedText type="caption">No critical path tasks</ThemedText>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Task FAB */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowAddTask(true);
        }}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: Accent.primary },
          pressed && styles.fabPressed,
        ]}
      >
        <IconSymbol name="plus" size={24} color="#FFFFFF" />
      </Pressable>

      {/* Add Task Modal */}
      <Modal
        visible={showAddTask}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddTask(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Add Task</ThemedText>
              <Pressable onPress={() => setShowAddTask(false)}>
                <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <TextInput
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              placeholder="Task title..."
              placeholderTextColor={colors.textSecondary}
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.background }]}
              autoFocus
            />

            <ThemedText type="caption" style={styles.modalLabel}>Type</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
              {(["feature", "bug", "refactor", "documentation", "test", "chore"] as TaskType[]).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setNewTaskType(type)}
                  style={[
                    styles.typeOption,
                    newTaskType === type && { backgroundColor: Accent.primary + "20", borderColor: Accent.primary },
                  ]}
                >
                  <IconSymbol
                    name={TYPE_ICONS[type]}
                    size={14}
                    color={newTaskType === type ? Accent.primary : colors.textSecondary}
                  />
                  <ThemedText
                    type="small"
                    style={{ color: newTaskType === type ? Accent.primary : colors.text }}
                  >
                    {type}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            <ThemedText type="caption" style={styles.modalLabel}>Priority</ThemedText>
            <View style={styles.prioritySelector}>
              {(["low", "medium", "high", "critical"] as TaskPriority[]).map((priority) => (
                <Pressable
                  key={priority}
                  onPress={() => setNewTaskPriority(priority)}
                  style={[
                    styles.priorityOption,
                    { borderColor: PRIORITY_COLORS[priority] },
                    newTaskPriority === priority && { backgroundColor: PRIORITY_COLORS[priority] + "20" },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: PRIORITY_COLORS[priority], textTransform: "capitalize" }}
                  >
                    {priority}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={handleAddTask}
              style={[styles.modalButton, { backgroundColor: Accent.primary }]}
            >
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>Add Task</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Sprint Suggestion Modal */}
      <Modal
        visible={showSuggestion}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSuggestion(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.suggestionModal, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={styles.suggestionHeader}>
                <IconSymbol name="sparkles" size={20} color={Accent.primary} />
                <ThemedText type="subtitle">Smart Sprint Suggestion</ThemedText>
              </View>
              <Pressable onPress={() => setShowSuggestion(false)}>
                <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {suggestion && (
              <>
                <View style={styles.suggestionStats}>
                  <View style={styles.suggestionStat}>
                    <ThemedText type="title" style={{ fontSize: 24 }}>{suggestion.taskIds.length}</ThemedText>
                    <ThemedText type="caption">Tasks</ThemedText>
                  </View>
                  <View style={styles.suggestionStat}>
                    <ThemedText type="title" style={{ fontSize: 24 }}>{suggestion.totalPoints}</ThemedText>
                    <ThemedText type="caption">Points</ThemedText>
                  </View>
                  <View style={styles.suggestionStat}>
                    <ThemedText type="title" style={{ fontSize: 24 }}>{suggestion.parallelOpportunities.length}</ThemedText>
                    <ThemedText type="caption">Parallel Groups</ThemedText>
                  </View>
                </View>

                <ThemedText type="defaultSemiBold" style={styles.suggestionGoal}>
                  {suggestion.goal}
                </ThemedText>

                <ThemedText type="caption" style={styles.suggestionReasoning}>
                  {suggestion.reasoning}
                </ThemedText>

                <ThemedText type="caption" style={styles.modalLabel}>Included Tasks</ThemedText>
                <ScrollView style={styles.suggestionTasks}>
                  {suggestion.taskIds.map((taskId) => {
                    const task = tasks.find((t) => t.id === taskId);
                    if (!task) return null;
                    return (
                      <View key={taskId} style={styles.suggestionTaskItem}>
                        <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
                        <ThemedText type="small" numberOfLines={1} style={{ flex: 1 }}>
                          {task.title}
                        </ThemedText>
                        {suggestion.criticalTasks.includes(taskId) && (
                          <View style={styles.criticalBadge}>
                            <ThemedText style={{ color: "#EF4444", fontSize: 10 }}>CRITICAL</ThemedText>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>

                <View style={styles.suggestionActions}>
                  <Pressable
                    onPress={() => setShowSuggestion(false)}
                    style={[styles.suggestionButton, { backgroundColor: colors.background }]}
                  >
                    <ThemedText>Dismiss</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleApplySuggestion}
                    style={[styles.suggestionButton, { backgroundColor: Accent.primary }]}
                  >
                    <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>Create Sprint</ThemedText>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsBar: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.lg,
    flexWrap: "wrap",
  },
  statItem: {
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    marginTop: Spacing.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#22C55E",
    borderRadius: 2,
  },
  commandBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: Spacing.lg,
    marginTop: 0,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  commandInput: {
    flex: 1,
    fontSize: 14,
  },
  commandSend: {
    padding: Spacing.xs,
  },
  viewTabs: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  viewTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  suggestButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  kanbanContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  kanbanColumn: {
    width: 280,
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  columnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  columnCount: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  columnContent: {
    flex: 1,
  },
  taskCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  taskCardPressed: {
    opacity: 0.8,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  typeIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  taskTitle: {
    marginBottom: 4,
  },
  taskDescription: {
    marginBottom: Spacing.sm,
  },
  taskFooter: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pointsBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  depsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  listContainer: {
    padding: Spacing.lg,
  },
  timelineContainer: {
    padding: Spacing.lg,
  },
  timelineTitle: {
    marginBottom: 4,
  },
  timelineSubtitle: {
    marginBottom: Spacing.lg,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  timelineLine: {
    width: 24,
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.95 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: "80%",
  },
  suggestionModal: {
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  modalInput: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  modalLabel: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  typeSelector: {
    marginBottom: Spacing.lg,
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginRight: Spacing.sm,
  },
  prioritySelector: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  priorityOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  modalButton: {
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  suggestionStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: Spacing.lg,
  },
  suggestionStat: {
    alignItems: "center",
  },
  suggestionGoal: {
    marginBottom: Spacing.sm,
  },
  suggestionReasoning: {
    marginBottom: Spacing.lg,
  },
  suggestionTasks: {
    maxHeight: 200,
    marginBottom: Spacing.lg,
  },
  suggestionTaskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  criticalBadge: {
    backgroundColor: "#EF444420",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  suggestionActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  suggestionButton: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
});
