import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
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
    // Don't expose tokens
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
  
  // These would require actual GitHub API integration
  // For now, return placeholder data
  repositories: protectedProcedure.query(async ({ ctx }) => {
    const conn = await db.getGitHubConnectionByUserId(ctx.user.id);
    if (!conn) return [];
    // TODO: Implement actual GitHub API call
    return [];
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

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  projects: projectsRouter,
  chat: chatRouter,
  agents: agentsRouter,
  github: githubRouter,
  settings: settingsRouter,
  budget: budgetRouter,
  governance: governanceRouter,
});

export type AppRouter = typeof appRouter;
