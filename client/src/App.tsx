import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Chat from "./pages/Chat";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import Settings from "./pages/Settings";
import Workspace from "./pages/Workspace";
import GitHubCallback from "./pages/GitHubCallback";
import Metrics from "./pages/Metrics";
import AgentConfig from "./pages/AgentConfig";
import ExecutionHistory from "./pages/ExecutionHistory";
import DashboardLayout from "./components/DashboardLayout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/chat" component={Chat} />
      <Route path="/chat/:id" component={Chat} />
      <Route path="/agents" component={Agents} />
      <Route path="/agents/:id" component={AgentDetail} />
      <Route path="/settings" component={Settings} />
      <Route path="/settings/:tab" component={Settings} />
      <Route path="/workspace" component={Workspace} />
      <Route path="/workspace/:owner/:repo" component={Workspace} />
      <Route path="/github/callback" component={GitHubCallback} />
      <Route path="/metrics" component={Metrics} />
      <Route path="/agent-config" component={AgentConfig} />
      <Route path="/execution-history" component={ExecutionHistory} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
