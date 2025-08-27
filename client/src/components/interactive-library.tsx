/**
 * Interactive Library Component - Dynamic scenario and asset management
 * 
 * This component provides a comprehensive library system that:
 * - Displays scenarios and regions as reusable assets
 * - Allows filtering and searching through content
 * - Shows relationships between scenarios and sessions
 * - Provides quick-access templates and inspiration
 * 
 * Features:
 * - Real-time search and filtering
 * - Category-based organization
 * - Visual relationship mapping
 * - Drag-and-drop for quick reuse
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Search, MapPin, Users, Shield, Coins, Filter, BookOpen, Copy, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';

// Types (reused from scenario-builder)
interface Scenario {
  id: string;
  userId: string | null;
  title: string;
  mainIdea: string;
  worldContext: string | null;
  politicalSituation: string | null;
  keyThemes: string[] | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

interface Region {
  id: string;
  scenarioId: string | null;
  name: string;
  type: 'city' | 'settlement' | 'wasteland' | 'fortress' | 'trade_hub';
  description: string | null;
  controllingFaction: string | null;
  population: number | null;
  resources: string[] | null;
  threatLevel: number;
  politicalStance: 'hostile' | 'neutral' | 'friendly' | 'allied' | null;
  tradeRoutes: string[] | null;
  createdAt: Date;
}

interface LibraryStats {
  totalScenarios: number;
  totalRegions: number;
  activeScenarios: number;
  uniqueThemes: number;
}

interface InteractiveLibraryProps {
  showTitle?: boolean;
}

const REGION_ICONS = {
  city: '🏙️',
  settlement: '🏘️',
  wasteland: '🏜️',
  fortress: '🏰',
  trade_hub: '🏪'
};

const STATUS_COLORS = {
  draft: 'secondary',
  active: 'default',
  completed: 'outline',
  archived: 'destructive'
} as const;

export function InteractiveLibrary({ showTitle = true }: InteractiveLibraryProps) {
  // State management
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [scenarioRegions, setScenarioRegions] = useState<Region[]>([]);
  const [stats, setStats] = useState<LibraryStats>({
    totalScenarios: 0,
    totalRegions: 0,
    activeScenarios: 0,
    uniqueThemes: 0
  });

  // API Functions
  const fetchScenarios = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/scenarios?userId=demo-user');
      if (!response.ok) throw new Error('Failed to fetch scenarios');
      const data = await response.json();
      setScenarios(data);
      
      // Calculate stats
      const activeCount = data.filter((s: Scenario) => s.status === 'active').length;
      const allThemes = data.flatMap((s: Scenario) => s.keyThemes || []);
      const uniqueThemes = new Set(allThemes).size;
      
      setStats(prev => ({
        ...prev,
        totalScenarios: data.length,
        activeScenarios: activeCount,
        uniqueThemes
      }));
    } catch (error) {
      console.error('Failed to fetch scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRegions = async () => {
    try {
      // Since there's no endpoint to get all regions, we'll fetch them per scenario
      // In a real app, you'd want a dedicated endpoint for this
      const allRegions: Region[] = [];
      for (const scenario of scenarios) {
        const response = await fetch(`/api/scenarios/${scenario.id}/regions`);
        if (response.ok) {
          const regionData = await response.json();
          allRegions.push(...regionData);
        }
      }
      setRegions(allRegions);
      setStats(prev => ({
        ...prev,
        totalRegions: allRegions.length
      }));
    } catch (error) {
      console.error('Failed to fetch regions:', error);
    }
  };

  const fetchScenarioRegions = async (scenarioId: string) => {
    try {
      const response = await fetch(`/api/scenarios/${scenarioId}/regions`);
      if (!response.ok) throw new Error('Failed to fetch scenario regions');
      const data = await response.json();
      setScenarioRegions(data);
    } catch (error) {
      console.error('Failed to fetch scenario regions:', error);
      setScenarioRegions([]);
    }
  };

  // Filter functions
  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch = scenario.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         scenario.mainIdea.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (scenario.keyThemes && scenario.keyThemes.some(theme => 
                           theme.toLowerCase().includes(searchQuery.toLowerCase())
                         ));
    
    const matchesStatus = statusFilter === 'all' || scenario.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredRegions = regions.filter(region => {
    const matchesSearch = region.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (region.description && region.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (region.controllingFaction && region.controllingFaction.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || region.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getThreatColor = (level: number) => {
    if (level <= 2) return 'bg-green-500';
    if (level <= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Effects
  useEffect(() => {
    fetchScenarios();
  }, []);

  useEffect(() => {
    if (scenarios.length > 0) {
      fetchAllRegions();
    }
  }, [scenarios]);

  useEffect(() => {
    if (selectedScenario) {
      fetchScenarioRegions(selectedScenario.id);
    }
  }, [selectedScenario]);

  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Interactive Library</h2>
          <p className="text-slate-400">
            Browse and reuse scenarios, regions, and world-building elements
          </p>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{stats.totalScenarios}</div>
            <div className="text-sm text-slate-300">Scenarios</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{stats.totalRegions}</div>
            <div className="text-sm text-slate-300">Regions</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.activeScenarios}</div>
            <div className="text-sm text-slate-300">Active</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.uniqueThemes}</div>
            <div className="text-sm text-slate-300">Themes</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search scenarios, regions, themes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-white">All Status</SelectItem>
                <SelectItem value="draft" className="text-white">Draft</SelectItem>
                <SelectItem value="active" className="text-white">Active</SelectItem>
                <SelectItem value="completed" className="text-white">Completed</SelectItem>
                <SelectItem value="archived" className="text-white">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-white">All Types</SelectItem>
                <SelectItem value="city" className="text-white">Cities</SelectItem>
                <SelectItem value="settlement" className="text-white">Settlements</SelectItem>
                <SelectItem value="wasteland" className="text-white">Wastelands</SelectItem>
                <SelectItem value="fortress" className="text-white">Fortresses</SelectItem>
                <SelectItem value="trade_hub" className="text-white">Trade Hubs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenarios List */}
        <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-orange-400" />
              Scenarios ({filteredScenarios.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {filteredScenarios.map((scenario) => (
                  <Card
                    key={scenario.id}
                    className={`bg-slate-700/50 border-slate-600 cursor-pointer transition-all hover:bg-slate-700 ${
                      selectedScenario?.id === scenario.id ? 'border-orange-500 bg-orange-500/10' : ''
                    }`}
                    onClick={() => setSelectedScenario(scenario)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-white">{scenario.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant={STATUS_COLORS[scenario.status]} className="text-xs">
                            {scenario.status}
                          </Badge>
                          <Link href="/scenarios">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                      <p className="text-slate-300 text-sm mb-3 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                        {scenario.mainIdea}
                      </p>
                      {scenario.keyThemes && scenario.keyThemes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {scenario.keyThemes.slice(0, 3).map((theme) => (
                            <Badge key={theme} variant="outline" className="text-xs text-orange-300 border-orange-400">
                              {theme}
                            </Badge>
                          ))}
                          {scenario.keyThemes.length > 3 && (
                            <Badge variant="outline" className="text-xs text-slate-400">
                              +{scenario.keyThemes.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      <div className="text-xs text-slate-400">
                        Created {new Date(scenario.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredScenarios.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No scenarios found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Scenario Details / Regions */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-orange-400" />
              {selectedScenario ? 'Scenario Regions' : 'All Regions'}
            </CardTitle>
            {selectedScenario && (
              <CardDescription className="text-slate-300">
                {selectedScenario.title}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {(selectedScenario ? scenarioRegions : filteredRegions).map((region) => (
                  <Card key={region.id} className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{REGION_ICONS[region.type]}</span>
                          <h4 className="font-semibold text-white text-sm">{region.name}</h4>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${getThreatColor(region.threatLevel)}`} />
                          <span className="text-xs text-slate-400">{region.threatLevel}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="outline" className="text-xs">
                          {region.type}
                        </Badge>
                        {region.politicalStance && (
                          <Badge variant="secondary" className="text-xs">
                            {region.politicalStance}
                          </Badge>
                        )}
                      </div>
                      
                      {region.description && (
                        <p className="text-slate-300 text-xs mt-2 line-clamp-2">
                          {region.description}
                        </p>
                      )}
                      
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                        {region.controllingFaction && (
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            <span>{region.controllingFaction}</span>
                          </div>
                        )}
                        {region.population !== null && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{region.population?.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      
                      {region.resources && region.resources.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                            <Coins className="h-3 w-3" />
                            <span>Resources:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {region.resources.slice(0, 3).map((resource) => (
                              <Badge key={resource} variant="outline" className="text-xs">
                                {resource}
                              </Badge>
                            ))}
                            {region.resources.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{region.resources.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {(selectedScenario ? scenarioRegions : filteredRegions).length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No regions found</p>
                    <p className="text-sm">
                      {selectedScenario ? 'This scenario has no regions yet' : 'Try adjusting your search or filters'}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {selectedScenario && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white mb-1">Selected: {selectedScenario.title}</h3>
                <p className="text-slate-300 text-sm">
                  {scenarioRegions.length} regions • {selectedScenario.keyThemes?.length || 0} themes • {selectedScenario.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedScenario(null)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Clear Selection
                </Button>
                <Link href="/scenarios">
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Builder
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}