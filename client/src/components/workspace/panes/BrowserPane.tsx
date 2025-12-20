import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Globe, 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  ExternalLink,
  Home,
  AlertCircle
} from "lucide-react";

interface BrowserPaneProps {
  url?: string;
  onUrlChange?: (url: string) => void;
}

export default function BrowserPane({ url: initialUrl, onUrlChange }: BrowserPaneProps) {
  const [inputUrl, setInputUrl] = useState(initialUrl || "");
  const [currentUrl, setCurrentUrl] = useState(initialUrl || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const normalizeUrl = (url: string): string => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `https://${url}`;
  };

  const handleNavigate = useCallback(() => {
    const normalized = normalizeUrl(inputUrl);
    if (normalized) {
      setCurrentUrl(normalized);
      setError(null);
      setIsLoading(true);
      onUrlChange?.(normalized);
    }
  }, [inputUrl, onUrlChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNavigate();
    }
  };

  const handleRefresh = () => {
    if (iframeRef.current && currentUrl) {
      setIsLoading(true);
      iframeRef.current.src = currentUrl;
    }
  };

  const handleGoHome = () => {
    setInputUrl("");
    setCurrentUrl("");
    setError(null);
  };

  const handleOpenExternal = () => {
    if (currentUrl) {
      window.open(currentUrl, "_blank");
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    // Check if iframe actually loaded content (some sites block with X-Frame-Options)
    // We can't directly check due to cross-origin, but we can detect common failure patterns
    try {
      // If we can access contentWindow, the iframe loaded something
      const hasContent = iframeRef.current?.contentWindow;
      if (!hasContent) {
        setError("This site may have blocked embedding. Try opening it externally.");
      }
    } catch (e) {
      // Cross-origin error is expected for most sites, which means it loaded
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError("This site cannot be displayed in an embedded frame. Try opening it externally.");
  };

  // Timeout-based error detection for sites that block silently
  useEffect(() => {
    if (isLoading && currentUrl) {
      const timeout = setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          // Don't set error immediately, let user see if it loaded
        }
      }, 10000); // 10 second timeout
      return () => clearTimeout(timeout);
    }
  }, [isLoading, currentUrl]);

  return (
    <div className="flex flex-col h-full">
      {/* URL Bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleGoHome}
          title="Home"
        >
          <Home className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleRefresh}
          disabled={!currentUrl}
          title="Refresh"
        >
          <RotateCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
        <div className="flex-1 flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter URL..."
            className="h-8"
          />
        </div>
        <Button
          size="sm"
          onClick={handleNavigate}
          disabled={!inputUrl}
        >
          Go
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleOpenExternal}
          disabled={!currentUrl}
          title="Open in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {!currentUrl ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <Globe className="w-12 h-12 opacity-50" />
            <p className="text-sm">Enter a URL to browse</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInputUrl("google.com");
                  setCurrentUrl("https://google.com");
                  onUrlChange?.("https://google.com");
                }}
              >
                Google
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInputUrl("github.com");
                  setCurrentUrl("https://github.com");
                  onUrlChange?.("https://github.com");
                }}
              >
                GitHub
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInputUrl("stackoverflow.com");
                  setCurrentUrl("https://stackoverflow.com");
                  onUrlChange?.("https://stackoverflow.com");
                }}
              >
                Stack Overflow
              </Button>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-8">
            <AlertCircle className="w-12 h-12 text-yellow-500" />
            <p className="text-sm text-center">{error}</p>
            <Button onClick={handleOpenExternal}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={currentUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title="Browser"
            />
          </>
        )}
      </div>
    </div>
  );
}
