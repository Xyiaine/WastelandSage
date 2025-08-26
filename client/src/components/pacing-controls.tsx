import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FastForward, Rewind, AlertTriangle, CheckCircle } from "lucide-react";
import type { CreatorMode, TimelineEventData } from "@/lib/types";

interface PacingControlsProps {
  sessionId: string;
  creatorMode: CreatorMode;
}

export function PacingControls({ sessionId, creatorMode }: PacingControlsProps) {
  const { toast } = useToast();

  const addPacingEventMutation = useMutation({
    mutationFn: async (pacingType: 'accelerate' | 'slow' | 'tension' | 'resolve') => {
      const eventNames = {
        accelerate: 'Sudden Conflict',
        slow: 'Roleplay Moment', 
        tension: 'Rising Threat',
        resolve: 'Resolution Point'
      };

      const eventDescriptions = {
        accelerate: creatorMode === 'road' 
          ? 'Unexpected combat encounter or environmental hazard demands immediate action.'
          : 'Factional dispute erupts or emergency situation requires quick decisions.',
        slow: creatorMode === 'road'
          ? 'Opportunity for character interaction, planning, or investigation.'
          : 'Social gathering, trade negotiation, or information exchange.',
        tension: creatorMode === 'road'
          ? 'Resources run low, equipment fails, or pursuit intensifies.'
          : 'Political pressure mounts, betrayal hints surface, or deadlines loom.',
        resolve: creatorMode === 'road'
          ? 'Chase concludes, conflict resolution, or safe haven reached.'
          : 'Diplomatic solution found, alliance formed, or justice served.'
      };

      const response = await apiRequest('POST', '/api/timeline-events', {
        sessionId,
        name: eventNames[pacingType],
        description: eventDescriptions[pacingType],
        phase: 'exploration', // Default phase, can be updated
        duration: pacingType === 'slow' ? 20 : pacingType === 'resolve' ? 15 : 25,
        orderIndex: Date.now(), // Temporary, will be reordered
        creatorMode,
        isCompleted: 'false'
      });
      
      return response.json();
    },
    onSuccess: (event: TimelineEventData) => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'timeline'] });
      toast({
        title: "Pacing Event Added",
        description: `${event.name} has been added to the timeline.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Event",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const pacingButtons = [
    {
      action: 'accelerate' as const,
      label: 'Accelerate',
      description: 'Add conflict',
      icon: FastForward,
      color: 'rust',
      testId: 'button-accelerate'
    },
    {
      action: 'slow' as const,
      label: 'Slow Down', 
      description: 'Add roleplay',
      icon: Rewind,
      color: 'brass',
      testId: 'button-slow-down'
    },
    {
      action: 'tension' as const,
      label: 'Add Tension',
      description: 'Inject conflict',
      icon: AlertTriangle,
      color: 'red',
      testId: 'button-add-tension'
    },
    {
      action: 'resolve' as const,
      label: 'Resolve',
      description: 'Tie up loose ends',
      icon: CheckCircle,
      color: 'toxic',
      testId: 'button-resolve'
    }
  ];

  return (
    <div className="metal-panel rounded-lg p-6">
      <h2 className="text-xl font-bold text-rust-400 mb-4">Pacing Controls</h2>
      
      <div className="grid grid-cols-2 gap-3">
        {pacingButtons.map((button) => {
          const Icon = button.icon;
          return (
            <Button
              key={button.action}
              onClick={() => addPacingEventMutation.mutate(button.action)}
              disabled={addPacingEventMutation.isPending}
              className={`industrial-button p-4 rounded-lg text-center hover:border-${button.color}-400 group flex-col h-auto`}
              data-testid={button.testId}
            >
              <Icon className={`text-${button.color}-400 text-xl mb-2 group-hover:text-${button.color}-300 h-6 w-6`} />
              <div className="text-sm font-medium">{button.label}</div>
              <div className="text-xs text-gray-400">{button.description}</div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
