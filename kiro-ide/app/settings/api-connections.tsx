import { useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol, IconSymbolName } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSecrets } from "@/hooks/use-secrets";
import { LLM_PROVIDERS, SMART_ROUTING_CONFIG } from "@/lib/default-secrets";

const API_PROVIDERS_KEY = "hero_api_providers";

// LLM Provider types
interface LLMProvider {
  id: string;
  name: string;
  icon: string;
  models: { id: string; name: string; capabilities: string[] }[];
  isConfigured: boolean;
  isEnabled: boolean;
  apiKeySet: boolean;
  baseUrl?: string;
  defaultModel?: string;
  secretName?: string;
}

// Available LLM providers - pre-configured with Gemini and Anthropic
const getDefaultProviders = (secrets: any[]): LLMProvider[] => {
  const geminiSecret = secrets.find(s => s.name === "Gemini API Key");
  const anthropicSecret = secrets.find(s => s.name === "Anthropic Claude API Key");
  
  return [
    {
      id: "gemini",
      name: "Google Gemini",
      icon: "sparkles",
      models: LLM_PROVIDERS.gemini.models,
      isConfigured: !!geminiSecret,
      isEnabled: !!geminiSecret,
      apiKeySet: !!geminiSecret,
      defaultModel: "gemini-2.5-flash",
      secretName: "Gemini API Key",
      baseUrl: LLM_PROVIDERS.gemini.baseUrl,
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      icon: "brain",
      models: LLM_PROVIDERS.anthropic.models,
      isConfigured: !!anthropicSecret,
      isEnabled: !!anthropicSecret,
      apiKeySet: !!anthropicSecret,
      defaultModel: "claude-sonnet-4-20250514",
      secretName: "Anthropic Claude API Key",
      baseUrl: LLM_PROVIDERS.anthropic.baseUrl,
    },
    {
      id: "openai",
      name: "OpenAI",
      icon: "sparkles",
      models: [
        { id: "gpt-4o", name: "GPT-4o", capabilities: ["advanced", "code", "vision"] },
        { id: "gpt-4o-mini", name: "GPT-4o Mini", capabilities: ["fast", "code"] },
        { id: "o1", name: "o1", capabilities: ["reasoning", "advanced"] },
      ],
      isConfigured: false,
      isEnabled: false,
      apiKeySet: false,
      secretName: "OpenAI API Key",
    },
    {
      id: "mistral",
      name: "Mistral AI",
      icon: "wind",
      models: [
        { id: "mistral-large", name: "Mistral Large", capabilities: ["advanced", "code"] },
        { id: "codestral", name: "Codestral", capabilities: ["code", "fast"] },
      ],
      isConfigured: false,
      isEnabled: false,
      apiKeySet: false,
    },
    {
      id: "groq",
      name: "Groq",
      icon: "bolt.fill",
      models: [
        { id: "llama-3.3-70b", name: "Llama 3.3 70B", capabilities: ["fast", "code"] },
        { id: "mixtral-8x7b", name: "Mixtral 8x7B", capabilities: ["fast"] },
      ],
      isConfigured: false,
      isEnabled: false,
      apiKeySet: false,
    },
    {
      id: "ollama",
      name: "Ollama (Local)",
      icon: "desktopcomputer",
      models: [
        { id: "llama3.2", name: "Llama 3.2", capabilities: ["local", "code"] },
        { id: "codellama", name: "Code Llama", capabilities: ["local", "code"] },
      ],
      isConfigured: false,
      isEnabled: false,
      apiKeySet: false,
      baseUrl: "http://localhost:11434",
    },
  ];
};

