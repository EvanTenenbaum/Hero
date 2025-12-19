import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  TextInput,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useProjects, Project } from "@/hooks/use-projects";

export default function ProjectsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { projects, loading, refresh, createProject } = useProjects();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProject = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/new-project");
  }, [router]);

  const handleOpenProject = useCallback(
    (project: Project) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: "/project/[id]",
        params: { id: project.id },
      });
    },
    [router]
  );

  const renderProject = useCallback(
    ({ item }: { item: Project }) => (
      <Pressable
        onPress={() => handleOpenProject(item)}
        style={({ pressed }) => [
          styles.projectCard,
          { backgroundColor: colors.surface },
          pressed && styles.projectCardPressed,
        ]}
      >
        <View style={[styles.projectIcon, { backgroundColor: Accent.primary + "20" }]}>
          <IconSymbol name="folder.fill" size={24} color={Accent.primary} />
        </View>
        <View style={styles.projectInfo}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {item.name}
          </ThemedText>
          <ThemedText type="caption" numberOfLines={1}>
            {item.description || "No description"}
          </ThemedText>
          <View style={styles.projectMeta}>
            <ThemedText type="small">
              {item.filesCount} files • {item.activeAgents} agents
            </ThemedText>
            <ThemedText type="small">
              {formatTimeAgo(item.lastModified)}
            </ThemedText>
          </View>
        </View>
        <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
      </Pressable>
    ),
    [colors, handleOpenProject]
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
        <ThemedText type="title">Projects</ThemedText>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search projects..."
            placeholderTextColor={colors.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.quickActions}>
        <Pressable
          onPress={handleCreateProject}
          style={({ pressed }) => [
            styles.quickAction,
            { backgroundColor: Accent.primary },
            pressed && styles.quickActionPressed,
          ]}
        >
          <IconSymbol name="plus" size={20} color="#FFFFFF" />
          <ThemedText style={styles.quickActionText}>New Project</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.push("/clone-repo")}
          style={({ pressed }) => [
            styles.quickAction,
            { backgroundColor: colors.surface },
            pressed && styles.quickActionPressed,
          ]}
        >
          <IconSymbol name="arrow.down.circle" size={20} color={colors.text} />
          <ThemedText style={styles.quickActionTextSecondary}>Clone</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.push("/import-project")}
          style={({ pressed }) => [
            styles.quickAction,
            { backgroundColor: colors.surface },
            pressed && styles.quickActionPressed,
          ]}
        >
          <IconSymbol name="square.and.arrow.down" size={20} color={colors.text} />
          <ThemedText style={styles.quickActionTextSecondary}>Import</ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => item.id}
        renderItem={renderProject}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={Accent.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="folder.fill" size={48} color={colors.textDisabled} />
            <ThemedText type="subtitle" style={{ color: colors.textSecondary, marginTop: 16 }}>
              No projects yet
            </ThemedText>
            <ThemedText type="caption" style={{ textAlign: "center", marginTop: 8 }}>
              Create a new project or clone from GitHub to get started
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  quickActionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  quickActionText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  quickActionTextSecondary: {
    fontWeight: "600",
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  projectCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  projectCardPressed: {
    opacity: 0.8,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  projectInfo: {
    flex: 1,
    gap: 2,
  },
  projectMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: Spacing.xl,
  },
});
