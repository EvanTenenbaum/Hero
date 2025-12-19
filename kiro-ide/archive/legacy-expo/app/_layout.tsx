import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/manus-runtime";
import { Colors } from "@/constants/theme";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

// Custom dark theme for IDE aesthetic
const HeroDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    border: Colors.dark.border,
    primary: Colors.dark.tint,
    text: Colors.dark.text,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  useEffect(() => {
    initManusRuntime();
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(
    () => initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame },
    [initialFrame, initialInsets],
  );

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={colorScheme === "dark" ? HeroDarkTheme : DefaultTheme}>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: Colors.dark.surface },
                headerTintColor: Colors.dark.text,
                contentStyle: { backgroundColor: Colors.dark.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
              <Stack.Screen name="oauth/callback" options={{ headerShown: false }} />
              
              {/* Project screens */}
              <Stack.Screen 
                name="new-project" 
                options={{ 
                  presentation: "modal",
                  title: "New Project",
                }} 
              />
              <Stack.Screen 
                name="project/[id]" 
                options={{ 
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="clone-repo" 
                options={{ 
                  presentation: "modal",
                  title: "Clone Repository",
                }} 
              />
              <Stack.Screen 
                name="import-project" 
                options={{ 
                  presentation: "modal",
                  title: "Import Project",
                }} 
              />
              
              {/* Settings screens */}
              <Stack.Screen 
                name="settings/secrets" 
                options={{ title: "Secrets Vault" }} 
              />
              <Stack.Screen 
                name="settings/api-connections" 
                options={{ title: "API Connections" }} 
              />
              <Stack.Screen 
                name="settings/mcp" 
                options={{ title: "MCP Servers" }} 
              />
              <Stack.Screen 
                name="settings/mcp-servers" 
                options={{ title: "MCP Servers" }} 
              />
              <Stack.Screen 
                name="settings/github" 
                options={{ title: "GitHub" }} 
              />
              <Stack.Screen 
                name="settings/agent-rules" 
                options={{ title: "Agent Rules" }} 
              />
              <Stack.Screen 
                name="settings/agent-config" 
                options={{ title: "Agent Configuration" }} 
              />
              <Stack.Screen 
                name="settings/add-secret" 
                options={{ 
                  presentation: "modal",
                  title: "Add Secret" 
                }} 
              />
              <Stack.Screen 
                name="settings/routing" 
                options={{ title: "Smart Routing" }} 
              />
              <Stack.Screen 
                name="settings/appearance" 
                options={{ title: "Appearance" }} 
              />
              <Stack.Screen 
                name="settings/editor" 
                options={{ title: "Editor" }} 
              />
              <Stack.Screen 
                name="settings/storage" 
                options={{ title: "Storage" }} 
              />
              <Stack.Screen 
                name="settings/about" 
                options={{ title: "About" }} 
              />
              <Stack.Screen 
                name="settings/budgets" 
                options={{ title: "Budget Limits" }} 
              />
              
              {/* Project screens */}
              <Stack.Screen 
                name="project/roadmap" 
                options={{ title: "Roadmap" }} 
              />
              <Stack.Screen 
                name="project/governance" 
                options={{ title: "Governance" }} 
              />
              <Stack.Screen 
                name="project/violations" 
                options={{ title: "Violations", headerShown: false }} 
              />
              
              {/* Agent screens */}
              <Stack.Screen 
                name="agent/[id]" 
                options={{ title: "Agent Execution", headerShown: false }} 
              />
            </Stack>
            <StatusBar style="light" />
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>
        <SafeAreaFrameContext.Provider value={frame}>
          <SafeAreaInsetsContext.Provider value={insets}>{content}</SafeAreaInsetsContext.Provider>
        </SafeAreaFrameContext.Provider>
      </SafeAreaProvider>
    );
  }

  return <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>;
}
