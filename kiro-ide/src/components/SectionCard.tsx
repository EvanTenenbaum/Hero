import { ReactNode, memo } from "react";

type SectionCardProps = {
  title: string;
  description: string;
  footer?: ReactNode;
  children?: ReactNode;
};

const SectionCardComponent = ({
  title,
  description,
  footer,
  children
}: SectionCardProps): JSX.Element => {
  return (
    <section className="section-card">
      <div className="section-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
      {footer ? <div className="section-footer">{footer}</div> : null}
    </section>
  );
};

export const SectionCard = memo(SectionCardComponent);
