import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import { useEffect } from "react";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAgents, Agent, AgentStatus } from "@/hooks/use-agents";

export default function AgentsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { agents, loading, refresh, pauseAgent, resumeAgent, killAgent, spawnAgent } = useAgents();

  const activeAgents = agents.filter((a) => a.status === "running" || a.status === "paused");
  const completedAgents = agents.filter((a) => a.status === "completed" || a.status === "failed");

  const handleSpawnAgent = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    spawnAgent("coding", "New coding task");
  }, [spawnAgent]);

  const renderAgent = useCallback(
    ({ item }: { item: Agent }) => (
      <AgentCard
        agent={item}
        colors={colors}
        onPause={() => pauseAgent(item.id)}
        onResume={() => resumeAgent(item.id)}
        onKill={() => killAgent(item.id)}
      />
    ),
    [colors, pauseAgent, resumeAgent, killAgent]
  );

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
        <View style={styles.headerRow}>
          <ThemedText type="title">Agents</ThemedText>
          <View style={[styles.activeCount, { backgroundColor: Accent.primary + "20" }]}>
            <ThemedText type="defaultSemiBold" style={{ color: Accent.primary }}>
              {activeAgents.length} active
            </ThemedText>
          </View>
        </View>
      </View>

      <FlatList
        data={agents}
        keyExtractor={(item) => item.id}
        renderItem={renderAgent}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={Accent.primary}
          />
        }
        ListHeaderComponent={
          activeAgents.length > 0 ? (
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Active Agents</ThemedText>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="cpu.fill" size={48} color={colors.textDisabled} />
            <ThemedText type="subtitle" style={{ color: colors.textSecondary, marginTop: 16 }}>
              No agents running
            </ThemedText>
            <ThemedText type="caption" style={{ textAlign: "center", marginTop: 8 }}>
              Spawn agents to execute tasks autonomously
            </ThemedText>
          </View>
        }
      />

      <Pressable
        onPress={handleSpawnAgent}
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

interface AgentCardProps {
  agent: Agent;
  colors: typeof Colors.dark;
  onPause: () => void;
  onResume: () => void;
  onKill: () => void;
}

function AgentCard({ agent, colors, onPause, onResume, onKill }: AgentCardProps) {
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (agent.status === "running") {
      pulseOpacity.value = withRepeat(
        withTiming(0.5, { duration: 1000 }),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [agent.status, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const statusColor = getStatusColor(agent.status);

  return (
    <View style={[styles.agentCard, { backgroundColor: colors.surface }]}>
      <View style={styles.agentHeader}>
        <View style={styles.agentInfo}>
          <Animated.View
            style={[
              styles.statusDot,
              { backgroundColor: statusColor },
              agent.status === "running" && pulseStyle,
            ]}
          />
          <View>
            <ThemedText type="defaultSemiBold">{agent.name}</ThemedText>
            <ThemedText type="caption">{agent.type} agent</ThemedText>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
          <ThemedText type="small" style={{ color: statusColor }}>
            {agent.status}
          </ThemedText>
        </View>
      </View>

      <View style={styles.taskInfo}>
        <IconSymbol name="doc.fill" size={14} color={colors.textSecondary} />
        <ThemedText type="caption" numberOfLines={2} style={{ flex: 1 }}>
          {agent.currentTask || "No task assigned"}
        </ThemedText>
      </View>

      {agent.status === "running" && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.elevated }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${agent.progress}%`, backgroundColor: Accent.primary },
              ]}
            />
          </View>
          <ThemedText type="small">{agent.progress}%</ThemedText>
        </View>
      )}

      <View style={styles.agentMeta}>
        <View style={styles.metaItem}>
          <IconSymbol name="bolt.fill" size={12} color={colors.textSecondary} />
          <ThemedText type="small">{agent.tokensUsed.toLocaleString()} tokens</ThemedText>
        </View>
        <View style={styles.metaItem}>
          <IconSymbol name="clock.arrow.circlepath" size={12} color={colors.textSecondary} />
          <ThemedText type="small">{formatDuration(agent.runtime)}</ThemedText>
        </View>
      </View>

      <View style={styles.agentActions}>
        {agent.status === "running" ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPause();
            }}
            style={[styles.actionButton, { backgroundColor: colors.elevated }]}
          >
            <IconSymbol name="pause.fill" size={16} color={Accent.warning} />
            <ThemedText type="small">Pause</ThemedText>
          </Pressable>
        ) : agent.status === "paused" ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onResume();
            }}
            style={[styles.actionButton, { backgroundColor: colors.elevated }]}
          >
            <IconSymbol name="play.fill" size={16} color={Accent.success} />
            <ThemedText type="small">Resume</ThemedText>
          </Pressable>
        ) : null}
        {(agent.status === "running" || agent.status === "paused") && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onKill();
            }}
            style={[styles.actionButton, { backgroundColor: colors.elevated }]}
          >
            <IconSymbol name="stop.fill" size={16} color={Accent.error} />
            <ThemedText type="small">Kill</ThemedText>
          </Pressable>
        )}
        <Pressable style={[styles.actionButton, { backgroundColor: colors.elevated }]}>
          <IconSymbol name="doc.text.fill" size={16} color={colors.textSecondary} />
          <ThemedText type="small">Logs</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case "running":
      return Accent.primary;
    case "paused":
      return Accent.warning;
    case "completed":
      return Accent.success;
    case "failed":
      return Accent.error;
    default:
      return "#8B949E";
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeCount: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  sectionHeader: {
    paddingVertical: Spacing.md,
  },
  agentCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  agentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  agentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  taskInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  agentMeta: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  agentActions: {
    flexDirection: "row",
    gap: Spacing.sm,
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
    paddingVertical: 64,
    paddingHorizontal: Spacing.xl,
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
