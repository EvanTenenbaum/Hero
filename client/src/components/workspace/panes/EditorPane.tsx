import { useState } from "react";
import { Code2, FileCode } from "lucide-react";

interface EditorPaneProps {
  filePath?: string;
}

export default function EditorPane({ filePath }: EditorPaneProps) {
  const [content, setContent] = useState("");

  if (!filePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <FileCode className="w-12 h-12 opacity-50" />
        <p className="text-sm">No file selected</p>
        <p className="text-xs text-center max-w-xs">
          Open a file from the GitHub pane or select a file to edit
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* File header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 shrink-0">
        <Code2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate">{filePath}</span>
      </div>

      {/* Editor area - placeholder for Monaco */}
      <div className="flex-1 overflow-auto">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full p-4 bg-transparent font-mono text-sm resize-none focus:outline-none"
          placeholder="// Code editor - Monaco integration pending"
        />
      </div>
    </div>
  );
}
