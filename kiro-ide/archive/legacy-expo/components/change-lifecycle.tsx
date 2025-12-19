/**
 * KIRO IDE - Change Lifecycle Component
 * 
 * Implements the forced 8-step change approval process:
 * 1. DECLARE INTENT
 * 2. DECLARE SCOPE
 * 3. DECLARE RISK LEVEL
 * 4. PRESENT PREVIEW
 * 5. REQUIRE APPROVAL
 * 6. APPLY CHANGE
 * 7. CONFIRM RESULT
 * 8. ENABLE RECOVERY
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
} from "react-native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ChangeProposal,
  ChangeStep,
  CHANGE_STEPS,
  RiskLevel,
} from "@/lib/change-lifecycle";

interface ChangeLifecycleProps {
  proposal: ChangeProposal;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
  visible: boolean;
}

export function ChangeLifecycleModal({
  proposal,
  onApprove,
  onReject,
  onCancel,
  visible,
}: ChangeLifecycleProps) {
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

  const currentStep = CHANGE_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === CHANGE_STEPS.length - 1;
  const canProceed = acknowledged[currentStep?.id];

  const handleAcknowledge = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAcknowledged((prev) => ({ ...prev, [currentStep.id]: true }));
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (!canProceed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isLastStep) {
      onApprove();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [canProceed, isLastStep, onApprove]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case "critical": return Accent.error;
      case "high": return "#F97316";
      case "medium": return Accent.warning;
      case "low": return Accent.success;
      default: return colors.textSecondary;
    }
  };

  const renderStepContent = () => {
    switch (currentStep?.id) {
      case "declare_intent":
        return (
          <View style={styles.stepContent}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.md }}>
              What is being changed?
            </ThemedText>
            <View style={[styles.infoCard, { backgroundColor: colors.elevated }]}>
              <ThemedText type="defaultSemiBold">{proposal.intent}</ThemedText>
              <ThemedText type="caption" style={{ marginTop: Spacing.sm }}>
                {proposal.description}
              </ThemedText>
            </View>
            <View style={[styles.warningCard, { backgroundColor: Accent.warning + "15" }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color={Accent.warning} />
              <ThemedText type="caption" style={{ flex: 1 }}>
                Review the intent carefully. This change cannot be undone without a rollback.
              </ThemedText>
            </View>
          </View>
        );

      case "declare_scope":
        return (
          <View style={styles.stepContent}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.md }}>
              What will be affected?
            </ThemedText>
            <View style={[styles.scopeList, { backgroundColor: colors.elevated }]}>
              <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.sm }}>
                Files ({proposal.scope.files.length})
              </ThemedText>
              {proposal.scope.files.map((file, i) => (
                <View key={i} style={styles.scopeItem}>
                  <IconSymbol name="doc.fill" size={16} color={colors.textSecondary} />
                  <ThemedText type="caption" numberOfLines={1} style={{ flex: 1 }}>
                    {file}
                  </ThemedText>
                </View>
              ))}
            </View>
            {proposal.scope.dependencies.length > 0 && (
              <View style={[styles.scopeList, { backgroundColor: colors.elevated, marginTop: Spacing.md }]}>
                <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.sm }}>
                  Dependencies ({proposal.scope.dependencies.length})
                </ThemedText>
                {proposal.scope.dependencies.map((dep, i) => (
                  <View key={i} style={styles.scopeItem}>
                    <IconSymbol name="cube.fill" size={16} color={colors.textSecondary} />
                    <ThemedText type="caption">{dep}</ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      case "declare_risk":
        return (
          <View style={styles.stepContent}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.md }}>
              Risk Assessment
            </ThemedText>
            <View
              style={[
                styles.riskCard,
                {
                  backgroundColor: getRiskColor(proposal.riskLevel) + "15",
                  borderColor: getRiskColor(proposal.riskLevel),
                },
              ]}
            >
              <View style={styles.riskHeader}>
                <IconSymbol
                  name={proposal.riskLevel === "critical" ? "exclamationmark.octagon.fill" : "shield.fill"}
                  size={32}
                  color={getRiskColor(proposal.riskLevel)}
                />
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold" style={{ textTransform: "uppercase" }}>
                    {proposal.riskLevel} Risk
                  </ThemedText>
                  <ThemedText type="caption">
                    {proposal.riskLevel === "critical" && "Requires extra caution and explicit approval"}
                    {proposal.riskLevel === "high" && "Significant changes that may affect stability"}
                    {proposal.riskLevel === "medium" && "Moderate changes with manageable risk"}
                    {proposal.riskLevel === "low" && "Minor changes with minimal risk"}
                  </ThemedText>
                </View>
              </View>
            </View>
            {proposal.riskLevel === "critical" && (
              <View style={[styles.warningCard, { backgroundColor: Accent.error + "15" }]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={20} color={Accent.error} />
                <ThemedText type="caption" style={{ flex: 1, color: Accent.error }}>
                  Critical risk changes require manual confirmation at each step.
                </ThemedText>
              </View>
            )}
          </View>
        );

      case "present_preview":
        return (
          <View style={styles.stepContent}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.md }}>
              Change Preview
            </ThemedText>
            <ScrollView style={[styles.previewContainer, { backgroundColor: colors.elevated }]}>
              {proposal.preview.map((change, i) => (
                <View key={i} style={styles.previewItem}>
                  <View style={styles.previewHeader}>
                    <IconSymbol
                      name={change.type === "add" ? "plus.circle.fill" : change.type === "delete" ? "minus.circle.fill" : "pencil.circle.fill"}
                      size={16}
                      color={change.type === "add" ? Accent.success : change.type === "delete" ? Accent.error : Accent.warning}
                    />
                    <ThemedText type="small" style={{ flex: 1 }}>
                      {change.file}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: colors.textSecondary }}>
                      {change.type}
                    </ThemedText>
                  </View>
                  {change.diff && (
                    <View style={[styles.diffBlock, { backgroundColor: colors.background }]}>
                      <ThemedText type="code" style={{ fontSize: 12 }}>
                        {change.diff}
                      </ThemedText>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        );

      case "require_approval":
        return (
          <View style={styles.stepContent}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.md }}>
              Approval Required
            </ThemedText>
            <View style={[styles.approvalCard, { backgroundColor: colors.elevated }]}>
              <IconSymbol name="checkmark.shield.fill" size={48} color={Accent.primary} />
              <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.md, textAlign: "center" }}>
                Ready to Apply Changes
              </ThemedText>
              <ThemedText type="caption" style={{ marginTop: Spacing.sm, textAlign: "center" }}>
                You have reviewed the intent, scope, risk, and preview. Confirm to proceed with applying the changes.
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <ThemedText type="caption">Files</ThemedText>
                <ThemedText type="defaultSemiBold">{proposal.scope.files.length}</ThemedText>
              </View>
              <View style={styles.summaryItem}>
                <ThemedText type="caption">Risk</ThemedText>
                <ThemedText type="defaultSemiBold" style={{ color: getRiskColor(proposal.riskLevel) }}>
                  {proposal.riskLevel}
                </ThemedText>
              </View>
              <View style={styles.summaryItem}>
                <ThemedText type="caption">Changes</ThemedText>
                <ThemedText type="defaultSemiBold">{proposal.preview.length}</ThemedText>
              </View>
            </View>
          </View>
        );

      case "apply_change":
        return (
          <View style={styles.stepContent}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.md }}>
              Applying Changes
            </ThemedText>
            <View style={[styles.progressCard, { backgroundColor: colors.elevated }]}>
              <View style={styles.progressIndicator}>
                <View style={[styles.progressBar, { backgroundColor: Accent.primary }]} />
              </View>
              <ThemedText type="caption" style={{ marginTop: Spacing.md, textAlign: "center" }}>
                Changes are being applied...
              </ThemedText>
            </View>
          </View>
        );

      case "confirm_result":
        return (
          <View style={styles.stepContent}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.md }}>
              Confirm Result
            </ThemedText>
            <View style={[styles.resultCard, { backgroundColor: Accent.success + "15" }]}>
              <IconSymbol name="checkmark.circle.fill" size={48} color={Accent.success} />
              <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.md }}>
                Changes Applied Successfully
              </ThemedText>
              <ThemedText type="caption" style={{ marginTop: Spacing.sm, textAlign: "center" }}>
                All changes have been applied. Please verify the result before finalizing.
              </ThemedText>
            </View>
          </View>
        );

      case "enable_recovery":
        return (
          <View style={styles.stepContent}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.md }}>
              Recovery Options
            </ThemedText>
            <View style={[styles.recoveryCard, { backgroundColor: colors.elevated }]}>
              <View style={styles.recoveryOption}>
                <IconSymbol name="clock.arrow.circlepath" size={24} color={Accent.primary} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">Checkpoint Created</ThemedText>
                  <ThemedText type="caption">
                    A checkpoint was created before this change. You can rollback at any time.
                  </ThemedText>
                </View>
              </View>
              <View style={[styles.recoveryOption, { marginTop: Spacing.md }]}>
                <IconSymbol name="arrow.uturn.backward.circle.fill" size={24} color={Accent.warning} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">Rollback Available</ThemedText>
                  <ThemedText type="caption">
                    If issues are found, use the rollback feature to revert all changes.
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Pressable onPress={onCancel} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color={colors.text} />
          </Pressable>
          <ThemedText type="defaultSemiBold">Change Lifecycle</ThemedText>
          <View style={{ width: 32 }} />
        </View>

        {/* Progress indicator */}
        <View style={[styles.progressSteps, { backgroundColor: colors.surface }]}>
          {CHANGE_STEPS.map((step, i) => (
            <View
              key={step.id}
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    i < currentStepIndex
                      ? Accent.success
                      : i === currentStepIndex
                      ? Accent.primary
                      : colors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Step title */}
        <View style={styles.stepHeader}>
          <ThemedText type="caption" style={{ color: Accent.primary }}>
            Step {currentStepIndex + 1} of {CHANGE_STEPS.length}
          </ThemedText>
          <ThemedText type="title" style={{ marginTop: Spacing.xs }}>
            {currentStep?.name}
          </ThemedText>
          <ThemedText type="caption" style={{ marginTop: Spacing.xs }}>
            {currentStep?.description}
          </ThemedText>
        </View>

        {/* Step content */}
        <ScrollView style={styles.contentScroll}>
          {renderStepContent()}
        </ScrollView>

        {/* Acknowledge checkbox */}
        {!acknowledged[currentStep?.id] && (
          <Pressable
            onPress={handleAcknowledge}
            style={[styles.acknowledgeRow, { backgroundColor: colors.surface }]}
          >
            <View
              style={[
                styles.checkbox,
                { borderColor: colors.border },
              ]}
            >
              {acknowledged[currentStep?.id] && (
                <IconSymbol name="checkmark" size={14} color={Accent.primary} />
              )}
            </View>
            <ThemedText type="caption" style={{ flex: 1 }}>
              I have reviewed and understand this step
            </ThemedText>
          </Pressable>
        )}

        {/* Navigation buttons */}
        <View style={[styles.footer, { backgroundColor: colors.surface }]}>
          {currentStepIndex > 0 && (
            <Pressable
              onPress={handleBack}
              style={[styles.backButton, { backgroundColor: colors.elevated }]}
            >
              <IconSymbol name="chevron.left" size={16} color={colors.text} />
              <ThemedText>Back</ThemedText>
            </Pressable>
          )}
          <Pressable
            onPress={onReject}
            style={[styles.rejectButton, { backgroundColor: Accent.error + "20" }]}
          >
            <ThemedText style={{ color: Accent.error }}>Reject</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleNext}
            disabled={!canProceed}
            style={[
              styles.nextButton,
              {
                backgroundColor: canProceed ? Accent.primary : colors.border,
              },
            ]}
          >
            <ThemedText style={{ color: canProceed ? "#FFFFFF" : colors.textDisabled }}>
              {isLastStep ? "Complete" : "Next"}
            </ThemedText>
            {!isLastStep && (
              <IconSymbol
                name="chevron.right"
                size={16}
                color={canProceed ? "#FFFFFF" : colors.textDisabled}
              />
            )}
          </Pressable>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  progressSteps: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  contentScroll: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  infoCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  scopeList: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  scopeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  riskCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  riskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  previewContainer: {
    maxHeight: 300,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  previewItem: {
    marginBottom: Spacing.md,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  diffBlock: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
  },
  approvalCard: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  progressCard: {
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: "center",
  },
  progressIndicator: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    width: "60%",
    height: "100%",
  },
  resultCard: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: Radius.lg,
  },
  recoveryCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  recoveryOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  acknowledgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  rejectButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
});
