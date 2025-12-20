import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { chatAgentRouter } from './routers/chat-agent';
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

// ════════════════════════════════════════════════════════════════════════════
// AUTH ROUTER
// ════════════════════════════════════════════════════════════════════════════

const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});

// ════════════════════════════════════════════════════════════════════════════
// PROJECTS ROUTER
// ════════════════════════════════════════════════════════════════════════════

const projectsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getProjectsByUserId(ctx.user.id);
  }),
  
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await db.getProjectById(input.id, ctx.user.id);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      return project;
    }),
  
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      type: z.enum(["local", "github", "imported"]).default("local"),
      githubRepoFullName: z.string().optional(),
      githubCloneUrl: z.string().optional(),
      githubDefaultBranch: z.string().optional(),
      settings: z.object({
        language: z.string().optional(),
        framework: z.string().optional(),
        governanceEnabled: z.boolean().optional(),
        budgetLimit: z.number().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createProject({
        userId: ctx.user.id,
        ...input,
      });
    }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      settings: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateProject(id, ctx.user.id, data);
      return { success: true };
    }),
  
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteProject(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ════════════════════════════════════════════════════════════════════════════
// CHAT ROUTER
// ════════════════════════════════════════════════════════════════════════════

const chatRouter = router({
  conversations: protectedProcedure.query(async ({ ctx }) => {
    return db.getConversationsByUserId(ctx.user.id);
  }),
  
  getConversation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const conv = await db.getConversationById(input.id, ctx.user.id);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND" });
      return conv;
    }),
  
  createConversation: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      type: z.enum(["general", "project", "agent"]).default("general"),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createConversation({
        userId: ctx.user.id,
        ...input,
      });
    }),
  
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const conv = await db.getConversationById(input.conversationId, ctx.user.id);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND" });
      return db.getMessagesByConversationId(input.conversationId);
    }),
  
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      content: z.string().min(1),
      systemPrompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const conv = await db.getConversationById(input.conversationId, ctx.user.id);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND" });
      
      // Save user message
      await db.addMessage({
        conversationId: input.conversationId,
        role: "user",
        content: input.content,
      });
      
      // Get conversation history
      const messages = await db.getMessagesByConversationId(input.conversationId);
      
      // Build LLM messages
      const llmMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
      
      if (input.systemPrompt) {
        llmMessages.push({ role: "system", content: input.systemPrompt });
      } else {
        llmMessages.push({
          role: "system",
          content: `You are Hero IDE's AI assistant. You help developers with coding tasks, project management, and technical questions. Be concise, helpful, and provide code examples when appropriate. Use markdown formatting for code blocks.`
        });
      }
      
      // Add conversation history (last 20 messages for context)
      const recentMessages = messages.slice(-20);
      for (const msg of recentMessages) {
        if (msg.role === "user" || msg.role === "assistant") {
          llmMessages.push({ role: msg.role, content: msg.content });
        }
      }
      
      // Call LLM
      const response = await invokeLLM({ messages: llmMessages });
      const rawContent = response.choices[0]?.message?.content;
      const assistantContent = typeof rawContent === 'string' ? rawContent : "I apologize, but I couldn't generate a response.";
      
      // Save assistant message
      const assistantMsg = await db.addMessage({
        conversationId: input.conversationId,
        role: "assistant",
        content: assistantContent,
        model: "gemini-2.5-flash",
        tokensUsed: response.usage?.total_tokens,
      });
      
      // Record budget usage
      if (response.usage) {
        await db.recordBudgetUsage({
          userId: ctx.user.id,
          tokensUsed: response.usage.total_tokens || 0,
          costUsd: ((response.usage.total_tokens || 0) * 0.000001).toFixed(6), // Approximate cost
          model: "gemini-2.5-flash",
          operation: "chat",
        });
      }
      
      return {
        id: assistantMsg.id,
        content: assistantContent,
        tokensUsed: response.usage?.total_tokens,
      };
    }),
});

