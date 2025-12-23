/**
 * Project Hydrator Service
 * 
 * Responsible for cloning GitHub repositories into E2B sandboxes
 * and injecting runtime secrets.
 * 
 * @module server/services/projectHydrator
 */

import { Sandbox } from '@e2b/code-interpreter';
import { ENV } from '../_core/env';
import { getDb } from '../db';
import { projectSecrets, Project, githubConnections } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';
import { REPO_PATH } from './sandboxManager';
import { escapeShellArg } from '../utils/shell';

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════
const CLONE_TIMEOUT_MS = 120000; // 2 minutes for clone operation
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface HydrationResult {
  success: boolean;
  repoPath: string;
  filesCloned?: number;
  error?: string;
}

interface SecretEntry {
  key: string;
  value: string;
}

// ════════════════════════════════════════════════════════════════════════════
// ENCRYPTION UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get the encryption key from environment
 * Uses environment-based salt for secure key derivation
 */
function getEncryptionKey(): Buffer {
  const key = ENV.SECRETS_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('SECRETS_ENCRYPTION_KEY is not configured');
  }
  
  // Use environment-based salt or derive from a secure source
  // SECURITY: In production, set SECRETS_KDF_SALT to a unique random value
  const saltSource = process.env.SECRETS_KDF_SALT || ENV.SECRETS_ENCRYPTION_KEY;
  const salt = crypto.createHash('sha256').update(saltSource + '-hero-kdf').digest().slice(0, 16);
  
  // Ensure key is 32 bytes for AES-256
  return crypto.scryptSync(key, salt, 32);
}

/**
 * Encrypt a secret value
 */
export function encryptSecret(value: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV + AuthTag + Encrypted data
  return iv.toString('hex') + authTag.toString('hex') + encrypted;
}

/**
 * Decrypt a secret value
 */
export function decryptSecret(encryptedValue: string): string {
  const key = getEncryptionKey();
  
  // Extract IV, AuthTag, and encrypted data
  const iv = Buffer.from(encryptedValue.slice(0, IV_LENGTH * 2), 'hex');
  const authTag = Buffer.from(encryptedValue.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2), 'hex');
  const encrypted = encryptedValue.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// ════════════════════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Validate GitHub repository owner/name to prevent injection
 * Only allows alphanumeric, hyphens, underscores, and dots
 */
function validateGitHubIdentifier(value: string, fieldName: string): void {
  if (!value || !/^[a-zA-Z0-9._-]+$/.test(value)) {
    throw new Error(`Invalid ${fieldName}: must contain only alphanumeric characters, dots, hyphens, and underscores`);
  }
  if (value.length > 100) {
    throw new Error(`Invalid ${fieldName}: too long (max 100 characters)`);
  }
}

/**
 * Validate branch name to prevent injection
 */
function validateBranchName(branch: string): void {
  // Git branch names cannot contain: space, ~, ^, :, ?, *, [, \, or start with -
  if (!branch || /[\s~^:?*\[\]\\]/.test(branch) || branch.startsWith('-') || branch.includes('..')) {
    throw new Error('Invalid branch name');
  }
  if (branch.length > 255) {
    throw new Error('Branch name too long');
  }
}

/**
 * Mask sensitive data for logging
 */
function maskToken(token: string): string {
  if (token.length <= 8) return '***';
  return token.slice(0, 4) + '...' + token.slice(-4);
}

// ════════════════════════════════════════════════════════════════════════════
// PROJECT HYDRATOR CLASS
// ════════════════════════════════════════════════════════════════════════════

