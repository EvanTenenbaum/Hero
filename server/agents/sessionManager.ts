/**
 * Session Manager Module
 * 
 * Manages agent session state with automatic expiration.
 * Sessions are scoped per-user and optionally per-project.
 */

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface SessionData {
  sessionId: string;
  userId: number;
  projectId?: number;
  agentType: string;
  
  // State
  metadata: Record<string, unknown>;
  recentActions: string[];
  openFiles: string[];
  
  // Timing
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
}

export interface SessionConfig {
  ttlMs: number; // Time to live in milliseconds
  maxRecentActions: number;
  maxOpenFiles: number;
}

const DEFAULT_CONFIG: SessionConfig = {
  ttlMs: 30 * 60 * 1000, // 30 minutes
  maxRecentActions: 20,
  maxOpenFiles: 10,
};

// ════════════════════════════════════════════════════════════════════════════
// SESSION MANAGER CLASS
// ════════════════════════════════════════════════════════════════════════════

class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private config: SessionConfig;
  private cleanupInterval?: ReturnType<typeof setInterval>;
  
  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }
  
  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Create a new session
   */
  createSession(
    userId: number,
    agentType: string,
    projectId?: number,
    initialMetadata?: Record<string, unknown>
  ): SessionData {
    const now = new Date();
    const session: SessionData = {
      sessionId: this.generateSessionId(),
      userId,
      projectId,
      agentType,
      metadata: initialMetadata || {},
      recentActions: [],
      openFiles: [],
      createdAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + this.config.ttlMs),
    };
    
    this.sessions.set(session.sessionId, session);
    return session;
  }
  
  /**
   * Get a session by ID
   */
  getSession(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    
    if (!session) return undefined;
    
    // Check if expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    
    return session;
  }
  
  /**
   * Get or create a session for a user/project/agent combination
   */
  getOrCreateSession(
    userId: number,
    agentType: string,
    projectId?: number
  ): SessionData {
    // Look for existing session
    for (const session of Array.from(this.sessions.values())) {
      if (
        session.userId === userId &&
        session.agentType === agentType &&
        session.projectId === projectId &&
        new Date() < session.expiresAt
      ) {
        return session;
      }
    }
    
    // Create new session
    return this.createSession(userId, agentType, projectId);
  }
  
  /**
   * Update session activity (extends expiration)
   */
  touchSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = new Date();
      session.expiresAt = new Date(Date.now() + this.config.ttlMs);
    }
  }
  
  /**
   * Add a recent action to the session
   */
  addAction(sessionId: string, action: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.recentActions.push(action);
    
    // Trim to max size
    if (session.recentActions.length > this.config.maxRecentActions) {
      session.recentActions = session.recentActions.slice(-this.config.maxRecentActions);
    }
    
    this.touchSession(sessionId);
  }
  
  /**
   * Add an open file to the session
   */
  addOpenFile(sessionId: string, filePath: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    // Remove if already exists (to move to end)
    const index = session.openFiles.indexOf(filePath);
    if (index !== -1) {
      session.openFiles.splice(index, 1);
    }
    
    session.openFiles.push(filePath);
    
    // Trim to max size (remove oldest)
    if (session.openFiles.length > this.config.maxOpenFiles) {
      session.openFiles = session.openFiles.slice(-this.config.maxOpenFiles);
    }
    
    this.touchSession(sessionId);
  }
  
  /**
   * Remove an open file from the session
   */
  removeOpenFile(sessionId: string, filePath: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    const index = session.openFiles.indexOf(filePath);
    if (index !== -1) {
      session.openFiles.splice(index, 1);
    }
  }
  
  /**
   * Update session metadata
   */
  updateMetadata(sessionId: string, metadata: Record<string, unknown>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.metadata = { ...session.metadata, ...metadata };
    this.touchSession(sessionId);
  }
  
  /**
   * Get session metadata value
   */
  getMetadata<T>(sessionId: string, key: string): T | undefined {
    const session = this.sessions.get(sessionId);
    return session?.metadata[key] as T | undefined;
  }
  
  /**
   * End a session
   */
  endSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
  
  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: number): SessionData[] {
    const userSessions: SessionData[] = [];
    
    for (const session of Array.from(this.sessions.values())) {
      if (session.userId === userId && new Date() < session.expiresAt) {
        userSessions.push(session);
      }
    }
    
    return userSessions;
  }
  
  /**
   * Get all active sessions
   */
  getAllSessions(): SessionData[] {
    const now = new Date();
    return Array.from(this.sessions.values()).filter(s => now < s.expiresAt);
  }
  
  /**
   * Clean up expired sessions
   */
  cleanup(): number {
    const now = new Date();
    let cleaned = 0;
    
    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    
    return cleaned;
  }
  
  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
  
  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    sessionsByAgent: Record<string, number>;
  } {
    const now = new Date();
    const activeSessions = Array.from(this.sessions.values()).filter(s => now < s.expiresAt);
    
    const sessionsByAgent: Record<string, number> = {};
    for (const session of activeSessions) {
      sessionsByAgent[session.agentType] = (sessionsByAgent[session.agentType] || 0) + 1;
    }
    
    return {
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      sessionsByAgent,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ════════════════════════════════════════════════════════════════════════════

export const sessionManager = new SessionManager();

// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get the global session manager instance
 */
export function getSessionManager(): SessionManager {
  return sessionManager;
}

/**
 * Create a session manager with custom config
 */
export function createSessionManager(config?: Partial<SessionConfig>): SessionManager {
  return new SessionManager(config);
}
