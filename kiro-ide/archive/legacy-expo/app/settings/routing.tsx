import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Routing rule types
interface RoutingRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  targetModel: string;
  priority: number;
  enabled: boolean;
}

interface TaskTypeRouting {
  taskType: string;
  icon: IconSymbolName;
  description: string;
  preferredModels: string[];
  fallbackModel: string;
}

// Default routing rules
const DEFAULT_RULES: RoutingRule[] = [
  {
    id: "1",
    name: "Complex Reasoning",
    description: "Route complex reasoning tasks to most capable model",
    condition: "complexity > 0.8 OR requires_reasoning = true",
    targetModel: "claude-3.5-sonnet",
    priority: 1,
    enabled: true,
  },
  {
    id: "2",
    name: "Code Generation",
    description: "Route code tasks to specialized coding models",
    condition: "task_type = 'code' AND language IN supported_languages",
    targetModel: "gpt-4o",
    priority: 2,
    enabled: true,
  },
  {
    id: "3",
    name: "Fast Responses",
    description: "Route simple tasks to fast models for quick responses",
    condition: "complexity < 0.3 AND tokens < 1000",
    targetModel: "gpt-4o-mini",
    priority: 3,
    enabled: true,
  },
  {
    id: "4",
    name: "Long Context",
    description: "Route tasks with large context to models with high token limits",
    condition: "context_tokens > 100000",
    targetModel: "gemini-1.5-pro",
    priority: 4,
    enabled: true,
  },
  {
    id: "5",
    name: "Cost Optimization",
    description: "Route low-priority tasks to cost-effective models",
    condition: "priority = 'low' AND NOT critical",
    targetModel: "llama-3.1-8b",
    priority: 5,
    enabled: false,
  },
];

const TASK_TYPE_ROUTING: TaskTypeRouting[] = [
  {
    taskType: "Code Generation",
    icon: "chevron.left.forwardslash.chevron.right",
    description: "Writing new code, implementing features",
    preferredModels: ["gpt-4o", "claude-3.5-sonnet", "codestral"],
    fallbackModel: "gpt-4o-mini",
  },
  {
    taskType: "Code Review",
    icon: "magnifyingglass",
    description: "Reviewing PRs, finding bugs, suggesting improvements",
    preferredModels: ["claude-3.5-sonnet", "gpt-4o"],
    fallbackModel: "gpt-4o-mini",
  },
  {
    taskType: "Documentation",
    icon: "doc.text.fill",
    description: "Writing docs, README files, comments",
    preferredModels: ["gpt-4o", "claude-3.5-sonnet"],
    fallbackModel: "gpt-4o-mini",
  },
  {
    taskType: "Planning",
    icon: "list.bullet",
    description: "Architecture decisions, task breakdown",
    preferredModels: ["claude-3.5-sonnet", "o1"],
    fallbackModel: "gpt-4o",
  },
  {
    taskType: "Debugging",
    icon: "ladybug.fill",
    description: "Finding and fixing bugs, error analysis",
    preferredModels: ["gpt-4o", "claude-3.5-sonnet"],
    fallbackModel: "gpt-4o-mini",
  },
  {
    taskType: "Refactoring",
    icon: "arrow.triangle.2.circlepath",
    description: "Improving code structure, optimization",
    preferredModels: ["claude-3.5-sonnet", "gpt-4o"],
    fallbackModel: "codestral",
  },
];

