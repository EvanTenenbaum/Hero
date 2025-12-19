import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

/**
 * GitHub OAuth Callback Handler
 * This page handles the OAuth callback from GitHub and stores the access token
 */
export default function GitHubCallback() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  
  const connectMutation = trpc.github.connect.useMutation({
    onSuccess: () => {
      navigate("/settings?tab=github&connected=true");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  useEffect(() => {
    // Parse the URL parameters
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const errorParam = params.get("error");
    const errorDescription = params.get("error_description");

    if (errorParam) {
      setError(errorDescription || errorParam);
      return;
    }

    if (!code) {
      setError("No authorization code received");
      return;
    }

    // Exchange the code for an access token
    // Note: In production, this should be done server-side
    // For now, we'll simulate with a placeholder
    // The actual OAuth flow would require a GitHub OAuth App
    
    // Simulated token exchange - in production, call a server endpoint
    const exchangeCode = async () => {
      try {
        // This would normally be a server-side call to exchange the code
        // For demonstration, we'll show the flow
        setError("GitHub OAuth requires server-side token exchange. Please configure your GitHub OAuth App credentials in Settings.");
      } catch (err: any) {
        setError(err.message || "Failed to exchange authorization code");
      }
    };

    exchangeCode();
  }, [connectMutation, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8 max-w-md">
          <div className="text-red-500 text-lg font-medium">GitHub Connection Failed</div>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate("/settings")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Return to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Connecting to GitHub...</p>
      </div>
    </div>
  );
}