// ════════════════════════════════════════════════════════════════════════════
// AGENTS ROUTER
// ════════════════════════════════════════════════════════════════════════════

const agentsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getAgentsByUserId(ctx.user.id);
  }),
  
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const agent = await db.getAgentById(input.id, ctx.user.id);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      return agent;
    }),
  
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      type: z.enum(["coder", "reviewer", "planner", "custom"]).default("custom"),
      systemPrompt: z.string().optional(),
      model: z.string().default("gemini-2.5-flash"),
      temperature: z.string().default("0.7"),
      maxTokens: z.number().default(8192),
      maxSteps: z.number().default(10),
      uncertaintyThreshold: z.number().min(0).max(100).default(70),
      allowScopeExpansion: z.boolean().default(false),
      requireApprovalForChanges: z.boolean().default(true),
      autoCheckpoint: z.boolean().default(true),
      budgetLimitUsd: z.string().default("1.00"),
      budgetLimitTokens: z.number().default(100000),
      rules: z.array(z.object({
        id: z.string(),
        type: z.enum(["allow", "deny", "require"]),
        pattern: z.string(),
        description: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createAgent({
        userId: ctx.user.id,
        ...input,
      });
    }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      systemPrompt: z.string().optional(),
      model: z.string().optional(),
      temperature: z.string().optional(),
      maxTokens: z.number().optional(),
      maxSteps: z.number().optional(),
      uncertaintyThreshold: z.number().min(0).max(100).optional(),
      allowScopeExpansion: z.boolean().optional(),
      requireApprovalForChanges: z.boolean().optional(),
      autoCheckpoint: z.boolean().optional(),
      budgetLimitUsd: z.string().optional(),
      budgetLimitTokens: z.number().optional(),
      rules: z.array(z.any()).optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateAgent(id, ctx.user.id, data);
      return { success: true };
    }),
  
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteAgent(input.id, ctx.user.id);
      return { success: true };
    }),
  
  // Agent Executions
  executions: protectedProcedure.query(async ({ ctx }) => {
    return db.getAgentExecutionsByUserId(ctx.user.id);
  }),
  
  getExecution: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const exec = await db.getAgentExecutionById(input.id, ctx.user.id);
      if (!exec) throw new TRPCError({ code: "NOT_FOUND" });
      return exec;
    }),
  
  startExecution: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      projectId: z.number().optional(),
      goal: z.string().min(1),
      assumptions: z.array(z.string()).optional(),
      stoppingConditions: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify agent ownership
      const agent = await db.getAgentById(input.agentId, ctx.user.id);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      
      // Create execution record
      const exec = await db.createAgentExecution({
        agentId: input.agentId,
        userId: ctx.user.id,
        projectId: input.projectId,
        goal: input.goal,
        assumptions: input.assumptions,
        stoppingConditions: input.stoppingConditions,
        state: "planning",
        startedAt: new Date(),
      });
      
      return exec;
    }),
  
  haltExecution: protectedProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const exec = await db.getAgentExecutionById(input.id, ctx.user.id);
      if (!exec) throw new TRPCError({ code: "NOT_FOUND" });
      
      await db.updateAgentExecution(input.id, {
        state: "halted",
        haltReason: "user_requested",
        haltMessage: input.reason || "Halted by user",
        completedAt: new Date(),
      });
      
      return { success: true };
    }),
});

// ════════════════════════════════════════════════════════════════════════════
// GITHUB ROUTER
// ════════════════════════════════════════════════════════════════════════════

