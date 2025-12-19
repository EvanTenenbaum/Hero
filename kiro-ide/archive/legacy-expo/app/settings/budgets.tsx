import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Budget limit types
interface BudgetLimit {
  id: string;
  name: string;
  description: string;
  icon: IconSymbolName;
  value: number;
  unit: string;
  maxValue: number;
  warningThreshold: number;
  enabled: boolean;
  hardLimit: boolean;
}

// Default budget limits
const DEFAULT_LIMITS: BudgetLimit[] = [
  {
    id: "tokens_per_request",
    name: "Tokens per Request",
    description: "Maximum tokens for a single LLM request",
    icon: "text.word.spacing",
    value: 8000,
    unit: "tokens",
    maxValue: 128000,
    warningThreshold: 0.8,
    enabled: true,
    hardLimit: true,
  },
  {
    id: "context_size",
    name: "Context Window Size",
    description: "Maximum context size for agent operations",
    icon: "doc.text.fill",
    value: 100000,
    unit: "tokens",
    maxValue: 200000,
    warningThreshold: 0.9,
    enabled: true,
    hardLimit: true,
  },
  {
    id: "steps_per_task",
    name: "Steps per Task",
    description: "Maximum agent steps before requiring approval",
    icon: "list.number",
    value: 10,
    unit: "steps",
    maxValue: 50,
    warningThreshold: 0.8,
    enabled: true,
    hardLimit: true,
  },
  {
    id: "cost_per_session",
    name: "Cost per Session",
    description: "Maximum API cost per session",
    icon: "dollarsign.circle",
    value: 5,
    unit: "USD",
    maxValue: 100,
    warningThreshold: 0.7,
    enabled: true,
    hardLimit: false,
  },
  {
    id: "time_per_task",
    name: "Time per Task",
    description: "Maximum execution time for a single task",
    icon: "clock.fill",
    value: 300,
    unit: "seconds",
    maxValue: 3600,
    warningThreshold: 0.8,
    enabled: true,
    hardLimit: true,
  },
  {
    id: "files_per_change",
    name: "Files per Change",
    description: "Maximum files modified in a single change",
    icon: "folder.fill",
    value: 10,
    unit: "files",
    maxValue: 100,
    warningThreshold: 0.8,
    enabled: true,
    hardLimit: true,
  },
  {
    id: "scope_expansion",
    name: "Scope Expansion",
    description: "Maximum allowed scope expansion from original request",
    icon: "arrow.up.left.and.arrow.down.right",
    value: 20,
    unit: "%",
    maxValue: 100,
    warningThreshold: 0.5,
    enabled: true,
    hardLimit: true,
  },
];

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const [limits, setLimits] = useState<BudgetLimit[]>(DEFAULT_LIMITS);
  const [failEarlyEnabled, setFailEarlyEnabled] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  const [editingLimit, setEditingLimit] = useState<string | null>(null);

  const handleToggleLimit = useCallback((limitId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLimits((prev) =>
      prev.map((l) => (l.id === limitId ? { ...l, enabled: !l.enabled } : l))
    );
  }, []);

  const handleToggleHardLimit = useCallback((limitId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLimits((prev) =>
      prev.map((l) => (l.id === limitId ? { ...l, hardLimit: !l.hardLimit } : l))
    );
  }, []);

  const handleUpdateValue = useCallback((limitId: string, value: number) => {
    setLimits((prev) =>
      prev.map((l) => (l.id === limitId ? { ...l, value: Math.min(value, l.maxValue) } : l))
    );
  }, []);

  const getUsageColor = (usage: number) => {
    if (usage >= 1) return Accent.error;
    if (usage >= 0.8) return Accent.warning;
    return Accent.success;
  };

  const renderLimit = useCallback(
    (limit: BudgetLimit) => {
      const isEditing = editingLimit === limit.id;
      const usagePercent = (limit.value / limit.maxValue) * 100;

      return (
        <View key={limit.id} style={[styles.limitCard, { backgroundColor: colors.surface }]}>
          <View style={styles.limitHeader}>
            <View style={[styles.limitIcon, { backgroundColor: Accent.primary + "20" }]}>
              <IconSymbol name={limit.icon} size={20} color={Accent.primary} />
            </View>
            <View style={styles.limitInfo}>
              <View style={styles.limitNameRow}>
                <ThemedText type="defaultSemiBold">{limit.name}</ThemedText>
                {limit.hardLimit && (
                  <View style={[styles.hardBadge, { backgroundColor: Accent.error + "20" }]}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={10} color={Accent.error} />
                    <ThemedText type="small" style={{ color: Accent.error }}>
                      Hard
                    </ThemedText>
                  </View>
                )}
              </View>
              <ThemedText type="caption">{limit.description}</ThemedText>
            </View>
            <Switch
              value={limit.enabled}
              onValueChange={() => handleToggleLimit(limit.id)}
              trackColor={{ false: colors.background, true: Accent.primary + "60" }}
              thumbColor={limit.enabled ? Accent.primary : colors.textSecondary}
            />
          </View>

          {limit.enabled && (
            <View style={styles.limitDetails}>
              {/* Value input */}
              <View style={styles.valueRow}>
                <Pressable
                  onPress={() => setEditingLimit(isEditing ? null : limit.id)}
                  style={[styles.valueBox, { backgroundColor: colors.background }]}
                >
                  {isEditing ? (
                    <TextInput
                      value={limit.value.toString()}
                      onChangeText={(text) => {
                        const num = parseInt(text) || 0;
                        handleUpdateValue(limit.id, num);
                      }}
                      onBlur={() => setEditingLimit(null)}
                      style={[styles.valueInput, { color: colors.text }]}
                      keyboardType="numeric"
                      autoFocus
                    />
                  ) : (
                    <ThemedText type="defaultSemiBold" style={{ fontSize: 20 }}>
                      {limit.value.toLocaleString()}
                    </ThemedText>
                  )}
                  <ThemedText type="caption">{limit.unit}</ThemedText>
                </Pressable>
                <View style={styles.maxValue}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    Max: {limit.maxValue.toLocaleString()} {limit.unit}
                  </ThemedText>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: getUsageColor(limit.value / limit.maxValue),
                        width: `${usagePercent}%`,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.warningMarker,
                      { left: `${limit.warningThreshold * 100}%` },
                    ]}
                  />
                </View>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {usagePercent.toFixed(0)}% of max
                </ThemedText>
              </View>

              {/* Hard limit toggle */}
              <Pressable
                onPress={() => handleToggleHardLimit(limit.id)}
                style={[
                  styles.hardLimitToggle,
                  {
                    backgroundColor: limit.hardLimit
                      ? Accent.error + "15"
                      : colors.background,
                  },
                ]}
              >
                <IconSymbol
                  name={limit.hardLimit ? "lock.fill" : "lock.open.fill"}
                  size={14}
                  color={limit.hardLimit ? Accent.error : colors.textSecondary}
                />
                <ThemedText
                  type="small"
                  style={{ color: limit.hardLimit ? Accent.error : colors.textSecondary }}
                >
                  {limit.hardLimit ? "Hard limit (will halt)" : "Soft limit (warning only)"}
                </ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      );
    },
    [colors, editingLimit, handleToggleLimit, handleToggleHardLimit, handleUpdateValue]
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Master controls */}
        <View style={[styles.masterCard, { backgroundColor: colors.surface }]}>
          <View style={styles.masterOption}>
            <View style={styles.masterInfo}>
              <IconSymbol name="exclamationmark.octagon.fill" size={24} color={Accent.error} />
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">Fail-Early Enforcement</ThemedText>
                <ThemedText type="caption">
                  Immediately halt when any hard limit is reached
                </ThemedText>
              </View>
            </View>
            <Switch
              value={failEarlyEnabled}
              onValueChange={(value) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setFailEarlyEnabled(value);
              }}
              trackColor={{ false: colors.background, true: Accent.error + "60" }}
              thumbColor={failEarlyEnabled ? Accent.error : colors.textSecondary}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.masterOption}>
            <View style={styles.masterInfo}>
              <IconSymbol name="bell.fill" size={24} color={Accent.warning} />
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">Warning Notifications</ThemedText>
                <ThemedText type="caption">
                  Show warnings when approaching limits
                </ThemedText>
              </View>
            </View>
            <Switch
              value={showWarnings}
              onValueChange={(value) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowWarnings(value);
              }}
              trackColor={{ false: colors.background, true: Accent.warning + "60" }}
              thumbColor={showWarnings ? Accent.warning : colors.textSecondary}
            />
          </View>
        </View>

        {/* Info banner */}
        <View style={[styles.infoBanner, { backgroundColor: Accent.primary + "10" }]}>
          <IconSymbol name="info.circle.fill" size={16} color={Accent.primary} />
          <ThemedText type="caption" style={{ flex: 1 }}>
            Hard limits enforce fail-early behavior. When reached, the agent will halt and present safe options instead of continuing.
          </ThemedText>
        </View>

        {/* Limits list */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Resource Limits
          </ThemedText>
          {limits.map(renderLimit)}
        </View>

        {/* Reset button */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setLimits(DEFAULT_LIMITS);
          }}
          style={[styles.resetButton, { backgroundColor: colors.surface }]}
        >
          <IconSymbol name="arrow.counterclockwise" size={16} color={colors.textSecondary} />
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            Reset to Defaults
          </ThemedText>
        </Pressable>
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
  masterCard: {
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  masterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  masterInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  limitCard: {
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  limitHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  limitIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  limitInfo: {
    flex: 1,
  },
  limitNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  hardBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    gap: 2,
  },
  limitDetails: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueBox: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  valueInput: {
    fontSize: 20,
    fontWeight: "600",
    minWidth: 80,
  },
  maxValue: {
    alignItems: "flex-end",
  },
  progressContainer: {
    gap: Spacing.xs,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  warningMarker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  hardLimitToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
});
