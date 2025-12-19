import { ReactNode } from "react";

export type TabKey = "projects" | "chat" | "agents" | "settings";

export type TabItem = {
  key: TabKey;
  label: string;
  icon: ReactNode;
};

type TabBarProps = {
  items: TabItem[];
  active: TabKey;
  onChange: (key: TabKey) => void;
};

export const TabBar = ({ items, active, onChange }: TabBarProps) => {
  return (
    <nav className="tab-bar" aria-label="Primary">
      <ul>
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className={`tab-button${active === item.key ? " active" : ""}`}
              onClick={() => onChange(item.key)}
            >
              <span className="tab-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
