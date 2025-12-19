import { memo } from "react";
import { SectionCard } from "../components/SectionCard";

const settingsHighlights = [
  "Secrets vault ready",
  "Model routing: Risk-aware",
  "Budgets: Enforced"
];

const SettingsScreenComponent = (): JSX.Element => {
  return (
    <SectionCard
      title="Settings"
      description="Configure governance, secrets, routing, and integrations from one place."
    >
      <div className="section-list">
        {settingsHighlights.map((item) => (
          <div className="pill" key={item}>
            {item}
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

export const SettingsScreen = memo(SettingsScreenComponent);
export const SettingsScreen = () => {
  return (
    <div className="section-card">
      <h2>Settings</h2>
      <p>Configure governance, secrets, routing, and integrations from one place.</p>
      <div className="section-list">
        <div className="pill">Secrets vault ready</div>
        <div className="pill">Model routing: Risk-aware</div>
        <div className="pill">Budgets: Enforced</div>
      </div>
    </div>
  );
};
