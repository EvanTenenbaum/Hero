import { useCallback, useMemo, useState } from "react";
import { SectionCard } from "./components/SectionCard";
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

const governanceSteps = [
  "Step 1: Declare intent",
  "Step 4: Preview changes",
  "Step 6: Apply with recovery"
];

const quickActions = [
  "Create new project",
  "Connect GitHub",
  "Review change queue",
  "Configure budgets"
];

export const App = (): JSX.Element => {
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

  const handleTabChange = useCallback((key: TabKey) => {
    setActiveTab(key);
  }, []);

  const header = screenTitles[activeTab];

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <h1>{header.title}</h1>
          <p>{header.subtitle}</p>
        </div>
        <span className="pill">Mobile-first</span>
      </header>
      <main className="content">
        {screenMap[activeTab]}
        <SectionCard
          title="Governance Snapshot"
          description="Every change follows the 8-step lifecycle with explicit scope, risk, and approval checkpoints to protect project integrity."
        >
          <div className="section-list">
            {governanceSteps.map((item) => (
              <div className="pill" key={item}>
                {item}
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard
          title="Quick Actions"
          description="Keep the next steps within thumb reach so you can move fast without skipping governance."
        >
          <div className="action-grid">
            {quickActions.map((item) => (
              <button type="button" className="action-card" key={item}>
                <span>{item}</span>
              </button>
            ))}
          </div>
        </SectionCard>
      </main>
      <TabBar items={tabs} active={activeTab} onChange={handleTabChange} />
    </div>
  );
};
