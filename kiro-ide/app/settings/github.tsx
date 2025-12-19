import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Accent, Spacing, Radius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

// GitHub connection state
interface GitHubUser {
  login: string;
  name: string;
  avatarUrl: string;
  email: string;
}

interface GitHubRepo {
  id: string;
  name: string;
  fullName: string;
  private: boolean;
  description: string;
  language: string;
  updatedAt: Date;
  defaultBranch: string;
}

export default function GitHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [tokenInput, setTokenInput] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConnect = useCallback(async () => {
    if (!tokenInput.trim()) {
      Alert.alert("Error", "Please enter a GitHub Personal Access Token");
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Simulate API call
    setTimeout(() => {
      setUser({
        login: "developer",
        name: "Developer",
        avatarUrl: "",
        email: "dev@example.com",
      });
      setRepos([
        {
          id: "1",
          name: "hero-ide",
          fullName: "developer/hero-ide",
          private: false,
          description: "AI-powered IDE",
          language: "TypeScript",
          updatedAt: new Date(),
          defaultBranch: "main",
        },
        {
          id: "2",
          name: "my-project",
          fullName: "developer/my-project",
          private: true,
          description: "A private project",
          language: "Python",
          updatedAt: new Date(Date.now() - 86400000),
          defaultBranch: "main",
        },
      ]);
      setIsConnected(true);
      setShowTokenInput(false);
      setTokenInput("");
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  }, [tokenInput]);

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      "Disconnect GitHub",
      "Are you sure you want to disconnect your GitHub account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setIsConnected(false);
            setUser(null);
            setRepos([]);
          },
        },
      ]
    );
  }, []);

  const handleOpenGitHub = useCallback(() => {
    Linking.openURL("https://github.com/settings/tokens/new?scopes=repo,read:user,read:org");
  }, []);

  const renderRepo = useCallback(
    ({ item }: { item: GitHubRepo }) => (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // Open repo or link to project
        }}
        style={({ pressed }) => [
          styles.repoCard,
          { backgroundColor: colors.surface },
          pressed && styles.repoCardPressed,
        ]}
      >
        <View style={styles.repoHeader}>
          <View style={styles.repoInfo}>
            <IconSymbol
              name={item.private ? "lock.fill" : "folder.fill"}
              size={16}
              color={item.private ? Accent.warning : colors.textSecondary}
            />
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {item.name}
            </ThemedText>
          </View>
          {item.language && (
            <View style={[styles.languageBadge, { backgroundColor: getLanguageColor(item.language) + "20" }]}>
              <View style={[styles.languageDot, { backgroundColor: getLanguageColor(item.language) }]} />
              <ThemedText type="small">{item.language}</ThemedText>
            </View>
          )}
        </View>
        {item.description && (
          <ThemedText type="caption" numberOfLines={2} style={{ marginTop: 4 }}>
            {item.description}
          </ThemedText>
        )}
        <View style={styles.repoMeta}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {item.fullName}
          </ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {formatDate(item.updatedAt)}
          </ThemedText>
        </View>
      </Pressable>
    ),
    [colors]
  );

  if (!isConnected) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.connectContainer}>
          <View style={[styles.githubIcon, { backgroundColor: colors.surface }]}>
            <IconSymbol name="arrow.triangle.branch" size={48} color={colors.text} />
          </View>
          <ThemedText type="title" style={{ textAlign: "center", marginTop: 24 }}>
            Connect GitHub
          </ThemedText>
          <ThemedText type="caption" style={{ textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
            Connect your GitHub account to clone repositories, create pull requests, and manage issues
          </ThemedText>

          {showTokenInput ? (
            <View style={styles.tokenInputContainer}>
              <TextInput
                value={tokenInput}
                onChangeText={setTokenInput}
                style={[styles.tokenInput, { color: colors.text, backgroundColor: colors.surface }]}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.tokenActions}>
                <Pressable
                  onPress={() => setShowTokenInput(false)}
                  style={[styles.tokenButton, { backgroundColor: colors.surface }]}
                >
                  <ThemedText>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleConnect}
                  disabled={loading}
                  style={[styles.tokenButton, { backgroundColor: Accent.primary }]}
                >
                  <ThemedText style={{ color: "#FFFFFF" }}>
                    {loading ? "Connecting..." : "Connect"}
                  </ThemedText>
                </Pressable>
              </View>
              <Pressable onPress={handleOpenGitHub} style={styles.helpLink}>
                <IconSymbol name="questionmark.circle" size={14} color={Accent.primary} />
                <ThemedText type="small" style={{ color: Accent.primary }}>
                  How to create a Personal Access Token
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.connectActions}>
              <Pressable
                onPress={() => setShowTokenInput(true)}
                style={({ pressed }) => [
                  styles.connectButton,
                  { backgroundColor: Accent.primary },
                  pressed && styles.connectButtonPressed,
                ]}
              >
                <IconSymbol name="key.fill" size={20} color="#FFFFFF" />
                <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Connect with Token
                </ThemedText>
              </Pressable>
              <ThemedText type="caption" style={{ textAlign: "center", marginTop: 16 }}>
                Use a Personal Access Token for secure authentication
              </ThemedText>
            </View>
          )}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* User card */}
      <View style={[styles.userCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.avatar, { backgroundColor: Accent.primary + "20" }]}>
          <ThemedText type="title" style={{ color: Accent.primary }}>
            {user?.name?.[0] || user?.login?.[0] || "?"}
          </ThemedText>
        </View>
        <View style={styles.userInfo}>
          <ThemedText type="defaultSemiBold">{user?.name || user?.login}</ThemedText>
          <ThemedText type="caption">@{user?.login}</ThemedText>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {user?.email}
          </ThemedText>
        </View>
        <Pressable
          onPress={handleDisconnect}
          style={[styles.disconnectButton, { backgroundColor: Accent.error + "15" }]}
        >
          <IconSymbol name="xmark.circle.fill" size={16} color={Accent.error} />
          <ThemedText type="small" style={{ color: Accent.error }}>
            Disconnect
          </ThemedText>
        </Pressable>
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <Pressable
          onPress={() => router.push("/clone-repo")}
          style={[styles.quickAction, { backgroundColor: colors.surface }]}
        >
          <IconSymbol name="arrow.down.circle.fill" size={24} color={Accent.primary} />
          <ThemedText type="small">Clone Repo</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Create new repo
          }}
          style={[styles.quickAction, { backgroundColor: colors.surface }]}
        >
          <IconSymbol name="plus.circle.fill" size={24} color={Accent.success} />
          <ThemedText type="small">New Repo</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // View PRs
          }}
          style={[styles.quickAction, { backgroundColor: colors.surface }]}
        >
          <IconSymbol name="arrow.triangle.pull" size={24} color={Accent.warning} />
          <ThemedText type="small">Pull Requests</ThemedText>
        </Pressable>
      </View>

      {/* Repositories */}
      <View style={styles.reposSection}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Repositories</ThemedText>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Refresh repos
            }}
          >
            <IconSymbol name="arrow.clockwise" size={18} color={Accent.primary} />
          </Pressable>
        </View>
        <FlatList
          data={repos}
          keyExtractor={(item) => item.id}
          renderItem={renderRepo}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          ListEmptyComponent={
            <View style={styles.emptyRepos}>
              <ThemedText type="caption">No repositories found</ThemedText>
            </View>
          }
        />
      </View>
    </ThemedView>
  );
}

function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    TypeScript: "#3178C6",
    JavaScript: "#F7DF1E",
    Python: "#3776AB",
    Rust: "#DEA584",
    Go: "#00ADD8",
    Java: "#B07219",
    Swift: "#FA7343",
    Kotlin: "#A97BFF",
  };
  return colors[language] || "#8B949E";
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 7) return `Updated ${days} days ago`;
  if (days < 30) return `Updated ${Math.floor(days / 7)} weeks ago`;
  return `Updated ${Math.floor(days / 30)} months ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  connectContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  githubIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  connectActions: {
    width: "100%",
    marginTop: 32,
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  connectButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  tokenInputContainer: {
    width: "100%",
    marginTop: 32,
    gap: Spacing.md,
  },
  tokenInput: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    fontSize: 16,
    fontFamily: "monospace",
  },
  tokenActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  tokenButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  helpLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    margin: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  disconnectButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  reposSection: {
    flex: 1,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  repoCard: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  repoCardPressed: {
    opacity: 0.8,
  },
  repoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  repoInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  languageBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    gap: 4,
  },
  languageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  repoMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  emptyRepos: {
    alignItems: "center",
    padding: Spacing.xl,
  },
});