class ProjectHydrator {
  /**
   * Hydrate a sandbox with a project's GitHub repository
   * 
   * @param sandbox - The E2B sandbox instance
   * @param project - The project configuration
   * @returns Hydration result
   */
  async hydrate(sandbox: Sandbox, project: Project): Promise<HydrationResult> {
    try {
      // Validate project has required GitHub info
      if (!project.repoOwner || !project.repoName) {
        throw new Error('Project is missing repoOwner or repoName');
      }

      // SECURITY: Validate repository identifiers to prevent injection
      validateGitHubIdentifier(project.repoOwner, 'repoOwner');
      validateGitHubIdentifier(project.repoName, 'repoName');

      // Get GitHub access token
      const accessToken = await this.getGitHubAccessToken(project);
      
      // SECURITY: Log without exposing the token
      console.debug(`Cloning ${project.repoOwner}/${project.repoName} into sandbox (token: ${maskToken(accessToken)})`);
      
      // Clone using git credential helper to avoid token in command line
      // First, configure git to use the token via credential helper
      await sandbox.commands.run(
        `git config --global credential.helper store`,
        { timeoutMs: 5000 }
      );
      
      // Write credentials to git credential store (more secure than URL)
      const credentialEntry = `https://x-access-token:${accessToken}@github.com`;
      await sandbox.files.write('/home/user/.git-credentials', credentialEntry + '\n');
      await sandbox.commands.run('chmod 600 /home/user/.git-credentials', { timeoutMs: 5000 });
      
      // Clone using HTTPS URL without embedded credentials
      const repoUrl = `https://github.com/${project.repoOwner}/${project.repoName}.git`;
      const cloneResult = await sandbox.commands.run(
        `git clone ${escapeShellArg(repoUrl)} ${escapeShellArg(REPO_PATH)}`,
        { timeoutMs: CLONE_TIMEOUT_MS }
      );
      
      // Clean up credentials file immediately after clone
      await sandbox.commands.run('rm -f /home/user/.git-credentials', { timeoutMs: 5000 });
      
      if (cloneResult.exitCode !== 0) {
        throw new Error(`Git clone failed: ${cloneResult.stderr}`);
      }

      // Checkout the correct branch if specified
      const branch = project.defaultBranch || 'main';
      validateBranchName(branch);
      
      const checkoutResult = await sandbox.commands.run(
        `cd ${escapeShellArg(REPO_PATH)} && git checkout ${escapeShellArg(branch)}`,
        { timeoutMs: 30000 }
      );
      
      // Handle branch not found - try to create it or fall back to default
      if (checkoutResult.exitCode !== 0) {
        console.warn(`Branch ${branch} not found, using default branch`);
        // Get the default branch from remote
        await sandbox.commands.run(
          `cd ${escapeShellArg(REPO_PATH)} && git checkout $(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')`,
          { timeoutMs: 30000 }
        );
      }

      // Verify clone by checking for key files
      const verifyResult = await sandbox.commands.run(
        `ls -la ${escapeShellArg(REPO_PATH)}`,
        { timeoutMs: 10000 }
      );
      
      if (verifyResult.exitCode !== 0) {
        throw new Error('Failed to verify repository clone');
      }

      // Count files cloned (exclude .git directory)
      const countResult = await sandbox.commands.run(
        `find ${escapeShellArg(REPO_PATH)} -type f -not -path '*/.git/*' | wc -l`,
        { timeoutMs: 30000 }
      );
      const filesCloned = parseInt(countResult.stdout.trim()) || 0;

      // Inject secrets
      await this.injectSecrets(sandbox, project.id);

      console.debug(`Successfully hydrated sandbox with ${filesCloned} files`);
      
      return {
        success: true,
        repoPath: REPO_PATH,
        filesCloned,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Hydration failed: ${errorMessage}`);
      return {
        success: false,
        repoPath: REPO_PATH,
        error: errorMessage,
      };
    }
  }

  /**
   * Get GitHub access token for the project
   * This should integrate with the existing GitHub OAuth flow
   */
  private async getGitHubAccessToken(project: Project): Promise<string> {
    // If project has an installation ID, use GitHub App installation token
    if (project.githubInstallationId) {
      return this.getInstallationToken(project.githubInstallationId);
    }
    
    // Otherwise, try to get user's OAuth token from the database
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }
    
    const [connection] = await db
      .select()
      .from(githubConnections)
      .where(eq(githubConnections.userId, project.userId))
      .limit(1);

    if (!connection || !connection.accessToken) {
      throw new Error('No GitHub connection found for project owner');
    }

    // TODO: Implement token refresh logic if token is expired
    // Check if token has expiration and refresh if needed

    return connection.accessToken;
  }

  /**
   * Get installation token from GitHub App
   * Uses JWT to authenticate as the GitHub App and request an installation token
   */
  private async getInstallationToken(installationId: string): Promise<string> {
    // Check for required environment variables
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
    
    if (!appId || !privateKey) {
      // Fall back to OAuth token if GitHub App is not configured
      console.warn('GitHub App not configured, installation token unavailable');
      throw new Error('GitHub App credentials not configured. Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY.');
    }

    try {
      // Create JWT for GitHub App authentication
      // Note: In production, consider using a proper JWT library like 'jsonwebtoken' or 'jose'
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iat: now - 10, // Issued 10 seconds ago to account for clock drift
        exp: now + 600, // Expires in 10 minutes
        iss: appId,
      };

      // Sign JWT with RS256 algorithm
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signatureInput = `${header}.${body}`;
      
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(signatureInput);
      const signature = sign.sign(privateKey, 'base64url');
      
      const jwt = `${signatureInput}.${signature}`;

      // Request installation access token
      const response = await fetch(
        `https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'HERO-IDE',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(`Failed to get installation token: ${error.message || response.statusText}`);
      }

      const data = await response.json() as { token: string };
      return data.token;
    } catch (error) {
      console.error('Failed to get GitHub App installation token:', error);
      throw error;
    }
  }

