import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dice6, User, Skull, Plus } from "lucide-react";
import type { CreatorMode, NPCData } from "@/lib/types";

interface NPCGeneratorProps {
  creatorMode: CreatorMode;
  sessionId: string | null;
}

export function NPCGenerator({ creatorMode, sessionId }: NPCGeneratorProps) {
  const { toast } = useToast();
  const [generatedNPCs, setGeneratedNPCs] = useState<NPCData[]>([]);

  const generateNPCMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/generate-npc', {
        setting: creatorMode,
        faction: undefined,
        role: undefined
      });
      return response.json();
    },
    onSuccess: (npc: NPCData) => {
      setGeneratedNPCs(prev => [npc, ...prev.slice(0, 2)]); // Keep last 3 NPCs
      toast({
        title: "NPC Generated",
        description: `${npc.name} has been created.`,
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

  const addNPCToSessionMutation = useMutation({
    mutationFn: async (npc: NPCData) => {
      if (!sessionId) throw new Error('No active session');
      
      const response = await apiRequest('POST', '/api/nodes', {
        sessionId,
        type: 'npc',
        name: npc.name,
        description: npc.description,
        properties: npc.properties,
        x: Math.random() * 400,
        y: Math.random() * 350
      });
      return response.json();
    },
    onSuccess: (node) => {
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'nodes'] });
      }
      toast({
        title: "NPC Added",
        description: "NPC has been added to your scenario library.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add NPC",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getFactionColor = (faction: string) => {
    if (faction.toLowerCase().includes('vulture')) return 'text-red-400';
    if (faction.toLowerCase().includes('trader') || faction.toLowerCase().includes('merchant')) return 'text-brass-400';
    if (faction.toLowerCase().includes('raider')) return 'text-rust-400';
    return 'text-gray-400';
  };

  const getNPCIcon = (type: string) => {
    if (type.toLowerCase().includes('raider') || type.toLowerCase().includes('warlord')) {
      return <Skull className="text-red-500 text-sm h-4 w-4" />;
    }
    return <User className="text-brass-400 text-sm h-4 w-4" />;
  };

  return (
    <div className="metal-panel rounded-lg p-6">
      <h2 className="text-xl font-bold text-rust-400 mb-4">Quick NPCs</h2>
      
      <div className="space-y-3">
        {generatedNPCs.length === 0 ? (
          <div className="text-center text-gray-400 py-4">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No NPCs generated yet.</p>
          </div>
        ) : (
          generatedNPCs.map((npc, index) => (
            <div 
              key={`${npc.name}-${index}`}
              className="bg-steel-700 border border-steel-600 rounded-lg p-3"
              data-testid={`npc-card-${index}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-brass-400 rounded-full flex items-center justify-center">
                    {getNPCIcon(npc.type)}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{npc.name}</div>
                    <div className="text-xs text-gray-400">{npc.type}</div>
                    {npc.properties.faction && npc.properties.faction !== 'independent' && (
                      <div className={`text-xs ${getFactionColor(npc.properties.faction)}`}>
                        {npc.properties.faction}
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={() => addNPCToSessionMutation.mutate(npc)}
                  disabled={!sessionId || addNPCToSessionMutation.isPending}
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-white p-1"
                  data-testid={`button-add-npc-${index}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-300 mt-2">{npc.description}</p>
              
              {npc.properties.motivation && (
                <div className="mt-2 text-xs">
                  <span className="text-gray-400">Motivation: </span>
                  <span className="text-gray-300">{npc.properties.motivation}</span>
                </div>
              )}
              
              {npc.properties.equipment && npc.properties.equipment.length > 0 && (
                <div className="mt-1 text-xs">
                  <span className="text-gray-400">Equipment: </span>
                  <span className="text-gray-300">{npc.properties.equipment.join(', ')}</span>
                </div>
              )}
              
              {npc.properties.secrets && npc.properties.secrets.length > 0 && (
                <div className="mt-1 text-xs">
                  <span className="text-gray-400">Secrets: </span>
                  <span className="text-gray-300">{npc.properties.secrets.join(', ')}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <Button 
        onClick={() => generateNPCMutation.mutate()}
        disabled={generateNPCMutation.isPending}
        className="w-full industrial-button py-2 rounded-lg text-sm mt-4"
        data-testid="button-generate-npc"
      >
        <Dice6 className="mr-2 h-4 w-4" />
        {generateNPCMutation.isPending ? 'Generating...' : 'Generate Random NPC'}
      </Button>
    </div>
  );
}
