import { memo } from "react";
import { SectionCard } from "../components/SectionCard";

const projectHighlights = [
  "Active: Hero IDE Web",
  "Next: Import GitHub repo",
  "Governance: Collaborative mode"
];

const ProjectsScreenComponent = (): JSX.Element => {
  return (
    <SectionCard
      title="Projects"
      description="Keep every workspace scoped, governed, and ready for rapid execution."
    >
      <div className="section-list">
        {projectHighlights.map((item) => (
          <div className="pill" key={item}>
            {item}
          </div>
        ))}
      </div>
    </SectionCard>
  );
};

export const ProjectsScreen = memo(ProjectsScreenComponent);
