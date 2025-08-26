import { CheckCircle, Play, Circle } from "lucide-react";
import type { SessionData } from "@/lib/types";

interface SessionBuilderProps {
  session: SessionData;
  onSessionUpdate: (updates: Partial<SessionData>) => void;
}

const phases = [
  { name: 'Hook', duration: 15, icon: CheckCircle },
  { name: 'Exploration', duration: 45, icon: Play },
  { name: 'Rising Tension', duration: 30, icon: Circle },
  { name: 'Climax', duration: 45, icon: Circle },
  { name: 'Resolution', duration: 25, icon: Circle }
];

export function SessionBuilder({ session, onSessionUpdate }: SessionBuilderProps) {
  const handlePhaseClick = (phaseIndex: number) => {
    onSessionUpdate({ currentPhase: phaseIndex });
  };

  return (
    <div className="metal-panel rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-rust-400">Session Builder</h2>
        <div className="text-sm text-gray-400 font-mono">
          Phase {session.currentPhase + 1}/5
        </div>
      </div>
      
      <div className="space-y-3">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          const isCompleted = index < session.currentPhase;
          const isCurrent = index === session.currentPhase;
          const isPending = index > session.currentPhase;
          
          return (
            <button
              key={phase.name}
              onClick={() => handlePhaseClick(index)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border-l-4 transition-all ${
                isCompleted
                  ? 'bg-steel-700 border-toxic-400'
                  : isCurrent
                  ? 'bg-rust-500 border-rust-400 rust-glow'
                  : 'bg-steel-600 border-gray-400 hover:bg-steel-500'
              }`}
              data-testid={`button-phase-${phase.name.toLowerCase().replace(' ', '-')}`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`h-5 w-5 ${
                  isCompleted
                    ? 'text-toxic-400'
                    : isCurrent
                    ? 'text-white'
                    : 'text-gray-400'
                }`} />
                <span className={`font-medium ${
                  isCurrent ? 'text-white' : 'text-gray-300'
                }`}>
                  {phase.name}
                </span>
              </div>
              <span className={`text-xs font-mono ${
                isCurrent ? 'text-gray-200' : 'text-gray-400'
              }`}>
                {phase.duration}min
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
