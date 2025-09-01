
/**
 * Session Tracker Component - Real-time session state tracking
 * 
 * This component provides:
 * - Current scenario position tracking
 * - Player status and health monitoring
 * - Time tracking and session duration
 * - Quick scenario navigation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { 
  Play, 
  Pause, 
  Clock, 
  MapPin, 
  Users, 
  Heart, 
  Shield, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Navigation
} from 'lucide-react';

interface Player {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  status: 'active' | 'injured' | 'unconscious' | 'dead';
  location?: string;
  notes?: string;
}

interface ScenarioPosition {
  scenarioId?: string;
  scenarioTitle?: string;
  currentLocation: string;
  currentPhase: string;
  progress: number; // 0-100
  objectives: string[];
  completedObjectives: string[];
}

interface SessionTrackerProps {
  sessionId: string;
  scenarioId?: string;
  players?: string[];
}

export function SessionTracker({ sessionId, scenarioId, players: playerNames = [] }: SessionTrackerProps) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scenarioPosition, setScenarioPosition] = useState<ScenarioPosition>({
    currentLocation: 'Starting Area',
    currentPhase: 'Introduction',
    progress: 0,
    objectives: [],
    completedObjectives: []
  });

  // Initialize players from props
  useEffect(() => {
    if (playerNames.length > 0) {
      const initialPlayers = playerNames.map((name, index) => ({
        id: `player-${index}`,
        name,
        health: 100,
        maxHealth: 100,
        status: 'active' as const,
        location: scenarioPosition.currentLocation
      }));
      setPlayers(initialPlayers);
    }
  }, [playerNames]);

  // Load session state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(`session-tracker-${sessionId}`);
    if (savedState) {
      const state = JSON.parse(savedState);
      setIsSessionActive(state.isSessionActive);
      setSessionDuration(state.sessionDuration);
      setStartTime(state.startTime ? new Date(state.startTime) : null);
      setPlayers(state.players || []);
      setScenarioPosition(state.scenarioPosition || scenarioPosition);
    }
  }, [sessionId]);

  // Save session state to localStorage
  const saveState = () => {
    const state = {
      isSessionActive,
      sessionDuration,
      startTime,
      players,
      scenarioPosition
    };
    localStorage.setItem(`session-tracker-${sessionId}`, JSON.stringify(state));
  };

  useEffect(() => {
    saveState();
  }, [isSessionActive, sessionDuration, startTime, players, scenarioPosition]);

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isSessionActive && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setSessionDuration(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive, startTime]);

  const startSession = () => {
    setIsSessionActive(true);
    setStartTime(new Date());
  };

  const pauseSession = () => {
    setIsSessionActive(false);
  };

  const updatePlayerHealth = (playerId: string, health: number) => {
    setPlayers(prev =>
      prev.map(player => {
        if (player.id === playerId) {
          const newHealth = Math.max(0, Math.min(player.maxHealth, health));
          let status: Player['status'] = 'active';
          
          if (newHealth === 0) status = 'dead';
          else if (newHealth <= player.maxHealth * 0.25) status = 'unconscious';
          else if (newHealth <= player.maxHealth * 0.5) status = 'injured';
          
          return { ...player, health: newHealth, status };
        }
        return player;
      })
    );
  };

  const updateLocation = (location: string) => {
    setScenarioPosition(prev => ({ ...prev, currentLocation: location }));
    setPlayers(prev => prev.map(player => ({ ...player, location })));
  };

  const updatePhase = (phase: string) => {
    setScenarioPosition(prev => ({ ...prev, currentPhase: phase }));
  };

  const updateProgress = (progress: number) => {
    setScenarioPosition(prev => ({ ...prev, progress: Math.max(0, Math.min(100, progress)) }));
  };

  const completeObjective = (objective: string) => {
    setScenarioPosition(prev => ({
      ...prev,
      completedObjectives: [...prev.completedObjectives, objective],
      objectives: prev.objectives.filter(obj => obj !== objective)
    }));
  };

  const addObjective = (objective: string) => {
    setScenarioPosition(prev => ({
      ...prev,
      objectives: [...prev.objectives, objective]
    }));
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlayerStatusColor = (status: Player['status']) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'injured': return 'text-yellow-400';
      case 'unconscious': return 'text-orange-400';
      case 'dead': return 'text-red-400';
    }
  };

  const getHealthColor = (health: number, maxHealth: number) => {
    const percentage = health / maxHealth;
    if (percentage > 0.75) return 'bg-green-500';
    if (percentage > 0.5) return 'bg-yellow-500';
    if (percentage > 0.25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="heading-minimal flex items-center gap-3">
          <Navigation className="h-5 w-5 text-toxic" />
          Session Tracker
        </h2>
        <p className="text-minimal mt-1">
          Monitor session progress, player status, and scenario position
        </p>
      </div>
      
      <div className="space-y-6">
        {/* Session Controls */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={isSessionActive ? pauseSession : startSession}
                className={isSessionActive ? "bg-orange-500 hover:bg-orange-600 border-0" : "btn-rust"}
                size="sm"
              >
                {isSessionActive ? (
                  <Pause className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isSessionActive ? "Pause" : "Start"}
              </Button>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{formatDuration(sessionDuration)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`status-dot ${isSessionActive ? 'status-active' : 'status-warning'}`}></div>
              <span className="text-xs font-medium">{isSessionActive ? "Live" : "Paused"}</span>
            </div>
          </div>
        </div>

        {/* Scenario Position */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Scenario Position</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300">Current Location</label>
              <input
                type="text"
                value={scenarioPosition.currentLocation}
                onChange={(e) => updateLocation(e.target.value)}
                className="w-full bg-slate-700 border-slate-600 text-white rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300">Current Phase</label>
              <input
                type="text"
                value={scenarioPosition.currentPhase}
                onChange={(e) => updatePhase(e.target.value)}
                className="w-full bg-slate-700 border-slate-600 text-white rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-foreground">Scenario Progress</label>
              <span className="text-sm font-mono text-rust">{scenarioPosition.progress}%</span>
            </div>
            <Progress value={scenarioPosition.progress} className="h-1.5 bg-muted" />
            <div className="flex gap-2 mt-3">
              <Button
                onClick={() => updateProgress(scenarioPosition.progress - 10)}
                size="sm"
                className="btn-ghost px-3"
              >
                -10%
              </Button>
              <Button
                onClick={() => updateProgress(scenarioPosition.progress + 10)}
                size="sm"
                className="btn-ghost px-3"
              >
                +10%
              </Button>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-600" />

        {/* Player Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Player Status</h3>
          
          {players.length > 0 ? (
            <div className="space-y-3">
              {players.map((player) => (
                <div key={player.id} className="p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-white">{player.name}</h4>
                      <Badge variant="outline" className={getPlayerStatusColor(player.status)}>
                        {player.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-300">
                      <Heart className="h-4 w-4" />
                      {player.health}/{player.maxHealth}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="w-full bg-slate-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${getHealthColor(player.health, player.maxHealth)}`}
                            style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => updatePlayerHealth(player.id, player.health - 10)}
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0 border-red-500 text-red-400"
                        >
                          -
                        </Button>
                        <Button
                          onClick={() => updatePlayerHealth(player.id, player.health + 10)}
                          size="sm"
                          variant="outline"
                          className="h-6 w-6 p-0 border-green-500 text-green-400"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    
                    {player.location && (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <MapPin className="h-3 w-3" />
                        {player.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-slate-400">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No players added to session</p>
            </div>
          )}
        </div>

        <Separator className="bg-slate-600" />

        {/* Objectives */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Objectives</h3>
          
          <div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Add new objective..."
                className="flex-1 bg-slate-700 border-slate-600 text-white rounded px-3 py-2 text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const target = e.target as HTMLInputElement;
                    if (target.value.trim()) {
                      addObjective(target.value.trim());
                      target.value = '';
                    }
                  }
                }}
              />
            </div>
            
            <div className="space-y-2">
              {scenarioPosition.objectives.map((objective, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-slate-700/30 rounded">
                  <Button
                    onClick={() => completeObjective(objective)}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-green-400"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <span className="text-white text-sm">{objective}</span>
                </div>
              ))}
              
              {scenarioPosition.completedObjectives.map((objective, index) => (
                <div key={`completed-${index}`} className="flex items-center gap-2 p-2 bg-green-900/20 rounded">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-green-300 text-sm line-through">{objective}</span>
                </div>
              ))}
              
              {scenarioPosition.objectives.length === 0 && scenarioPosition.completedObjectives.length === 0 && (
                <div className="text-center py-4 text-slate-400">
                  <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No objectives set</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
