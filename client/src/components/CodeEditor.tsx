import { useRef, useState, useCallback } from "react";
import Editor, { OnMount, OnChange } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Undo, Redo, Copy, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { editor } from "monaco-editor";

interface CodeEditorProps {
  value: string;
  language?: string;
  path?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  isDirty?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

// Map file extensions to Monaco language identifiers
function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    mjs: "javascript",
    cjs: "javascript",
    
    // Web
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    less: "less",
    
    // Data formats
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    toml: "toml",
    
    // Markdown
    md: "markdown",
    mdx: "markdown",
    
    // Python
    py: "python",
    pyw: "python",
    
    // Ruby
    rb: "ruby",
    rake: "ruby",
    gemspec: "ruby",
    
    // Go
    go: "go",
    
    // Rust
    rs: "rust",
    
    // Java/Kotlin
    java: "java",
    kt: "kotlin",
    kts: "kotlin",
    
    // C/C++
    c: "c",
    h: "c",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    hpp: "cpp",
    hxx: "cpp",
    
    // C#
    cs: "csharp",
    
    // PHP
    php: "php",
    
    // Swift
    swift: "swift",
    
    // Shell
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    fish: "shell",
    
    // SQL
    sql: "sql",
    
    // Docker
    dockerfile: "dockerfile",
    
    // GraphQL
    graphql: "graphql",
    gql: "graphql",
    
    // Config files
    env: "ini",
    ini: "ini",
    conf: "ini",
    cfg: "ini",
    
    // Plain text
    txt: "plaintext",
    log: "plaintext",
  };
  
  return languageMap[ext || ""] || "plaintext";
}

export function CodeEditor({
  value,
  language,
  path = "",
  readOnly = false,
  onChange,
  onSave,
  isDirty = false,
  isLoading = false,
  error,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [copied, setCopied] = useState(false);

  const detectedLanguage = language || getLanguageFromPath(path);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    
    // Add keyboard shortcut for save
    editor.addCommand(
      // Ctrl/Cmd + S
      2048 | 49, // KeyMod.CtrlCmd | KeyCode.KeyS
      () => {
        if (onSave && !readOnly) {
          onSave(editor.getValue());
        }
      }
    );
  }, [onSave, readOnly]);

  const handleChange: OnChange = useCallback((value) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  }, [onChange]);

  const handleUndo = () => {
    editorRef.current?.trigger("keyboard", "undo", null);
  };

  const handleRedo = () => {
    editorRef.current?.trigger("keyboard", "redo", null);
  };

  const handleCopy = async () => {
    const selection = editorRef.current?.getSelection();
    let textToCopy = value;
    
    if (selection && !selection.isEmpty()) {
      textToCopy = editorRef.current?.getModel()?.getValueInRange(selection) || value;
    }
    
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (onSave && !readOnly) {
      onSave(value);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-destructive font-medium">Error loading file</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#333] bg-[#252526]">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300 font-mono truncate max-w-[300px]">
            {path || "Untitled"}
          </span>
          {isDirty && (
            <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-400">
              Modified
            </Badge>
          )}
          <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
            {detectedLanguage}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={readOnly}
            className="h-7 px-2 text-gray-400 hover:text-foreground hover:bg-[#333]"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={readOnly}
            className="h-7 px-2 text-gray-400 hover:text-foreground hover:bg-[#333]"
          >
            <Redo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-gray-400 hover:text-foreground hover:bg-[#333]"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </Button>
          {onSave && !readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={!isDirty}
              className={cn(
                "h-7 px-2 text-gray-400 hover:text-foreground hover:bg-[#333]",
                isDirty && "text-blue-400"
              )}
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={detectedLanguage}
          value={value}
          theme="vs-dark"
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            readOnly,
            minimap: { enabled: true },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            fontLigatures: true,
            lineNumbers: "on",
            renderLineHighlight: "all",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            suggest: {
              showKeywords: true,
              showSnippets: true,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
            padding: { top: 16, bottom: 16 },
          }}
          loading={
            <div className="h-full flex items-center justify-center">
              <div className="text-gray-400">Loading editor...</div>
            </div>
          }
        />
      </div>
    </div>
  );
}

export default CodeEditor;
