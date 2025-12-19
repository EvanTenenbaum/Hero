import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSecrets, Secret, SecretCategory } from "@/hooks/use-secrets";

export default function SecretsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { secrets, deleteSecret, loading } = useSecrets();
  
  const [activeCategory, setActiveCategory] = useState<SecretCategory | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const categories: { id: SecretCategory | "all"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "llm", label: "LLM" },
    { id: "github", label: "GitHub" },
    { id: "mcp", label: "MCP" },
    { id: "custom", label: "Custom" },
  ];

  const filteredSecrets = activeCategory === "all"
    ? secrets
    : secrets.filter((s) => s.category === activeCategory);

  const handleDelete = useCallback((secret: Secret) => {
    Alert.alert(
      "Delete Secret",
      `Are you sure you want to delete "${secret.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            deleteSecret(secret.id);
          },
        },
      ]
    );
  }, [deleteSecret]);

  const renderSecret = useCallback(
    ({ item }: { item: Secret }) => (
      <View style={[styles.secretCard, { backgroundColor: colors.surface }]}>
        <View style={styles.secretHeader}>
          <View style={styles.secretInfo}>
            <IconSymbol name="key.fill" size={18} color={Accent.primary} />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold" numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText type="caption">
                {item.description || "No description"}
              </ThemedText>
            </View>
          </View>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: getCategoryColor(item.category) + "20" },
            ]}
          >
            <ThemedText
              type="small"
              style={{ color: getCategoryColor(item.category) }}
            >
              {item.category.toUpperCase()}
            </ThemedText>
          </View>
        </View>
        <View style={styles.secretValue}>
          <ThemedText type="code" style={{ color: colors.textSecondary }}>
            {"•".repeat(Math.min(item.value.length, 24))}
          </ThemedText>
        </View>
        <View style={styles.secretMeta}>
          <ThemedText type="small">
            Last used: {item.lastUsed ? formatDate(item.lastUsed) : "Never"}
          </ThemedText>
          <View style={styles.secretActions}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Edit functionality
              }}
              style={styles.actionButton}
            >
              <IconSymbol name="pencil" size={16} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => handleDelete(item)}
              style={styles.actionButton}
            >
              <IconSymbol name="trash.fill" size={16} color={Accent.error} />
            </Pressable>
          </View>
        </View>
      </View>
    ),
    [colors, handleDelete]
  );

  return (
    <ThemedView style={styles.container}>
      {/* Security banner */}
      <View style={[styles.securityBanner, { backgroundColor: Accent.success + "10" }]}>
        <IconSymbol name="checkmark.circle.fill" size={16} color={Accent.success} />
        <ThemedText type="small" style={{ color: Accent.success, flex: 1 }}>
          Secrets are encrypted and stored securely on device
        </ThemedText>
      </View>

      {/* Category tabs */}
      <View style={styles.categoryTabs}>
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveCategory(cat.id);
            }}
            style={[
              styles.categoryTab,
              activeCategory === cat.id && {
                backgroundColor: Accent.primary + "20",
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: activeCategory === cat.id ? Accent.primary : colors.textSecondary,
                fontWeight: activeCategory === cat.id ? "600" : "400",
              }}
            >
              {cat.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredSecrets}
        keyExtractor={(item) => item.id}
        renderItem={renderSecret}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="key.fill" size={48} color={colors.textDisabled} />
            <ThemedText type="subtitle" style={{ color: colors.textSecondary, marginTop: 16 }}>
              No secrets yet
            </ThemedText>
            <ThemedText type="caption" style={{ textAlign: "center", marginTop: 8 }}>
              Add API keys and credentials to use with your projects
            </ThemedText>
          </View>
        }
      />

      {/* Add button */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/settings/add-secret");
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

function getCategoryColor(category: SecretCategory): string {
  switch (category) {
    case "llm":
      return Accent.primary;
    case "github":
      return "#6366F1";
    case "mcp":
      return Accent.warning;
    case "custom":
      return "#8B949E";
    default:
      return "#8B949E";
  }
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  securityBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  categoryTabs: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  categoryTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  secretCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  secretHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  secretInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  secretValue: {
    paddingVertical: Spacing.sm,
  },
  secretMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  secretActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.sm,
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
