import { BLANK_DRAFT_STARTER_OPTIONS } from '../../data/classBlockPresets';

export interface WorkbenchBlankStartersProps {
  readonly onSelectStarter: (starterId: string) => void;
}

export function WorkbenchBlankStarters({ onSelectStarter }: WorkbenchBlankStartersProps) {
  return (
    <div
      className="workbench-blank-starters"
      role="group"
      aria-label="빈 초안 빠른 시작"
    >
      {BLANK_DRAFT_STARTER_OPTIONS.slice(0, 4).map((starter) => (
        <button
          key={starter.id}
          type="button"
          className="workbench-blank-starter-chip"
          onClick={() => onSelectStarter(starter.id)}
          title={starter.descriptionKo}
        >
          <span>{starter.titleKo}</span>
        </button>
      ))}
    </div>
  );
}
