import { useMemo, useState } from "react";
import { TabBar, TabItem, TabKey } from "./components/TabBar";
import { AgentsScreen } from "./screens/AgentsScreen";
import { ChatScreen } from "./screens/ChatScreen";
import { ProjectsScreen } from "./screens/ProjectsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

const screenMap: Record<TabKey, JSX.Element> = {
  projects: <ProjectsScreen />,
  chat: <ChatScreen />,
  agents: <AgentsScreen />,
  settings: <SettingsScreen />
};

const screenTitles: Record<TabKey, { title: string; subtitle: string }> = {
  projects: {
    title: "Hero IDE",
    subtitle: "Mobile-first web workspace for governed AI development"
  },
  chat: {
    title: "Hero PM",
    subtitle: "Natural language command center with strict governance"
  },
  agents: {
    title: "Agent Monitor",
    subtitle: "Autonomous execution with checkpoints and safety rails"
  },
  settings: {
    title: "System Settings",
    subtitle: "Configure routing, budgets, and integrations"
  }
};

export const App = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("projects");

  const tabs: TabItem[] = useMemo(
    () => [
      { key: "projects", label: "Projects", icon: "📁" },
      { key: "chat", label: "Chat", icon: "💬" },
      { key: "agents", label: "Agents", icon: "🤖" },
      { key: "settings", label: "Settings", icon: "⚙️" }
    ],
    []
  );

  const header = screenTitles[activeTab];

  return (
    <div className="app-shell">
      <header className="header">
        <h1>{header.title}</h1>
        <p>{header.subtitle}</p>
      </header>
      <main className="content">
        {screenMap[activeTab]}
        <div className="section-card">
          <h2>Governance Snapshot</h2>
          <p>
            Every change follows the 8-step lifecycle with explicit scope, risk,
            and approval checkpoints to protect project integrity.
          </p>
          <div className="section-list">
            <div className="pill">Step 1: Declare intent</div>
            <div className="pill">Step 4: Preview changes</div>
            <div className="pill">Step 6: Apply with recovery</div>
          </div>
        </div>
      </main>
      <TabBar items={tabs} active={activeTab} onChange={setActiveTab} />
    </div>
  );
};
