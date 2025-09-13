
/**
 * Mediterranean Map Component - Interactive scenario visualization
 * 
 * This component provides:
 * - Interactive map of the Mediterranean Sea
 * - Clickable city markers for each region
 * - Detailed information panels for cities
 * - Political status, NPCs, quests, and resources display
 * - Real-time updates from scenario data
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  MapPin, 
  Users, 
  Shield, 
  Coins, 
  AlertTriangle, 
  Crown,
  Zap,
  Target,
  X,
  Navigation,
  Info
} from 'lucide-react';

// Types
interface Region {
  id: string;
  scenarioId: string | null;
  name: string;
  type: 'city' | 'settlement' | 'wasteland' | 'fortress' | 'trade_hub' | 'industrial';
  description: string | null;
  controllingFaction: string | null;
  population: number | null;
  resources: string[] | null;
  threatLevel: number;
  politicalStance: 'hostile' | 'neutral' | 'friendly' | 'allied' | null;
  tradeRoutes: string[] | null;
  createdAt: Date;
}

interface ScenarioNPC {
  id: string;
  scenarioId: string;
  name: string;
  role: string;
  description: string;
  location: string | null;
  faction: string | null;
  importance: 'minor' | 'major' | 'critical';
  status: 'alive' | 'dead' | 'missing' | 'unknown';
}

interface ScenarioQuest {
  id: string;
  scenarioId: string;
  title: string;
  description: string;
  status: 'not_started' | 'active' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  rewards: string | null;
  requirements: string | null;
}

interface CityPosition {
  x: number; // Percentage from left
  y: number; // Percentage from top
  regionId: string;
}

interface MediterraneanMapProps {
  currentScenario: any;
  regions: Region[];
  onRegionUpdate?: (regionId: string) => void;
}

// Generate city positions dynamically based on region names
const generateCityPositions = (regions: Region[]): CityPosition[] => {
  const positionMap: { [key: string]: { x: number; y: number } } = {
    'Cité Médicale': { x: 25, y: 45 },
    'Cité du Carburant': { x: 35, y: 55 },
    'Cité Industrielle': { x: 45, y: 40 },
    'Cité de l\'Eau & Alimentation': { x: 30, y: 35 },
    'Cité du Divertissement': { x: 55, y: 60 },
    'Nuke City': { x: 20, y: 25 },
    'Cité des Métaux & Recyclage': { x: 40, y: 65 },
    'Cité de l\'Armement & Défense': { x: 60, y: 40 },
    'L\'Île des Anciens': { x: 70, y: 50 },
    'Bunker Oméga': { x: 50, y: 30 },
  };

  // Create positions based on actual regions, with fallback positions for unknown cities
  return regions.map((region, index) => {
    const knownPosition = positionMap[region.name];
    if (knownPosition) {
      return { ...knownPosition, regionId: region.id };
    }
    // Generate fallback positions in a circle for unknown regions
    const angle = (index * 2 * Math.PI) / regions.length;
    const radius = 25;
    const centerX = 50;
    const centerY = 50;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      regionId: region.id
    };
  });
};

const POLITICAL_STANCE_COLORS = {
  hostile: 'bg-red-500',
  neutral: 'bg-gray-500',
  friendly: 'bg-green-500',
  allied: 'bg-blue-500'
};

const THREAT_LEVEL_COLORS = {
  1: 'bg-green-400',
  2: 'bg-yellow-400',
  3: 'bg-orange-400',
  4: 'bg-red-400',
  5: 'bg-red-600'
};

export function MediterraneanMap({ currentScenario, regions, onRegionUpdate }: MediterraneanMapProps) {
  const [selectedCity, setSelectedCity] = useState<Region | null>(null);
  const [cityNPCs, setCityNPCs] = useState<ScenarioNPC[]>([]);
  const [cityQuests, setCityQuests] = useState<ScenarioQuest[]>([]);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Fetch city-specific data when a city is selected
  const fetchCityData = useCallback(async (region: Region) => {
    if (!currentScenario) return;

    try {
      setLoading(true);

      // Fetch NPCs for this city
      const npcsResponse = await fetch(`/api/scenarios/${currentScenario.id}/npcs`);
      if (npcsResponse.ok) {
        const allNPCs = await npcsResponse.json();
        const regionNPCs = allNPCs.filter((npc: ScenarioNPC) => 
          npc.location === region.name || npc.location === region.id
        );
        setCityNPCs(regionNPCs);
      }

      // Fetch quests for this city (you might want to implement location-based quests)
      const questsResponse = await fetch(`/api/scenarios/${currentScenario.id}/quests`);
      if (questsResponse.ok) {
        const allQuests = await questsResponse.json();
        // For now, show all quests - you can implement location filtering later
        setCityQuests(allQuests);
      }

    } catch (error) {
      console.error('Error fetching city data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentScenario]);

  const handleCityClick = useCallback((region: Region) => {
    setSelectedCity(region);
    fetchCityData(region);
  }, [fetchCityData]);

  // Generate city positions dynamically based on current regions
  const cityPositions = React.useMemo(() => generateCityPositions(regions), [regions]);

  const positionsById = useMemo(() => {
    const map: Record<string, CityPosition> = {};
    cityPositions.forEach(pos => {
      map[pos.regionId] = pos;
    });
    return map;
  }, [cityPositions]);

  const getCityPosition = useCallback((regionId: string): CityPosition | undefined => {
    return positionsById[regionId];
  }, [positionsById]);

  const getPoliticalStanceIcon = useCallback((stance: string | null) => {
    switch (stance) {
      case 'hostile': return <AlertTriangle className="h-3 w-3" />;
      case 'allied': return <Shield className="h-3 w-3" />;
      case 'friendly': return <Users className="h-3 w-3" />;
      default: return <Navigation className="h-3 w-3" />;
    }
  }, []);

  return (
    <div className="w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      <div className="flex h-full">
        {/* Map Area */}
        <div className="flex-1 relative">
          <div 
            ref={mapRef}
            className="w-full h-full relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 overflow-hidden"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 30%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, rgba(234, 179, 8, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.2) 0%, transparent 70%)
              `
            }}
          >
            {/* Mediterranean Sea Background */}
            <div className="absolute inset-0 opacity-30">
              <svg viewBox="0 0 100 100" className="w-full h-full" role="img" aria-label="Mediterranean Sea coastline with islands">
                {/* Simple Mediterranean coastline */}
                <path
                  d="M5,60 Q15,45 25,50 Q35,40 45,45 Q55,35 65,40 Q75,45 85,50 Q90,55 85,65 Q75,70 65,65 Q55,75 45,70 Q35,80 25,75 Q15,70 5,60 Z"
                  fill="rgba(34, 197, 94, 0.2)"
                  stroke="rgba(34, 197, 94, 0.4)"
                  strokeWidth="0.5"
                />
                {/* Islands */}
                <circle cx="70" cy="50" r="3" fill="rgba(34, 197, 94, 0.3)" />
                <circle cx="25" cy="65" r="2" fill="rgba(34, 197, 94, 0.3)" />
              </svg>
            </div>

            {/* City Markers */}
            {regions.map((region) => {
              const position = getCityPosition(region.id);
              if (!position) {
                console.warn(`No position found for region: ${region.name} (${region.id})`);
                return null;
              }

              const isSelected = selectedCity?.id === region.id;
              const stanceColor = region.politicalStance ? POLITICAL_STANCE_COLORS[region.politicalStance] : 'bg-gray-500';
              const threatColor = THREAT_LEVEL_COLORS[region.threatLevel as keyof typeof THREAT_LEVEL_COLORS] || 'bg-gray-400';

              return (
                <div
                  key={region.id}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-400 focus-visible:ring-offset-2 focus-visible:rounded-full ${
                    isSelected ? 'scale-125 z-20' : 'hover:scale-125 focus:scale-125 z-10'
                  }`}
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Clicked on city:', region.name);
                    handleCityClick(region);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCityClick(region);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${region.name} - ${region.type} (${region.politicalStance || 'neutral'} stance, threat level ${region.threatLevel})`}
                >
                  {/* City Marker */}
                  <div className="relative">
                    {/* Threat Level Ring - More visible */}
                    <div className={`w-12 h-12 rounded-full ${threatColor} opacity-40 absolute -inset-2 animate-pulse`} />
                    
                    {/* Political Stance Marker - Larger and more prominent */}
                    <div className={`w-8 h-8 rounded-full ${stanceColor} border-3 border-white flex items-center justify-center text-white shadow-xl hover:shadow-2xl`}>
                      {getPoliticalStanceIcon(region.politicalStance)}
                    </div>

                    {/* Always visible city name on hover */}
                    <div className="absolute top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="bg-slate-900 text-white text-sm px-3 py-1 rounded-lg whitespace-nowrap shadow-xl border border-slate-500">
                        <div className="font-semibold">{region.name}</div>
                        <div className="text-xs text-slate-300">{region.type.replace('_', ' ')}</div>
                      </div>
                      {/* Arrow pointing to city */}
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-t border-slate-500"></div>
                    </div>

                    {/* Crisis Indicator - More prominent */}
                    {region.description?.includes('CRISIS') && (
                      <div className="absolute -top-1 -right-1 z-10">
                        <div className="w-4 h-4 bg-red-500 rounded-full animate-ping" />
                        <div className="absolute inset-0 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                          <AlertTriangle className="h-2 w-2 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute -inset-3 border-2 border-orange-400 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 border border-slate-600">
              <h4 className="text-white font-semibold mb-2 text-sm">Map Legend</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-slate-300">Hostile</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-slate-300">Allied</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-slate-300">Friendly</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full" />
                  <span className="text-slate-300">Neutral</span>
                </div>
              </div>
            </div>

            {/* Instructions and Debug Info */}
            {!selectedCity && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 border border-slate-600">
                <div className="flex items-center gap-2 text-slate-300 text-sm mb-2">
                  <Info className="h-4 w-4" />
                  Click on any city to view detailed information
                </div>
                <div className="text-xs text-slate-400">
                  Found {regions.length} cities on the map
                </div>
              </div>
            )}

            {/* Debug: Show all region positions */}
            {process.env.NODE_ENV === 'development' && (
              <div className="absolute top-20 left-4 bg-slate-800/80 p-2 rounded text-xs text-white max-w-xs">
                <div className="font-semibold mb-1">Debug - City Positions:</div>
                {regions.slice(0, 3).map((region) => {
                  const pos = getCityPosition(region.id);
                  return (
                    <div key={region.id} className="text-slate-300">
                      {region.name}: {pos ? `${pos.x}%, ${pos.y}%` : 'No position'}
                    </div>
                  );
                })}
                {regions.length > 3 && (
                  <div className="text-slate-400">... and {regions.length - 3} more</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* City Information Panel */}
        {selectedCity && (
          <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-hidden">
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedCity.name}</h3>
                    <p className="text-sm text-slate-400 capitalize">{selectedCity.type.replace('_', ' ')}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedCity(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedCity.politicalStance && (
                    <Badge variant="outline" className={`${
                      selectedCity.politicalStance === 'hostile' ? 'border-red-400 text-red-300' :
                      selectedCity.politicalStance === 'allied' ? 'border-blue-400 text-blue-300' :
                      selectedCity.politicalStance === 'friendly' ? 'border-green-400 text-green-300' :
                      'border-gray-400 text-gray-300'
                    }`}>
                      {selectedCity.politicalStance}
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-orange-400 text-orange-300">
                    Threat {selectedCity.threatLevel}/5
                  </Badge>
                  {selectedCity.population && (
                    <Badge variant="outline" className="border-blue-400 text-blue-300">
                      {selectedCity.population.toLocaleString()} people
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content Tabs */}
              <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="overview" className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
                    <TabsTrigger value="overview">Info</TabsTrigger>
                    <TabsTrigger value="npcs">NPCs ({cityNPCs.length})</TabsTrigger>
                    <TabsTrigger value="quests">Quests ({cityQuests.length})</TabsTrigger>
                    <TabsTrigger value="resources">Resources</TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-hidden">
                    <TabsContent value="overview" className="h-full p-4">
                      <ScrollArea className="h-full">
                        <div className="space-y-4">
                          {/* Description */}
                          {selectedCity.description && (
                            <div>
                              <h4 className="font-semibold text-white mb-2">Current Situation</h4>
                              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {selectedCity.description}
                              </p>
                            </div>
                          )}

                          {/* Faction Control */}
                          {selectedCity.controllingFaction && (
                            <div>
                              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                <Crown className="h-4 w-4" />
                                Controlling Faction
                              </h4>
                              <Badge variant="outline" className="text-yellow-300 border-yellow-400">
                                {selectedCity.controllingFaction}
                              </Badge>
                            </div>
                          )}

                          {/* Trade Routes */}
                          {selectedCity.tradeRoutes && selectedCity.tradeRoutes.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                <Navigation className="h-4 w-4" />
                                Trade Routes
                              </h4>
                              <div className="space-y-1">
                                {selectedCity.tradeRoutes.map((route, index) => (
                                  <div key={index} className="text-sm text-slate-300 flex items-center gap-2">
                                    <MapPin className="h-3 w-3" />
                                    {route}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="npcs" className="h-full p-4">
                      <ScrollArea className="h-full">
                        {loading ? (
                          <div className="text-center py-8 text-slate-400">Loading NPCs...</div>
                        ) : cityNPCs.length > 0 ? (
                          <div className="space-y-3">
                            {cityNPCs.map((npc) => (
                              <Card key={npc.id} className="bg-slate-700/50 border-slate-600">
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium text-white">{npc.name}</h5>
                                    <Badge variant="outline" className={`text-xs ${
                                      npc.importance === 'critical' ? 'border-red-400 text-red-300' :
                                      npc.importance === 'major' ? 'border-orange-400 text-orange-300' :
                                      'border-green-400 text-green-300'
                                    }`}>
                                      {npc.importance}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-400 mb-2">{npc.role}</p>
                                  {npc.description && (
                                    <p className="text-xs text-slate-300 line-clamp-3">{npc.description}</p>
                                  )}
                                  {npc.faction && (
                                    <Badge variant="secondary" className="mt-2 text-xs">
                                      {npc.faction}
                                    </Badge>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No NPCs found in this city</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="quests" className="h-full p-4">
                      <ScrollArea className="h-full">
                        {loading ? (
                          <div className="text-center py-8 text-slate-400">Loading quests...</div>
                        ) : cityQuests.length > 0 ? (
                          <div className="space-y-3">
                            {cityQuests.map((quest) => (
                              <Card key={quest.id} className="bg-slate-700/50 border-slate-600">
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium text-white">{quest.title}</h5>
                                    <Badge variant="outline" className={`text-xs ${
                                      quest.priority === 'critical' ? 'border-red-400 text-red-300' :
                                      quest.priority === 'high' ? 'border-orange-400 text-orange-300' :
                                      quest.priority === 'medium' ? 'border-yellow-400 text-yellow-300' :
                                      'border-green-400 text-green-300'
                                    }`}>
                                      {quest.priority}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-slate-300 line-clamp-3">{quest.description}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {quest.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No quests available</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="resources" className="h-full p-4">
                      <ScrollArea className="h-full">
                        {selectedCity.resources && selectedCity.resources.length > 0 ? (
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                <Coins className="h-4 w-4" />
                                Available Resources
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                {selectedCity.resources.map((resource, index) => (
                                  <Badge key={index} variant="outline" className="text-orange-300 border-orange-400 justify-center">
                                    {resource}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <Separator className="bg-slate-600" />

                            <div>
                              <h4 className="font-semibold text-white mb-2">Resource Control</h4>
                              <p className="text-sm text-slate-300">
                                This city controls critical resources that other settlements depend on, 
                                creating both opportunities and vulnerabilities in the current political climate.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No resources specified</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
