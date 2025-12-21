/**
 * Semantic Code Chunker
 * 
 * Parses TypeScript/JavaScript/React code into semantic chunks for indexing.
 * Uses TypeScript compiler API for accurate AST parsing.
 */

import * as ts from "typescript";
import * as path from "path";
import { InsertContextChunk } from "../../drizzle/schema";

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export type ChunkType = 
  | "function"
  | "class"
  | "interface"
  | "type"
  | "component"
  | "hook"
  | "constant"
  | "import"
  | "export"
  | "comment"
  | "block"
  | "file_summary";

export interface CodeChunk {
  type: ChunkType;
  name: string | null;
  parentName: string | null;
  content: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  imports: string[];
  exports: string[];
  references: string[];
  language: string;
}

export interface ChunkerOptions {
  maxChunkLines: number;
  includeImports: boolean;
  includeComments: boolean;
  generateSummary: boolean;
}

const DEFAULT_OPTIONS: ChunkerOptions = {
  maxChunkLines: 100,
  includeImports: true,
  includeComments: true,
  generateSummary: true,
};

// ════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get line and column from position in source file
 */
function getLineAndColumn(
  sourceFile: ts.SourceFile,
  pos: number
): { line: number; column: number } {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos);
  return { line: line + 1, column: character };
}

/**
 * Extract text from source file between positions
 */
function extractText(
  sourceFile: ts.SourceFile,
  start: number,
  end: number
): string {
  return sourceFile.text.substring(start, end);
}

/**
 * Check if a node is a React component (function returning JSX)
 */
function isReactComponent(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  if (!ts.isFunctionDeclaration(node) && !ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) {
    return false;
  }
  
  // Check if function name starts with uppercase (React convention)
  let name = "";
  if (ts.isFunctionDeclaration(node) && node.name) {
    name = node.name.text;
  } else if (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
    name = node.parent.name.text;
  }
  
  if (name && /^[A-Z]/.test(name)) {
    return true;
  }
  
  // Check for JSX in return statement
  const text = extractText(sourceFile, node.getStart(), node.getEnd());
  return text.includes("<") && (text.includes("/>") || text.includes("</"));
}

/**
 * Check if a function is a React hook
 */
function isReactHook(name: string): boolean {
  return /^use[A-Z]/.test(name);
}

/**
 * Extract imports from source file
 */
function extractImports(sourceFile: ts.SourceFile): string[] {
  const imports: string[] = [];
  
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        imports.push(moduleSpecifier.text);
      }
    }
  });
  
  return imports;
}

/**
 * Extract exports from source file
 */
function extractExports(sourceFile: ts.SourceFile): string[] {
  const exports: string[] = [];
  
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        exports.push(node.moduleSpecifier.text);
      }
    } else if (ts.isExportAssignment(node)) {
      exports.push("default");
    } else if (
      (ts.isFunctionDeclaration(node) || 
       ts.isClassDeclaration(node) || 
       ts.isVariableStatement(node) ||
       ts.isInterfaceDeclaration(node) ||
       ts.isTypeAliasDeclaration(node)) &&
      node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      if (ts.isFunctionDeclaration(node) && node.name) {
        exports.push(node.name.text);
      } else if (ts.isClassDeclaration(node) && node.name) {
        exports.push(node.name.text);
      } else if (ts.isInterfaceDeclaration(node)) {
        exports.push(node.name.text);
      } else if (ts.isTypeAliasDeclaration(node)) {
        exports.push(node.name.text);
      } else if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name)) {
            exports.push(decl.name.text);
          }
        });
      }
    }
  });
  
  return exports;
}

/**
 * Extract references (identifiers that might reference other chunks)
 */
function extractReferences(node: ts.Node, sourceFile: ts.SourceFile): string[] {
  const references: string[] = [];
  const seen = new Set<string>();
  
  function visit(n: ts.Node) {
    if (ts.isIdentifier(n)) {
      const name = n.text;
      // Filter out common keywords and built-ins
      if (!seen.has(name) && 
          name.length > 1 && 
          /^[A-Z]/.test(name) && // Only PascalCase identifiers (likely types/classes/components)
          !["React", "Promise", "Array", "Object", "String", "Number", "Boolean", "Date", "Error", "Map", "Set"].includes(name)) {
        seen.add(name);
        references.push(name);
      }
    }
    ts.forEachChild(n, visit);
  }
  
  visit(node);
  return references;
}

// ════════════════════════════════════════════════════════════════════════════
// CHUNKER CLASS
// ════════════════════════════════════════════════════════════════════════════

