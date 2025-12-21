/**
 * Code Search Component - UI for searching indexed code
 * Sprint 2: Context Engine Search
 */

import { useState, useCallback, useEffect } from "react";
import { Search, Code, FileCode, Loader2, X, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

interface SearchResult {
  id: number;
  filePath: string;
  name: string | null;
  chunkType: string;
  content: string;
  summary: string | null;
  startLine: number;
  endLine: number;
  score: number;
  matchType: "semantic" | "keyword" | "hybrid";
}

interface CodeSearchProps {
  projectId: number;
  onSelectResult?: (result: SearchResult) => void;
  className?: string;
}

const CHUNK_TYPE_COLORS: Record<string, string> = {
  function: "bg-blue-500/20 text-blue-400",
  class: "bg-purple-500/20 text-purple-400",
  interface: "bg-green-500/20 text-green-400",
  type: "bg-yellow-500/20 text-yellow-400",
  component: "bg-pink-500/20 text-pink-400",
  hook: "bg-cyan-500/20 text-cyan-400",
  constant: "bg-orange-500/20 text-orange-400",
  file_summary: "bg-gray-500/20 text-gray-400"
};

export function CodeSearch({ projectId, onSelectResult, className }: CodeSearchProps) {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"hybrid" | "semantic" | "keyword">("hybrid");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [isSearching, setIsSearching] = useState(false);

  const [searchParams, setSearchParams] = useState<{
    projectId: number;
    query: string;
    searchType: string;
    limit: number;
  } | null>(null);

  const searchQuery = trpc.context.search.useQuery(
    searchParams ? {
      projectId: searchParams.projectId,
      query: searchParams.query,
      chunkTypes: undefined,
      filePath: undefined,
      limit: searchParams.limit,
      offset: 0
    } : { projectId: 0, query: "", limit: 0, offset: 0 },
    {
      enabled: !!searchParams && !!searchParams.query
    }
  );

  // Handle search results
  useEffect(() => {
    if (searchQuery.data && isSearching) {
      setResults(searchQuery.data.chunks as unknown as SearchResult[]);
      setIsSearching(false);
    }
  }, [searchQuery.data, isSearching]);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setSearchParams({
      projectId,
      query: query.trim(),
      searchType,
      limit: 20
    });
  }, [query, projectId, searchType]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const toggleExpanded = (id: number) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5" />
          Code Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Search code... (e.g., 'authentication handler')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-8"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={searchType} onValueChange={(v) => setSearchType(v as typeof searchType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="semantic">Semantic</SelectItem>
              <SelectItem value="keyword">Keyword</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {results.length} results found
            </div>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {results.map((result) => (
                <SearchResultCard
                  key={result.id}
                  result={result}
                  expanded={expandedResults.has(result.id)}
                  onToggleExpand={() => toggleExpanded(result.id)}
                  onSelect={() => onSelectResult?.(result)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {results.length === 0 && query && !isSearching && (
          <div className="text-center py-8 text-muted-foreground">
            <Code className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No results found for "{query}"</p>
            <p className="text-sm">Try different keywords or search type</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SearchResultCardProps {
  result: SearchResult;
  expanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
}

function SearchResultCard({ result, expanded, onToggleExpand, onSelect }: SearchResultCardProps) {
  const typeColor = CHUNK_TYPE_COLORS[result.chunkType] || "bg-gray-500/20 text-gray-400";
  
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50"
        onClick={onToggleExpand}
      >
        <button className="text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <FileCode className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{result.name || "anonymous"}</span>
            <Badge variant="outline" className={typeColor}>
              {result.chunkType}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {result.filePath}:{result.startLine}-{result.endLine}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {(result.score * 100).toFixed(0)}%
        </div>
      </div>
      
      {expanded && (
        <div className="border-t">
          <pre className="p-3 text-xs overflow-x-auto bg-muted/30 max-h-48">
            <code>{result.content}</code>
          </pre>
          <div className="p-2 border-t flex justify-end">
            <Button size="sm" variant="outline" onClick={onSelect}>
              Open in Editor
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact search badge for use in headers
 */
export function CodeSearchBadge({ projectId }: { projectId: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Search className="h-4 w-4" />
        Search Code
      </Button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-96 z-50">
          <CodeSearch projectId={projectId} />
        </div>
      )}
    </div>
  );
}

export default CodeSearch;