export default function RoutingScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const [rules, setRules] = useState<RoutingRule[]>(DEFAULT_RULES);
  const [smartRoutingEnabled, setSmartRoutingEnabled] = useState(true);
  const [costOptimization, setCostOptimization] = useState(false);
  const [expandedTaskType, setExpandedTaskType] = useState<string | null>(null);

  const handleToggleRule = useCallback((ruleId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  }, []);

  const renderRule = useCallback(
    ({ item }: { item: RoutingRule }) => (
      <View style={[styles.ruleCard, { backgroundColor: colors.surface }]}>
        <View style={styles.ruleHeader}>
          <View style={styles.ruleInfo}>
            <View style={styles.rulePriority}>
              <ThemedText type="small" style={{ color: Accent.primary }}>
                #{item.priority}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
              <ThemedText type="caption">{item.description}</ThemedText>
            </View>
          </View>
          <Switch
            value={item.enabled}
            onValueChange={() => handleToggleRule(item.id)}
            trackColor={{ false: colors.background, true: Accent.primary + "60" }}
            thumbColor={item.enabled ? Accent.primary : colors.textSecondary}
          />
        </View>
        <View style={styles.ruleDetails}>
          <View style={[styles.conditionBox, { backgroundColor: colors.background }]}>
            <ThemedText type="code" style={{ fontSize: 11 }}>
              {item.condition}
            </ThemedText>
          </View>
          <View style={styles.targetModel}>
            <IconSymbol name="arrow.right" size={12} color={colors.textSecondary} />
            <View style={[styles.modelBadge, { backgroundColor: Accent.primary + "20" }]}>
              <ThemedText type="small" style={{ color: Accent.primary }}>
                {item.targetModel}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
    ),
    [colors, handleToggleRule]
  );

  const renderTaskType = useCallback(
    ({ item }: { item: TaskTypeRouting }) => {
      const isExpanded = expandedTaskType === item.taskType;
      return (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setExpandedTaskType(isExpanded ? null : item.taskType);
          }}
          style={[styles.taskTypeCard, { backgroundColor: colors.surface }]}
        >
          <View style={styles.taskTypeHeader}>
            <View style={[styles.taskTypeIcon, { backgroundColor: Accent.primary + "20" }]}>
              <IconSymbol name={item.icon} size={20} color={Accent.primary} />
            </View>
            <View style={styles.taskTypeInfo}>
              <ThemedText type="defaultSemiBold">{item.taskType}</ThemedText>
              <ThemedText type="caption">{item.description}</ThemedText>
            </View>
            <IconSymbol
              name={isExpanded ? "chevron.up" : "chevron.down"}
              size={16}
              color={colors.textSecondary}
            />
          </View>
          {isExpanded && (
            <View style={styles.taskTypeDetails}>
              <ThemedText type="caption" style={styles.detailLabel}>
                PREFERRED MODELS (in order)
              </ThemedText>
              <View style={styles.modelList}>
                {item.preferredModels.map((model, index) => (
                  <View
                    key={model}
                    style={[
                      styles.modelItem,
                      { backgroundColor: index === 0 ? Accent.primary + "20" : colors.background },
                    ]}
                  >
                    <ThemedText type="small" style={{ marginRight: 4 }}>
                      {index + 1}.
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{ color: index === 0 ? Accent.primary : colors.text }}
                    >
                      {model}
                    </ThemedText>
                  </View>
                ))}
              </View>
              <ThemedText type="caption" style={[styles.detailLabel, { marginTop: Spacing.md }]}>
                FALLBACK MODEL
              </ThemedText>
              <View style={[styles.modelItem, { backgroundColor: colors.background }]}>
                <IconSymbol name="arrow.uturn.backward" size={12} color={colors.textSecondary} />
                <ThemedText type="small">{item.fallbackModel}</ThemedText>
              </View>
            </View>
          )}
        </Pressable>
      );
    },
    [colors, expandedTaskType]
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Master toggle */}
        <View style={[styles.masterToggle, { backgroundColor: colors.surface }]}>
          <View style={styles.toggleInfo}>
            <IconSymbol name="sparkles" size={24} color={Accent.primary} />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">Smart Routing</ThemedText>
              <ThemedText type="caption">
                Automatically select the best model based on task type and context
              </ThemedText>
            </View>
          </View>
          <Switch
            value={smartRoutingEnabled}
            onValueChange={(value) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setSmartRoutingEnabled(value);
            }}
            trackColor={{ false: colors.background, true: Accent.primary + "60" }}
            thumbColor={smartRoutingEnabled ? Accent.primary : colors.textSecondary}
          />
        </View>

        {/* Cost optimization toggle */}
        <View style={[styles.optionRow, { backgroundColor: colors.surface }]}>
          <View style={styles.optionInfo}>
            <IconSymbol name="dollarsign.circle" size={20} color={Accent.warning} />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">Cost Optimization</ThemedText>
              <ThemedText type="caption">
                Prefer cheaper models when quality requirements are lower
              </ThemedText>
            </View>
          </View>
          <Switch
            value={costOptimization}
            onValueChange={(value) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCostOptimization(value);
            }}
            trackColor={{ false: colors.background, true: Accent.warning + "60" }}
            thumbColor={costOptimization ? Accent.warning : colors.textSecondary}
          />
        </View>

        {/* Task type routing */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Task Type Routing
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionDescription}>
            Configure which models handle different types of tasks
          </ThemedText>
          {TASK_TYPE_ROUTING.map((item) => (
            <View key={item.taskType}>{renderTaskType({ item })}</View>
          ))}
        </View>

        {/* Custom rules */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <ThemedText type="subtitle">Custom Rules</ThemedText>
              <ThemedText type="caption">
                Define custom routing rules with conditions
              </ThemedText>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                // Add new rule
              }}
              style={[styles.addButton, { backgroundColor: Accent.primary }]}
            >
              <IconSymbol name="plus" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
          {rules.map((item) => (
            <View key={item.id}>{renderRule({ item })}</View>
          ))}
        </View>

        {/* Info banner */}
        <View style={[styles.infoBanner, { backgroundColor: Accent.primary + "10" }]}>
          <IconSymbol name="info.circle.fill" size={16} color={Accent.primary} />
          <ThemedText type="caption" style={{ flex: 1 }}>
            Rules are evaluated in priority order. The first matching rule determines the model.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  masterToggle: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  toggleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  optionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  sectionDescription: {
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  taskTypeCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  taskTypeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  taskTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  taskTypeInfo: {
    flex: 1,
  },
  taskTypeDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  detailLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  modelList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  modelItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
  },
  ruleCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  ruleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  ruleInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    flex: 1,
  },
  rulePriority: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,200,150,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  ruleDetails: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  conditionBox: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  targetModel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  modelBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
});
