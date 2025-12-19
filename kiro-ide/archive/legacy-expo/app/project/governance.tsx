import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState, useMemo } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useGovernance } from "@/hooks/use-governance";
import { AutonomyMode, SystemState } from "@/lib/state-machine";
import { Violation } from "@/lib/violation-handler";
import { ChangeRequest } from "@/lib/change-lifecycle";

const MODE_COLORS: Record<AutonomyMode, string> = {
  directed: "#22C55E",
  collaborative: "#F59E0B",
  agentic: "#EF4444",
};

const MODE_DESCRIPTIONS: Record<AutonomyMode, string> = {
  directed: "All actions require explicit user approval",
  collaborative: "Low-risk actions auto-approved, high-risk needs approval",
  agentic: "Agent operates independently within defined limits",
};

export default function GovernanceScreen() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const {
    state,
    loading,
    isHalted,
    haltReasons,
    autonomyMode,
    changeAutonomyMode,
    budgetSummary,
    budgetState,
    violations,
    activeChange,
    changeProgress,
    getContextInspection,
    resumeFromHalt,
  } = useGovernance();

  const [selectedTab, setSelectedTab] = useState<"overview" | "changes" | "violations" | "context">("overview");

  const systemState = state?.system;
  const contextInspection = useMemo(() => getContextInspection(), [getContextInspection]);

  const handleModeChange = useCallback(
    async (mode: AutonomyMode) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await changeAutonomyMode(mode);
    },
    [changeAutonomyMode]
  );

  const handleHalt = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    // Halt is handled by the governance system automatically
  }, []);

  const handleResume = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await resumeFromHalt("User manually resumed system");
  }, [resumeFromHalt]);

  const getStateColor = (systemState: SystemState | undefined) => {
    if (!systemState) return "#6B7280";
    if (systemState.budget === "budget-exceeded") return "#DC2626";
    if (systemState.action === "apply") return "#F59E0B";
    if (systemState.action === "propose") return "#3B82F6";
    return "#22C55E";
  };

  const getStateLabel = (systemState: SystemState | undefined) => {
    if (!systemState) return "Loading";
    if (isHalted) return "Halted";
    if (systemState.budget === "budget-exceeded") return "Budget Exceeded";
    if (systemState.action === "apply") return "Executing";
    if (systemState.action === "propose") return "Planning";
    return "Idle";
  };

  const renderOverview = () => (
    <ScrollView
      contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* System State Card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <IconSymbol name="cpu.fill" size={20} color={getStateColor(systemState)} />
          <ThemedText type="subtitle">System State</ThemedText>
        </View>
        <View style={styles.stateDisplay}>
          <View style={[styles.stateBadge, { backgroundColor: getStateColor(systemState) + "20" }]}>
            <View style={[styles.stateDot, { backgroundColor: getStateColor(systemState) }]} />
            <ThemedText type="defaultSemiBold" style={{ color: getStateColor(systemState), textTransform: "uppercase" }}>
              {getStateLabel(systemState)}
            </ThemedText>
          </View>
          {isHalted ? (
            <Pressable
              onPress={handleResume}
              style={[styles.actionButton, { backgroundColor: "#22C55E" }]}
            >
              <IconSymbol name="play.fill" size={16} color="#FFFFFF" />
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>Resume</ThemedText>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleHalt}
              style={[styles.actionButton, { backgroundColor: "#EF4444" }]}
            >
              <IconSymbol name="stop.fill" size={16} color="#FFFFFF" />
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>Halt</ThemedText>
            </Pressable>
          )}
        </View>
      </View>

      {/* Autonomy Mode Card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <IconSymbol name="shield.fill" size={20} color={MODE_COLORS[autonomyMode]} />
          <ThemedText type="subtitle">Autonomy Mode</ThemedText>
        </View>
        <ThemedText type="caption" style={styles.modeDescription}>
          {MODE_DESCRIPTIONS[autonomyMode]}
        </ThemedText>
        <View style={styles.modeSelector}>
          {(["directed", "collaborative", "agentic"] as AutonomyMode[]).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => handleModeChange(mode)}
              style={[
                styles.modeOption,
                { borderColor: MODE_COLORS[mode] },
                autonomyMode === mode && { backgroundColor: MODE_COLORS[mode] + "20" },
              ]}
            >
              <View style={[styles.modeDot, { backgroundColor: MODE_COLORS[mode] }]} />
              <ThemedText
                type="small"
                style={{ color: autonomyMode === mode ? MODE_COLORS[mode] : colors.text }}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Budget Status Card */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <IconSymbol name="dollarsign.circle.fill" size={20} color={Accent.primary} />
          <ThemedText type="subtitle">Budget & Limits</ThemedText>
        </View>
        <View style={styles.budgetGrid}>
          <View style={styles.budgetItem}>
            <ThemedText type="caption">Status</ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: budgetSummary.statusColor }}>
              {budgetSummary.status}
            </ThemedText>
          </View>
          <View style={styles.budgetItem}>
            <ThemedText type="caption">Utilization</ThemedText>
            <View style={styles.budgetBar}>
              <View
                style={[
                  styles.budgetFill,
                  {
                    width: `${Math.min(budgetSummary.utilizationPercent, 100)}%`,
                    backgroundColor: budgetSummary.statusColor,
                  },
                ]}
              />
            </View>
            <ThemedText type="small">{Math.round(budgetSummary.utilizationPercent)}%</ThemedText>
          </View>
          {budgetSummary.topConcerns.length > 0 && (
            <View style={styles.budgetItem}>
              <ThemedText type="caption">Concerns</ThemedText>
              {budgetSummary.topConcerns.slice(0, 2).map((concern, i) => (
                <ThemedText key={i} type="small" style={{ color: "#F59E0B" }}>
                  • {concern}
                </ThemedText>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <ThemedText type="title" style={{ fontSize: 28, color: "#F59E0B" }}>
            {activeChange ? 1 : 0}
          </ThemedText>
          <ThemedText type="caption">Pending</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <ThemedText type="title" style={{ fontSize: 28, color: "#EF4444" }}>
            {violations.filter((v: Violation) => !v.acknowledged).length}
          </ThemedText>
          <ThemedText type="caption">Violations</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <ThemedText type="title" style={{ fontSize: 28, color: "#22C55E" }}>
            {contextInspection.summary.totalSources}
          </ThemedText>
          <ThemedText type="caption">Sources</ThemedText>
        </View>
      </View>
    </ScrollView>
  );

  const renderViolations = () => (
    <FlatList
      data={violations}
      keyExtractor={(item: Violation) => item.id}
      contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + 20 }]}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <IconSymbol name="checkmark.shield.fill" size={48} color="#22C55E" />
          <ThemedText type="caption">No violations detected</ThemedText>
        </View>
      }
      renderItem={({ item }: { item: Violation }) => (
        <View
          style={[
            styles.violationCard,
            { backgroundColor: colors.surface },
            item.acknowledged && styles.violationAcknowledged,
          ]}
        >
          <View style={styles.violationHeader}>
            <View style={[styles.severityBadge, { backgroundColor: item.severity === "critical" ? "#EF4444" : item.severity === "major" ? "#F59E0B" : "#3B82F6" }]}>
              <IconSymbol
                name={item.severity === "critical" ? "exclamationmark.triangle.fill" : "exclamationmark.circle.fill"}
                size={14}
                color="#FFFFFF"
              />
              <ThemedText style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "bold" }}>
                {item.severity.toUpperCase()}
              </ThemedText>
            </View>
            <ThemedText type="small">{new Date(item.timestamp).toLocaleTimeString()}</ThemedText>
          </View>
          <ThemedText type="defaultSemiBold">{item.type.replace(/_/g, " ")}</ThemedText>
          <ThemedText type="caption">{item.description}</ThemedText>
          {item.suggestedAction && (
            <View style={styles.suggestedAction}>
              <IconSymbol name="lightbulb.fill" size={12} color="#F59E0B" />
              <ThemedText type="small">{item.suggestedAction}</ThemedText>
            </View>
          )}
        </View>
      )}
    />
  );

  const renderContext = () => (
    <ScrollView
      contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <IconSymbol name="doc.text.fill" size={20} color={Accent.primary} />
          <ThemedText type="subtitle">Context Overview</ThemedText>
        </View>
        <View style={styles.contextStats}>
          <View style={styles.contextStat}>
            <ThemedText type="title" style={{ fontSize: 24 }}>{contextInspection.summary.totalSources}</ThemedText>
            <ThemedText type="caption">Sources</ThemedText>
          </View>
          <View style={styles.contextStat}>
            <ThemedText type="title" style={{ fontSize: 24 }}>{contextInspection.summary.totalTokens.toLocaleString()}</ThemedText>
            <ThemedText type="caption">Tokens</ThemedText>
          </View>
          <View style={styles.contextStat}>
            <ThemedText type="title" style={{ fontSize: 24 }}>{Math.round(contextInspection.summary.averageRelevance * 100)}%</ThemedText>
            <ThemedText type="caption">Relevance</ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <IconSymbol name="folder.fill" size={20} color={Accent.primary} />
          <ThemedText type="subtitle">Sources by Type</ThemedText>
        </View>
        {contextInspection.sources.map((source) => (
          <View key={source.source} style={styles.fileTypeRow}>
            <ThemedText type="code" numberOfLines={1} style={{ flex: 1 }}>{source.source}</ThemedText>
            <ThemedText type="small">{source.tokenCount} tokens</ThemedText>
          </View>
        ))}
      </View>

      {contextInspection.warnings.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#F59E0B" />
            <ThemedText type="subtitle">Warnings</ThemedText>
          </View>
          {contextInspection.warnings.map((warning, index) => (
            <View key={index} style={styles.warningItem}>
              <ThemedText type="caption">{warning}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderChanges = () => (
    <ScrollView
      contentContainerStyle={[styles.tabContent, { paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      {activeChange ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <IconSymbol name="arrow.triangle.2.circlepath" size={20} color={Accent.primary} />
            <ThemedText type="subtitle">Active Change</ThemedText>
          </View>
          <ThemedText type="defaultSemiBold">{activeChange.id}</ThemedText>
          <ThemedText type="caption">Step: {activeChange.currentStep}</ThemedText>
          {changeProgress && (
            <View style={styles.progressContainer}>
              <View style={styles.budgetBar}>
                <View
                  style={[
                    styles.budgetFill,
                    {
                      width: `${changeProgress.percentage}%`,
                      backgroundColor: Accent.primary,
                    },
                  ]}
                />
              </View>
              <ThemedText type="small">
                {changeProgress.current} / {changeProgress.total} steps
              </ThemedText>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <IconSymbol name="checkmark.circle.fill" size={48} color={colors.textSecondary} />
          <ThemedText type="caption">No active changes</ThemedText>
        </View>
      )}
    </ScrollView>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
        {(["overview", "changes", "violations", "context"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTab(tab);
            }}
            style={[
              styles.tab,
              selectedTab === tab && { borderBottomColor: Accent.primary, borderBottomWidth: 2 },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: selectedTab === tab ? Accent.primary : colors.textSecondary,
                textTransform: "capitalize",
              }}
            >
              {tab}
            </ThemedText>
            {tab === "violations" && violations.filter((v: Violation) => !v.acknowledged).length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: "#EF4444" }]}>
                <ThemedText style={{ color: "#FFFFFF", fontSize: 10 }}>
                  {violations.filter((v: Violation) => !v.acknowledged).length}
                </ThemedText>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Tab Content */}
      {selectedTab === "overview" && renderOverview()}
      {selectedTab === "changes" && renderChanges()}
      {selectedTab === "violations" && renderViolations()}
      {selectedTab === "context" && renderContext()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.md,
  },
  tabBadge: {
    backgroundColor: Accent.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: "center",
  },
  tabContent: {
    padding: Spacing.lg,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  stateDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  stateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  modeDescription: {
    marginBottom: Spacing.md,
  },
  modeSelector: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  modeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  budgetGrid: {
    gap: Spacing.md,
  },
  budgetItem: {
    gap: 4,
  },
  budgetBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  budgetFill: {
    height: "100%",
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  violationCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  violationAcknowledged: {
    opacity: 0.6,
    borderLeftColor: "#6B7280",
  },
  violationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  suggestedAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F59E0B20",
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  contextStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  contextStat: {
    alignItems: "center",
  },
  fileTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  warningItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  progressContainer: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
});
