import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAgentRules, AgentTypeConfig } from "@/hooks/use-agent-rules";

export default function AgentRulesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { agentTypes, loading } = useAgentRules();

  const getAgentIcon = (type: string): IconSymbolName => {
    switch (type) {
      case "coding":
        return "chevron.left.forwardslash.chevron.right";
      case "review":
        return "magnifyingglass";
      case "planning":
        return "list.bullet";
      case "documentation":
        return "doc.text.fill";
      case "testing":
        return "checkmark.circle.fill";
      default:
        return "cpu.fill";
    }
  };

  const renderAgentType = useCallback(
    ({ item }: { item: AgentTypeConfig }) => (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({
            pathname: "/settings/agent-config",
            params: { type: item.type },
          });
        }}
        style={({ pressed }) => [
          styles.agentCard,
          { backgroundColor: colors.surface },
          pressed && styles.agentCardPressed,
        ]}
      >
        <View style={[styles.agentIcon, { backgroundColor: Accent.primary + "20" }]}>
          <IconSymbol name={getAgentIcon(item.type)} size={24} color={Accent.primary} />
        </View>
        <View style={styles.agentInfo}>
          <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
          <ThemedText type="caption" numberOfLines={2}>
            {item.description}
          </ThemedText>
          <View style={styles.agentMeta}>
            <View style={styles.metaItem}>
              <IconSymbol name="doc.fill" size={12} color={colors.textSecondary} />
              <ThemedText type="small">
                {item.contextRules.filter((r) => r.enabled).length} context rules
              </ThemedText>
            </View>
            <View style={styles.metaItem}>
              <IconSymbol name="sparkles" size={12} color={colors.textSecondary} />
              <ThemedText type="small">{item.preferredModel || "Auto"}</ThemedText>
            </View>
          </View>
        </View>
        <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
      </Pressable>
    ),
    [colors, router]
  );

  return (
    <ThemedView style={styles.container}>
      {/* Info banner */}
      <View style={[styles.infoBanner, { backgroundColor: Accent.primary + "10" }]}>
        <IconSymbol name="info.circle.fill" size={16} color={Accent.primary} />
        <ThemedText type="caption" style={{ flex: 1 }}>
          Configure how each agent type behaves, what context they receive, and which model they use
        </ThemedText>
      </View>

      <FlatList
        data={agentTypes}
        keyExtractor={(item) => item.type}
        renderItem={renderAgentType}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        ListHeaderComponent={
          <ThemedText type="caption" style={styles.sectionHeader}>
            AGENT TYPES
          </ThemedText>
        }
      />

      {/* Add custom agent type */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/settings/agent-config?type=custom&new=true");
        }}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: Accent.primary },
          pressed && styles.fabPressed,
        ]}
      >
        <IconSymbol name="plus" size={24} color="#FFFFFF" />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  agentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  agentCardPressed: {
    opacity: 0.8,
  },
  agentIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  agentInfo: {
    flex: 1,
    gap: 4,
  },
  agentMeta: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
    opacity: 0.9,
  },
});
