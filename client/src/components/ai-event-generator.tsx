import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Bot } from "lucide-react";
import type { CreatorMode, AiMode, NodeData, TimelineEventData, GeneratedEventData } from "@/lib/types";

interface AiEventGeneratorProps {
  sessionId: string;
  creatorMode: CreatorMode;
  aiMode: AiMode;
  nodes: NodeData[];
  timelineEvents: TimelineEventData[];
}

export function AiEventGenerator({ 
  sessionId, 
  creatorMode, 
  aiMode: initialAiMode, 
  nodes, 
  timelineEvents 
}: AiEventGeneratorProps) {
  const { toast } = useToast();
  const [aiMode, setAiMode] = useState<AiMode>(initialAiMode);
  const [useNodeGraph, setUseNodeGraph] = useState(true);
  const [useTimeline, setUseTimeline] = useState(true);
  const [generatedEvent, setGeneratedEvent] = useState<GeneratedEventData | null>(null);

  const generateEventMutation = useMutation({
    mutationFn: async () => {
      const recentEvents = useTimeline 
        ? timelineEvents
            .slice(-3)
            .map(event => ({
              name: event.name,
              description: event.description || '',
              phase: event.phase
            }))
        : [];

      const connectedNodes = useNodeGraph
        ? nodes
            .slice(-5)
            .map(node => ({
              type: node.type,
              name: node.name,
              description: node.description || ''
            }))
        : [];

      const response = await apiRequest('POST', '/api/generate-event', {
        sessionId,
        creatorMode,
        currentPhase: 'exploration', // TODO: Get from session
        aiMode,
        recentEvents,
        connectedNodes,
        environment: creatorMode === 'road' ? 'wasteland' : 'settlement',
        threatLevel: 'medium'
      });
      
      return response.json();
    },
    onSuccess: (event: GeneratedEventData) => {
      setGeneratedEvent(event);
      toast({
        title: "Event Generated",
        description: `AI has created: ${event.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const applyEventMutation = useMutation({
    mutationFn: async () => {
      if (!generatedEvent) throw new Error('No event to apply');

      // Create timeline event
      const response = await apiRequest('POST', '/api/timeline-events', {
        sessionId,
        name: generatedEvent.name,
        description: generatedEvent.description,
        phase: 'exploration',
        duration: generatedEvent.estimatedDuration,
        orderIndex: Date.now(),
        creatorMode,
        isCompleted: 'false'
      });

      // Create suggested nodes
      for (const suggestedNode of generatedEvent.suggestedNodes) {
        await apiRequest('POST', '/api/nodes', {
          sessionId,
          type: suggestedNode.type,
          name: suggestedNode.name,
          description: suggestedNode.description,
          properties: suggestedNode.properties,
          x: Math.random() * 400,
          y: Math.random() * 350
        });
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'timeline'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'nodes'] });
      setGeneratedEvent(null);
      toast({
        title: "Event Applied",
        description: "Event and suggested nodes have been added to your session.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Apply Event",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <div className="metal-panel rounded-lg p-6">
      <h2 className="text-xl font-bold text-rust-400 mb-4">AI Event Generator</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Generation Mode</label>
          <Select value={aiMode} onValueChange={(value: AiMode) => setAiMode(value)}>
            <SelectTrigger className="w-full bg-steel-700 border-steel-500" data-testid="select-ai-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chaos">Chaos Mode (Mad Max)</SelectItem>
              <SelectItem value="continuity">Continuity Mode (Fallout)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Context Awareness</label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <Checkbox 
                checked={useNodeGraph}
                onCheckedChange={(checked) => setUseNodeGraph(!!checked)}
                className="border-steel-500 bg-steel-700 data-[state=checked]:bg-rust-400"
                data-testid="checkbox-use-nodes"
              />
              <span className="text-sm">Use Node Graph</span>
            </label>
            <label className="flex items-center space-x-2">
              <Checkbox 
                checked={useTimeline}
                onCheckedChange={(checked) => setUseTimeline(!!checked)}
                className="border-steel-500 bg-steel-700 data-[state=checked]:bg-rust-400"
                data-testid="checkbox-use-timeline"
              />
              <span className="text-sm">Use Timeline</span>
            </label>
          </div>
        </div>
        
        <Button 
          onClick={() => generateEventMutation.mutate()}
          disabled={generateEventMutation.isPending}
          className="w-full industrial-button py-3 rounded-lg font-medium hover:border-rust-400"
          data-testid="button-generate-event"
        >
          <Wand2 className="mr-2 h-4 w-4 text-rust-400" />
          {generateEventMutation.isPending ? 'Generating...' : 'Generate Event'}
        </Button>
        
        {/* Generated Event Display */}
        {generatedEvent && (
          <div className="bg-steel-700 border border-steel-500 rounded-lg p-4 text-sm">
            <div className="flex items-start space-x-3">
              <Bot className="text-rust-400 mt-1 h-5 w-5" />
              <div className="flex-1">
                <p className="font-medium mb-1">Generated Event:</p>
                <h4 className="font-bold text-rust-400 mb-2">{generatedEvent.name}</h4>
                <p className="text-gray-300 mb-3">{generatedEvent.description}</p>
                
                {generatedEvent.suggestedNodes.length > 0 && (
                  <div className="mb-3">
                    <p className="font-medium mb-1 text-xs text-gray-400">Suggested Nodes:</p>
                    <div className="flex flex-wrap gap-1">
                      {generatedEvent.suggestedNodes.map((node, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-steel-600 rounded text-xs"
                        >
                          {node.type}: {node.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Duration: {generatedEvent.estimatedDuration}min
                  </span>
                  <Button
                    onClick={() => applyEventMutation.mutate()}
                    disabled={applyEventMutation.isPending}
                    size="sm"
                    className="btn-rust"
                    data-testid="button-apply-event"
                  >
                    {applyEventMutation.isPending ? 'Applying...' : 'Apply Event'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
