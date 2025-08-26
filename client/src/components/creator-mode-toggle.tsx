import { Button } from "@/components/ui/button";
import { Construction, Building2 } from "lucide-react";
import type { CreatorMode } from "@/lib/types";

interface CreatorModeToggleProps {
  currentMode: CreatorMode;
  onModeChange: (mode: CreatorMode) => void;
}

export function CreatorModeToggle({ currentMode, onModeChange }: CreatorModeToggleProps) {
  return (
    <div className="bg-steel-700 p-1 rounded-lg flex">
      <Button
        onClick={() => onModeChange('road')}
        className={`px-6 py-3 rounded-md font-medium transition-all ${
          currentMode === 'road'
            ? 'bg-rust-500 text-white rust-glow'
            : 'text-gray-400 hover:text-white bg-transparent border-none'
        }`}
        data-testid="button-road-mode"
      >
        <Construction className="mr-2 h-4 w-4" />
        On the Road
      </Button>
      <Button
        onClick={() => onModeChange('city')}
        className={`px-6 py-3 rounded-md font-medium transition-all ${
          currentMode === 'city'
            ? 'bg-brass-500 text-steel-800 brass-glow'
            : 'text-gray-400 hover:text-white bg-transparent border-none'
        }`}
        data-testid="button-city-mode"
      >
        <Building2 className="mr-2 h-4 w-4" />
        City / Camp
      </Button>
    </div>
  );
}