const githubRouter = router({
  connection: protectedProcedure.query(async ({ ctx }) => {
    const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
    if (!conn) return null;
    return {
      id: conn.id,
      githubUsername: conn.githubUsername,
      scopes: conn.scopes,
      createdAt: conn.createdAt,
    };
  }),
  
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await db.deleteGitHubConnection(ctx.user.id);
    return { success: true };
  }),
  
  // Store GitHub token (from OAuth callback)
  connect: protectedProcedure
    .input(z.object({
      accessToken: z.string(),
      githubId: z.string(),
      githubUsername: z.string(),
      scopes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.upsertGitHubConnection({
        userId: ctx.user.id,
        githubId: input.githubId,
        githubUsername: input.githubUsername,
        accessToken: input.accessToken,
        scopes: input.scopes,
      });
      return { success: true };
    }),
  
  repositories: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      perPage: z.number().default(30),
      sort: z.enum(["created", "updated", "pushed", "full_name"]).default("updated"),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
      if (!conn) return { repositories: [], hasMore: false };
      
      try {
        const github = await import("./github");
        const repos = await github.listUserRepositories(conn.accessToken, {
          page: input?.page || 1,
          per_page: input?.perPage || 30,
          sort: input?.sort || "updated",
        });
        return {
          repositories: repos.map(r => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            description: r.description,
            private: r.private,
            htmlUrl: r.html_url,
            cloneUrl: r.clone_url,
            defaultBranch: r.default_branch,
            language: r.language,
            stars: r.stargazers_count,
            forks: r.forks_count,
            updatedAt: r.updated_at,
            owner: r.owner.login,
            ownerAvatar: r.owner.avatar_url,
          })),
          hasMore: repos.length === (input?.perPage || 30),
        };
      } catch (error) {
        console.error("GitHub API error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch repositories" });
      }
    }),
  
  searchRepositories: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      page: z.number().default(1),
      perPage: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
      if (!conn) throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      
      try {
        const github = await import("./github");
        const result = await github.searchRepositories(conn.accessToken, input.query, {
          page: input.page,
          per_page: input.perPage,
        });
        return {
          totalCount: result.total_count,
          repositories: result.items.map(r => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            description: r.description,
            private: r.private,
            htmlUrl: r.html_url,
            cloneUrl: r.clone_url,
            defaultBranch: r.default_branch,
            language: r.language,
            stars: r.stargazers_count,
            forks: r.forks_count,
            updatedAt: r.updated_at,
            owner: r.owner.login,
            ownerAvatar: r.owner.avatar_url,
          })),
        };
      } catch (error) {
        console.error("GitHub search error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to search repositories" });
      }
    }),
  
  getRepository: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
      if (!conn) throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      
      try {
        const github = await import("./github");
        const r = await github.getRepository(conn.accessToken, input.owner, input.repo);
        return {
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          description: r.description,
          private: r.private,
          htmlUrl: r.html_url,
          cloneUrl: r.clone_url,
          defaultBranch: r.default_branch,
          language: r.language,
          stars: r.stargazers_count,
          forks: r.forks_count,
          updatedAt: r.updated_at,
          owner: r.owner.login,
          ownerAvatar: r.owner.avatar_url,
        };
      } catch (error) {
        console.error("GitHub get repo error:", error);
        throw new TRPCError({ code: "NOT_FOUND", message: "Repository not found" });
      }
    }),
  
  getBranches: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
      if (!conn) throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      
      try {
        const github = await import("./github");
        const branches = await github.listBranches(conn.accessToken, input.owner, input.repo);
        return branches.map(b => ({
          name: b.name,
          sha: b.commit.sha,
          protected: b.protected,
        }));
      } catch (error) {
        console.error("GitHub branches error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch branches" });
      }
    }),
  
  getFileTree: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      branch: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
      if (!conn) throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      
      try {
        const github = await import("./github");
        const tree = await github.getRepositoryTree(
          conn.accessToken,
          input.owner,
          input.repo,
          input.branch || "main",
          true
        );
        return tree.map(item => ({
          path: item.path,
          type: item.type,
          sha: item.sha,
          size: item.size,
        }));
      } catch (error) {
        console.error("GitHub tree error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch file tree" });
      }
    }),
  
  getFileContent: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      branch: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
      if (!conn) throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      
      try {
        const github = await import("./github");
        const file = await github.getFileContent(
          conn.accessToken,
          input.owner,
          input.repo,
          input.path,
          input.branch
        );
        return file;
      } catch (error: any) {
        console.error("GitHub file error:", error);
        if (error.message?.includes("directory")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Path is a directory" });
        }
        throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
      }
    }),
  
  updateFile: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      content: z.string(),
      message: z.string(),
      sha: z.string(),
      branch: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
      if (!conn) throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      
      try {
        const github = await import("./github");
        const result = await github.createOrUpdateFile(
          conn.accessToken,
          input.owner,
          input.repo,
          input.path,
          input.content,
          input.message,
          input.sha,
          input.branch
        );
        return {
          sha: result.content.sha,
          commitSha: result.commit.sha,
        };
      } catch (error) {
        console.error("GitHub update file error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update file" });
      }
    }),
  
  createFile: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      content: z.string(),
      message: z.string(),
      branch: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
      if (!conn) throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      
      try {
        const github = await import("./github");
        const result = await github.createOrUpdateFile(
          conn.accessToken,
          input.owner,
          input.repo,
          input.path,
          input.content,
          input.message,
          undefined,
          input.branch
        );
        return {
          sha: result.content.sha,
          commitSha: result.commit.sha,
        };
      } catch (error) {
        console.error("GitHub create file error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create file" });
      }
    }),
  
  deleteFile: protectedProcedure
    .input(z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      message: z.string(),
      sha: z.string(),
      branch: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
      if (!conn) throw new TRPCError({ code: "UNAUTHORIZED", message: "GitHub not connected" });
      
      try {
        const github = await import("./github");
        const result = await github.deleteFile(
          conn.accessToken,
          input.owner,
          input.repo,
          input.path,
          input.message,
          input.sha,
          input.branch
        );
        return {
          commitSha: result.commit.sha,
        };
      } catch (error) {
        console.error("GitHub delete file error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete file" });
      }
    }),
});

