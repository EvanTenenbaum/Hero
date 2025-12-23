/**
 * Safe Enhanced Agent Wrapper
 * 
 * Provides a safe integration layer for the enhanced agent services.
 * This wrapper handles graceful degradation when new services are unavailable
 * and ensures backward compatibility with existing code.
 */

import { logger } from '../_core/logger';
import { EnhancedCloudChatAgent, EnhancedAgentConfig, ChatContext, ChatAgentResult } from './enhancedCloudChatAgent';
import { AgentTaskType } from './enhancedPromptSystem';

// Feature flags for gradual rollout
export interface EnhancedAgentFeatureFlags {
    enableMemory: boolean;
    enableLearning: boolean;
    enableReflection: boolean;
    enableAdaptive: boolean;
}

// Default feature flags (all disabled for safe rollout)
const DEFAULT_FEATURE_FLAGS: EnhancedAgentFeatureFlags = {
    enableMemory: false,
    enableLearning: false,
    enableReflection: false,
    enableAdaptive: false,
};

// Environment-based feature flag overrides
function getFeatureFlags(): EnhancedAgentFeatureFlags {
    return {
        enableMemory: process.env.HERO_ENABLE_AGENT_MEMORY === 'true',
        enableLearning: process.env.HERO_ENABLE_AGENT_LEARNING === 'true',
        enableReflection: process.env.HERO_ENABLE_AGENT_REFLECTION === 'true',
        enableAdaptive: process.env.HERO_ENABLE_AGENT_ADAPTIVE === 'true',
    };
}

/**
 * Check if the database tables required by enhanced agent exist.
 * Returns false if tables don't exist, allowing graceful degradation.
 */
async function checkDatabaseReady(): Promise<boolean> {
    try {
        // Import dynamically to avoid circular dependencies
        const { getDb } = await import('../db');
        const db = await getDb();
        
        if (!db) {
            logger.warn('Database not available for enhanced agent');
            return false;
        }
        
        // Try a simple query to check if tables exist
        // This will fail gracefully if tables don't exist
        try {
            await db.execute('SELECT 1 FROM agent_memory_short_term LIMIT 1');
            await db.execute('SELECT 1 FROM audit_logs LIMIT 1');
            return true;
        } catch (tableError) {
            logger.info('Enhanced agent tables not yet created, using fallback mode');
            return false;
        }
    } catch (error) {
        logger.warn({ error }, 'Error checking database readiness for enhanced agent');
        return false;
    }
}

/**
 * Safe wrapper for creating an enhanced agent.
 * Falls back to basic functionality if enhanced features are unavailable.
 */
export async function createSafeEnhancedAgent(
    config: Omit<EnhancedAgentConfig, 'enableMemory' | 'enableLearning' | 'enableReflection' | 'enableAdaptive'>
): Promise<EnhancedCloudChatAgent | null> {
    try {
        const featureFlags = getFeatureFlags();
        const dbReady = await checkDatabaseReady();
        
        // If database isn't ready, disable features that require it
        const safeFlags: EnhancedAgentFeatureFlags = dbReady 
            ? featureFlags 
            : { ...DEFAULT_FEATURE_FLAGS };
        
        const enhancedConfig: EnhancedAgentConfig = {
            ...config,
            ...safeFlags,
        };
        
        logger.info({ 
            userId: config.userId, 
            projectId: config.projectId,
            features: safeFlags 
        }, 'Creating enhanced agent with safe configuration');
        
        return new EnhancedCloudChatAgent(enhancedConfig);
    } catch (error) {
        logger.error({ error }, 'Failed to create enhanced agent, returning null');
        return null;
    }
}

/**
 * Process a message with the enhanced agent, with fallback handling.
 */
export async function processMessageSafe(
    agent: EnhancedCloudChatAgent | null,
    userMessage: string,
    context: ChatContext,
    taskType: AgentTaskType = 'CODE_GENERATION',
    fallbackHandler?: (message: string, context: ChatContext) => Promise<ChatAgentResult>
): Promise<ChatAgentResult> {
    // If no enhanced agent, use fallback
    if (!agent) {
        if (fallbackHandler) {
            logger.info('Using fallback handler for message processing');
            return fallbackHandler(userMessage, context);
        }
        throw new Error('Enhanced agent unavailable and no fallback provided');
    }
    
    try {
        return await agent.processMessage(userMessage, context, taskType);
    } catch (error) {
        logger.error({ error }, 'Enhanced agent failed to process message');
        
        // Try fallback if available
        if (fallbackHandler) {
            logger.info('Falling back to basic message processing');
            return fallbackHandler(userMessage, context);
        }
        
        // Return a safe error response
        return {
            response: 'I encountered an issue processing your request. Please try again.',
            toolsUsed: [],
            filesModified: [],
            executionTimeMs: 0,
            confidence: 0,
            learningApplied: false,
            memoryUsed: false,
        };
    }
}

/**
 * Graceful shutdown for enhanced agent resources.
 */
export async function shutdownEnhancedAgent(agent: EnhancedCloudChatAgent | null): Promise<void> {
    if (!agent) return;
    
    try {
        // Any cleanup logic for the enhanced agent
        logger.info('Enhanced agent shutdown complete');
    } catch (error) {
        logger.warn({ error }, 'Error during enhanced agent shutdown');
    }
}

/**
 * Health check for enhanced agent services.
 */
export async function checkEnhancedAgentHealth(): Promise<{
    healthy: boolean;
    database: boolean;
    features: EnhancedAgentFeatureFlags;
    errors: string[];
}> {
    const errors: string[] = [];
    const dbReady = await checkDatabaseReady();
    const features = getFeatureFlags();
    
    if (!dbReady && (features.enableMemory || features.enableLearning)) {
        errors.push('Database not ready but memory/learning features enabled');
    }
    
    return {
        healthy: errors.length === 0,
        database: dbReady,
        features,
        errors,
    };
}
