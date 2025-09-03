/**
 * Session Progress Tracker Component
 * 
 * Real-time session management with pacing guidance and time tracking
 * Designed for 4-hour modular RPG sessions with phase-based progression
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Play, Pause, Square, Clock, Timer, Users, 
  CheckCircle, AlertCircle, Coffee, Target 
} from 'lucide-react';

interface SessionPhase {
  id: string;
  name: string;
  description: string;
  suggestedDuration: number; // in minutes
  color: string;
  completed: boolean;
}

interface SessionProgressProps {
  sessionId?: string;
  sessionMode: 'road' | 'city';
  onPhaseChange?: (phase: SessionPhase) => void;
  onSessionComplete?: () => void;
}

const ROAD_SESSION_PHASES: SessionPhase[] = [
  {
    id: 'setup',
    name: '🎯 Setup & Briefing',
    description: 'Character status, supply check, route planning',
    suggestedDuration: 30,
    color: 'bg-blue-500',
    completed: false
  },
  {
    id: 'journey-start',
    name: '🚗 Journey Begins',
    description: 'Departure, initial obstacles, team dynamics',
    suggestedDuration: 45,
    color: 'bg-green-500',
    completed: false
  },
  {
    id: 'major-encounter',
    name: '⚡ Major Encounter',
    description: 'Combat, negotiation, or environmental challenge',
    suggestedDuration: 60,
    color: 'bg-orange-500',
    completed: false
  },
  {
    id: 'break',
    name: '☕ Mid-Session Break',
    description: '15-minute break for players and GM',
    suggestedDuration: 15,
    color: 'bg-purple-500',
    completed: false
  },
  {
    id: 'complications',
    name: '🔥 Complications',
    description: 'Consequences, pursuit, resource management',
    suggestedDuration: 45,
    color: 'bg-red-500',
    completed: false
  },
  {
    id: 'arrival',
    name: '🏁 Arrival & Resolution',
    description: 'Destination reached, immediate aftermath',
    suggestedDuration: 35,
    color: 'bg-teal-500',
    completed: false
  }
];

const CITY_SESSION_PHASES: SessionPhase[] = [
  {
    id: 'setup',
    name: '🏛️ City Entry',
    description: 'Arrival, first impressions, establishing contacts',
    suggestedDuration: 30,
    color: 'bg-blue-500',
    completed: false
  },
  {
    id: 'investigation',
    name: '🔍 Investigation Phase',
    description: 'Gathering information, meeting NPCs, building relationships',
    suggestedDuration: 60,
    color: 'bg-green-500',
    completed: false
  },
  {
    id: 'political-tension',
    name: '⚖️ Political Maneuvering',
    description: 'Faction interactions, negotiations, alliances',
    suggestedDuration: 45,
    color: 'bg-yellow-500',
    completed: false
  },
  {
    id: 'break',
    name: '☕ Mid-Session Break',
    description: '15-minute break for players and GM',
    suggestedDuration: 15,
    color: 'bg-purple-500',
    completed: false
  },
  {
    id: 'climax',
    name: '🎭 Dramatic Climax',
    description: 'Major confrontation, revelation, or decision point',
    suggestedDuration: 50,
    color: 'bg-red-500',
    completed: false
  },
  {
    id: 'resolution',
    name: '📜 Resolution',
    description: 'Consequences, rewards, setting up future sessions',
    suggestedDuration: 20,
    color: 'bg-indigo-500',
    completed: false
  }
];

export function SessionProgressTracker({ 
  sessionId, 
  sessionMode, 
  onPhaseChange, 
  onSessionComplete 
}: SessionProgressProps) {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phases, setPhases] = useState<SessionPhase[]>(
    sessionMode === 'road' ? [...ROAD_SESSION_PHASES] : [...CITY_SESSION_PHASES]
  );
  const [breakReminders, setBreakReminders] = useState<string[]>([]);
  const [pacingAdvice, setPacingAdvice] = useState<string>('');

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && startTime) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const start = startTime.getTime();
        setElapsedSeconds(Math.floor((now - start) / 1000));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  // Pacing analysis effect
  useEffect(() => {
    if (!isActive) return;

    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const currentPhase = phases[currentPhaseIndex];
    
    if (currentPhase) {
      const expectedTime = phases.slice(0, currentPhaseIndex).reduce((acc, phase) => acc + phase.suggestedDuration, 0);
      const timeDelay = elapsedMinutes - expectedTime;

      if (timeDelay > 10) {
        setPacingAdvice(`⚠️ Running ${timeDelay} minutes behind schedule. Consider speeding up current phase.`);
      } else if (timeDelay < -10) {
        setPacingAdvice(`✅ Running ${Math.abs(timeDelay)} minutes ahead. Great pacing!`);
      } else {
        setPacingAdvice('🎯 Session pacing is on track.');
      }
    }
  }, [elapsedSeconds, currentPhaseIndex, phases, isActive]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = () => {
    setIsActive(true);
    setStartTime(new Date());
    setElapsedSeconds(0);
  };

  const pauseSession = () => {
    setIsActive(!isActive);
  };

  const stopSession = () => {
    setIsActive(false);
    setStartTime(null);
    setElapsedSeconds(0);
    onSessionComplete?.();
  };

  const completePhase = (index: number) => {
    const updatedPhases = [...phases];
    updatedPhases[index] = { ...updatedPhases[index], completed: true };
    setPhases(updatedPhases);
    
    if (index < phases.length - 1) {
      setCurrentPhaseIndex(index + 1);
    }
    
    onPhaseChange?.(updatedPhases[index]);
    
    // Add break reminder if applicable
    if (updatedPhases[index].id === 'break') {
      setBreakReminders(prev => [...prev, `Break completed at ${formatTime(elapsedSeconds)}`]);
    }
  };

  const totalDuration = phases.reduce((acc, phase) => acc + phase.suggestedDuration, 0);
  const completedDuration = phases
    .filter(phase => phase.completed)
    .reduce((acc, phase) => acc + phase.suggestedDuration, 0);
  const progressPercentage = (completedDuration / totalDuration) * 100;

  return (
    <Card className="w-full bg-slate-800 border-slate-600" data-testid="session-progress-tracker">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-white">
          <span className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Session Progress - {sessionMode === 'road' ? 'On the Road' : 'City Politics'}
          </span>
          <Badge variant="outline" className="text-yellow-400 border-yellow-400">
            {formatTime(elapsedSeconds)} / {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Session Controls */}
        <div className="flex items-center gap-3">
          {!isActive && !startTime ? (
            <Button 
              onClick={startSession}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-start-session"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button 
                onClick={pauseSession}
                variant="outline"
                className={isActive ? "border-yellow-500" : "border-green-500"}
                data-testid="button-pause-session"
              >
                {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button 
                onClick={stopSession}
                variant="outline"
                className="border-red-500 hover:bg-red-500/10"
                data-testid="button-stop-session"
              >
                <Square className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div className="text-sm text-slate-400">
            {pacingAdvice}
          </div>
        </div>

        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Session Progress</span>
            <span className="text-slate-300">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Phase List */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-white mb-3">Session Phases</h4>
          {phases.map((phase, index) => (
            <div 
              key={phase.id} 
              className={`p-3 rounded-lg border transition-colors ${
                index === currentPhaseIndex 
                  ? 'bg-slate-700 border-yellow-500' 
                  : phase.completed 
                  ? 'bg-slate-700/50 border-green-500/50' 
                  : 'bg-slate-700/30 border-slate-600'
              }`}
              data-testid={`phase-${phase.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {phase.completed ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : index === currentPhaseIndex ? (
                    <Clock className="h-4 w-4 text-yellow-400" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-slate-500" />
                  )}
                  <div>
                    <div className="font-medium text-white">{phase.name}</div>
                    <div className="text-xs text-slate-400">{phase.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {phase.suggestedDuration}m
                  </Badge>
                  {index === currentPhaseIndex && !phase.completed && (
                    <Button 
                      size="sm" 
                      onClick={() => completePhase(index)}
                      className="h-7 px-2 bg-green-600 hover:bg-green-700"
                      data-testid={`button-complete-phase-${phase.id}`}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Break Reminders */}
        {breakReminders.length > 0 && (
          <div className="p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg">
            <h5 className="text-sm font-medium text-purple-300 mb-2 flex items-center gap-2">
              <Coffee className="h-4 w-4" />
              Break History
            </h5>
            {breakReminders.map((reminder, index) => (
              <div key={index} className="text-xs text-purple-200">
                {reminder}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}