export default function APIConnectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { secrets } = useSecrets();
  
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    // Initialize providers based on available secrets
    setProviders(getDefaultProviders(secrets));
  }, [secrets]);

  const handleToggleProvider = useCallback((provider: LLMProvider) => {
    if (!provider.apiKeySet) {
      Alert.alert(
        "API Key Required",
        `Please add an API key for ${provider.name} in the Secrets Vault first.`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Go to Secrets", 
            onPress: () => router.push("/settings/secrets")
          },
        ]
      );
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProviders((prev) =>
      prev.map((p) =>
        p.id === provider.id ? { ...p, isEnabled: !p.isEnabled } : p
      )
    );
  }, [router]);

  const handleConfigureProvider = useCallback((provider: LLMProvider) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedProvider(provider);
    setShowConfigModal(true);
  }, []);

  const getProviderIcon = (icon: string): IconSymbolName => {
    const iconMap: Record<string, IconSymbolName> = {
      sparkles: "sparkles",
      brain: "cpu.fill",
      wind: "wind",
      "bolt.fill": "bolt.fill",
      desktopcomputer: "desktopcomputer",
      "arrow.triangle.branch": "arrow.triangle.branch",
    };
    return iconMap[icon] || "sparkles";
  };

  const renderProvider = useCallback(
    ({ item }: { item: LLMProvider }) => (
      <View style={[styles.providerCard, { backgroundColor: colors.surface }]}>
        <View style={styles.providerHeader}>
          <View style={styles.providerInfo}>
            <View
              style={[
                styles.providerIcon,
                { backgroundColor: item.isEnabled ? Accent.primary + "20" : colors.background },
              ]}
            >
              <IconSymbol
                name={getProviderIcon(item.icon)}
                size={20}
                color={item.isEnabled ? Accent.primary : colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
              <ThemedText type="caption">
                {item.models.length} models available
              </ThemedText>
            </View>
          </View>
          <Switch
            value={item.isEnabled}
            onValueChange={() => handleToggleProvider(item)}
            trackColor={{ false: colors.border, true: Accent.primary + "60" }}
            thumbColor={item.isEnabled ? Accent.primary : colors.textSecondary}
          />
        </View>

        {/* Status badges */}
        <View style={styles.statusRow}>
          {item.apiKeySet ? (
            <View style={[styles.statusBadge, { backgroundColor: Accent.success + "20" }]}>
              <IconSymbol name="checkmark.circle.fill" size={12} color={Accent.success} />
              <ThemedText type="small" style={{ color: Accent.success }}>
                API Key Set
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: Accent.warning + "20" }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={12} color={Accent.warning} />
              <ThemedText type="small" style={{ color: Accent.warning }}>
                No API Key
              </ThemedText>
            </View>
          )}
          {item.isEnabled && (
            <View style={[styles.statusBadge, { backgroundColor: Accent.primary + "20" }]}>
              <ThemedText type="small" style={{ color: Accent.primary }}>
                Routing Enabled
              </ThemedText>
            </View>
          )}
        </View>

        {/* Models preview */}
        {item.isEnabled && (
          <View style={styles.modelsContainer}>
            <ThemedText type="caption" style={{ marginBottom: 4 }}>
              Available Models:
            </ThemedText>
            <View style={styles.modelsList}>
              {item.models.slice(0, 3).map((model) => (
                <View
                  key={model.id}
                  style={[styles.modelChip, { backgroundColor: colors.background }]}
                >
                  <ThemedText type="small">{model.name}</ThemedText>
                </View>
              ))}
              {item.models.length > 3 && (
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  +{item.models.length - 3} more
                </ThemedText>
              )}
            </View>
          </View>
        )}

        {/* Configure button */}
        <Pressable
          onPress={() => handleConfigureProvider(item)}
          style={[styles.configButton, { backgroundColor: colors.background }]}
        >
          <IconSymbol name="gearshape.fill" size={14} color={colors.textSecondary} />
          <ThemedText type="small">Configure</ThemedText>
        </Pressable>
      </View>
    ),
    [colors, handleToggleProvider, handleConfigureProvider]
  );

  // Count enabled providers
  const enabledCount = providers.filter(p => p.isEnabled).length;

  return (
    <ThemedView style={styles.container}>
      {/* Header info */}
      <View style={[styles.infoBanner, { backgroundColor: Accent.primary + "10" }]}>
        <IconSymbol name="sparkles" size={16} color={Accent.primary} />
        <ThemedText type="caption" style={{ flex: 1 }}>
          Configure LLM providers for smart routing. Hero will automatically select the best model for each task.
        </ThemedText>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statBadge, { backgroundColor: Accent.success + "20" }]}>
          <ThemedText type="small" style={{ color: Accent.success }}>
            {enabledCount} Enabled
          </ThemedText>
        </View>
        <View style={[styles.statBadge, { backgroundColor: colors.surface }]}>
          <ThemedText type="small">
            {providers.filter(p => p.apiKeySet).length} Configured
          </ThemedText>
        </View>
      </View>

      {/* Smart routing info */}
      {enabledCount >= 2 && (
        <View style={[styles.routingBanner, { backgroundColor: Accent.success + "10" }]}>
          <IconSymbol name="arrow.triangle.branch" size={16} color={Accent.success} />
          <View style={{ flex: 1 }}>
            <ThemedText type="small" style={{ color: Accent.success, fontWeight: "600" }}>
              Smart Routing Active
            </ThemedText>
            <ThemedText type="caption">
              Tasks will be routed to optimal models based on type and risk level
            </ThemedText>
          </View>
        </View>
      )}

      <FlatList
        data={providers}
        keyExtractor={(item) => item.id}
        renderItem={renderProvider}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  routingBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  statBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  providerCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  providerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  providerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    gap: 4,
  },
  modelsContainer: {
    paddingTop: Spacing.xs,
  },
  modelsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    alignItems: "center",
  },
  modelChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  configButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
});
