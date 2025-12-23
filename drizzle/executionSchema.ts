import {
  mysqlTable,
  int,
  varchar,
  text,
  json,
  timestamp,
  primaryKey,
  unique,
  index,
} from 'drizzle-orm/mysql-core';
import { relations, InferModel } from 'drizzle-orm';

/**
 * Defines the Drizzle ORM schema for execution state persistence.
 * This schema is designed for use with MySQL/TiDB.
 */

// --- Execution State Table ---

/**
 * Represents the main table for storing the state of an execution run.
 */
export const executionState = mysqlTable(
  'execution_state',
  {
    /**
     * Unique identifier for the execution state record.
     */
    id: int('id').autoincrement().notNull(),

    /**
     * Unique identifier for the specific execution run (e.g., a UUID).
     * Used for external referencing and linking checkpoints.
     */
    executionId: varchar('execution_id', { length: 64 }).notNull().unique(),

    /**
     * ID of the user who initiated the execution.
     * Note: Foreign key constraint definition is typically handled at the application level
     * or in a separate schema file if cross-schema relations are needed.
     */
    userId: int('user_id').notNull(),

    /**
     * ID of the project associated with this execution.
     * Note: Foreign key constraint definition is omitted here for simplicity,
     * assuming it links to a 'projects' table defined elsewhere.
     */
    projectId: int('project_id').notNull(),

    /**
     * Type of agent or process running the execution (e.g., 'CodeAgent', 'PlanAgent').
     */
    agentType: varchar('agent_type', { length: 20 }).notNull(),

    /**
     * The current, detailed state of the execution, stored as a JSON object.
     */
    state: json('state').notNull(),

    /**
     * The current status of the execution.
     * Possible values: 'pending', 'running', 'paused', 'completed', 'failed', 'cancelled'.
     */
    status: varchar('status', { length: 20 }).notNull(),

    /**
     * Timestamp when the execution started.
     */
    startedAt: timestamp('started_at', { mode: 'date' }).notNull().defaultNow(),

    /**
     * Timestamp when the execution was completed, failed, or cancelled.
     */
    completedAt: timestamp('completed_at', { mode: 'date' }),

    /**
     * Detailed error message if the execution failed.
     */
    error: text('error'),

    /**
     * Additional metadata related to the execution, stored as JSON.
     */
    metadata: json('metadata'),

    /**
     * Timestamp when the record was created.
     */
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),

    /**
     * Timestamp when the record was last updated.
     */
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .notNull()
      .defaultNow()
      .onUpdateNow(),
  },
  (table) => ({
    pk: primaryKey(table.id),
    executionIdIdx: unique('execution_id_idx').on(table.executionId),
    userProjectIdx: index('user_project_idx').on(table.userId, table.projectId),
    statusIdx: index('status_idx').on(table.status),
  })
);

/**
 * Type definition for inserting a record into the executionState table.
 */
export type NewExecutionState = InferModel<typeof executionState, 'insert'>;

/**
 * Type definition for selecting a record from the executionState table.
 */
export type ExecutionState = InferModel<typeof executionState, 'select'>;

// --- Execution Checkpoints Table ---

/**
 * Represents snapshots of the execution state at specific points in time.
 */
export const executionCheckpoints = mysqlTable(
  'execution_checkpoints',
  {
    /**
     * Unique identifier for the checkpoint record.
     */
    id: int('id').autoincrement().notNull(),

    /**
     * The execution ID this checkpoint belongs to.
     * Foreign key to executionState.executionId.
     */
    executionId: varchar('execution_id', { length: 64 }).notNull(),

    /**
     * Unique identifier for the checkpoint itself (e.g., step number or UUID).
     */
    checkpointId: varchar('checkpoint_id', { length: 64 }).notNull(),

    /**
     * The full state snapshot at the time of the checkpoint, stored as JSON.
     */
    state: json('state').notNull(),

    /**
     * Timestamp when the checkpoint was created.
     */
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey(table.id),
    uniqueCheckpoint: unique('unique_checkpoint_idx').on(
      table.executionId,
      table.checkpointId
    ),
    executionIdIdx: index('checkpoint_execution_id_idx').on(table.executionId),
  })
);

/**
 * Type definition for inserting a record into the executionCheckpoints table.
 */
export type NewExecutionCheckpoint = InferModel<
  typeof executionCheckpoints,
  'insert'
>;

/**
 * Type definition for selecting a record from the executionCheckpoints table.
 */
export type ExecutionCheckpoint = InferModel<
  typeof executionCheckpoints,
  'select'
>;

// --- Relations ---

/**
 * Defines the relationship between executionState and executionCheckpoints.
 * One execution state can have multiple checkpoints.
 */
export const executionRelations = relations(executionState, ({ many }) => ({
  checkpoints: many(executionCheckpoints),
}));

export const checkpointRelations = relations(
  executionCheckpoints,
  ({ one }) => ({
    execution: one(executionState, {
      fields: [executionCheckpoints.executionId],
      references: [executionState.executionId],
    }),
  })
);