// ════════════════════════════════════════════════════════════════════════════
// SETTINGS ROUTER
// ════════════════════════════════════════════════════════════════════════════

const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return db.getOrCreateUserSettings(ctx.user.id);
  }),
  
  update: protectedProcedure
    .input(z.object({
      monthlyBudgetLimitUsd: z.string().optional(),
      dailyBudgetLimitUsd: z.string().optional(),
      defaultModel: z.string().optional(),
      modelRouting: z.object({
        chat: z.string().optional(),
        codeGeneration: z.string().optional(),
        codeReview: z.string().optional(),
        planning: z.string().optional(),
      }).optional(),
      notifyOnViolation: z.boolean().optional(),
      notifyOnBudgetWarning: z.boolean().optional(),
      notifyOnAgentCompletion: z.boolean().optional(),
      theme: z.enum(["light", "dark", "system"]).optional(),
      sidebarCollapsed: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserSettings(ctx.user.id, input);
      return { success: true };
    }),
  
  // Secrets management
  secrets: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const secrets = await db.getSecretsByUserId(ctx.user.id, input.projectId);
      // Don't expose encrypted values
      return secrets.map(s => ({
        id: s.id,
        name: s.name,
        key: s.key,
        description: s.description,
        category: s.category,
        createdAt: s.createdAt,
      }));
    }),
  
  createSecret: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      key: z.string().min(1),
      value: z.string().min(1),
      description: z.string().optional(),
      category: z.enum(["api_key", "oauth_token", "database", "other"]).default("other"),
      projectId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Encrypt value before storing
      const encryptedValue = Buffer.from(input.value).toString("base64"); // Simple encoding for now
      
      return db.createSecret({
        userId: ctx.user.id,
        name: input.name,
        key: input.key,
        encryptedValue,
        description: input.description,
        category: input.category,
        projectId: input.projectId,
      });
    }),
  
  deleteSecret: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteSecret(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ════════════════════════════════════════════════════════════════════════════
// BUDGET ROUTER
// ════════════════════════════════════════════════════════════════════════════

const budgetRouter = router({
  usage: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = input.endDate ? new Date(input.endDate) : new Date();
      
      const [usage, totals] = await Promise.all([
        db.getBudgetUsageByUserId(ctx.user.id, startDate, endDate),
        db.getTotalBudgetUsage(ctx.user.id, startDate, endDate),
      ]);
      
      return { usage, totals };
    }),
  
  summary: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const [monthly, daily, settings] = await Promise.all([
      db.getTotalBudgetUsage(ctx.user.id, startOfMonth, now),
      db.getTotalBudgetUsage(ctx.user.id, startOfDay, now),
      db.getOrCreateUserSettings(ctx.user.id),
    ]);
    
    return {
      monthly: {
        used: monthly.totalCostUsd,
        limit: settings.monthlyBudgetLimitUsd,
        tokens: monthly.totalTokens,
      },
      daily: {
        used: daily.totalCostUsd,
        limit: settings.dailyBudgetLimitUsd,
        tokens: daily.totalTokens,
      },
    };
  }),
});

