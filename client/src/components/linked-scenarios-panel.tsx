
/**
 * Linked Scenarios Panel - Quick access to scenario content during sessions
 * 
 * This component provides game masters with instant access to:
 * - Linked scenario content and regions
 * - NPCs from active scenarios
 * - Quick scenario switching during gameplay
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight, 
  MapPin, 
  Users, 
  BookOpen,
  Eye,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface Region {
  id: string;
  name: string;
  type: string;
  description: string | null;
  controllingFaction: string | null;
  threatLevel: number;
}

interface ScenarioNPC {
  id: string;
  name: string;
  role: string;
  description: string | null;
  location: string | null;
  faction: string | null;
  importance: 'minor' | 'major' | 'critical';
}

interface Scenario {
  id: string;
  title: string;
  mainIdea: string;
  keyThemes: string[] | null;
  status: string;
}

interface LinkedScenariosPanelProps {
  sessionId: string;
}

export function LinkedScenariosPanel({ sessionId }: LinkedScenariosPanelProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [npcs, setNpcs] = useState<ScenarioNPC[]>([]);
  const [expandedScenarios, setExpandedScenarios] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [scenarioDataCache, setScenarioDataCache] = useState<Map<string, { regions: Region[]; npcs: ScenarioNPC[] }>>(new Map());

  // Fetch linked scenarios
  const fetchLinkedScenarios = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sessions/${sessionId}/scenarios`);
      if (response.ok) {
        const data = await response.json();
        setScenarios(data);
        
        // Auto-select first scenario if none selected
        if (data.length > 0 && !selectedScenario) {
          setSelectedScenario(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching linked scenarios:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch scenario details with proper data caching and race condition protection
  const fetchScenarioDetails = async (scenarioId: string, abortController?: AbortController) => {
    // Check if data is already cached
    if (scenarioDataCache.has(scenarioId)) {
      const cachedData = scenarioDataCache.get(scenarioId)!;
      setRegions(cachedData.regions);
      setNpcs(cachedData.npcs);
      setDetailsError(null);
      return;
    }

    setDetailsLoading(true);
    setDetailsError(null);

    try {
      // Fetch regions
      const regionsResponse = await fetch(`/api/scenarios/${scenarioId}/regions`, {
        signal: abortController?.signal
      });
      if (!regionsResponse.ok) {
        throw new Error(`Failed to fetch regions: ${regionsResponse.status}`);
      }
      const regionsData = await regionsResponse.json();

      // Fetch NPCs
      const npcsResponse = await fetch(`/api/scenarios/${scenarioId}/npcs`, {
        signal: abortController?.signal
      });
      if (!npcsResponse.ok) {
        throw new Error(`Failed to fetch NPCs: ${npcsResponse.status}`);
      }
      const npcsData = await npcsResponse.json();

      // Only update state if request wasn't aborted and scenario still selected
      if (!abortController?.signal.aborted && selectedScenario === scenarioId) {
        setRegions(regionsData);
        setNpcs(npcsData);
        
        // Cache the data only after both requests succeed
        setScenarioDataCache(prev => {
          const newCache = new Map(prev);
          newCache.set(scenarioId, { regions: regionsData, npcs: npcsData });
          return newCache;
        });
      }
    } catch (err) {
      if (!abortController?.signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setDetailsError(errorMessage);
        console.error('Error fetching scenario details:', err);
      }
    } finally {
      if (!abortController?.signal.aborted) {
        setDetailsLoading(false);
      }
    }
  };

  const toggleScenarioExpansion = (scenarioId: string) => {
    const newExpanded = new Set(expandedScenarios);
    if (newExpanded.has(scenarioId)) {
      newExpanded.delete(scenarioId);
    } else {
      newExpanded.add(scenarioId);
    }
    setExpandedScenarios(newExpanded);
  };

  useEffect(() => {
    if (sessionId) {
      // Clear cache when session changes to prevent stale data
      setScenarioDataCache(new Map());
      setRegions([]);
      setNpcs([]);
      setSelectedScenario(null);
      fetchLinkedScenarios();
    }
  }, [sessionId]);

  useEffect(() => {
    if (selectedScenario) {
      // Clear previous data immediately to prevent stale display
      setRegions([]);
      setNpcs([]);
      setDetailsError(null);
      
      const abortController = new AbortController();
      fetchScenarioDetails(selectedScenario, abortController);
      
      return () => {
        abortController.abort();
      };
    }
  }, [selectedScenario, scenarioDataCache]);


  if (scenarios.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-400" />
            Linked Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-slate-400">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No scenarios linked to this session</p>
            <p className="text-xs">Link scenarios for quick access to content</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-400" />
          Linked Scenarios ({scenarios.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {scenarios.map((scenario) => (
              <Collapsible key={scenario.id}>
                <CollapsibleTrigger
                  className="w-full"
                  onClick={() => toggleScenarioExpansion(scenario.id)}
                >
                  <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedScenario === scenario.id
                      ? 'bg-blue-500/20 border-blue-500/50'
                      : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      {expandedScenarios.has(scenario.id) ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                      <div className="text-left">
                        <h4 className="font-medium text-white text-sm">{scenario.title}</h4>
                        <Badge variant={scenario.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {scenario.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedScenario(scenario.id);
                        }}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/scenarios?id=${scenario.id}`, '_blank');
                        }}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  {expandedScenarios.has(scenario.id) && selectedScenario === scenario.id && (
                    <div className="ml-6 mt-2 space-y-3">
                      <p className="text-slate-300 text-sm">{scenario.mainIdea}</p>
                      
                      {/* Key Themes */}
                      {scenario.keyThemes && scenario.keyThemes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {scenario.keyThemes.slice(0, 3).map((theme) => (
                            <Badge key={theme} variant="outline" className="text-xs text-orange-300 border-orange-400">
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Loading state */}
                      {detailsLoading && (
                        <div className="text-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto text-blue-400" />
                          <p className="text-xs text-slate-400 mt-1">Loading scenario details...</p>
                        </div>
                      )}
                      
                      {/* Error state */}
                      {detailsError && (
                        <div className="text-center py-4 space-y-2">
                          <AlertCircle className="h-4 w-4 mx-auto text-red-400" />
                          <p className="text-xs text-red-400">{detailsError}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDetailsError(null);
                              fetchScenarioDetails(scenario.id);
                            }}
                            className="text-xs h-6 px-2 text-slate-400 hover:text-white"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        </div>
                      )}

                      {/* Content - only show when not loading and no error */}
                      {!detailsLoading && !detailsError && (
                        <div>
                          {/* Regions Quick List */}
                          {regions.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-white mb-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Regions ({regions.length})
                          </h5>
                          <div className="space-y-1">
                            {regions.slice(0, 3).map((region) => (
                              <div key={region.id} className="text-xs text-slate-300 flex items-center justify-between">
                                <span>{region.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  Threat {region.threatLevel}/5
                                </Badge>
                              </div>
                            ))}
                            {regions.length > 3 && (
                              <div className="text-xs text-slate-400">
                                +{regions.length - 3} more regions
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* NPCs Quick List */}
                      {npcs.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-white mb-1 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            NPCs ({npcs.length})
                          </h5>
                          <div className="space-y-1">
                            {npcs.filter(npc => npc.importance === 'critical' || npc.importance === 'major')
                                 .slice(0, 3).map((npc) => (
                              <div key={npc.id} className="text-xs text-slate-300 flex items-center justify-between">
                                <span>{npc.name}</span>
                                <Badge variant="outline" className={`text-xs ${
                                  npc.importance === 'critical' ? 'border-red-400 text-red-300' :
                                  npc.importance === 'major' ? 'border-orange-400 text-orange-300' :
                                  'border-gray-400 text-gray-300'
                                }`}>
                                  {npc.role}
                                </Badge>
                              </div>
                            ))}
                            {npcs.length > 3 && (
                              <div className="text-xs text-slate-400">
                                +{npcs.length - 3} more NPCs
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                        </div>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
