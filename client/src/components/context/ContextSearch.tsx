/**
 * ContextSearch Component
 * 
 * Provides a search interface for the Context Engine.
 * Supports hybrid search with configurable weights and filters.
 */

import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Search, 
  Filter, 
  Code, 
  FileCode, 
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
  Hash,
  GitBranch,
  Clock,
  Copy,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ContextSearchProps {
  projectId: number;
  onSelectChunk?: (chunk: SearchResultChunk) => void;
  maxHeight?: string;
}

interface SearchResultChunk {
  id: number;
  filePath: string;
  name: string | null;
  chunkType: string;
  content: string;
  summary: string | null;
  startLine: number;
  endLine: number;
  score: number;
  matchType: string;
  tokenCount: number;
}

// Chunk type icons
const chunkTypeIcons: Record<string, React.ReactNode> = {
  function: <Code className="h-3 w-3" />,
  class: <GitBranch className="h-3 w-3" />,
  interface: <Hash className="h-3 w-3" />,
  type: <Hash className="h-3 w-3" />,
  component: <Sparkles className="h-3 w-3" />,
  hook: <Sparkles className="h-3 w-3" />,
  constant: <Hash className="h-3 w-3" />,
};

export function ContextSearch({ projectId, onSelectChunk, maxHeight = "500px" }: ContextSearchProps) {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  // Search weights
  const [semanticWeight, setSemanticWeight] = useState(0.6);
  const [keywordWeight, setKeywordWeight] = useState(0.3);
  const [graphWeight, setGraphWeight] = useState(0.1);
  
  // Search results
  const { data: results, isLoading, refetch } = trpc.context.hybridSearch.useQuery(
    {
      projectId,
      query,
      limit: 20,
      semanticWeight,
      keywordWeight,
      graphWeight,
    },
    {
      enabled: query.length >= 2,
    }
  );

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.length >= 2) {
      refetch();
    }
  }, [query, refetch]);

  const handleCopyContent = useCallback(async (chunk: SearchResultChunk) => {
    try {
      await navigator.clipboard.writeText(chunk.content);
      setCopiedId(chunk.id);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error("Failed to copy code");
    }
  }, []);

  // Group results by file
  const groupedResults = useMemo(() => {
    if (!results?.chunks) return new Map<string, SearchResultChunk[]>();
    
    const grouped = new Map<string, SearchResultChunk[]>();
    for (const chunk of results.chunks) {
      const existing = grouped.get(chunk.filePath) || [];
      existing.push(chunk);
      grouped.set(chunk.filePath, existing);
    }
    return grouped;
  }, [results?.chunks]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4" />
          Context Search
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code, functions, types..."
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={query.length < 2 || isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </form>

        {/* Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent className="space-y-4 pt-2">
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50 space-y-4">
              <p className="text-sm font-medium">Search Weights</p>
              
              <div className="space-y-3">
                <WeightSlider
                  label="Semantic"
                  value={semanticWeight}
                  onChange={setSemanticWeight}
                  icon={<Sparkles className="h-3 w-3" />}
                />
                <WeightSlider
                  label="Keyword"
                  value={keywordWeight}
                  onChange={setKeywordWeight}
                  icon={<Hash className="h-3 w-3" />}
                />
                <WeightSlider
                  label="Graph"
                  value={graphWeight}
                  onChange={setGraphWeight}
                  icon={<GitBranch className="h-3 w-3" />}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Total: {((semanticWeight + keywordWeight + graphWeight) * 100).toFixed(0)}%
                {Math.abs(semanticWeight + keywordWeight + graphWeight - 1) > 0.01 && (
                  <span className="text-yellow-500 ml-2">(should sum to 100%)</span>
                )}
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Results metadata */}
        {results && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {results.chunks.length} results in {results.searchTimeMs}ms
            </span>
            <span>
              ~{results.totalTokens} tokens
              {results.truncated && " (truncated)"}
            </span>
          </div>
        )}

        {/* Results list */}
        <ScrollArea className="pr-4" style={{ maxHeight }}>
          <div className="space-y-3">
            {Array.from(groupedResults.entries()).map(([filePath, chunks]) => (
              <FileResultGroup
                key={filePath}
                filePath={filePath}
                chunks={chunks}
                onSelectChunk={onSelectChunk}
                onCopyChunk={handleCopyContent}
                copiedId={copiedId}
              />
            ))}

            {query.length >= 2 && !isLoading && results?.chunks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No results found for "{query}"</p>
                <p className="text-xs mt-1">Try different keywords or adjust search weights</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Weight slider component
function WeightSlider({ 
  label, 
  value, 
  onChange, 
  icon 
}: { 
  label: string; 
  value: number; 
  onChange: (v: number) => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span>{(value * 100).toFixed(0)}%</span>
      </div>
      <Slider
        value={[value * 100]}
        onValueChange={([v]) => onChange(v / 100)}
        max={100}
        step={5}
        className="w-full"
      />
    </div>
  );
}

// File result group component
function FileResultGroup({
  filePath,
  chunks,
  onSelectChunk,
  onCopyChunk,
  copiedId,
}: {
  filePath: string;
  chunks: SearchResultChunk[];
  onSelectChunk?: (chunk: SearchResultChunk) => void;
  onCopyChunk: (chunk: SearchResultChunk) => void;
  copiedId: number | null;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <FileCode className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium truncate flex-1 text-left">
          {filePath}
        </span>
        <Badge variant="secondary" className="text-xs">
          {chunks.length}
        </Badge>
      </CollapsibleTrigger>

      <CollapsibleContent className="pl-6 space-y-2 mt-2">
        {chunks.map((chunk) => (
          <ChunkResult
            key={chunk.id}
            chunk={chunk}
            onSelect={onSelectChunk}
            onCopy={onCopyChunk}
            isCopied={copiedId === chunk.id}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Individual chunk result
function ChunkResult({
  chunk,
  onSelect,
  onCopy,
  isCopied,
}: {
  chunk: SearchResultChunk;
  onSelect?: (chunk: SearchResultChunk) => void;
  onCopy: (chunk: SearchResultChunk) => void;
  isCopied: boolean;
}) {
  const relevancePercent = Math.round(chunk.score * 100);
  const relevanceColor = relevancePercent >= 70 
    ? "text-green-500" 
    : relevancePercent >= 40 
      ? "text-yellow-500" 
      : "text-zinc-500";

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border/50 bg-card/50",
        "hover:border-border hover:bg-card transition-colors",
        onSelect && "cursor-pointer"
      )}
      onClick={() => onSelect?.(chunk)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {chunkTypeIcons[chunk.chunkType] || <Code className="h-3 w-3" />}
          <Badge variant="outline" className="text-xs">
            {chunk.chunkType}
          </Badge>
          {chunk.name && (
            <span className="text-sm font-mono font-medium">{chunk.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", relevanceColor)}>
            {relevancePercent}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(chunk);
            }}
          >
            {isCopied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Summary */}
      {chunk.summary && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {chunk.summary}
        </p>
      )}

      {/* Code preview */}
      <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto max-h-24 overflow-y-hidden">
        <code>{chunk.content.slice(0, 300)}{chunk.content.length > 300 ? "..." : ""}</code>
      </pre>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <span>L{chunk.startLine}-{chunk.endLine}</span>
        <span>{chunk.tokenCount} tokens</span>
      </div>
    </div>
  );
}

export default ContextSearch;
