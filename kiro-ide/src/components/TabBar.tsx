import { ReactNode, memo, useCallback } from "react";

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

const TabBarComponent = ({ items, active, onChange }: TabBarProps): JSX.Element => {
  const handleChange = useCallback(
    (key: TabKey) => {
      onChange(key);
    },
    [onChange]
  );

  return (
    <nav className="tab-bar" aria-label="Primary">
      <ul>
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              className={`tab-button${active === item.key ? " active" : ""}`}
              onClick={() => handleChange(item.key)}
              aria-pressed={active === item.key}
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

export const TabBar = memo(TabBarComponent);
