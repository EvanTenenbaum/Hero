import { memo } from "react";
import { SectionCard } from "../components/SectionCard";

const agentStatuses = [
  "Planner · 2 tasks queued",
  "Validator · Awaiting approval",
  "Builder · Budget safe"
];

const AgentsScreenComponent = (): JSX.Element => {
  return (
    <SectionCard
      title="Agents"
      description="Track active agents with clarity on budgets, risks, and checkpoints."
    >
      <div className="section-list">
        {agentStatuses.map((item) => (
          <div className="pill" key={item}>
            {item}
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

export const AgentsScreen = memo(AgentsScreenComponent);
