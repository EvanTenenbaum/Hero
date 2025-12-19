import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface SettingsItem {
  id: string;
  title: string;
  subtitle: string;
  icon: IconSymbolName;
  route: string;
  badge?: string;
}

const settingsGroups: { title: string; items: SettingsItem[] }[] = [
  {
    title: "Integrations",
    items: [
      {
        id: "secrets",
        title: "Secrets Vault",
        subtitle: "API keys, tokens, and credentials",
        icon: "key.fill",
        route: "/settings/secrets",
      },
      {
        id: "api",
        title: "API Connections",
        subtitle: "LLM providers and smart routing",
        icon: "link",
        route: "/settings/api-connections",
      },
      {
        id: "mcp",
        title: "MCP Servers",
        subtitle: "Model Context Protocol connections",
        icon: "server.rack",
        route: "/settings/mcp",
      },
      {
        id: "github",
        title: "GitHub",
        subtitle: "Repository and account settings",
        icon: "arrow.triangle.branch",
        route: "/settings/github",
      },
    ],
  },
  {
    title: "AI Configuration",
    items: [
      {
        id: "agent-rules",
        title: "Agent Rules",
        subtitle: "Configure agent types and context",
        icon: "cpu.fill",
        route: "/settings/agent-rules",
      },
      {
        id: "routing",
        title: "Smart Routing",
        subtitle: "Task-to-model mapping",
        icon: "sparkles",
        route: "/settings/routing",
      },
      {
        id: "budgets",
        title: "Budget Limits",
        subtitle: "Resource limits and fail-early enforcement",
        icon: "gauge.with.dots.needle.bottom.50percent",
        route: "/settings/budgets",
      },
    ],
  },
  {
    title: "Preferences",
    items: [
      {
        id: "appearance",
        title: "Appearance",
        subtitle: "Theme, fonts, and display",
        icon: "ellipsis",
        route: "/settings/appearance",
      },
      {
        id: "editor",
        title: "Editor",
        subtitle: "Code editor preferences",
        icon: "chevron.left.forwardslash.chevron.right",
        route: "/settings/editor",
      },
      {
        id: "storage",
        title: "Storage",
        subtitle: "Cache and data management",
        icon: "folder.fill",
        route: "/settings/storage",
      },
    ],
  },
  {
    title: "About",
    items: [
      {
        id: "about",
        title: "About Hero IDE",
        subtitle: "Version, licenses, feedback",
        icon: "info.circle.fill",
        route: "/settings/about",
      },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const handlePress = useCallback(
    (route: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(route as any);
    },
    [router]
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
        <ThemedText type="title">Settings</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {settingsGroups.map((group) => (
          <View key={group.title} style={styles.group}>
            <ThemedText type="caption" style={styles.groupTitle}>
              {group.title.toUpperCase()}
            </ThemedText>
            <View style={[styles.groupCard, { backgroundColor: colors.surface }]}>
              {group.items.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => handlePress(item.route)}
                  style={({ pressed }) => [
                    styles.settingsItem,
                    index < group.items.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                    pressed && styles.settingsItemPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: Accent.primary + "20" },
                    ]}
                  >
                    <IconSymbol name={item.icon} size={18} color={Accent.primary} />
                  </View>
                  <View style={styles.itemContent}>
                    <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                    <ThemedText type="caption">{item.subtitle}</ThemedText>
                  </View>
                  {item.badge && (
                    <View style={[styles.badge, { backgroundColor: Accent.primary }]}>
                      <ThemedText type="small" style={{ color: "#FFFFFF" }}>
                        {item.badge}
                      </ThemedText>
                    </View>
                  )}
                  <IconSymbol
                    name="chevron.right"
                    size={16}
                    color={colors.textSecondary}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  group: {
    marginBottom: Spacing.xl,
  },
  groupTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  groupCard: {
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  settingsItemPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
});