export class SemanticChunker {
  private options: ChunkerOptions;
  
  constructor(options: Partial<ChunkerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Parse and chunk a TypeScript/JavaScript file
   */
  chunkFile(
    content: string,
    filePath: string,
    projectId: number,
    fileHash: string
  ): Omit<InsertContextChunk, "id" | "createdAt" | "updatedAt" | "lastIndexedAt">[] {
    const chunks: Omit<InsertContextChunk, "id" | "createdAt" | "updatedAt" | "lastIndexedAt">[] = [];
    const ext = path.extname(filePath).toLowerCase();
    
    // Determine language and script kind
    let language = "typescript";
    let scriptKind = ts.ScriptKind.TS;
    
    if (ext === ".tsx") {
      language = "typescriptreact";
      scriptKind = ts.ScriptKind.TSX;
    } else if (ext === ".jsx") {
      language = "javascriptreact";
      scriptKind = ts.ScriptKind.JSX;
    } else if (ext === ".js" || ext === ".mjs" || ext === ".cjs") {
      language = "javascript";
      scriptKind = ts.ScriptKind.JS;
    }
    
    // Parse the source file
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );
    
    // Extract file-level imports and exports
    const fileImports = extractImports(sourceFile);
    const fileExports = extractExports(sourceFile);
    
    // Generate file summary chunk
    if (this.options.generateSummary) {
      const summaryChunk = this.createFileSummaryChunk(
        sourceFile,
        filePath,
        projectId,
        fileHash,
        language,
        fileImports,
        fileExports
      );
      chunks.push(summaryChunk);
    }
    
    // Process top-level nodes
    ts.forEachChild(sourceFile, (node) => {
      const nodeChunks = this.processNode(
        node,
        sourceFile,
        filePath,
        projectId,
        fileHash,
        language,
        null
      );
      chunks.push(...nodeChunks);
    });
    
    return chunks;
  }
  
  /**
   * Create a file summary chunk
   */
  private createFileSummaryChunk(
    sourceFile: ts.SourceFile,
    filePath: string,
    projectId: number,
    fileHash: string,
    language: string,
    imports: string[],
    exports: string[]
  ): Omit<InsertContextChunk, "id" | "createdAt" | "updatedAt" | "lastIndexedAt"> {
    const lines = sourceFile.text.split("\n");
    const summary = `File: ${filePath}\nLines: ${lines.length}\nImports: ${imports.length}\nExports: ${exports.join(", ") || "none"}`;
    
    return {
      projectId,
      filePath,
      fileHash,
      startLine: 1,
      endLine: Math.min(10, lines.length),
      startColumn: 0,
      endColumn: 0,
      chunkType: "file_summary",
      name: path.basename(filePath),
      parentName: null,
      content: lines.slice(0, 10).join("\n"),
      summary,
      language,
      imports,
      exports,
      references: [],
      embedding: null,
      embeddingModel: null,
      keywords: this.extractKeywords(sourceFile.text),
      tokenCount: this.estimateTokens(sourceFile.text),
    };
  }
  
