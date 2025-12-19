import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_SECRETS } from "@/lib/default-secrets";

const SECRETS_KEY = "hero_secrets";
const SECRETS_INITIALIZED_KEY = "hero_secrets_initialized";

export type SecretCategory = "llm" | "github" | "mcp" | "custom";

export interface Secret {
  id: string;
  name: string;
  value: string;
  category: SecretCategory;
  description: string;
  projectScope: string | null; // null = all projects
  createdAt: Date;
  lastUsed: Date | null;
}

export function useSecrets() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSecrets = useCallback(async () => {
    try {
      // Check if we need to initialize with default secrets
      const isInitialized = await AsyncStorage.getItem(SECRETS_INITIALIZED_KEY);
      
      if (!isInitialized) {
        // First time - initialize with default secrets
        await AsyncStorage.setItem(SECRETS_KEY, JSON.stringify(DEFAULT_SECRETS));
        await AsyncStorage.setItem(SECRETS_INITIALIZED_KEY, "true");
        setSecrets(DEFAULT_SECRETS);
      } else {
        // Load existing secrets
        const data = await AsyncStorage.getItem(SECRETS_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          const secretsWithDates = parsed.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            lastUsed: s.lastUsed ? new Date(s.lastUsed) : null,
          }));
          setSecrets(secretsWithDates);
        }
      }
    } catch (error) {
      console.error("Failed to load secrets:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  const saveSecrets = useCallback(async (newSecrets: Secret[]) => {
    try {
      await AsyncStorage.setItem(SECRETS_KEY, JSON.stringify(newSecrets));
      setSecrets(newSecrets);
    } catch (error) {
      console.error("Failed to save secrets:", error);
    }
  }, []);

  const addSecret = useCallback(
    async (
      name: string,
      value: string,
      category: SecretCategory,
      description: string = "",
      projectScope: string | null = null
    ): Promise<Secret> => {
      const newSecret: Secret = {
        id: generateId(),
        name,
        value,
        category,
        description,
        projectScope,
        createdAt: new Date(),
        lastUsed: null,
      };
      await saveSecrets([newSecret, ...secrets]);
      return newSecret;
    },
    [secrets, saveSecrets]
  );

  const updateSecret = useCallback(
    async (id: string, updates: Partial<Omit<Secret, "id" | "createdAt">>) => {
      const updated = secrets.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      );
      await saveSecrets(updated);
    },
    [secrets, saveSecrets]
  );

  const deleteSecret = useCallback(
    async (id: string) => {
      const filtered = secrets.filter((s) => s.id !== id);
      await saveSecrets(filtered);
    },
    [secrets, saveSecrets]
  );

  const getSecret = useCallback(
    (id: string): Secret | undefined => {
      return secrets.find((s) => s.id === id);
    },
    [secrets]
  );

  const getSecretByName = useCallback(
    (name: string, category?: SecretCategory): Secret | undefined => {
      return secrets.find(
        (s) => s.name === name && (!category || s.category === category)
      );
    },
    [secrets]
  );

  const markSecretUsed = useCallback(
    async (id: string) => {
      await updateSecret(id, { lastUsed: new Date() });
    },
    [updateSecret]
  );

  const getSecretsForProject = useCallback(
    (projectId: string): Secret[] => {
      return secrets.filter(
        (s) => s.projectScope === null || s.projectScope === projectId
      );
    },
    [secrets]
  );

  // Reset to default secrets (useful for testing)
  const resetToDefaults = useCallback(async () => {
    await AsyncStorage.removeItem(SECRETS_INITIALIZED_KEY);
    await loadSecrets();
  }, [loadSecrets]);

  return {
    secrets,
    loading,
    addSecret,
    updateSecret,
    deleteSecret,
    getSecret,
    getSecretByName,
    markSecretUsed,
    getSecretsForProject,
    resetToDefaults,
    refresh: loadSecrets,
  };
}

function generateId(): string {
  return `secret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
