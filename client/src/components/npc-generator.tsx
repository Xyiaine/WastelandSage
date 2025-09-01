import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dice6, User, Skull, Plus, Trash2, EyeOff, Eye, Crown, Coins, Shield, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CreatorMode, NPCData } from "@/lib/types";
import type { ScenarioNPC } from "@shared/schema";

// Helper functions for NPC display
function getNPCIcon(role: string) {
  switch (role.toLowerCase()) {
    case 'leader':
    case 'chief':
    case 'boss':
      return <Crown className="h-4 w-4 text-brass-300" />;
    case 'trader':
    case 'merchant':
      return <Coins className="h-4 w-4 text-brass-300" />;
    case 'guard':
    case 'soldier':
    case 'warrior':
      return <Shield className="h-4 w-4 text-brass-300" />;
    case 'scavenger':
    case 'scrapper':
      return <Search className="h-4 w-4 text-brass-300" />;
    default:
      return <User className="h-4 w-4 text-brass-300" />;
  }
}

function getFactionColor(faction: string) {
  const factionColors: Record<string, string> = {
    'Les Blouses Blanches': 'text-blue-300',
    'Les Raffineurs': 'text-orange-300',
    'Les Forgerons d\'Acier': 'text-gray-300',
    'Les Gardiens de la Source': 'text-green-300',
    'Les Faiseurs de Rêves': 'text-purple-300',
    'Le Réacteur à Ciel Ouvert': 'text-yellow-300',
    'Les Fossoyeurs': 'text-red-300',
    'Les Arsenaux': 'text-red-400',
    'Le Paradis Perdu': 'text-emerald-300',
    'Les Fantômes d\'Acier': 'text-slate-300'
  };
  return factionColors[faction] || 'text-gray-400';
}

interface NPCGeneratorProps {
  creatorMode: CreatorMode;
  sessionId: string | null;
  scenarioId?: string | null;
}

export function NPCGenerator({ creatorMode, sessionId, scenarioId }: NPCGeneratorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [generatedNPCs, setGeneratedNPCs] = useState<NPCData[]>([]);

  // Query scenario NPCs if we have a scenario
  const { data: scenarioNPCs = [] } = useQuery<ScenarioNPC[]>({
    queryKey: ['/api/scenarios', scenarioId, 'npcs'],
    enabled: !!scenarioId
  });

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
        title: t('npcManager.npcGenerated'),
        description: t('npcManager.npcGeneratedDesc', { name: npc.name }),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('npcManager.generationFailed'),
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
        title: t('npcManager.npcAdded'),
        description: t('npcManager.npcAddedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('npcManager.additionFailed'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete scenario NPC mutation
  const deleteScenarioNPCMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/scenario-npcs/${id}`);
    },
    onSuccess: () => {
      if (scenarioId) {
        queryClient.invalidateQueries({ queryKey: ['/api/scenarios', scenarioId, 'npcs'] });
      }
      toast({
        title: t('npcManager.npcDeleted'),
        description: t('npcManager.npcDeletedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('npcManager.deletionFailed'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Suppress scenario NPC mutation
  const suppressScenarioNPCMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('PATCH', `/api/scenario-npcs/${id}/suppress`);
      return response.json();
    },
    onSuccess: (npc: ScenarioNPC) => {
      if (scenarioId) {
        queryClient.invalidateQueries({ queryKey: ['/api/scenarios', scenarioId, 'npcs'] });
      }
      toast({
        title: t('npcManager.npcSuppressed'),
        description: t('npcManager.npcSuppressedDesc', { name: npc.name }),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('npcManager.suppressionFailed'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Restore scenario NPC mutation
  const restoreScenarioNPCMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('PATCH', `/api/scenario-npcs/${id}/restore`);
      return response.json();
    },
    onSuccess: (npc: ScenarioNPC) => {
      if (scenarioId) {
        queryClient.invalidateQueries({ queryKey: ['/api/scenarios', scenarioId, 'npcs'] });
      }
      toast({
        title: t('npcManager.npcRestored'),
        description: t('npcManager.npcRestoredDesc', { name: npc.name }),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('npcManager.restorationFailed'),
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
      <h2 className="text-xl font-bold text-rust-400 mb-4">{t('npcManager.title')}</h2>
      
      <div className="space-y-3">
        {/* Scenario NPCs Section */}
        {scenarioNPCs.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-brass-400 mb-3">{t('npcManager.scenarioNPCs')}</h3>
            <div className="space-y-2">
              {scenarioNPCs.map((npc) => (
                <div 
                  key={npc.id}
                  className={`bg-steel-700 border border-steel-600 rounded-lg p-3 ${
                    npc.status === 'suppressed' ? 'opacity-50' : ''
                  }`}
                  data-testid={`scenario-npc-card-${npc.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-brass-400 rounded-full flex items-center justify-center">
                        {getNPCIcon(npc.role)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{npc.name}</div>
                        <div className="text-xs text-gray-400">{npc.role}</div>
                        {npc.faction && (
                          <div className={`text-xs ${getFactionColor(npc.faction)}`}>
                            {npc.faction}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      {npc.status === 'suppressed' ? (
                        <Button 
                          onClick={() => restoreScenarioNPCMutation.mutate(npc.id)}
                          disabled={restoreScenarioNPCMutation.isPending}
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-green-400 p-1"
                          title={t('npcManager.restore')}
                          data-testid={`button-restore-npc-${npc.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => suppressScenarioNPCMutation.mutate(npc.id)}
                          disabled={suppressScenarioNPCMutation.isPending}
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-yellow-400 p-1"
                          title={t('npcManager.suppress')}
                          data-testid={`button-suppress-npc-${npc.id}`}
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        onClick={() => deleteScenarioNPCMutation.mutate(npc.id)}
                        disabled={deleteScenarioNPCMutation.isPending}
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-red-400 p-1"
                        title={t('npcManager.delete')}
                        data-testid={`button-delete-npc-${npc.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {npc.description && (
                    <p className="text-xs text-gray-300 mt-2">{npc.description}</p>
                  )}
                  {npc.location && (
                    <div className="mt-2 text-xs">
                      <span className="text-gray-400">{t('npcManager.location')}: </span>
                      <span className="text-gray-300">{npc.location}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated NPCs Section */}
        <h3 className="text-sm font-semibold text-brass-400 mb-3">{t('npcManager.quickGeneration')}</h3>
        {generatedNPCs.length === 0 ? (
          <div className="text-center text-gray-400 py-4">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('npcManager.noNPCs')}</p>
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
                  <span className="text-gray-400">{t('npcManager.motivation')}: </span>
                  <span className="text-gray-300">{npc.properties.motivation}</span>
                </div>
              )}
              
              {npc.properties.equipment && npc.properties.equipment.length > 0 && (
                <div className="mt-1 text-xs">
                  <span className="text-gray-400">{t('npcManager.equipment')}: </span>
                  <span className="text-gray-300">{npc.properties.equipment.join(', ')}</span>
                </div>
              )}
              
              {npc.properties.secrets && npc.properties.secrets.length > 0 && (
                <div className="mt-1 text-xs">
                  <span className="text-gray-400">{t('npcManager.secrets')}: </span>
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
        {generateNPCMutation.isPending ? t('npcManager.generating') : t('npcManager.generateRandom')}
      </Button>
    </div>
  );
}
