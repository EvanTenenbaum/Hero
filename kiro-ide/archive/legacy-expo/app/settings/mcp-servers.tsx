import { useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DEFAULT_MCP_SERVERS, MCPServerConfig } from "@/lib/default-secrets";

const MCP_SERVERS_KEY = "hero_mcp_servers";
const MCP_INITIALIZED_KEY = "hero_mcp_initialized";

// MCP Server types
interface MCPServer {
  id: string;
  name: string;
  url: string;
  protocol: "stdio" | "http" | "websocket";
  status: "connected" | "disconnected" | "error";
  tools: string[];
  lastConnected?: Date;
  errorMessage?: string;
  description?: string;
  isEnabled?: boolean;
  secretName?: string;
}

export default function MCPServersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServer, setNewServer] = useState<{
    name: string;
    url: string;
    protocol: "stdio" | "http" | "websocket";
  }>({
    name: "",
    url: "",
    protocol: "stdio",
  });

  // Load servers on mount
  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const isInitialized = await AsyncStorage.getItem(MCP_INITIALIZED_KEY);
      
      if (!isInitialized) {
        // First time - initialize with default MCP servers
        const defaultServers: MCPServer[] = DEFAULT_MCP_SERVERS.map((s) => ({
          ...s,
          lastConnected: new Date(),
        }));
        await AsyncStorage.setItem(MCP_SERVERS_KEY, JSON.stringify(defaultServers));
        await AsyncStorage.setItem(MCP_INITIALIZED_KEY, "true");
        setServers(defaultServers);
      } else {
        const data = await AsyncStorage.getItem(MCP_SERVERS_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          const serversWithDates = parsed.map((s: any) => ({
            ...s,
            lastConnected: s.lastConnected ? new Date(s.lastConnected) : undefined,
          }));
          setServers(serversWithDates);
        }
      }
    } catch (error) {
      console.error("Failed to load MCP servers:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveServers = async (newServers: MCPServer[]) => {
    try {
      await AsyncStorage.setItem(MCP_SERVERS_KEY, JSON.stringify(newServers));
      setServers(newServers);
    } catch (error) {
      console.error("Failed to save MCP servers:", error);
    }
  };

  const handleConnect = useCallback((server: MCPServer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = servers.map((s) =>
      s.id === server.id
        ? { ...s, status: "connected" as const, lastConnected: new Date() }
        : s
    );
    saveServers(updated);
  }, [servers]);

  const handleDisconnect = useCallback((server: MCPServer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = servers.map((s) =>
      s.id === server.id ? { ...s, status: "disconnected" as const } : s
    );
    saveServers(updated);
  }, [servers]);

  const handleDelete = useCallback((server: MCPServer) => {
    Alert.alert(
      "Remove Server",
      `Are you sure you want to remove "${server.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const filtered = servers.filter((s) => s.id !== server.id);
            saveServers(filtered);
          },
        },
      ]
    );
  }, [servers]);

  const handleAddServer = useCallback(() => {
    if (!newServer.name || !newServer.url) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newMCPServer: MCPServer = {
      id: Date.now().toString(),
      name: newServer.name,
      url: newServer.url,
      protocol: newServer.protocol,
      status: "disconnected",
      tools: [],
    };
    saveServers([...servers, newMCPServer]);
    setNewServer({ name: "", url: "", protocol: "stdio" });
    setShowAddModal(false);
  }, [newServer, servers]);

  const getStatusColor = (status: MCPServer["status"]) => {
    switch (status) {
      case "connected":
        return Accent.success;
      case "disconnected":
        return colors.textSecondary;
      case "error":
        return Accent.error;
    }
  };

  const renderServer = useCallback(
    ({ item }: { item: MCPServer }) => (
      <View style={[styles.serverCard, { backgroundColor: colors.surface }]}>
        <View style={styles.serverHeader}>
          <View style={styles.serverInfo}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
              <ThemedText type="code" numberOfLines={1} style={{ fontSize: 12 }}>
                {item.url}
              </ThemedText>
              {item.description && (
                <ThemedText type="caption" numberOfLines={1} style={{ marginTop: 2 }}>
                  {item.description}
                </ThemedText>
              )}
            </View>
          </View>
          <View style={[styles.protocolBadge, { backgroundColor: Accent.primary + "20" }]}>
            <ThemedText type="small" style={{ color: Accent.primary }}>
              {item.protocol.toUpperCase()}
            </ThemedText>
          </View>
        </View>

        {/* Tools */}
        {item.tools.length > 0 && (
          <View style={styles.toolsContainer}>
            <ThemedText type="caption" style={{ marginBottom: 4 }}>
              Available Tools:
            </ThemedText>
            <View style={styles.toolsList}>
              {item.tools.slice(0, 4).map((tool) => (
                <View
                  key={tool}
                  style={[styles.toolChip, { backgroundColor: colors.background }]}
                >
                  <ThemedText type="small">{tool}</ThemedText>
                </View>
              ))}
              {item.tools.length > 4 && (
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  +{item.tools.length - 4} more
                </ThemedText>
              )}
            </View>
          </View>
        )}

        {/* Secret indicator */}
        {item.secretName && (
          <View style={[styles.secretBadge, { backgroundColor: Accent.warning + "15" }]}>
            <IconSymbol name="key.fill" size={12} color={Accent.warning} />
            <ThemedText type="small" style={{ color: Accent.warning }}>
              Uses: {item.secretName}
            </ThemedText>
          </View>
        )}

        {/* Error message */}
        {item.status === "error" && item.errorMessage && (
          <View style={[styles.errorBanner, { backgroundColor: Accent.error + "15" }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={14} color={Accent.error} />
            <ThemedText type="small" style={{ color: Accent.error, flex: 1 }}>
              {item.errorMessage}
            </ThemedText>
          </View>
        )}

        {/* Actions */}
        <View style={styles.serverActions}>
          {item.lastConnected && (
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              Last connected: {formatDate(item.lastConnected)}
            </ThemedText>
          )}
          <View style={styles.actionButtons}>
            {item.status === "connected" ? (
              <Pressable
                onPress={() => handleDisconnect(item)}
                style={[styles.actionButton, { backgroundColor: colors.background }]}
              >
                <IconSymbol name="xmark.circle.fill" size={16} color={Accent.warning} />
                <ThemedText type="small">Disconnect</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => handleConnect(item)}
                style={[styles.actionButton, { backgroundColor: Accent.success + "20" }]}
              >
                <IconSymbol name="bolt.fill" size={16} color={Accent.success} />
                <ThemedText type="small" style={{ color: Accent.success }}>
                  Connect
                </ThemedText>
              </Pressable>
            )}
            <Pressable
              onPress={() => handleDelete(item)}
              style={[styles.actionButton, { backgroundColor: Accent.error + "15" }]}
            >
              <IconSymbol name="trash.fill" size={16} color={Accent.error} />
            </Pressable>
          </View>
        </View>
      </View>
    ),
    [colors, handleConnect, handleDisconnect, handleDelete]
  );

  return (
    <ThemedView style={styles.container}>
      {/* Info banner */}
      <View style={[styles.infoBanner, { backgroundColor: Accent.primary + "10" }]}>
        <IconSymbol name="server.rack" size={16} color={Accent.primary} />
        <ThemedText type="caption" style={{ flex: 1 }}>
          MCP servers extend Hero's capabilities with external tools and services
        </ThemedText>
      </View>

      {/* Connected count */}
      <View style={styles.statsRow}>
        <View style={[styles.statBadge, { backgroundColor: Accent.success + "20" }]}>
          <ThemedText type="small" style={{ color: Accent.success }}>
            {servers.filter(s => s.status === "connected").length} Connected
          </ThemedText>
        </View>
        <View style={[styles.statBadge, { backgroundColor: colors.surface }]}>
          <ThemedText type="small">
            {servers.length} Total
          </ThemedText>
        </View>
      </View>

      <FlatList
        data={servers}
        keyExtractor={(item) => item.id}
        renderItem={renderServer}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="server.rack" size={48} color={colors.textDisabled} />
            <ThemedText type="subtitle" style={{ color: colors.textSecondary, marginTop: 16 }}>
              No MCP servers
            </ThemedText>
            <ThemedText type="caption" style={{ textAlign: "center", marginTop: 8 }}>
              Add MCP servers to extend Hero's capabilities
            </ThemedText>
          </View>
        }
      />

      {/* Add button */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowAddModal(true);
        }}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: Accent.primary },
          pressed && styles.fabPressed,
        ]}
      >
        <IconSymbol name="plus" size={24} color="#FFFFFF" />
      </Pressable>

      {/* Add Server Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface }]}>
            <Pressable onPress={() => setShowAddModal(false)}>
              <ThemedText style={{ color: Accent.primary }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="defaultSemiBold">Add MCP Server</ThemedText>
            <Pressable onPress={handleAddServer}>
              <ThemedText style={{ color: Accent.primary, fontWeight: "600" }}>Add</ThemedText>
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <ThemedText type="small">Server Name</ThemedText>
              <TextInput
                value={newServer.name}
                onChangeText={(text) => setNewServer((prev) => ({ ...prev, name: text }))}
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
                placeholder="e.g., My MCP Server"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small">Server URL</ThemedText>
              <TextInput
                value={newServer.url}
                onChangeText={(text) => setNewServer((prev) => ({ ...prev, url: text }))}
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
                placeholder="stdio://... or https://..."
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small">Protocol</ThemedText>
              <View style={styles.protocolOptions}>
                {(["stdio", "http", "websocket"] as const).map((protocol) => (
                  <Pressable
                    key={protocol}
                    onPress={() => setNewServer((prev) => ({ ...prev, protocol }))}
                    style={[
                      styles.protocolOption,
                      {
                        backgroundColor:
                          newServer.protocol === protocol
                            ? Accent.primary + "20"
                            : colors.surface,
                        borderColor:
                          newServer.protocol === protocol
                            ? Accent.primary
                            : colors.border,
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{
                        color:
                          newServer.protocol === protocol
                            ? Accent.primary
                            : colors.text,
                      }}
                    >
                      {protocol.toUpperCase()}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
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
    paddingTop: Spacing.md,
  },
  serverCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  serverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  serverInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  protocolBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  toolsContainer: {
    paddingTop: Spacing.sm,
  },
  toolsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    alignItems: "center",
  },
  toolChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  secretBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
    alignSelf: "flex-start",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
  },
  serverActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  modalContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  input: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    fontSize: 16,
  },
  protocolOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  protocolOption: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
    borderWidth: 1,
  },
});
