import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
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

export default function ImportProjectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const [isImporting, setIsImporting] = useState(false);

  const importOptions = [
    {
      id: "folder",
      title: "From Device",
      subtitle: "Import a local folder",
      icon: "folder.fill" as const,
    },
    {
      id: "zip",
      title: "From ZIP",
      subtitle: "Import a compressed archive",
      icon: "doc.fill" as const,
    },
    {
      id: "template",
      title: "From Template",
      subtitle: "Start with a pre-built template",
      icon: "square.grid.2x2.fill" as const,
    },
  ];

  const handleImport = async (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsImporting(true);
    
    // Simulate import - will be replaced with actual import logic
    setTimeout(() => {
      setIsImporting(false);
      router.back();
    }, 1500);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.options}>
          {importOptions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => handleImport(option.id)}
              disabled={isImporting}
              style={({ pressed }) => [
                styles.optionCard,
                { backgroundColor: colors.surface },
                pressed && styles.optionCardPressed,
              ]}
            >
              <View style={[styles.optionIcon, { backgroundColor: Accent.primary + "20" }]}>
                <IconSymbol name={option.icon} size={24} color={Accent.primary} />
              </View>
              <View style={styles.optionText}>
                <ThemedText type="defaultSemiBold">{option.title}</ThemedText>
                <ThemedText type="caption">{option.subtitle}</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>

        <View style={[styles.hint, { backgroundColor: colors.surface }]}>
          <IconSymbol name="info.circle.fill" size={16} color={colors.textSecondary} />
          <ThemedText type="caption" style={{ flex: 1 }}>
            Imported projects will be analyzed by AI to generate context and suggest a roadmap
          </ThemedText>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.button, { backgroundColor: colors.surface }]}
        >
          <ThemedText type="defaultSemiBold">Cancel</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  options: {
    gap: Spacing.md,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  optionCardPressed: {
    opacity: 0.8,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
    gap: 4,
  },
  hint: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  footer: {
    padding: Spacing.lg,
  },
  button: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
  },
});