// ════════════════════════════════════════════════════════════════════════════
// GOVERNANCE ROUTER
// ════════════════════════════════════════════════════════════════════════════

const governanceRouter = router({
  changeRequests: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      return db.getChangeRequestsByProjectId(input.projectId);
    }),
  
  getChangeRequest: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const cr = await db.getChangeRequestById(input.id);
      if (!cr) throw new TRPCError({ code: "NOT_FOUND" });
      // Verify ownership through project
      const project = await db.getProjectById(cr.projectId, ctx.user.id);
      if (!project) throw new TRPCError({ code: "FORBIDDEN" });
      return cr;
    }),
  
  createChangeRequest: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(["code_change", "config_change", "dependency_change", "schema_change", "deployment", "other"]).default("code_change"),
      scope: z.object({
        files: z.array(z.string()),
        directories: z.array(z.string()),
        estimatedImpact: z.enum(["low", "medium", "high"]),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      
      return db.createChangeRequest({
        userId: ctx.user.id,
        ...input,
      });
    }),
  
  advanceLifecycle: protectedProcedure
    .input(z.object({
      id: z.number(),
      nextStep: z.enum([
        "declare_intent", "scope_definition", "risk_assessment",
        "preview_changes", "approval_request", "apply_changes",
        "verification", "completion"
      ]),
    }))
    .mutation(async ({ ctx, input }) => {
      const cr = await db.getChangeRequestById(input.id);
      if (!cr) throw new TRPCError({ code: "NOT_FOUND" });
      
      // Verify ownership
      const project = await db.getProjectById(cr.projectId, ctx.user.id);
      if (!project) throw new TRPCError({ code: "FORBIDDEN" });
      
      await db.updateChangeRequest(input.id, { lifecycleStep: input.nextStep });
      return { success: true };
    }),
  
  approveChangeRequest: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const cr = await db.getChangeRequestById(input.id);
      if (!cr) throw new TRPCError({ code: "NOT_FOUND" });
      
      await db.updateChangeRequest(input.id, {
        status: "approved",
        approvedBy: ctx.user.id,
        approvedAt: new Date(),
      });
      return { success: true };
    }),
  
  rejectChangeRequest: protectedProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const cr = await db.getChangeRequestById(input.id);
      if (!cr) throw new TRPCError({ code: "NOT_FOUND" });
      
      await db.updateChangeRequest(input.id, {
        status: "rejected",
        rejectionReason: input.reason,
      });
      return { success: true };
    }),
  
  violations: protectedProcedure.query(async ({ ctx }) => {
    return db.getViolationsByUserId(ctx.user.id);
  }),
});

