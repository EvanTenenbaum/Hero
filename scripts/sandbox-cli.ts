#!/usr/bin/env npx ts-node
/**
 * HERO Cloud Sandbox CLI
 * 
 * Command-line interface for managing cloud sandboxes.
 * Supports all sandbox operations for automation.
 * 
 * Usage:
 *   npx ts-node scripts/sandbox-cli.ts <command> [options]
 * 
 * Commands:
 *   start <projectId>     - Start a sandbox for a project
 *   stop <projectId>      - Stop a sandbox for a project
 *   stop-all              - Stop all active sandboxes
 *   status                - Show status of all sandboxes
 *   exec <projectId> <cmd> - Execute a command in a sandbox
 *   sync <projectId>      - Sync sandbox changes to GitHub
 *   hydrate <projectId>   - Clone and hydrate a project
 * 
 * @module scripts/sandbox-cli
 */

import { sandboxManager } from '../server/services/sandboxManager';
import { projectHydrator } from '../server/services/projectHydrator';
import { gitSyncService } from '../server/routers/gitSync';
import { getDb } from '../server/db';
import { projects } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// ════════════════════════════════════════════════════════════════════════════
// CLI COMMANDS
// ════════════════════════════════════════════════════════════════════════════

async function startSandbox(projectId: string): Promise<void> {
  console.log(`Starting sandbox for project ${projectId}...`);
  
  try {
    const sandbox = await sandboxManager.getOrStartSandbox(projectId);
    console.log(`✓ Sandbox started successfully`);
    
    // Get sandbox info
    const info = sandboxManager.getSandboxInfo(projectId);
    if (info) {
      console.log(`  Created: ${info.createdAt.toISOString()}`);
      console.log(`  Last accessed: ${info.lastAccessedAt.toISOString()}`);
    }
  } catch (error) {
    console.error(`✗ Failed to start sandbox: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function stopSandbox(projectId: string): Promise<void> {
  console.log(`Stopping sandbox for project ${projectId}...`);
  
  try {
    if (!sandboxManager.hasSandbox(projectId)) {
      console.log(`No active sandbox found for project ${projectId}`);
      return;
    }
    
    await sandboxManager.closeSandbox(projectId);
    console.log(`✓ Sandbox stopped successfully`);
  } catch (error) {
    console.error(`✗ Failed to stop sandbox: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function stopAllSandboxes(): Promise<void> {
  console.log('Stopping all sandboxes...');
  
  try {
    const count = sandboxManager.getActiveSandboxCount();
    await sandboxManager.closeAllSandboxes();
    console.log(`✓ Stopped ${count} sandbox(es)`);
  } catch (error) {
    console.error(`✗ Failed to stop sandboxes: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function showStatus(): Promise<void> {
  const count = sandboxManager.getActiveSandboxCount();
  console.log(`Active sandboxes: ${count}`);
  
  if (count === 0) {
    console.log('No active sandboxes');
  }
}

async function execCommand(projectId: string, command: string): Promise<void> {
  console.log(`Executing command in sandbox for project ${projectId}...`);
  console.log(`Command: ${command}`);
  
  try {
    const sandbox = await sandboxManager.getOrStartSandbox(projectId);
    const result = await sandbox.commands.run(command, { timeoutMs: 60000 });
    
    console.log('\n--- STDOUT ---');
    console.log(result.stdout || '(empty)');
    
    if (result.stderr) {
      console.log('\n--- STDERR ---');
      console.log(result.stderr);
    }
    
    console.log(`\nExit code: ${result.exitCode}`);
  } catch (error) {
    console.error(`✗ Failed to execute command: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function syncChanges(projectId: string): Promise<void> {
  console.log(`Syncing changes for project ${projectId}...`);
  
  try {
    const result = await gitSyncService.syncChanges(parseInt(projectId));
    
    if (result.success) {
      console.log(`✓ ${result.message}`);
      if (result.commitSha) {
        console.log(`  Commit SHA: ${result.commitSha}`);
      }
      if (result.filesChanged !== undefined) {
        console.log(`  Files changed: ${result.filesChanged}`);
      }
    } else {
      console.error(`✗ Sync failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`✗ Failed to sync: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function hydrateProject(projectId: string): Promise<void> {
  console.log(`Hydrating project ${projectId}...`);
  
  try {
    // Get project from database
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }
    
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, parseInt(projectId)))
      .limit(1);
    
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    if (!project.repoOwner || !project.repoName) {
      throw new Error('Project is not linked to a GitHub repository');
    }
    
    console.log(`  Repository: ${project.repoOwner}/${project.repoName}`);
    console.log(`  Branch: ${project.defaultBranch || 'main'}`);
    
    // Get or start sandbox
    const sandbox = await sandboxManager.getOrStartSandbox(projectId);
    
    // Hydrate
    const result = await projectHydrator.hydrate(sandbox, project);
    
    if (result.success) {
      console.log(`✓ Hydration successful`);
      console.log(`  Files cloned: ${result.filesCloned}`);
      console.log(`  Repo path: ${result.repoPath}`);
    } else {
      console.error(`✗ Hydration failed: ${result.error}`);
      process.exit(1);
    }
    
    // Install dependencies
    console.log('Installing dependencies...');
    const installResult = await projectHydrator.installDependencies(sandbox);
    
    if (installResult.success) {
      console.log('✓ Dependencies installed');
    } else {
      console.warn(`⚠ Dependency installation failed: ${installResult.error}`);
    }
  } catch (error) {
    console.error(`✗ Failed to hydrate: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════

function printUsage(): void {
  console.log(`
HERO Cloud Sandbox CLI

Usage:
  npx ts-node scripts/sandbox-cli.ts <command> [options]

Commands:
  start <projectId>        Start a sandbox for a project
  stop <projectId>         Stop a sandbox for a project
  stop-all                 Stop all active sandboxes
  status                   Show status of all sandboxes
  exec <projectId> <cmd>   Execute a command in a sandbox
  sync <projectId>         Sync sandbox changes to GitHub
  hydrate <projectId>      Clone and hydrate a project

Examples:
  npx ts-node scripts/sandbox-cli.ts start 123
  npx ts-node scripts/sandbox-cli.ts exec 123 "npm test"
  npx ts-node scripts/sandbox-cli.ts sync 123
  npx ts-node scripts/sandbox-cli.ts hydrate 123
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }
  
  switch (command) {
    case 'start':
      if (!args[1]) {
        console.error('Error: projectId required');
        process.exit(1);
      }
      await startSandbox(args[1]);
      break;
      
    case 'stop':
      if (!args[1]) {
        console.error('Error: projectId required');
        process.exit(1);
      }
      await stopSandbox(args[1]);
      break;
      
    case 'stop-all':
      await stopAllSandboxes();
      break;
      
    case 'status':
      await showStatus();
      break;
      
    case 'exec':
      if (!args[1] || !args[2]) {
        console.error('Error: projectId and command required');
        process.exit(1);
      }
      await execCommand(args[1], args.slice(2).join(' '));
      break;
      
    case 'sync':
      if (!args[1]) {
        console.error('Error: projectId required');
        process.exit(1);
      }
      await syncChanges(args[1]);
      break;
      
    case 'hydrate':
      if (!args[1]) {
        console.error('Error: projectId required');
        process.exit(1);
      }
      await hydrateProject(args[1]);
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
