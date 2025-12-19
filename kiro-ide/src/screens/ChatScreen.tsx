import { memo } from "react";
import { SectionCard } from "../components/SectionCard";

const commandExamples = [
  "\"Switch to collaborative mode\"",
  "\"Create roadmap task for auth\"",
  "\"Show MCP server status\""
];

const ChatScreenComponent = (): JSX.Element => {
  return (
    <SectionCard
      title="AI PM Chat"
      description="Issue commands, manage governance, and delegate tasks in real time."
    >
      <div className="section-list">
        {commandExamples.map((item) => (
          <div className="pill" key={item}>
            {item}
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

export const ChatScreen = memo(ChatScreenComponent);
