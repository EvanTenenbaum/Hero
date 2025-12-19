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
import { useProjects } from "@/hooks/use-projects";

export default function NewProjectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { createProject } = useProjects();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCreating(true);
    
    try {
      const project = await createProject(name.trim(), description.trim());
      router.replace({
        pathname: "/project/[id]",
        params: { id: project.id },
      });
    } catch (error) {
      console.error("Failed to create project:", error);
      setIsCreating(false);
    }
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
              PROJECT NAME
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text },
              ]}
              placeholder="My Awesome Project"
              placeholderTextColor={colors.textDisabled}
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="caption" style={styles.label}>
              DESCRIPTION (OPTIONAL)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.surface, color: colors.text },
              ]}
              placeholder="What are you building?"
              placeholderTextColor={colors.textDisabled}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={[styles.aiHint, { backgroundColor: Accent.primary + "10" }]}>
            <IconSymbol name="sparkles" size={20} color={Accent.primary} />
            <View style={styles.aiHintText}>
              <ThemedText type="defaultSemiBold" style={{ color: Accent.primary }}>
                AI will help you get started
              </ThemedText>
              <ThemedText type="caption">
                After creating, the AI PM will suggest a project structure and initial roadmap
              </ThemedText>
            </View>
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
            onPress={handleCreate}
            disabled={!name.trim() || isCreating}
            style={[
              styles.button,
              styles.primaryButton,
              { backgroundColor: name.trim() ? Accent.primary : colors.surface },
            ]}
          >
            <ThemedText
              type="defaultSemiBold"
              style={{ color: name.trim() ? "#FFFFFF" : colors.textDisabled }}
            >
              {isCreating ? "Creating..." : "Create Project"}
            </ThemedText>
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
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  aiHint: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  aiHintText: {
    flex: 1,
    gap: 4,
  },
  footer: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  primaryButton: {
    flex: 2,
  },
});
