import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSecrets, SecretCategory } from "@/hooks/use-secrets";

export default function AddSecretScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { addSecret } = useSecrets();

  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState<SecretCategory>("custom");
  const [description, setDescription] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const categories: { id: SecretCategory; label: string; hint: string }[] = [
    { id: "llm", label: "LLM", hint: "OpenAI, Anthropic, Google API keys" },
    { id: "github", label: "GitHub", hint: "Personal access tokens" },
    { id: "mcp", label: "MCP", hint: "MCP server credentials" },
    { id: "custom", label: "Custom", hint: "Other API keys and secrets" },
  ];

  const handleSave = async () => {
    if (!name.trim() || !value.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    try {
      await addSecret(name.trim(), value.trim(), category, description.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error("Failed to save secret:", error);
      setIsSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <ThemedText type="caption" style={styles.label}>
                SECRET NAME
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, color: colors.text },
                ]}
                placeholder="OPENAI_API_KEY"
                placeholderTextColor={colors.textDisabled}
                value={name}
                onChangeText={setName}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="caption" style={styles.label}>
                CATEGORY
              </ThemedText>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCategory(cat.id);
                    }}
                    style={[
                      styles.categoryOption,
                      { backgroundColor: colors.surface },
                      category === cat.id && {
                        borderColor: Accent.primary,
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <ThemedText
                      type="defaultSemiBold"
                      style={{
                        color: category === cat.id ? Accent.primary : colors.text,
                      }}
                    >
                      {cat.label}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary }}>
                      {cat.hint}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="caption" style={styles.label}>
                VALUE
              </ThemedText>
              <View style={styles.valueInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.valueInput,
                    { backgroundColor: colors.surface, color: colors.text },
                  ]}
                  placeholder="sk-..."
                  placeholderTextColor={colors.textDisabled}
                  value={value}
                  onChangeText={setValue}
                  secureTextEntry={!showValue}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={() => setShowValue(!showValue)}
                  style={styles.showButton}
                >
                  <IconSymbol
                    name={showValue ? "xmark" : "ellipsis"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
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
                placeholder="What is this secret used for?"
                placeholderTextColor={colors.textDisabled}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={[styles.securityNote, { backgroundColor: colors.surface }]}>
              <IconSymbol name="key.fill" size={16} color={Accent.primary} />
              <ThemedText type="caption" style={{ flex: 1 }}>
                Secrets are encrypted and stored locally. They are never sent to external servers.
              </ThemedText>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.button, { backgroundColor: colors.surface }]}
          >
            <ThemedText type="defaultSemiBold">Cancel</ThemedText>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={!name.trim() || !value.trim() || isSaving}
            style={[
              styles.button,
              styles.primaryButton,
              {
                backgroundColor:
                  name.trim() && value.trim() ? Accent.primary : colors.surface,
              },
            ]}
          >
            <ThemedText
              type="defaultSemiBold"
              style={{
                color: name.trim() && value.trim() ? "#FFFFFF" : colors.textDisabled,
              }}
            >
              {isSaving ? "Saving..." : "Save Secret"}
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  form: {
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
  valueInputContainer: {
    position: "relative",
  },
  valueInput: {
    paddingRight: 48,
  },
  showButton: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  categoryOption: {
    width: "48%",
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: 4,
  },
  securityNote: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  footer: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
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
