import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  AgentExecution,
  AgentStep,
  AgentState,
  HaltReason,
  SafeOption,
  getExecutionSummary,
  getSafeOptions,
} from "@/lib/safe-agentic";

// Mock execution data
const MOCK_EXECUTION: AgentExecution = {
  id: "exec_123",
  agentType: "coding",
  goal: {
    id: "goal_1",
    description: "Implement user authentication with JWT tokens",
    successCriteria: [
      "Login endpoint working",
      "Token validation middleware",
      "Refresh token support",
    ],
    assumptions: [
      "Using Express.js backend",
      "PostgreSQL database available",
      "bcrypt for password hashing",
    ],
    stoppingConditions: [
      "All tests pass",
      "No security vulnerabilities",
      "Documentation complete",
    ],
    createdAt: new Date(Date.now() - 3600000),
    validatedAt: new Date(Date.now() - 3500000),
  },
  state: "executing",
  maxSteps: 10,
  uncertaintyThreshold: 70,
  allowScopeExpansion: false,
  requireApprovalForChanges: true,
  autoCheckpoint: true,
  steps: [
    {
      id: "step_1",
      stepNumber: 1,
      description: "Create user model and migration",
      action: "create_file",
      status: "completed",
      preChecks: {
        goalStillValid: true,
        scopeUnchanged: true,
        uncertaintyLevel: 15,
        budgetRemaining: true,
        dependenciesMet: true,
      },
      result: {
        success: true,
        output: "Created models/User.ts and migrations/001_create_users.sql",
        changesApplied: ["models/User.ts", "migrations/001_create_users.sql"],
        rollbackAvailable: true,
      },
      startedAt: new Date(Date.now() - 300000),
      completedAt: new Date(Date.now() - 280000),
      durationMs: 20000,
    },
    {
      id: "step_2",
      stepNumber: 2,
      description: "Implement password hashing utility",
      action: "create_file",
      status: "completed",
      preChecks: {
        goalStillValid: true,
        scopeUnchanged: true,
        uncertaintyLevel: 10,
        budgetRemaining: true,
        dependenciesMet: true,
      },
      result: {
        success: true,
        output: "Created utils/password.ts with hash and verify functions",
        changesApplied: ["utils/password.ts"],
        rollbackAvailable: true,
      },
      startedAt: new Date(Date.now() - 250000),
      completedAt: new Date(Date.now() - 235000),
      durationMs: 15000,
    },
    {
      id: "step_3",
      stepNumber: 3,
      description: "Create JWT token service",
      action: "create_file",
      status: "executing",
      preChecks: {
        goalStillValid: true,
        scopeUnchanged: true,
        uncertaintyLevel: 45,
        budgetRemaining: true,
        dependenciesMet: true,
      },
      startedAt: new Date(Date.now() - 60000),
    },
  ],
  currentStepIndex: 2,
  totalTokensUsed: 15420,
  totalCost: 45, // cents
  totalDurationMs: 240000,
  startedAt: new Date(Date.now() - 300000),
  lastActivityAt: new Date(),
};

