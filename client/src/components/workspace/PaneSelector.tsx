import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaneContentType } from "@/hooks/useWorkspaceState";
import { Columns3, Github, Code2, Globe, Square, HardDrive } from "lucide-react";

interface PaneSelectorProps {
  value: PaneContentType;
  onChange: (value: PaneContentType) => void;
  className?: string;
}

const PANE_OPTIONS: { value: PaneContentType; label: string; icon: React.ReactNode }[] = [
  { value: 'board', label: 'Board', icon: <Columns3 className="w-4 h-4" /> },
  { value: 'github', label: 'GitHub', icon: <Github className="w-4 h-4" /> },
  { value: 'editor', label: 'Editor', icon: <Code2 className="w-4 h-4" /> },
  { value: 'browser', label: 'Browser', icon: <Globe className="w-4 h-4" /> },
  { value: 'drive', label: 'Drive', icon: <HardDrive className="w-4 h-4" /> },
  { value: 'empty', label: 'Empty', icon: <Square className="w-4 h-4" /> },
];

export function PaneSelector({ value, onChange, className }: PaneSelectorProps) {
  const selectedOption = PANE_OPTIONS.find(opt => opt.value === value);

  return (
    <Select value={value} onValueChange={(v) => onChange(v as PaneContentType)}>
      <SelectTrigger className={`h-7 text-xs ${className || ''}`}>
        <div className="flex items-center gap-2">
          {selectedOption?.icon}
          <SelectValue placeholder="Select content" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {PANE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              {option.icon}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
