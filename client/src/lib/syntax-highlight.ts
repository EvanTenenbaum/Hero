/**
 * Syntax Highlighting Utility - Sprint 29
 * 
 * Uses shiki for code syntax highlighting with language detection.
 */

import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';

// Singleton highlighter instance
let highlighterPromise: Promise<Highlighter> | null = null;

// Language detection from file extension
const extensionToLanguage: Record<string, BundledLanguage> = {
  // JavaScript/TypeScript
  'js': 'javascript',
  'jsx': 'jsx',
  'ts': 'typescript',
  'tsx': 'tsx',
  'mjs': 'javascript',
  'cjs': 'javascript',
  
  // Web
  'html': 'html',
  'htm': 'html',
  'css': 'css',
  'scss': 'scss',
  'sass': 'sass',
  'less': 'less',
  'vue': 'vue',
  'svelte': 'svelte',
  
  // Data formats
  'json': 'json',
  'yaml': 'yaml',
  'yml': 'yaml',
  'xml': 'xml',
  'toml': 'toml',
  
  // Backend
  'py': 'python',
  'rb': 'ruby',
  'go': 'go',
  'rs': 'rust',
  'java': 'java',
  'kt': 'kotlin',
  'swift': 'swift',
  'php': 'php',
  'c': 'c',
  'cpp': 'cpp',
  'h': 'c',
  'hpp': 'cpp',
  'cs': 'csharp',
  
  // Shell/Config
  'sh': 'bash',
  'bash': 'bash',
  'zsh': 'bash',
  'fish': 'fish',
  'ps1': 'powershell',
  'dockerfile': 'dockerfile',
  'makefile': 'makefile',
  
  // Markup
  'md': 'markdown',
  'mdx': 'mdx',
  'tex': 'latex',
  
  // Database
  'sql': 'sql',
  'graphql': 'graphql',
  'gql': 'graphql',
  
  // Other
  'diff': 'diff',
  'prisma': 'prisma',
  'env': 'dotenv',
};

/**
 * Get the shiki language from a file path
 */
export function getLanguageFromPath(filePath: string): BundledLanguage {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const fileName = filePath.split('/').pop()?.toLowerCase() || '';
  
  // Check for special filenames
  if (fileName === 'dockerfile') return 'dockerfile';
  if (fileName === 'makefile') return 'makefile';
  if (fileName.startsWith('.env')) return 'dotenv';
  
  return extensionToLanguage[ext] || 'text';
}

/**
 * Get or create the highlighter instance
 */
async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        'javascript', 'typescript', 'jsx', 'tsx',
        'html', 'css', 'json', 'yaml', 'xml',
        'python', 'go', 'rust', 'java',
        'bash', 'sql', 'markdown', 'diff',
        'vue', 'svelte', 'graphql', 'prisma',
      ],
    });
  }
  return highlighterPromise;
}

/**
 * Highlight code with syntax coloring
 */
export async function highlightCode(
  code: string,
  language: BundledLanguage | string,
  theme: 'dark' | 'light' = 'dark'
): Promise<string> {
  try {
    const highlighter = await getHighlighter();
    const themeName = theme === 'dark' ? 'github-dark' : 'github-light';
    
    // Check if language is loaded, fall back to text
    const loadedLangs = highlighter.getLoadedLanguages();
    const lang = loadedLangs.includes(language as BundledLanguage) ? language : 'text';
    
    return highlighter.codeToHtml(code, {
      lang: lang as BundledLanguage,
      theme: themeName,
    });
  } catch (error) {
    console.error('Syntax highlighting error:', error);
    // Return escaped HTML as fallback
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Highlight a diff with syntax coloring for the code portions
 */
export async function highlightDiff(
  lines: Array<{ type: 'add' | 'remove' | 'context'; content: string; lineNumber: number }>,
  language: BundledLanguage | string,
  theme: 'dark' | 'light' = 'dark'
): Promise<Array<{ type: 'add' | 'remove' | 'context'; html: string; lineNumber: number }>> {
  try {
    const highlighter = await getHighlighter();
    const themeName = theme === 'dark' ? 'github-dark' : 'github-light';
    
    // Check if language is loaded
    const loadedLangs = highlighter.getLoadedLanguages();
    const lang = loadedLangs.includes(language as BundledLanguage) ? language : 'text';
    
    // Highlight each line individually
    return lines.map(line => {
      try {
        const tokens = highlighter.codeToTokens(line.content, {
          lang: lang as BundledLanguage,
          theme: themeName,
        });
        
        // Convert tokens to HTML spans
        const html = tokens.tokens[0]?.map(token => 
          `<span style="color: ${token.color}">${escapeHtml(token.content)}</span>`
        ).join('') || escapeHtml(line.content);
        
        return {
          type: line.type,
          html,
          lineNumber: line.lineNumber,
        };
      } catch {
        return {
          type: line.type,
          html: escapeHtml(line.content),
          lineNumber: line.lineNumber,
        };
      }
    });
  } catch (error) {
    console.error('Diff highlighting error:', error);
    // Return escaped HTML as fallback
    return lines.map(line => ({
      type: line.type,
      html: escapeHtml(line.content),
      lineNumber: line.lineNumber,
    }));
  }
}