// ════════════════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ════════════════════════════════════════════════════════════════════════════

// New routers defined below, main router export at end of file


// ════════════════════════════════════════════════════════════════════════════
// CHECKPOINTS ROUTER (Critical Gap CG-03 from Research)
// ════════════════════════════════════════════════════════════════════════════

const checkpointsRouter = router({
  list: protectedProcedure
    .input(z.object({ executionId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify execution ownership
      const exec = await db.getAgentExecutionById(input.executionId, ctx.user.id);
      if (!exec) throw new TRPCError({ code: "NOT_FOUND" });
      return db.getCheckpointsByExecutionId(input.executionId);
    }),
  
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const checkpoint = await db.getCheckpointById(input.id);
      if (!checkpoint) throw new TRPCError({ code: "NOT_FOUND" });
      // Verify ownership through execution
      const exec = await db.getAgentExecutionById(checkpoint.executionId, ctx.user.id);
      if (!exec) throw new TRPCError({ code: "FORBIDDEN" });
      return checkpoint;
    }),
  
  create: protectedProcedure
    .input(z.object({
      agentId: z.number(),
      executionId: z.number(),
      stepNumber: z.number(),
      description: z.string().optional(),
      state: z.object({
        executionState: z.string(),
        currentStep: z.number(),
        steps: z.array(z.any()),
        context: z.record(z.string(), z.unknown()),
        filesModified: z.array(z.string()),
      }),
      rollbackData: z.object({
        fileSnapshots: z.array(z.object({
          path: z.string(),
          content: z.string(),
          action: z.enum(["create", "modify", "delete"]),
        })),
        dbChanges: z.array(z.any()),
      }).optional(),
      automatic: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify execution ownership
      const exec = await db.getAgentExecutionById(input.executionId, ctx.user.id);
      if (!exec) throw new TRPCError({ code: "NOT_FOUND", message: "Execution not found" });
      
      return db.createCheckpoint({
        agentId: input.agentId,
        executionId: input.executionId,
        userId: ctx.user.id,
        stepNumber: input.stepNumber,
        description: input.description,
        state: input.state,
        rollbackData: input.rollbackData,
        automatic: input.automatic,
      });
    }),
  
  rollback: protectedProcedure
    .input(z.object({ checkpointId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const checkpoint = await db.getCheckpointById(input.checkpointId);
      if (!checkpoint) throw new TRPCError({ code: "NOT_FOUND" });
      
      // Verify ownership
      const exec = await db.getAgentExecutionById(checkpoint.executionId, ctx.user.id);
      if (!exec) throw new TRPCError({ code: "FORBIDDEN" });
      
      // Update execution state to checkpoint state
      await db.updateAgentExecution(checkpoint.executionId, {
        state: checkpoint.state.executionState as any,
        currentStep: checkpoint.state.currentStep,
        steps: checkpoint.state.steps as any,
      });
      
      return { 
        success: true, 
        message: `Rolled back to checkpoint at step ${checkpoint.stepNumber}`,
        restoredState: checkpoint.state,
      };
    }),
});

// ════════════════════════════════════════════════════════════════════════════
// PROJECT NOTES ROUTER (Context Engineering from Research)
// ════════════════════════════════════════════════════════════════════════════

const notesRouter = router({
  list: protectedProcedure
    .input(z.object({ 
      projectId: z.number(),
      category: z.enum(["architecture", "decisions", "todos", "bugs", "context", "requirements", "api"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });
      return db.getProjectNotes(input.projectId, input.category);
    }),
  
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const note = await db.getProjectNoteById(input.id, ctx.user.id);
      if (!note) throw new TRPCError({ code: "NOT_FOUND" });
      return note;
    }),
  
  create: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      category: z.enum(["architecture", "decisions", "todos", "bugs", "context", "requirements", "api"]).default("context"),
      title: z.string().min(1).max(255),
      content: z.string().min(1),
      tags: z.array(z.string()).optional(),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      
      return db.createProjectNote({
        projectId: input.projectId,
        userId: ctx.user.id,
        category: input.category,
        title: input.title,
        content: input.content,
        tags: input.tags,
        priority: input.priority,
      });
    }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(255).optional(),
      content: z.string().min(1).optional(),
      category: z.enum(["architecture", "decisions", "todos", "bugs", "context", "requirements", "api"]).optional(),
      tags: z.array(z.string()).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateProjectNote(id, ctx.user.id, data);
      return { success: true };
    }),
  
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteProjectNote(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ════════════════════════════════════════════════════════════════════════════
// METRICS ROUTER (MR-04 from Research)
// ════════════════════════════════════════════════════════════════════════════

const metricsRouter = router({
  daily: protectedProcedure
    .input(z.object({
      startDate: z.string(), // YYYY-MM-DD format
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return db.getDailyMetrics(ctx.user.id, input.startDate, input.endDate);
    }),
  
  summary: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return db.getMetricsSummary(ctx.user.id, input.startDate, input.endDate);
    }),
  
  record: protectedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      date: z.string(), // YYYY-MM-DD format
      messagesCount: z.number().optional(),
      tokensUsed: z.number().optional(),
      costUsd: z.string().optional(),
      agentExecutionsCount: z.number().optional(),
      agentTasksCompleted: z.number().optional(),
      agentTasksFailed: z.number().optional(),
      linesGenerated: z.number().optional(),
      filesModified: z.number().optional(),
      totalExecutionTimeMs: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.upsertDailyMetrics({
        userId: ctx.user.id,
        ...input,
      });
    }),
  
  // Get metrics for last 7 days
  recentActivity: protectedProcedure.query(async ({ ctx }) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    const [daily, summary] = await Promise.all([
      db.getDailyMetrics(ctx.user.id, formatDate(startDate), formatDate(endDate)),
      db.getMetricsSummary(ctx.user.id, formatDate(startDate), formatDate(endDate)),
    ]);
    
    return { daily, summary };
  }),
});


