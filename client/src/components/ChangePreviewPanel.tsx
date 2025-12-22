/**
 * ChangePreviewPanel - Shows a diff preview of proposed code changes
 */

import { useState, useEffect } from "react";
import { getLanguageFromPath, highlightDiff } from "@/lib/syntax-highlight";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Check, X, FileCode, FilePlus, FileX } from "lucide-react";

interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  lineNumber: number;
}

interface FileDiff {
  filePath: string;
  lines: DiffLine[];
  additions: number;
  deletions: number;
}

interface ChangePreview {
  filePath: string;
  changeType: "create" | "modify" | "delete";
  diff: FileDiff;
  isProtected: boolean;
  protectionReason: string | null;
}

interface ChangePreviewPanelProps {
  previews: ChangePreview[];
  onApply: (confirmedProtectedFiles: string[]) => void;
  onCancel: () => void;
  isApplying?: boolean;
}

export function ChangePreviewPanel({
  previews,
  onApply,
  onCancel,
  isApplying = false,
}: ChangePreviewPanelProps) {
  const [confirmedFiles, setConfirmedFiles] = useState<Set<string>>(new Set());
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
    new Set(previews.map((p) => p.filePath))
  );
  const [highlightedDiffs, setHighlightedDiffs] = useState<Map<string, Array<{ type: 'add' | 'remove' | 'context'; html: string; lineNumber: number }>>>(new Map());

  // Highlight diffs when files are expanded
  useEffect(() => {
    const highlightExpandedFiles = async () => {
      for (const filePath of Array.from(expandedFiles)) {
        if (highlightedDiffs.has(filePath)) continue;
        
        const preview = previews.find(p => p.filePath === filePath);
        if (!preview) continue;
        
        const language = getLanguageFromPath(filePath);
        const highlighted = await highlightDiff(preview.diff.lines, language, 'dark');
        
        setHighlightedDiffs(prev => new Map(prev).set(filePath, highlighted));
      }
    };
    
    highlightExpandedFiles();
  }, [expandedFiles, previews]);

  const protectedFiles = previews.filter((p) => p.isProtected);
  const allProtectedConfirmed = protectedFiles.every((p) =>
    confirmedFiles.has(p.filePath)
  );

  const toggleFileConfirmation = (filePath: string) => {
    const newConfirmed = new Set(confirmedFiles);
    if (newConfirmed.has(filePath)) {
      newConfirmed.delete(filePath);
    } else {
      newConfirmed.add(filePath);
    }
    setConfirmedFiles(newConfirmed);
  };

  const toggleFileExpansion = (filePath: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filePath)) {
      newExpanded.delete(filePath);
    } else {
      newExpanded.add(filePath);
    }
    setExpandedFiles(newExpanded);
  };

  const getChangeIcon = (changeType: "create" | "modify" | "delete") => {
    switch (changeType) {
      case "create":
        return <FilePlus className="h-4 w-4 text-green-600" />;
      case "modify":
        return <FileCode className="h-4 w-4 text-primary" />;
      case "delete":
        return <FileX className="h-4 w-4 text-destructive" />;
    }
  };

  const totalAdditions = previews.reduce((sum, p) => sum + p.diff.additions, 0);
  const totalDeletions = previews.reduce((sum, p) => sum + p.diff.deletions, 0);

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif text-lg">Proposed Changes</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-600">+{totalAdditions}</span>
            <span className="text-destructive">-{totalDeletions}</span>
            <Badge variant="secondary">{previews.length} files</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Protected files warning */}
        {protectedFiles.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">
                  {protectedFiles.length} protected file
                  {protectedFiles.length > 1 ? "s" : ""} will be modified
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Please review and confirm each protected file before applying
                  changes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* File list */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {previews.map((preview) => (
              <div
                key={preview.filePath}
                className="rounded-lg border bg-card overflow-hidden"
              >
                {/* File header */}
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  onClick={() => toggleFileExpansion(preview.filePath)}
                >
                  <div className="flex items-center gap-2">
                    {getChangeIcon(preview.changeType)}
                    <span className="font-mono text-sm">{preview.filePath}</span>
                    {preview.isProtected && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        Protected
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">+{preview.diff.additions}</span>
                    <span className="text-destructive">-{preview.diff.deletions}</span>
                  </div>
                </button>

                {/* Protected file confirmation */}
                {preview.isProtected && (
                  <div className="px-3 pb-2 border-t bg-amber-50/50">
                    <label className="flex items-start gap-2 py-2 cursor-pointer">
                      <Checkbox
                        checked={confirmedFiles.has(preview.filePath)}
                        onCheckedChange={() =>
                          toggleFileConfirmation(preview.filePath)
                        }
                        className="mt-0.5"
                      />
                      <div className="text-sm">
                        <span className="font-medium">
                          I understand and confirm this change
                        </span>
                        {preview.protectionReason && (
                          <p className="text-muted-foreground mt-0.5">
                            {preview.protectionReason}
                          </p>
                        )}
                      </div>
                    </label>
                  </div>
                )}

                {/* Diff view with syntax highlighting */}
                {expandedFiles.has(preview.filePath) && (
                  <div className="border-t bg-zinc-900">
                    <pre className="p-3 text-xs font-mono overflow-x-auto">
                      {(highlightedDiffs.get(preview.filePath) || preview.diff.lines.map(l => ({ ...l, html: l.content }))).map((line, idx) => (
                        <div
                          key={idx}
                          className={`${
                            line.type === "add"
                              ? "bg-green-900/30 border-l-2 border-green-500"
                              : line.type === "remove"
                              ? "bg-red-900/30 border-l-2 border-red-500"
                              : "border-l-2 border-transparent"
                          }`}
                        >
                          <span className="inline-block w-8 text-right pr-2 select-none text-zinc-500">
                            {line.lineNumber}
                          </span>
                          <span className={`inline-block w-4 select-none ${
                            line.type === "add" ? "text-green-400" : line.type === "remove" ? "text-red-400" : "text-zinc-500"
                          }`}>
                            {line.type === "add"
                              ? "+"
                              : line.type === "remove"
                              ? "-"
                              : " "}
                          </span>
                          <span dangerouslySetInnerHTML={{ __html: line.html }} />
                        </div>
                      ))}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onCancel} disabled={isApplying}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            onClick={() => onApply(Array.from(confirmedFiles))}
            disabled={isApplying || (protectedFiles.length > 0 && !allProtectedConfirmed)}
          >
            {isApplying ? (
              <>
                <span className="animate-spin mr-1">⏳</span>
                Applying...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Apply Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
