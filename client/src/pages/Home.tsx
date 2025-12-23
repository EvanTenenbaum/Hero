import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { 
  Bot, Code2, FolderGit2, MessageSquare, Settings, Shield, 
  Sparkles, GitBranch, Zap, ArrowRight, Loader2 
} from "lucide-react";
import { Link } from "wouter";

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header - Clean, minimal */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Code2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Hero IDE</span>
          </div>
          <Button asChild size="sm">
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </header>

      {/* Hero Section - Typography-first, warm and inviting */}
      <section className="container py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-primary mb-4 tracking-wide uppercase">
            AI-Powered Development
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            Build software with
            <br />
            <span className="text-primary">autonomous agents</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Hero IDE combines intelligent chat, autonomous coding agents, and GitHub integration 
            with built-in governance. Ship code faster while staying in control.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Button asChild size="lg" className="gap-2">
              <a href={getLoginUrl()}>
                Get Started <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="https://github.com/EvanTenenbaum/Hero" target="_blank" rel="noopener">
                <GitBranch className="h-4 w-4 mr-2" /> View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid - Clean cards, subtle borders */}
      <section className="container py-20 border-t border-border">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold mb-3">Everything you need</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            A complete development environment with AI assistance at every step
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          <FeatureCard
            icon={<MessageSquare className="h-5 w-5" />}
            title="AI Chat"
            description="Intelligent coding assistant powered by Gemini. Get help with code, debugging, and architecture."
          />
          <FeatureCard
            icon={<Bot className="h-5 w-5" />}
            title="Autonomous Agents"
            description="Configure agents to work on your codebase with defined goals, budgets, and safety constraints."
          />
          <FeatureCard
            icon={<FolderGit2 className="h-5 w-5" />}
            title="GitHub Integration"
            description="Connect repositories, browse code, create branches, and manage pull requests seamlessly."
          />
          <FeatureCard
            icon={<Shield className="h-5 w-5" />}
            title="Governance Controls"
            description="8-step change lifecycle with approval workflows, risk assessment, and violation detection."
          />
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            title="Budget Management"
            description="Track token usage, set spending limits, and monitor costs across all AI operations."
          />
          <FeatureCard
            icon={<Settings className="h-5 w-5" />}
            title="Flexible Configuration"
            description="Customize agent behavior, model routing, safety thresholds, and notification preferences."
          />
        </div>
      </section>

      {/* Footer - Minimal */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          Powered by Gemini
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="hover-lift">
      <CardHeader className="pb-3">
        <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-primary mb-3">
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  return (
    <div className="p-6 space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl md:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>
          Welcome to Hero IDE
        </h1>
        <p className="text-muted-foreground mt-1">Your AI-powered development platform</p>
      </div>

      {/* Quick Actions - Clean grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickActionCard
          href="/projects"
          icon={<FolderGit2 className="h-5 w-5" />}
          title="Projects"
          description="Manage your projects"
        />
        <QuickActionCard
          href="/chat"
          icon={<MessageSquare className="h-5 w-5" />}
          title="Chat"
          description="AI assistant"
        />
        <QuickActionCard
          href="/agents"
          icon={<Bot className="h-5 w-5" />}
          title="Agents"
          description="Autonomous workers"
        />
        <QuickActionCard
          href="/settings"
          icon={<Settings className="h-5 w-5" />}
          title="Settings"
          description="Configuration"
        />
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              No recent activity yet. Start by creating a project or chatting with the AI.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Start</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                1
              </div>
              <span className="text-sm">Create or import a project</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                2
              </div>
              <span className="text-sm">Configure an AI agent</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                3
              </div>
              <span className="text-sm">Start coding with AI assistance</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickActionCard({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link href={href}>
      <Card className="hover-lift cursor-pointer h-full">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-primary flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-medium">{title}</h3>
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Authenticated users see dashboard
  return <Dashboard />;
}