export default function AgentExecutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const [execution, setExecution] = useState<AgentExecution>(MOCK_EXECUTION);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const summary = getExecutionSummary(execution);

  const handleHalt = useCallback(() => {
    Alert.alert(
      "Halt Execution",
      "Are you sure you want to halt this agent? It will stop at the current step.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Halt",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setExecution((prev) => ({
              ...prev,
              state: "halted",
              haltReason: "user_requested",
              haltDetails: "Halted by user request",
            }));
          },
        },
      ]
    );
  }, []);

  const handleResume = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExecution((prev) => ({
      ...prev,
      state: "executing",
      haltReason: undefined,
      haltDetails: undefined,
    }));
  }, []);

  const handleSafeOption = useCallback((option: SafeOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    switch (option.action) {
      case "rollback":
        Alert.alert(
          "Rollback Changes",
          "This will undo all changes made by this execution. Continue?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Rollback",
              style: "destructive",
              onPress: () => {
                setExecution((prev) => ({
                  ...prev,
                  state: "failed",
                  haltDetails: "Rolled back by user",
                }));
              },
            },
          ]
        );
        break;
      case "abort":
        setExecution((prev) => ({
          ...prev,
          state: "failed",
          haltDetails: "Aborted by user",
        }));
        break;
      case "pause":
        setExecution((prev) => ({
          ...prev,
          state: "waiting_approval",
        }));
        break;
      default:
        Alert.alert("Action", `Selected: ${option.label}`);
    }
  }, []);

  const getStateColor = (state: AgentState) => {
    switch (state) {
      case "executing":
        return Accent.primary;
      case "completed":
        return Accent.success;
      case "halted":
        return Accent.warning;
      case "failed":
        return Accent.error;
      case "waiting_approval":
        return Accent.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getStateIcon = (state: AgentState): IconSymbolName => {
    switch (state) {
      case "executing":
        return "play.fill";
      case "completed":
        return "checkmark.circle.fill";
      case "halted":
        return "pause.fill";
      case "failed":
        return "xmark.circle.fill";
      case "waiting_approval":
        return "clock.fill";
      default:
        return "ellipsis";
    }
  };

  const renderStep = (step: AgentStep) => {
    const isExpanded = expandedStep === step.id;
    const isActive = step.status === "executing";
    
    return (
      <Pressable
        key={step.id}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpandedStep(isExpanded ? null : step.id);
        }}
        style={[
          styles.stepCard,
          {
            backgroundColor: colors.surface,
            borderLeftColor:
              step.status === "completed"
                ? Accent.success
                : step.status === "failed"
                ? Accent.error
                : isActive
                ? Accent.primary
                : colors.border,
          },
        ]}
      >
        <View style={styles.stepHeader}>
          <View style={styles.stepNumber}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              #{step.stepNumber}
            </ThemedText>
          </View>
          <View style={styles.stepInfo}>
            <ThemedText type="defaultSemiBold" numberOfLines={isExpanded ? undefined : 1}>
              {step.description}
            </ThemedText>
            <View style={styles.stepMeta}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      step.status === "completed"
                        ? Accent.success + "20"
                        : step.status === "failed"
                        ? Accent.error + "20"
                        : isActive
                        ? Accent.primary + "20"
                        : colors.background,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color:
                      step.status === "completed"
                        ? Accent.success
                        : step.status === "failed"
                        ? Accent.error
                        : isActive
                        ? Accent.primary
                        : colors.textSecondary,
                  }}
                >
                  {step.status}
                </ThemedText>
              </View>
              {step.preChecks.uncertaintyLevel > 30 && (
                <View style={[styles.uncertaintyBadge, { backgroundColor: Accent.warning + "20" }]}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={10} color={Accent.warning} />
                  <ThemedText type="small" style={{ color: Accent.warning }}>
                    {step.preChecks.uncertaintyLevel}%
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
          <IconSymbol
            name={isExpanded ? "chevron.up" : "chevron.down"}
            size={16}
            color={colors.textSecondary}
          />
        </View>

        {isExpanded && (
          <View style={styles.stepDetails}>
            {/* Pre-checks */}
            <View style={styles.detailSection}>
              <ThemedText type="caption" style={styles.detailLabel}>
                PRE-CHECKS
              </ThemedText>
              <View style={styles.checksList}>
                {Object.entries(step.preChecks).map(([key, value]) => (
                  <View key={key} style={styles.checkItem}>
                    <IconSymbol
                      name={
                        typeof value === "boolean"
                          ? value
                            ? "checkmark.circle.fill"
                            : "xmark.circle.fill"
                          : "info.circle.fill"
                      }
                      size={14}
                      color={
                        typeof value === "boolean"
                          ? value
                            ? Accent.success
                            : Accent.error
                          : value > 50
                          ? Accent.warning
                          : Accent.success
                      }
                    />
                    <ThemedText type="small">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                      {typeof value === "number" && `: ${value}%`}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>

            {/* Result */}
            {step.result && (
              <View style={styles.detailSection}>
                <ThemedText type="caption" style={styles.detailLabel}>
                  RESULT
                </ThemedText>
                <View style={[styles.resultBox, { backgroundColor: colors.background }]}>
                  <ThemedText type="small">{step.result.output || step.result.error}</ThemedText>
                </View>
                {step.result.changesApplied.length > 0 && (
                  <View style={styles.changesList}>
                    <ThemedText type="caption">Changes:</ThemedText>
                    {step.result.changesApplied.map((change, i) => (
                      <ThemedText key={i} type="code" style={{ fontSize: 11 }}>
                        • {change}
                      </ThemedText>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Duration */}
            {step.durationMs && (
              <ThemedText type="small" style={{ color: colors.textSecondary }}>
                Duration: {(step.durationMs / 1000).toFixed(1)}s
              </ThemedText>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 20),
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerContent}>
          <ThemedText type="subtitle" numberOfLines={1}>
            {execution.agentType.charAt(0).toUpperCase() + execution.agentType.slice(1)} Agent
          </ThemedText>
          <View style={[styles.stateBadge, { backgroundColor: getStateColor(execution.state) + "20" }]}>
            <IconSymbol name={getStateIcon(execution.state)} size={12} color={getStateColor(execution.state)} />
            <ThemedText type="small" style={{ color: getStateColor(execution.state) }}>
              {execution.state}
            </ThemedText>
          </View>
        </View>
        {execution.state === "executing" && (
          <Pressable
            onPress={handleHalt}
            style={[styles.haltButton, { backgroundColor: Accent.error + "20" }]}
          >
            <IconSymbol name="stop.fill" size={16} color={Accent.error} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Goal card */}
        <View style={[styles.goalCard, { backgroundColor: colors.surface }]}>
          <ThemedText type="caption" style={styles.sectionLabel}>
            GOAL
          </ThemedText>
          <ThemedText type="defaultSemiBold">{execution.goal.description}</ThemedText>
          
          <View style={styles.goalDetails}>
            <View style={styles.goalSection}>
              <ThemedText type="caption">Success Criteria</ThemedText>
              {execution.goal.successCriteria.map((c, i) => (
                <View key={i} style={styles.criteriaItem}>
                  <IconSymbol name="checkmark" size={12} color={Accent.success} />
                  <ThemedText type="small">{c}</ThemedText>
                </View>
              ))}
            </View>
            
            <View style={styles.goalSection}>
              <ThemedText type="caption">Assumptions</ThemedText>
              {execution.goal.assumptions.map((a, i) => (
                <View key={i} style={styles.criteriaItem}>
                  <IconSymbol name="info.circle.fill" size={12} color={colors.textSecondary} />
                  <ThemedText type="small">{a}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              Progress
            </ThemedText>
            <ThemedText type="title" style={{ fontSize: 24 }}>
              {summary.stepsCompleted}/{summary.stepsTotal}
            </ThemedText>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              Success Rate
            </ThemedText>
            <ThemedText
              type="title"
              style={{
                fontSize: 24,
                color: summary.successRate >= 80 ? Accent.success : Accent.warning,
              }}
            >
              {summary.successRate}%
            </ThemedText>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              Cost
            </ThemedText>
            <ThemedText type="title" style={{ fontSize: 24 }}>
              {summary.totalCost}
            </ThemedText>
          </View>
        </View>

        {/* Halt info */}
        {execution.haltReason && (
          <View style={[styles.haltCard, { backgroundColor: Accent.warning + "15" }]}>
            <View style={styles.haltHeader}>
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color={Accent.warning} />
              <ThemedText type="defaultSemiBold" style={{ color: Accent.warning }}>
                Execution Halted
              </ThemedText>
            </View>
            <ThemedText type="caption" style={{ marginTop: 4 }}>
              {execution.haltDetails || execution.haltReason}
            </ThemedText>
            
            <View style={styles.safeOptions}>
              <ThemedText type="caption" style={styles.sectionLabel}>
                SAFE OPTIONS
              </ThemedText>
              {getSafeOptions(execution, execution.haltReason).map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => handleSafeOption(option)}
                  style={[
                    styles.safeOptionButton,
                    {
                      backgroundColor:
                        option.risk === "low"
                          ? Accent.success + "20"
                          : option.risk === "medium"
                          ? Accent.warning + "20"
                          : Accent.error + "20",
                    },
                  ]}
                >
                  <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
                  <ThemedText type="caption">{option.description}</ThemedText>
                </Pressable>
              ))}
            </View>
            
            <Pressable
              onPress={handleResume}
              style={[styles.resumeButton, { backgroundColor: Accent.primary }]}
            >
              <IconSymbol name="play.fill" size={16} color="#FFFFFF" />
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>
                Resume Execution
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* Steps */}
        <View style={styles.stepsSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Execution Steps
          </ThemedText>
          {execution.steps.map(renderStep)}
        </View>

        {/* Configuration */}
        <View style={[styles.configCard, { backgroundColor: colors.surface }]}>
          <ThemedText type="caption" style={styles.sectionLabel}>
            CONFIGURATION
          </ThemedText>
          <View style={styles.configRow}>
            <ThemedText type="small">Max Steps</ThemedText>
            <ThemedText type="defaultSemiBold">{execution.maxSteps}</ThemedText>
          </View>
          <View style={styles.configRow}>
            <ThemedText type="small">Uncertainty Threshold</ThemedText>
            <ThemedText type="defaultSemiBold">{execution.uncertaintyThreshold}%</ThemedText>
          </View>
          <View style={styles.configRow}>
            <ThemedText type="small">Scope Expansion</ThemedText>
            <ThemedText type="defaultSemiBold">
              {execution.allowScopeExpansion ? "Allowed" : "Blocked"}
            </ThemedText>
          </View>
          <View style={styles.configRow}>
            <ThemedText type="small">Auto Checkpoint</ThemedText>
            <ThemedText type="defaultSemiBold">
              {execution.autoCheckpoint ? "Enabled" : "Disabled"}
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerContent: {
    flex: 1,
    gap: 4,
  },
  stateBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    gap: 4,
  },
  haltButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  goalCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  sectionLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  goalDetails: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  goalSection: {
    gap: Spacing.xs,
  },
  criteriaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metricsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  metricCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  haltCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  haltHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  safeOptions: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  safeOptionButton: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: 2,
  },
  resumeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  stepsSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  stepCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  stepNumber: {
    width: 24,
    alignItems: "center",
  },
  stepInfo: {
    flex: 1,
    gap: 4,
  },
  stepMeta: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  uncertaintyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    gap: 2,
  },
  stepDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    gap: Spacing.md,
  },
  detailSection: {
    gap: Spacing.xs,
  },
  detailLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  checksList: {
    gap: Spacing.xs,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  resultBox: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  changesList: {
    marginTop: Spacing.xs,
    gap: 2,
  },
  configCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  configRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