  /**
   * Inject project secrets into the sandbox as a .env file
   */
  async injectSecrets(sandbox: Sandbox, projectId: number): Promise<void> {
    try {
      const secrets = await this.getProjectSecrets(projectId);
      
      if (secrets.length === 0) {
        console.debug('No secrets to inject');
        return;
      }

      // Format secrets as .env file content
      // SECURITY: Properly escape values for .env format
      const envContent = secrets
        .map(s => {
          // Escape special characters in value
          const escapedValue = s.value.includes('\n') || s.value.includes('"') || s.value.includes("'")
            ? `"${s.value.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`
            : s.value;
          return `${s.key}=${escapedValue}`;
        })
        .join('\n');

      // Write .env file to sandbox
      await sandbox.files.write(`${REPO_PATH}/.env`, envContent + '\n');

      // Set restrictive permissions on .env file
      await sandbox.commands.run(`chmod 600 ${escapeShellArg(REPO_PATH)}/.env`, { timeoutMs: 5000 });

      // Ensure .env is in .gitignore
      await this.ensureGitignore(sandbox);

      console.debug(`Injected ${secrets.length} secrets into sandbox`);
    } catch (error) {
      console.error('Failed to inject secrets:', error);
      // Don't throw - secrets injection failure shouldn't block hydration
    }
  }

  /**
   * Get and decrypt project secrets from database
   */
  private async getProjectSecrets(projectId: number): Promise<SecretEntry[]> {
    const db = await getDb();
    if (!db) {
      return [];
    }

    const secrets = await db
      .select()
      .from(projectSecrets)
      .where(eq(projectSecrets.projectId, projectId));

    return secrets.map(s => ({
      key: s.key,
      value: decryptSecret(s.encryptedValue),
    }));
  }

  /**
   * Ensure .env is in .gitignore
   */
  private async ensureGitignore(sandbox: Sandbox): Promise<void> {
    const gitignorePath = `${REPO_PATH}/.gitignore`;
    
    try {
      // Read existing .gitignore
      const content = await sandbox.files.read(gitignorePath);
      
      // Check if .env is already in .gitignore
      if (!content.includes('.env')) {
        // Append .env to .gitignore
        const newContent = content.trim() + '\n.env\n';
        await sandbox.files.write(gitignorePath, newContent);
        console.debug('Added .env to .gitignore');
      }
    } catch {
      // .gitignore doesn't exist, create it
      await sandbox.files.write(gitignorePath, '.env\n');
      console.debug('Created .gitignore with .env entry');
    }
  }

  /**
   * Install project dependencies in the sandbox
   */
  async installDependencies(sandbox: Sandbox): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if package.json exists
      const checkResult = await sandbox.commands.run(
        `test -f ${escapeShellArg(REPO_PATH)}/package.json && echo "exists"`,
        { timeoutMs: 5000 }
      );

      if (!checkResult.stdout.includes('exists')) {
        return { success: true }; // No package.json, nothing to install
      }

      // Detect package manager
      const lockFiles = await sandbox.commands.run(
        `ls ${escapeShellArg(REPO_PATH)}/*.lock ${escapeShellArg(REPO_PATH)}/pnpm-lock.yaml 2>/dev/null || true`,
        { timeoutMs: 5000 }
      );

      let installCmd = 'npm install';
      if (lockFiles.stdout.includes('pnpm-lock.yaml')) {
        installCmd = 'pnpm install';
      } else if (lockFiles.stdout.includes('yarn.lock')) {
        installCmd = 'yarn install';
      }

      console.debug(`Installing dependencies with: ${installCmd}`);
      const installResult = await sandbox.commands.run(
        `cd ${escapeShellArg(REPO_PATH)} && ${installCmd}`,
        { timeoutMs: 300000 } // 5 minutes for install
      );

      if (installResult.exitCode !== 0) {
        return { success: false, error: installResult.stderr };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ════════════════════════════════════════════════════════════════════════════

export const projectHydrator = new ProjectHydrator();

// Export the class for testing
export { ProjectHydrator };

// Export types
export type { HydrationResult, SecretEntry };