// ════════════════════════════════════════════════════════════════════════════
// USER AGENT RULES ROUTER
// ════════════════════════════════════════════════════════════════════════════

const userRulesRouter = router({
  list: protectedProcedure
    .input(z.object({
      agentType: z.enum(["pm", "developer", "qa", "devops", "research"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return db.getUserAgentRules(ctx.user.id, input?.agentType);
    }),
  
  create: protectedProcedure
    .input(z.object({
      agentType: z.enum(["pm", "developer", "qa", "devops", "research"]).optional(),
      ruleType: z.enum(["instruction", "allow", "deny", "confirm"]),
      ruleContent: z.string().min(1).max(1000),
      priority: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createUserAgentRule({
        userId: ctx.user.id,
        ...input,
      });
    }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      ruleContent: z.string().min(1).max(1000).optional(),
      ruleType: z.enum(["instruction", "allow", "deny", "confirm"]).optional(),
      isActive: z.boolean().optional(),
      priority: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateUserAgentRule(id, ctx.user.id, data);
      return { success: true };
    }),
  
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteUserAgentRule(input.id, ctx.user.id);
      return { success: true };
    }),
  
  // Bulk create preset rules
  createPresets: protectedProcedure
    .input(z.object({
      presets: z.array(z.enum([
        "typescript_only",
        "confirm_deletes",
        "no_force_push",
        "document_changes",
        "test_before_commit",
      ])),
    }))
    .mutation(async ({ ctx, input }) => {
      const presetRules: Array<{ ruleType: "instruction" | "allow" | "deny" | "confirm"; ruleContent: string }> = [];
      
      for (const preset of input.presets) {
        switch (preset) {
          case "typescript_only":
            presetRules.push({ ruleType: "instruction", ruleContent: "Always use TypeScript instead of JavaScript" });
            break;
          case "confirm_deletes":
            presetRules.push({ ruleType: "confirm", ruleContent: "Always confirm before deleting any file" });
            break;
          case "no_force_push":
            presetRules.push({ ruleType: "deny", ruleContent: "Never use git push --force" });
            break;
          case "document_changes":
            presetRules.push({ ruleType: "instruction", ruleContent: "Add comments explaining significant code changes" });
            break;
          case "test_before_commit":
            presetRules.push({ ruleType: "instruction", ruleContent: "Run tests before committing changes" });
            break;
        }
      }
      
      const created = [];
      for (const rule of presetRules) {
        const result = await db.createUserAgentRule({
          userId: ctx.user.id,
          ...rule,
        });
        created.push(result);
      }
      
      return created;
    }),
});

// ════════════════════════════════════════════════════════════════════════════
// AGENT LOGS ROUTER
// ════════════════════════════════════════════════════════════════════════════

const agentLogsRouter = router({
  list: protectedProcedure
    .input(z.object({
      executionId: z.number().optional(),
      sessionId: z.string().optional(),
      agentType: z.string().optional(),
      level: z.enum(["debug", "info", "warn", "error"]).optional(),
      limit: z.number().min(1).max(500).default(100),
    }).optional())
    .query(async ({ ctx, input }) => {
      return db.getAgentLogs(ctx.user.id, {
        executionId: input?.executionId,
        sessionId: input?.sessionId,
        agentType: input?.agentType,
        level: input?.level,
        limit: input?.limit || 100,
      });
    }),
  
  create: protectedProcedure
    .input(z.object({
      executionId: z.number().optional(),
      sessionId: z.string().optional(),
      agentType: z.string(),
      event: z.string(),
      level: z.enum(["debug", "info", "warn", "error"]).default("info"),
      data: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createAgentLog({
        userId: ctx.user.id,
        ...input,
      });
    }),
  
  // Get logs for a specific execution
  byExecution: protectedProcedure
    .input(z.object({ executionId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getAgentLogs(ctx.user.id, { executionId: input.executionId, limit: 500 });
    }),
  
  // Get recent errors
  errors: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      return db.getAgentLogs(ctx.user.id, { level: "error", limit: input?.limit || 50 });
    }),
});

// ════════════════════════════════════════════════════════════════════════════
// EXECUTION STEPS ROUTER
// ════════════════════════════════════════════════════════════════════════════

const executionStepsRouter = router({
  list: protectedProcedure
    .input(z.object({ executionId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getExecutionSteps(input.executionId, ctx.user.id);
    }),
  
  create: protectedProcedure
    .input(z.object({
      executionId: z.number(),
      stepNumber: z.number(),
      action: z.string(),
      input: z.record(z.string(), z.unknown()).optional(),
      requiresConfirmation: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createExecutionStep({
        ...input,
        userId: ctx.user.id,
      });
    }),
  
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "running", "awaiting_confirmation", "complete", "failed", "skipped"]).optional(),
      output: z.record(z.string(), z.unknown()).optional(),
      error: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateExecutionStep(id, ctx.user.id, data);
      return { success: true };
    }),
  
  confirm: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.confirmExecutionStep(input.id, ctx.user.id);
      return { success: true };
    }),
});

// ════════════════════════════════════════════════════════════════════════════
// MAIN ROUTER EXPORT
// ════════════════════════════════════════════════════════════════════════════

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  projects: projectsRouter,
  chat: chatRouter,
  chatAgent: chatAgentRouter,
  agents: agentsRouter,
  github: githubRouter,
  settings: settingsRouter,
  budget: budgetRouter,
  governance: governanceRouter,
  checkpoints: checkpointsRouter,
  notes: notesRouter,
  metrics: metricsRouter,
  userRules: userRulesRouter,
  agentLogs: agentLogsRouter,
  executionSteps: executionStepsRouter,
});

export type AppRouter = typeof appRouter;
