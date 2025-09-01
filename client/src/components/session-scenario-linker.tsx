
/**
 * Session-Scenario Linker Component
 * 
 * This component provides functionality for game masters to:
 * - Link scenarios to active sessions
 * - View linked scenarios for a session
 * - Manage scenario-session relationships
 * - Quick access to scenario content during sessions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Link, 
  Unlink, 
  MapPin, 
  Users, 
  Search, 
  Plus, 
  Eye,
  BookOpen,
  Clock,
  AlertTriangle
} from 'lucide-react';

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

interface Session {
  id: string;
  userId: string | null;
  name: string;
  creatorMode: 'road' | 'city';
  currentPhase: number;
  duration: number;
  aiMode: 'chaos' | 'continuity';
  createdAt: Date;
  updatedAt: Date;
}

interface SessionScenarioLinkerProps {
  currentSessionId?: string;
  onLinkedScenariosUpdate?: (scenarios: Scenario[]) => void;
}

export function SessionScenarioLinker({ 
  currentSessionId, 
  onLinkedScenariosUpdate 
}: SessionScenarioLinkerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [linkedScenarios, setLinkedScenarios] = useState<Scenario[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState(currentSessionId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('linked');

  // Fetch all sessions
  const fetchSessions = async () => {
    try {
      // Since we don't have a get all sessions endpoint, we'll use the current session
      if (currentSessionId) {
        const response = await fetch(`/api/sessions/${currentSessionId}`);
        if (response.ok) {
          const session = await response.json();
          setSessions([session]);
          setSelectedSessionId(session.id);
        }
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  // Fetch all scenarios
  const fetchScenarios = async () => {
    try {
      const response = await fetch('/api/scenarios?userId=demo-user');
      if (response.ok) {
        const data = await response.json();
        setScenarios(data);
      }
    } catch (err) {
      console.error('Error fetching scenarios:', err);
      setError('Failed to fetch scenarios');
    }
  };

  // Fetch linked scenarios for selected session
  const fetchLinkedScenarios = async (sessionId: string) => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/sessions/${sessionId}/scenarios`);
      if (response.ok) {
        const data = await response.json();
        setLinkedScenarios(data);
        onLinkedScenariosUpdate?.(data);
      }
    } catch (err) {
      console.error('Error fetching linked scenarios:', err);
      setError('Failed to fetch linked scenarios');
    } finally {
      setLoading(false);
    }
  };

  // Link scenario to session
  const linkScenario = async (scenarioId: string) => {
    if (!selectedSessionId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/scenarios/${scenarioId}/sessions/${selectedSessionId}/link`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await fetchLinkedScenarios(selectedSessionId);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to link scenario');
      }
    } catch (err) {
      setError('Failed to link scenario');
    } finally {
      setLoading(false);
    }
  };

  // Unlink scenario from session
  const unlinkScenario = async (scenarioId: string) => {
    if (!selectedSessionId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/scenarios/${scenarioId}/sessions/${selectedSessionId}/link`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchLinkedScenarios(selectedSessionId);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to unlink scenario');
      }
    } catch (err) {
      setError('Failed to unlink scenario');
    } finally {
      setLoading(false);
    }
  };

  // Filter scenarios based on search query
  const filteredScenarios = scenarios.filter(scenario =>
    scenario.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scenario.mainIdea.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (scenario.keyThemes && scenario.keyThemes.some(theme => 
      theme.toLowerCase().includes(searchQuery.toLowerCase())
    ))
  );

  // Get unlinked scenarios
  const unlinkedScenarios = filteredScenarios.filter(scenario =>
    !linkedScenarios.some(linked => linked.id === scenario.id)
  );

  useEffect(() => {
    fetchSessions();
    fetchScenarios();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchLinkedScenarios(selectedSessionId);
    }
  }, [selectedSessionId]);

  return (
    <Card className="bg-slate-800/50 border-slate-700" data-component="session-scenario-linker">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Link className="h-5 w-5 text-blue-400" />
          Session-Scenario Manager
        </CardTitle>
        <CardDescription className="text-slate-300">
          Link scenarios to your active session for quick access to content and NPCs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Session Selector */}
        {!currentSessionId && (
          <div className="mb-4">
            <label className="text-white text-sm font-medium mb-2 block">Select Session</label>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Choose a session..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id} className="text-white">
                    {session.name} ({session.creatorMode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="mb-4 border-red-500 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {selectedSessionId && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-slate-700">
              <TabsTrigger value="linked" className="text-white">
                Linked Scenarios ({linkedScenarios.length})
              </TabsTrigger>
              <TabsTrigger value="available" className="text-white">
                Available Scenarios ({unlinkedScenarios.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="linked" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Active Scenarios</h3>
                  <Badge variant="outline" className="text-blue-300 border-blue-400">
                    {linkedScenarios.length} linked
                  </Badge>
                </div>

                <ScrollArea className="h-96">
                  {linkedScenarios.length > 0 ? (
                    <div className="space-y-3">
                      {linkedScenarios.map((scenario) => (
                        <Card key={scenario.id} className="bg-slate-700/50 border-slate-600">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-white">{scenario.title}</h4>
                                  <Badge variant={scenario.status === 'active' ? 'default' : 'secondary'}>
                                    {scenario.status}
                                  </Badge>
                                </div>
                                <p className="text-slate-300 text-sm mb-2 line-clamp-2">
                                  {scenario.mainIdea}
                                </p>
                                {scenario.keyThemes && scenario.keyThemes.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {scenario.keyThemes.slice(0, 3).map((theme) => (
                                      <Badge key={theme} variant="outline" className="text-xs text-orange-300 border-orange-400">
                                        {theme}
                                      </Badge>
                                    ))}
                                    {scenario.keyThemes.length > 3 && (
                                      <Badge variant="outline" className="text-xs text-slate-400">
                                        +{scenario.keyThemes.length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(`/scenarios?id=${scenario.id}`, '_blank')}
                                  className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => unlinkScenario(scenario.id)}
                                  disabled={loading}
                                  className="border-red-500 text-red-400 hover:bg-red-500/10"
                                >
                                  <Unlink className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No scenarios linked to this session</p>
                      <p className="text-sm">Link scenarios to access their content during gameplay</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="available" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search scenarios..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white pl-10"
                      />
                    </div>
                  </div>
                  <Badge variant="outline" className="text-slate-300">
                    {unlinkedScenarios.length} available
                  </Badge>
                </div>

                <ScrollArea className="h-96">
                  {unlinkedScenarios.length > 0 ? (
                    <div className="space-y-3">
                      {unlinkedScenarios.map((scenario) => (
                        <Card key={scenario.id} className="bg-slate-700/50 border-slate-600 hover:border-slate-500 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-white">{scenario.title}</h4>
                                  <Badge variant={scenario.status === 'active' ? 'default' : 'secondary'}>
                                    {scenario.status}
                                  </Badge>
                                </div>
                                <p className="text-slate-300 text-sm mb-2 line-clamp-2">
                                  {scenario.mainIdea}
                                </p>
                                {scenario.keyThemes && scenario.keyThemes.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {scenario.keyThemes.slice(0, 3).map((theme) => (
                                      <Badge key={theme} variant="outline" className="text-xs text-orange-300 border-orange-400">
                                        {theme}
                                      </Badge>
                                    ))}
                                    {scenario.keyThemes.length > 3 && (
                                      <Badge variant="outline" className="text-xs text-slate-400">
                                        +{scenario.keyThemes.length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(`/scenarios?id=${scenario.id}`, '_blank')}
                                  className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => linkScenario(scenario.id)}
                                  disabled={loading}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No available scenarios found</p>
                      <p className="text-sm">
                        {searchQuery ? 'Try a different search term' : 'All scenarios are already linked'}
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
