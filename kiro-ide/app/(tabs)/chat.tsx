import { useCallback, useState, useRef, useEffect } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePMChat, PMMessage } from "@/hooks/use-pm-chat";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState("");
  
  const {
    messages,
    isLoading,
    currentSuggestions,
    pendingCommand,
    sendMessage,
    updateSuggestions,
    confirmCommand,
    cancelCommand,
  } = usePMChat();

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = inputText.trim();
    setInputText("");
    await sendMessage(text);
  }, [inputText, isLoading, sendMessage]);

  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
    updateSuggestions(text);
  }, [updateSuggestions]);

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const renderMessage = useCallback(
    ({ item }: { item: PMMessage }) => {
      const isUser = item.role === "user";
      const isConfigAction = item.isConfigAction;
      
      return (
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.aiBubble,
            {
              backgroundColor: isUser 
                ? Accent.primary 
                : isConfigAction 
                  ? colors.surface 
                  : colors.elevated,
              borderWidth: isConfigAction ? 1 : 0,
              borderColor: isConfigAction ? Accent.primary + "40" : "transparent",
            },
          ]}
        >
          {!isUser && (
            <View style={styles.aiHeader}>
              <IconSymbol 
                name={isConfigAction ? "gearshape.fill" : "sparkles"} 
                size={14} 
                color={Accent.primary} 
              />
              <ThemedText type="small" style={{ color: Accent.primary }}>
                {isConfigAction ? "Config" : "AI PM"}
              </ThemedText>
            </View>
          )}
          <ThemedText
            style={[
              styles.messageText,
              { color: isUser ? "#FFFFFF" : colors.text },
            ]}
          >
            {item.content}
          </ThemedText>
          
          {/* Confirmation buttons */}
          {item.requiresConfirmation && item.pendingConfirmation && (
            <View style={styles.confirmationRow}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  confirmCommand();
                }}
                style={[styles.confirmButton, { backgroundColor: Accent.success }]}
              >
                <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
                <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Confirm
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  cancelCommand();
                }}
                style={[styles.cancelButton, { backgroundColor: colors.elevated }]}
              >
                <ThemedText style={{ color: colors.textSecondary }}>
                  Cancel
                </ThemedText>
              </Pressable>
            </View>
          )}
          
          {/* Suggested follow-ups */}
          {item.commandResult?.suggestedFollowUp && (
            <View style={styles.followUpContainer}>
              <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: 4 }}>
                Suggested:
              </ThemedText>
              {item.commandResult.suggestedFollowUp.map((suggestion, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setInputText(suggestion);
                  }}
                  style={[styles.followUpChip, { backgroundColor: colors.elevated }]}
                >
                  <ThemedText type="small">{suggestion}</ThemedText>
                </Pressable>
              ))}
            </View>
          )}
          
          <ThemedText
            type="small"
            style={[
              styles.timestamp,
              { color: isUser ? "rgba(255,255,255,0.7)" : colors.textSecondary },
            ]}
          >
            {formatTime(item.timestamp)}
          </ThemedText>
        </View>
      );
    },
    [colors, confirmCommand, cancelCommand]
  );

  const quickActions = [
    { label: "Help", icon: "questionmark.circle.fill" as const },
    { label: "Create Task", icon: "plus.circle.fill" as const },
    { label: "Smart Order", icon: "sparkles" as const },
    { label: "Status", icon: "chart.bar.fill" as const },
  ];

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
          <ThemedText type="title">AI PM</ThemedText>
          <View style={[styles.modeBadge, { backgroundColor: Accent.primary + "20" }]}>
            <IconSymbol name="shield.fill" size={12} color={Accent.primary} />
            <ThemedText type="small" style={{ color: Accent.primary }}>
              Collaborative
            </ThemedText>
          </View>
        </View>
        <ThemedText type="caption" style={{ marginTop: 4 }}>
          Configure IDE, manage roadmap, control agents
        </ThemedText>
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.bottom + 49}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToBottom}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="sparkles" size={48} color={colors.textDisabled} />
              <ThemedText type="subtitle" style={{ color: colors.textSecondary, marginTop: 16 }}>
                Your AI Project Manager
              </ThemedText>
              <ThemedText type="caption" style={{ textAlign: "center", marginTop: 8 }}>
                Configure the IDE, manage tasks, and control agents with natural language
              </ThemedText>
              <View style={styles.suggestions}>
                <ThemedText type="caption" style={{ marginBottom: 8 }}>
                  Try saying:
                </ThemedText>
                {[
                  '"Add OpenAI API"',
                  '"Switch to collaborative mode"',
                  '"Create a task for authentication"',
                  '"Set budget limit to 1000"',
                  '"Connect to GitHub"',
                ].map((suggestion, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setInputText(suggestion.replace(/"/g, ""))}
                    style={[styles.suggestionChip, { backgroundColor: colors.surface }]}
                  >
                    <ThemedText type="caption">{suggestion}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          }
        />

        {/* Live suggestions */}
        {currentSuggestions.length > 0 && (
          <View style={[styles.suggestionsOverlay, { backgroundColor: colors.surface }]}>
            {currentSuggestions.map((suggestion, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setInputText(suggestion);
                }}
                style={[styles.liveSuggestion, { borderBottomColor: colors.border }]}
              >
                <IconSymbol name="sparkles" size={14} color={Accent.primary} />
                <ThemedText>{suggestion}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.quickActionsRow}>
            {quickActions.map((action, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (action.label === "Help") {
                    sendMessage("help");
                  } else if (action.label === "Status") {
                    sendMessage("Show project status");
                  } else {
                    setInputText(action.label.toLowerCase());
                  }
                }}
                style={[styles.quickActionChip, { backgroundColor: colors.elevated }]}
              >
                <IconSymbol name={action.icon} size={14} color={Accent.primary} />
                <ThemedText type="small">{action.label}</ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.inputRow}>
            <Pressable style={styles.attachButton}>
              <IconSymbol name="plus.circle.fill" size={24} color={colors.textSecondary} />
            </Pressable>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Configure IDE, manage tasks..."
              placeholderTextColor={colors.textDisabled}
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={4000}
              onSubmitEditing={handleSend}
            />
            {isLoading ? (
              <View style={[styles.sendButton, { backgroundColor: colors.elevated }]}>
                <ActivityIndicator size="small" color={Accent.primary} />
              </View>
            ) : (
              <Pressable
                onPress={handleSend}
                disabled={!inputText.trim() || isLoading}
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: inputText.trim() ? Accent.primary : colors.elevated,
                  },
                ]}
              >
                <IconSymbol
                  name="paperplane.fill"
                  size={18}
                  color={inputText.trim() ? "#FFFFFF" : colors.textDisabled}
                />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  messageBubble: {
    maxWidth: "85%",
    padding: Spacing.md,
    borderRadius: Radius.xl,
    marginBottom: Spacing.sm,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: Radius.sm,
  },
  aiBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: Radius.sm,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  timestamp: {
    marginTop: Spacing.xs,
    alignSelf: "flex-end",
  },
  confirmationRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  cancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  followUpContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  followUpChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: Spacing.xl,
  },
  suggestions: {
    marginTop: Spacing.xl,
    width: "100%",
  },
  suggestionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  suggestionsOverlay: {
    position: "absolute",
    bottom: 120,
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: Radius.lg,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  liveSuggestion: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
  },
  inputContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    flexWrap: "wrap",
  },
  quickActionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  attachButton: {
    padding: Spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    maxHeight: 120,
    paddingVertical: Spacing.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
