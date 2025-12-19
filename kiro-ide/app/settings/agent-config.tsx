import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAgentRules, AgentTypeConfig, ContextRule } from "@/hooks/use-agent-rules";

export default function AgentConfigScreen() {
  const { type, new: isNew } = useLocalSearchParams<{ type: string; new?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { agentTypes, updateAgentType, addAgentType } = useAgentRules();

  const [config, setConfig] = useState<AgentTypeConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isNew === "true") {
      // Create new custom agent type
      setConfig({
        type: "custom_" + Date.now(),
        name: "Custom Agent",
        description: "A custom agent type",
        systemPrompt: "",
        contextRules: [],
        preferredModel: undefined,
        maxTokens: 4096,
        temperature: 0.7,
        allowedActions: ["read", "write", "execute"],
      });
    } else {
      const existing = agentTypes.find((a) => a.type === type);
      if (existing) {
        setConfig({ ...existing });
      }
    }
  }, [type, isNew, agentTypes]);

  const handleSave = useCallback(async () => {
    if (!config) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (isNew === "true") {
      await addAgentType(config);
    } else {
      await updateAgentType(config.type, config);
    }
    
    router.back();
  }, [config, isNew, addAgentType, updateAgentType, router]);

  const updateConfig = useCallback((updates: Partial<AgentTypeConfig>) => {
    setConfig((prev) => prev ? { ...prev, ...updates } : null);
    setHasChanges(true);
  }, []);

  const toggleContextRule = useCallback((index: number) => {
    if (!config) return;
    const newRules = [...config.contextRules];
    newRules[index] = { ...newRules[index], enabled: !newRules[index].enabled };
    updateConfig({ contextRules: newRules });
  }, [config, updateConfig]);

  const addContextRule = useCallback(() => {
    if (!config) return;
    const newRule: ContextRule = {
      id: `rule_${Date.now()}`,
      name: "New Rule",
      description: "Describe what this rule does",
      pattern: "",
      enabled: true,
    };
    updateConfig({ contextRules: [...config.contextRules, newRule] });
  }, [config, updateConfig]);

  if (!config) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Basic Info */}
        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            BASIC INFO
          </ThemedText>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.inputGroup}>
              <ThemedText type="small">Name</ThemedText>
              <TextInput
                value={config.name}
                onChangeText={(text) => updateConfig({ name: text })}
                style={[
                  styles.input,
                  { color: colors.text, backgroundColor: colors.background },
                ]}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText type="small">Description</ThemedText>
              <TextInput
                value={config.description}
                onChangeText={(text) => updateConfig({ description: text })}
                style={[
                  styles.input,
                  styles.multilineInput,
                  { color: colors.text, backgroundColor: colors.background },
                ]}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>

        {/* System Prompt */}
        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            SYSTEM PROMPT
          </ThemedText>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TextInput
              value={config.systemPrompt}
              onChangeText={(text) => updateConfig({ systemPrompt: text })}
              style={[
                styles.input,
                styles.codeInput,
                { color: colors.text, backgroundColor: colors.background },
              ]}
              placeholderTextColor={colors.textSecondary}
              placeholder="Enter system prompt for this agent type..."
              multiline
              numberOfLines={6}
            />
          </View>
        </View>

        {/* Model Settings */}
        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            MODEL SETTINGS
          </ThemedText>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.inputGroup}>
              <ThemedText type="small">Preferred Model</ThemedText>
              <TextInput
                value={config.preferredModel || ""}
                onChangeText={(text) => updateConfig({ preferredModel: text || undefined })}
                style={[
                  styles.input,
                  { color: colors.text, backgroundColor: colors.background },
                ]}
                placeholder="Auto (based on task)"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText type="small">Max Tokens</ThemedText>
              <TextInput
                value={config.maxTokens?.toString() || "4096"}
                onChangeText={(text) => updateConfig({ maxTokens: parseInt(text) || 4096 })}
                style={[
                  styles.input,
                  { color: colors.text, backgroundColor: colors.background },
                ]}
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText type="small">Temperature: {config.temperature?.toFixed(1) || "0.7"}</ThemedText>
              <View style={styles.sliderContainer}>
                <ThemedText type="small">0</ThemedText>
                <View style={[styles.sliderTrack, { backgroundColor: colors.background }]}>
                  <View
                    style={[
                      styles.sliderFill,
                      {
                        backgroundColor: Accent.primary,
                        width: `${(config.temperature || 0.7) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <ThemedText type="small">1</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Context Rules */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="caption" style={styles.sectionTitle}>
              CONTEXT RULES
            </ThemedText>
            <Pressable
              onPress={addContextRule}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: Accent.primary },
                pressed && styles.addButtonPressed,
              ]}
            >
              <IconSymbol name="plus" size={16} color="#FFFFFF" />
              <ThemedText style={{ color: "#FFFFFF", fontSize: 12 }}>Add Rule</ThemedText>
            </Pressable>
          </View>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {config.contextRules.length === 0 ? (
              <ThemedText type="caption" style={{ textAlign: "center", padding: Spacing.lg }}>
                No context rules configured
              </ThemedText>
            ) : (
              config.contextRules.map((rule, index) => (
                <View
                  key={rule.id}
                  style={[
                    styles.ruleItem,
                    index < config.contextRules.length - 1 && styles.ruleItemBorder,
                  ]}
                >
                  <View style={styles.ruleInfo}>
                    <ThemedText type="defaultSemiBold">{rule.name}</ThemedText>
                    <ThemedText type="caption">{rule.description}</ThemedText>
                    {rule.pattern && (
                      <ThemedText type="code" numberOfLines={1}>
                        {rule.pattern}
                      </ThemedText>
                    )}
                  </View>
                  <Switch
                    value={rule.enabled}
                    onValueChange={() => toggleContextRule(index)}
                    trackColor={{ false: colors.background, true: Accent.primary + "60" }}
                    thumbColor={rule.enabled ? Accent.primary : colors.textSecondary}
                  />
                </View>
              ))
            )}
          </View>
        </View>

        {/* Allowed Actions */}
        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            ALLOWED ACTIONS
          </ThemedText>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {["read", "write", "execute", "delete", "deploy"].map((action) => (
              <View key={action} style={styles.actionItem}>
                <View style={styles.actionInfo}>
                  <ThemedText type="defaultSemiBold" style={{ textTransform: "capitalize" }}>
                    {action}
                  </ThemedText>
                  <ThemedText type="caption">
                    {action === "read" && "Read files and context"}
                    {action === "write" && "Create and modify files"}
                    {action === "execute" && "Run commands and scripts"}
                    {action === "delete" && "Delete files and resources"}
                    {action === "deploy" && "Deploy to production"}
                  </ThemedText>
                </View>
                <Switch
                  value={config.allowedActions?.includes(action) ?? false}
                  onValueChange={(enabled) => {
                    const actions = config.allowedActions || [];
                    if (enabled) {
                      updateConfig({ allowedActions: [...actions, action] });
                    } else {
                      updateConfig({ allowedActions: actions.filter((a) => a !== action) });
                    }
                  }}
                  trackColor={{ false: colors.background, true: Accent.primary + "60" }}
                  thumbColor={config.allowedActions?.includes(action) ? Accent.primary : colors.textSecondary}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <View style={[styles.saveContainer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: Accent.primary },
              pressed && styles.saveButtonPressed,
            ]}
          >
            <IconSymbol name="checkmark" size={20} color="#FFFFFF" />
            <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>
              Save Changes
            </ThemedText>
          </Pressable>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  input: {
    marginTop: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius.md,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  codeInput: {
    minHeight: 120,
    fontFamily: "monospace",
    fontSize: 14,
    textAlignVertical: "top",
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  sliderFill: {
    height: "100%",
    borderRadius: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  ruleItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  ruleInfo: {
    flex: 1,
    gap: 4,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  actionInfo: {
    flex: 1,
    gap: 2,
  },
  saveContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
});