  /**
   * Process a single AST node and return chunks
   */
  private processNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string,
    projectId: number,
    fileHash: string,
    language: string,
    parentName: string | null
  ): Omit<InsertContextChunk, "id" | "createdAt" | "updatedAt" | "lastIndexedAt">[] {
    const chunks: Omit<InsertContextChunk, "id" | "createdAt" | "updatedAt" | "lastIndexedAt">[] = [];
    
    // Skip import/export declarations if not included
    if (!this.options.includeImports && 
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))) {
      return chunks;
    }
    
    // Function declarations
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      const isComponent = isReactComponent(node, sourceFile);
      const isHook = isReactHook(name);
      
      chunks.push(this.createChunk(
        node,
        sourceFile,
        filePath,
        projectId,
        fileHash,
        language,
        isComponent ? "component" : isHook ? "hook" : "function",
        name,
        parentName
      ));
    }
    
    // Class declarations
    else if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      
      chunks.push(this.createChunk(
        node,
        sourceFile,
        filePath,
        projectId,
        fileHash,
        language,
        "class",
        className,
        parentName
      ));
      
      // Process class members
      node.members.forEach(member => {
        if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
          chunks.push(this.createChunk(
            member,
            sourceFile,
            filePath,
            projectId,
            fileHash,
            language,
            "function",
            member.name.text,
            className
          ));
        }
      });
    }
    
    // Interface declarations
    else if (ts.isInterfaceDeclaration(node)) {
      chunks.push(this.createChunk(
        node,
        sourceFile,
        filePath,
        projectId,
        fileHash,
        language,
        "interface",
        node.name.text,
        parentName
      ));
    }
    
    // Type alias declarations
    else if (ts.isTypeAliasDeclaration(node)) {
      chunks.push(this.createChunk(
        node,
        sourceFile,
        filePath,
        projectId,
        fileHash,
        language,
        "type",
        node.name.text,
        parentName
      ));
    }
    
    // Variable statements (const/let/var)
    else if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach(decl => {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          let chunkType: ChunkType = "constant";
          
          // Check if it's a component or hook
          if (decl.initializer) {
            if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
              if (isReactComponent(decl.initializer, sourceFile)) {
                chunkType = "component";
              } else if (isReactHook(name)) {
                chunkType = "hook";
              } else {
                chunkType = "function";
              }
            }
          }
          
          chunks.push(this.createChunk(
            node,
            sourceFile,
            filePath,
            projectId,
            fileHash,
            language,
            chunkType,
            name,
            parentName
          ));
        }
      });
    }
    
    // Import declarations
    else if (ts.isImportDeclaration(node) && this.options.includeImports) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        chunks.push(this.createChunk(
          node,
          sourceFile,
          filePath,
          projectId,
          fileHash,
          language,
          "import",
          moduleSpecifier.text,
          parentName
        ));
      }
    }
    
    // Export declarations
    else if (ts.isExportDeclaration(node)) {
      chunks.push(this.createChunk(
        node,
        sourceFile,
        filePath,
        projectId,
        fileHash,
        language,
        "export",
        null,
        parentName
      ));
    }
    
    return chunks;
  }
  
  /**
   * Create a chunk from an AST node
   */
  private createChunk(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string,
    projectId: number,
    fileHash: string,
    language: string,
    chunkType: ChunkType,
    name: string | null,
    parentName: string | null
  ): Omit<InsertContextChunk, "id" | "createdAt" | "updatedAt" | "lastIndexedAt"> {
    const start = getLineAndColumn(sourceFile, node.getStart());
    const end = getLineAndColumn(sourceFile, node.getEnd());
    const content = extractText(sourceFile, node.getStart(), node.getEnd());
    const references = extractReferences(node, sourceFile);
    
    return {
      projectId,
      filePath,
      fileHash,
      startLine: start.line,
      endLine: end.line,
      startColumn: start.column,
      endColumn: end.column,
      chunkType,
      name,
      parentName,
      content,
      summary: null, // Will be generated by AI later
      language,
      imports: [],
      exports: [],
      references,
      embedding: null,
      embeddingModel: null,
      keywords: this.extractKeywords(content),
      tokenCount: this.estimateTokens(content),
    };
  }
  
  /**
   * Extract keywords from content for trigram search
   */
  private extractKeywords(content: string): string {
    // Remove comments and strings
    const cleaned = content
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\/\/.*/g, " ")
      .replace(/"[^"]*"/g, " ")
      .replace(/'[^']*'/g, " ")
      .replace(/`[^`]*`/g, " ");
    
    // Extract identifiers
    const identifiers = cleaned.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/g) || [];
    
    // Filter and dedupe
    const keywords = Array.from(new Set(identifiers))
      .filter(id => id.length > 2 && !["const", "let", "var", "function", "class", "interface", "type", "import", "export", "from", "return", "if", "else", "for", "while", "switch", "case", "break", "continue", "try", "catch", "finally", "throw", "new", "this", "super", "extends", "implements", "async", "await", "static", "public", "private", "protected", "readonly", "abstract", "true", "false", "null", "undefined", "void", "never", "any", "unknown", "string", "number", "boolean", "object", "symbol", "bigint"].includes(id));
    
    return keywords.join(" ");
  }
  
  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(content: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(content.length / 4);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Chunk a TypeScript/JavaScript file
 */
export function chunkTypeScriptFile(
  content: string,
  filePath: string,
  projectId: number,
  fileHash: string,
  options?: Partial<ChunkerOptions>
): Omit<InsertContextChunk, "id" | "createdAt" | "updatedAt" | "lastIndexedAt">[] {
  const chunker = new SemanticChunker(options);
  return chunker.chunkFile(content, filePath, projectId, fileHash);
}

/**
 * Check if a file is a TypeScript/JavaScript file
 */
export function isTypeScriptFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext);
}

/**
 * Check if a file is a React file (TSX/JSX)
 */
export function isReactFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return [".tsx", ".jsx"].includes(ext);
}
