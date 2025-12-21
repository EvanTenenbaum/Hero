/**
 * ContextPreview Component
 * 
 * Displays a preview of retrieved context for AI prompts.
 * Shows formatted context with syntax highlighting and metadata.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileCode, 
  Copy, 
  Check,
  Loader2,
  Sparkles,
  Code,
  FileText,
  Braces
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ContextPreviewProps {
  projectId: number;
  query: string;
  maxTokens?: number;
  currentFile?: string;
  className?: string;
}

export function ContextPreview({ 
  projectId, 
  query, 
  maxTokens = 8000,
  currentFile,
  className 
}: ContextPreviewProps) {
  const [format, setFormat] = useState<"markdown" | "compact" | "xml">("markdown");
  const [copied, setCopied] = useState(false);

  // Fetch context
  const { data: context, isLoading, error } = trpc.context.getContext.useQuery(
    {
      projectId,
      query,
      maxTokens,
      currentFile,
      format,
    },
    {
      enabled: query.length >= 2,
    }
  );

  const handleCopy = async () => {
    if (!context?.context) return;
    
    try {
      await navigator.clipboard.writeText(context.context);
      setCopied(true);
      toast.success("Context copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy context");
    }
  };

  if (!query || query.length < 2) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Enter a query to retrieve relevant context</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Retrieving context...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-border/50 border-red-500/20", className)}>
        <CardContent className="p-6 text-center text-red-500">
          <p>Failed to retrieve context: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Context Preview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {context?.chunkCount || 0} chunks
            </Badge>
            <Badge variant="outline" className="text-xs">
              {context?.fileCount || 0} files
            </Badge>
            <Badge variant="outline" className="text-xs">
              ~{context?.totalTokens || 0} tokens
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Format tabs */}
        <Tabs value={format} onValueChange={(v) => setFormat(v as typeof format)}>
          <div className="flex items-center justify-between">
            <TabsList className="h-8">
              <TabsTrigger value="markdown" className="text-xs h-7 px-2">
                <FileText className="h-3 w-3 mr-1" />
                Markdown
              </TabsTrigger>
              <TabsTrigger value="compact" className="text-xs h-7 px-2">
                <Code className="h-3 w-3 mr-1" />
                Compact
              </TabsTrigger>
              <TabsTrigger value="xml" className="text-xs h-7 px-2">
                <Braces className="h-3 w-3 mr-1" />
                XML
              </TabsTrigger>
            </TabsList>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!context?.context}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <TabsContent value="markdown" className="mt-3">
            <ContextDisplay content={context?.context || ""} format="markdown" />
          </TabsContent>
          <TabsContent value="compact" className="mt-3">
            <ContextDisplay content={context?.context || ""} format="compact" />
          </TabsContent>
          <TabsContent value="xml" className="mt-3">
            <ContextDisplay content={context?.context || ""} format="xml" />
          </TabsContent>
        </Tabs>

        {/* Metadata */}
        {context && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
            <span>Search time: {context.searchTimeMs}ms</span>
            {context.truncated && (
              <Badge variant="secondary" className="text-xs">
                Truncated to fit budget
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Context display component
function ContextDisplay({ content, format }: { content: string; format: string }) {
  if (!content) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No context retrieved
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] rounded-lg border border-border/50 bg-muted/30">
      <pre className={cn(
        "p-4 text-xs font-mono whitespace-pre-wrap",
        format === "xml" && "text-blue-400"
      )}>
        {content}
      </pre>
    </ScrollArea>
  );
}

/**
 * Inline context badge for showing context status
 */
export function ContextBadge({ 
  projectId, 
  query 
}: { 
  projectId: number; 
  query: string;
}) {
  const { data: context, isLoading } = trpc.context.getContext.useQuery(
    { projectId, query, maxTokens: 4000, format: "compact" },
    { enabled: query.length >= 2 }
  );

  if (isLoading) {
    return (
      <Badge variant="outline" className="text-xs">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Loading context...
      </Badge>
    );
  }

  if (!context || context.chunkCount === 0) {
    return null;
  }

  return (
    <Badge variant="secondary" className="text-xs">
      <FileCode className="h-3 w-3 mr-1" />
      {context.chunkCount} chunks | ~{context.totalTokens} tokens
    </Badge>
  );
}

export default ContextPreview;
