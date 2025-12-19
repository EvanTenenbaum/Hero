import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
  Violation,
  ViolationType,
  ANTI_PATTERNS,
} from "@/lib/violation-handler";

// Mock violations data
const MOCK_VIOLATIONS: Violation[] = [
  {
    id: "viol_1",
    type: "scope_exceeded",
    severity: "major",
    timestamp: new Date(Date.now() - 3600000),
    description: "System operated outside declared scope",
    details: "Action affected files/resources not in declared scope. Action: Modified package.json without approval",
    evidence: {
      action: "edit_file",
      expectedBehavior: "Only modify files in src/ directory",
      actualBehavior: "Modified package.json in root directory",
      context: { file: "package.json", change: "added dependency" },
    },
    affectedResources: ["package.json"],
    potentialDamage: "1 resource(s) affected: package.json",
    halted: true,
    haltedAt: new Date(Date.now() - 3500000),
    disclosed: true,
    disclosedAt: new Date(Date.now() - 3500000),
    rollbackAvailable: true,
    rollbackPerformed: false,
    isolationPerformed: false,
    acknowledged: false,
    acknowledgedAt: null,
    preventionSteps: [
      "Always declare scope before taking action",
      "Validate each action against declared scope",
      "Request scope expansion if needed",
    ],
    recurrenceRisk: "medium",
    suggestedAction: "Always declare scope before taking action",
  },
  {
    id: "viol_2",
    type: "push_through_ambiguity",
    severity: "minor",
    timestamp: new Date(Date.now() - 7200000),
    description: "System continued despite high uncertainty",
    details: "Action taken when ambiguity threshold exceeded. Action: Implemented feature with unclear requirements",
    evidence: {
      action: "create_file",
      expectedBehavior: "Halt and request clarification when uncertainty > 70%",
      actualBehavior: "Continued with 75% uncertainty",
      context: { uncertainty: 75, threshold: 70 },
    },
    affectedResources: ["src/features/auth.ts"],
    potentialDamage: "1 resource(s) affected: src/features/auth.ts",
    halted: true,
    haltedAt: new Date(Date.now() - 7100000),
    disclosed: true,
    disclosedAt: new Date(Date.now() - 7100000),
    rollbackAvailable: true,
    rollbackPerformed: true,
    isolationPerformed: false,
    acknowledged: true,
    acknowledgedAt: new Date(Date.now() - 7000000),
    preventionSteps: [
      "Halt on high ambiguity",
      "Request clarification",
      "Never assume user prefers completion",
    ],
    recurrenceRisk: "low",
    suggestedAction: "Halt on high ambiguity",
  },
];

