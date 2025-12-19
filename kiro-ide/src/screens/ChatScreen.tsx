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
export const ChatScreen = () => {
  return (
    <div className="section-card">
      <h2>AI PM Chat</h2>
      <p>Issue commands, manage governance, and delegate tasks in real time.</p>
      <div className="section-list">
        <div className="pill">"Switch to collaborative mode"</div>
        <div className="pill">"Create roadmap task for auth"</div>
        <div className="pill">"Show MCP server status"</div>
      </div>
    </div>
  );
};
