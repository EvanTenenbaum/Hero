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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">Hero IDE</span>
          </div>
          <Button asChild variant="default" className="bg-violet-600 hover:bg-violet-700">
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300 mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered Development Platform
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
            Build Faster with
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent"> Autonomous Agents</span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
            Hero IDE combines AI chat, autonomous coding agents, and GitHub integration 
            with built-in governance and safety controls. Ship code faster while staying in control.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-violet-600 hover:bg-violet-700 gap-2">
              <a href={getLoginUrl()}>
                Get Started <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <a href="https://github.com/EvanTenenbaum/Hero" target="_blank" rel="noopener">
                <GitBranch className="h-4 w-4 mr-2" /> View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container py-24 border-t border-slate-800/50">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Everything You Need</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            A complete development environment with AI assistance at every step
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<MessageSquare className="h-6 w-6" />}
            title="AI Chat"
            description="Intelligent coding assistant powered by Gemini. Get help with code, debugging, and architecture decisions."
          />
          <FeatureCard
            icon={<Bot className="h-6 w-6" />}
            title="Autonomous Agents"
            description="Configure agents to work on your codebase with defined goals, budgets, and safety constraints."
          />
          <FeatureCard
            icon={<FolderGit2 className="h-6 w-6" />}
            title="GitHub Integration"
            description="Connect your repositories, browse code, create branches, and manage pull requests."
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="Governance Controls"
            description="8-step change lifecycle with approval workflows, risk assessment, and violation detection."
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title="Budget Management"
            description="Track token usage, set spending limits, and monitor costs across all AI operations."
          />
          <FeatureCard
            icon={<Settings className="h-6 w-6" />}
            title="Flexible Configuration"
            description="Customize agent behavior, model routing, safety thresholds, and notification preferences."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8">
        <div className="container text-center text-sm text-slate-500">
          Built with Manus • Powered by Gemini
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-colors">
      <CardHeader>
        <div className="h-12 w-12 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 mb-4">
          {icon}
        </div>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-slate-400">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome to Hero IDE</h1>
        <p className="text-slate-400 mt-1">Your AI-powered development platform</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-sm">No recent activity yet. Start by creating a project or chatting with the AI.</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Quick Start</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs">1</div>
              <span className="text-slate-300">Create or import a project</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs">2</div>
              <span className="text-slate-300">Configure an AI agent</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs">3</div>
              <span className="text-slate-300">Start coding with AI assistance</span>
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
      <Card className="bg-slate-900/50 border-slate-800 hover:border-violet-500/50 hover:bg-slate-800/50 transition-all cursor-pointer">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
            {icon}
          </div>
          <div>
            <h3 className="font-medium text-white">{title}</h3>
            <p className="text-sm text-slate-400">{description}</p>
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Authenticated users see dashboard
  return (
    <div className="min-h-screen bg-slate-950">
      <Dashboard />
    </div>
  );
}