export default function ViolationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const [violations, setViolations] = useState<Violation[]>(MOCK_VIOLATIONS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");

  const filteredViolations = violations.filter((v) => {
    if (filter === "pending") return !v.acknowledged;
    if (filter === "resolved") return v.acknowledged;
    return true;
  });

  const handleAcknowledge = useCallback((id: string) => {
    Alert.alert(
      "Acknowledge Violation",
      "By acknowledging, you confirm you've reviewed this violation and understand the prevention steps.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Acknowledge",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setViolations((prev) =>
              prev.map((v) =>
                v.id === id
                  ? { ...v, acknowledged: true, acknowledgedAt: new Date() }
                  : v
              )
            );
          },
        },
      ]
    );
  }, []);

  const handleRollback = useCallback((id: string) => {
    Alert.alert(
      "Rollback Changes",
      "This will undo all changes made by the violating action. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Rollback",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setViolations((prev) =>
              prev.map((v) =>
                v.id === id ? { ...v, rollbackPerformed: true } : v
              )
            );
          },
        },
      ]
    );
  }, []);

  const getSeverityColor = (severity: Violation["severity"]) => {
    switch (severity) {
      case "critical":
        return Accent.error;
      case "major":
        return Accent.warning;
      case "minor":
        return colors.textSecondary;
    }
  };

  const getSeverityIcon = (severity: Violation["severity"]): IconSymbolName => {
    switch (severity) {
      case "critical":
        return "xmark.octagon.fill";
      case "major":
        return "exclamationmark.triangle.fill";
      case "minor":
        return "info.circle.fill";
    }
  };

  const renderViolation = (violation: Violation) => {
    const isExpanded = expandedId === violation.id;
    const pattern = ANTI_PATTERNS[violation.type];
    const severityColor = getSeverityColor(violation.severity);

    return (
      <Pressable
        key={violation.id}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpandedId(isExpanded ? null : violation.id);
        }}
        style={[
          styles.violationCard,
          {
            backgroundColor: colors.surface,
            borderLeftColor: severityColor,
            opacity: violation.acknowledged ? 0.7 : 1,
          },
        ]}
      >
        <View style={styles.violationHeader}>
          <View style={styles.violationIcon}>
            <IconSymbol
              name={getSeverityIcon(violation.severity)}
              size={20}
              color={severityColor}
            />
          </View>
          <View style={styles.violationInfo}>
            <ThemedText type="defaultSemiBold">{pattern.name}</ThemedText>
            <View style={styles.violationMeta}>
              <View
                style={[
                  styles.severityBadge,
                  { backgroundColor: severityColor + "20" },
                ]}
              >
                <ThemedText type="small" style={{ color: severityColor }}>
                  {violation.severity}
                </ThemedText>
              </View>
              {violation.acknowledged && (
                <View style={[styles.statusBadge, { backgroundColor: Accent.success + "20" }]}>
                  <IconSymbol name="checkmark" size={10} color={Accent.success} />
                  <ThemedText type="small" style={{ color: Accent.success }}>
                    Acknowledged
                  </ThemedText>
                </View>
              )}
              {violation.rollbackPerformed && (
                <View style={[styles.statusBadge, { backgroundColor: Accent.primary + "20" }]}>
                  <ThemedText type="small" style={{ color: Accent.primary }}>
                    Rolled back
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

        <ThemedText type="caption" style={{ marginTop: Spacing.xs }}>
          {new Date(violation.timestamp).toLocaleString()}
        </ThemedText>

        {isExpanded && (
          <View style={styles.violationDetails}>
            {/* Description */}
            <View style={styles.detailSection}>
              <ThemedText type="caption" style={styles.detailLabel}>
                WHAT HAPPENED
              </ThemedText>
              <ThemedText type="small">{violation.details}</ThemedText>
            </View>

            {/* Evidence */}
            <View style={styles.detailSection}>
              <ThemedText type="caption" style={styles.detailLabel}>
                EVIDENCE
              </ThemedText>
              <View style={[styles.evidenceBox, { backgroundColor: colors.background }]}>
                <View style={styles.evidenceRow}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    Expected:
                  </ThemedText>
                  <ThemedText type="small">{violation.evidence.expectedBehavior}</ThemedText>
                </View>
                <View style={styles.evidenceRow}>
                  <ThemedText type="small" style={{ color: colors.textSecondary }}>
                    Actual:
                  </ThemedText>
                  <ThemedText type="small" style={{ color: Accent.error }}>
                    {violation.evidence.actualBehavior}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Affected Resources */}
            <View style={styles.detailSection}>
              <ThemedText type="caption" style={styles.detailLabel}>
                AFFECTED RESOURCES
              </ThemedText>
              <View style={styles.resourcesList}>
                {violation.affectedResources.map((resource, i) => (
                  <View key={i} style={[styles.resourceChip, { backgroundColor: colors.background }]}>
                    <IconSymbol name="doc.fill" size={12} color={colors.textSecondary} />
                    <ThemedText type="code" style={{ fontSize: 11 }}>
                      {resource}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>

            {/* Prevention Steps */}
            <View style={styles.detailSection}>
              <ThemedText type="caption" style={styles.detailLabel}>
                PREVENTION STEPS
              </ThemedText>
              {violation.preventionSteps.map((step, i) => (
                <View key={i} style={styles.preventionItem}>
                  <ThemedText type="small" style={{ color: Accent.primary }}>
                    {i + 1}.
                  </ThemedText>
                  <ThemedText type="small">{step}</ThemedText>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.actionButtons}>
              {violation.rollbackAvailable && !violation.rollbackPerformed && (
                <Pressable
                  onPress={() => handleRollback(violation.id)}
                  style={[styles.actionButton, { backgroundColor: Accent.error + "20" }]}
                >
                  <IconSymbol name="arrow.uturn.backward" size={14} color={Accent.error} />
                  <ThemedText type="small" style={{ color: Accent.error }}>
                    Rollback
                  </ThemedText>
                </Pressable>
              )}
              {!violation.acknowledged && (
                <Pressable
                  onPress={() => handleAcknowledge(violation.id)}
                  style={[styles.actionButton, { backgroundColor: Accent.success + "20" }]}
                >
                  <IconSymbol name="checkmark" size={14} color={Accent.success} />
                  <ThemedText type="small" style={{ color: Accent.success }}>
                    Acknowledge
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  const pendingCount = violations.filter((v) => !v.acknowledged).length;
  const criticalCount = violations.filter((v) => v.severity === "critical" && !v.acknowledged).length;

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
          <ThemedText type="title">Violations</ThemedText>
          {pendingCount > 0 && (
            <View style={[styles.pendingBadge, { backgroundColor: Accent.error + "20" }]}>
              <ThemedText type="small" style={{ color: Accent.error }}>
                {pendingCount} pending
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      {/* Summary */}
      {criticalCount > 0 && (
        <View style={[styles.criticalBanner, { backgroundColor: Accent.error + "15" }]}>
          <IconSymbol name="xmark.octagon.fill" size={20} color={Accent.error} />
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold" style={{ color: Accent.error }}>
              {criticalCount} Critical Violation{criticalCount > 1 ? "s" : ""}
            </ThemedText>
            <ThemedText type="caption">
              Immediate attention required
            </ThemedText>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filterRow}>
        {(["all", "pending", "resolved"] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter(f);
            }}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f ? Accent.primary : colors.surface,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{ color: filter === f ? "#FFFFFF" : colors.text }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredViolations.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="checkmark.shield.fill" size={48} color={Accent.success} />
            <ThemedText type="subtitle" style={{ marginTop: Spacing.md }}>
              No Violations
            </ThemedText>
            <ThemedText type="caption" style={{ textAlign: "center" }}>
              {filter === "all"
                ? "No violations have been detected"
                : filter === "pending"
                ? "All violations have been acknowledged"
                : "No resolved violations yet"}
            </ThemedText>
          </View>
        ) : (
          filteredViolations.map(renderViolation)
        )}
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
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  pendingBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  criticalBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  violationCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderLeftWidth: 4,
  },
  violationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  violationIcon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  violationInfo: {
    flex: 1,
    gap: 4,
  },
  violationMeta: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  severityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    gap: 2,
  },
  violationDetails: {
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
  evidenceBox: {
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
  },
  evidenceRow: {
    gap: 2,
  },
  resourcesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  resourceChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    gap: 4,
  },
  preventionItem: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
  },
});
