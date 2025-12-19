import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function CloneRepoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const [repoUrl, setRepoUrl] = useState("");
  const [isCloning, setIsCloning] = useState(false);

  const handleClone = async () => {
    if (!repoUrl.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCloning(true);
    
    // Simulate cloning - will be replaced with actual GitHub integration
    setTimeout(() => {
      setIsCloning(false);
      router.back();
    }, 2000);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText type="caption" style={styles.label}>
              REPOSITORY URL
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text },
              ]}
              placeholder="https://github.com/user/repo.git"
              placeholderTextColor={colors.textDisabled}
              value={repoUrl}
              onChangeText={setRepoUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              autoFocus
            />
          </View>

          <View style={[styles.hint, { backgroundColor: colors.surface }]}>
            <IconSymbol name="info.circle.fill" size={16} color={colors.textSecondary} />
            <ThemedText type="caption">
              Supports GitHub, GitLab, and Bitbucket repositories
            </ThemedText>
          </View>

          <View style={styles.recentRepos}>
            <ThemedText type="caption" style={styles.label}>
              RECENT REPOSITORIES
            </ThemedText>
            {["owner/repo-1", "owner/repo-2"].map((repo, i) => (
              <Pressable
                key={i}
                onPress={() => setRepoUrl(`https://github.com/${repo}.git`)}
                style={[styles.repoItem, { backgroundColor: colors.surface }]}
              >
                <IconSymbol name="clock.arrow.circlepath" size={16} color={colors.textSecondary} />
                <ThemedText style={{ flex: 1 }}>{repo}</ThemedText>
                <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.button, { backgroundColor: colors.surface }]}
          >
            <ThemedText type="defaultSemiBold">Cancel</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleClone}
            disabled={!repoUrl.trim() || isCloning}
            style={[
              styles.button,
              styles.primaryButton,
              { backgroundColor: repoUrl.trim() ? Accent.primary : colors.surface },
            ]}
          >
            {isCloning ? (
              <ThemedText type="defaultSemiBold" style={{ color: "#FFFFFF" }}>
                Cloning...
              </ThemedText>
            ) : (
              <>
                <IconSymbol
                  name="arrow.down.circle"
                  size={18}
                  color={repoUrl.trim() ? "#FFFFFF" : colors.textDisabled}
                />
                <ThemedText
                  type="defaultSemiBold"
                  style={{ color: repoUrl.trim() ? "#FFFFFF" : colors.textDisabled }}
                >
                  Clone
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  form: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    marginLeft: Spacing.xs,
  },
  input: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    fontSize: 16,
    lineHeight: 24,
  },
  hint: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    alignItems: "center",
  },
  recentRepos: {
    gap: Spacing.sm,
  },
  repoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.md,
  },
  footer: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  primaryButton: {
    flex: 2,
  },
});
