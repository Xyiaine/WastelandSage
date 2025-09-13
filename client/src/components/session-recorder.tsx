
/**
 * Session Recorder Component - Record and replay session events
 * 
 * Features:
 * - Real-time session event recording
 * - Timeline playback with scrubbing
 * - Event annotation and bookmarking
 * - Export session recordings
 * - Learning insights from recorded sessions
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Volume2,
  Bookmark,
  Download,
  Upload,
  Clock,
  Users,
  MessageCircle,
  Zap,
  Target,
  BarChart3,
  Eye,
  FileText
} from 'lucide-react';

// Types for session recording
interface SessionEvent {
  id: string;
  timestamp: number;
  type: 'action' | 'dialogue' | 'decision' | 'combat' | 'discovery' | 'social';
  actor: 'gm' | 'player' | 'npc' | 'system';
  actorName: string;
  content: string;
  data?: any;
  importance: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  location?: string;
  participants?: string[];
}

interface SessionBookmark {
  id: string;
  timestamp: number;
  label: string;
  description: string;
  type: 'moment' | 'decision' | 'plot' | 'character' | 'combat';
  color: string;
}

interface SessionRecording {
  id: string;
  sessionId: string;
  sessionName: string;
  startTime: number;
  endTime?: number;
  duration: number;
  events: SessionEvent[];
  bookmarks: SessionBookmark[];
  participants: string[];
  metadata: {
    creatorMode: 'road' | 'city';
    scenarios: string[];
    totalEvents: number;
    avgEventsPerHour: number;
  };
}

interface SessionInsight {
  type: 'pacing' | 'participation' | 'content' | 'engagement';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success';
  metric?: number;
  suggestion?: string;
}

interface SessionRecorderProps {
  sessionId: string;
  isActive?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: (recording: SessionRecording) => void;
  onEventRecord?: (event: SessionEvent) => void;
}

const EVENT_ICONS = {
  action: Zap,
  dialogue: MessageCircle,
  decision: Target,
  combat: Square,
  discovery: Eye,
  social: Users
};

const EVENT_COLORS = {
  action: 'bg-blue-500',
  dialogue: 'bg-green-500',
  decision: 'bg-orange-500',
  combat: 'bg-red-500',
  discovery: 'bg-purple-500',
  social: 'bg-yellow-500'
};

const BOOKMARK_TYPES = [
  { value: 'moment', label: 'Key Moment', color: 'bg-blue-500' },
  { value: 'decision', label: 'Major Decision', color: 'bg-orange-500' },
  { value: 'plot', label: 'Plot Point', color: 'bg-purple-500' },
  { value: 'character', label: 'Character Development', color: 'bg-green-500' },
  { value: 'combat', label: 'Combat Encounter', color: 'bg-red-500' }
];

export function SessionRecorder({ 
  sessionId, 
  isActive = false, 
  onRecordingStart, 
  onRecordingStop, 
  onEventRecord 
}: SessionRecorderProps) {
  const { t } = useTranslation();
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [currentRecording, setCurrentRecording] = useState<SessionRecording | null>(null);
  const [recordings, setRecordings] = useState<SessionRecording[]>([]);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedRecording, setSelectedRecording] = useState<SessionRecording | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  
  // UI state
  const [activeTab, setActiveTab] = useState('recorder');
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [newBookmark, setNewBookmark] = useState<Partial<SessionBookmark>>({});
  const [insights, setInsights] = useState<SessionInsight[]>([]);
  
  // Refs
  const playbackInterval = useRef<NodeJS.Timeout | null>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  // Mock data for demonstration
  const mockRecording: SessionRecording = {
    id: 'rec-1',
    sessionId: sessionId,
    sessionName: 'The Crimson Trade Wars - Session 1',
    startTime: Date.now() - 7200000, // 2 hours ago
    endTime: Date.now() - 3600000, // 1 hour ago
    duration: 3600000, // 1 hour
    events: [
      {
        id: 'evt-1',
        timestamp: Date.now() - 7200000,
        type: 'dialogue',
        actor: 'gm',
        actorName: 'GM',
        content: 'Welcome to the Mediterranean Basin. The year is 2200, and tensions are high between the city-states.',
        importance: 'high',
        tags: ['introduction', 'setting'],
        participants: ['Player 1', 'Player 2', 'Player 3']
      },
      {
        id: 'evt-2',
        timestamp: Date.now() - 7000000,
        type: 'decision',
        actor: 'player',
        actorName: 'Player 1',
        content: 'We decide to approach the Industrial City through the eastern trade route.',
        importance: 'high',
        tags: ['navigation', 'strategy'],
        location: 'Eastern Trade Route',
        participants: ['Player 1', 'Player 2', 'Player 3']
      },
      {
        id: 'evt-3',
        timestamp: Date.now() - 6800000,
        type: 'discovery',
        actor: 'gm',
        actorName: 'GM',
        content: 'You notice unusual activity at the checkpoint. Armed guards are inspecting every convoy.',
        importance: 'medium',
        tags: ['discovery', 'tension'],
        location: 'Eastern Checkpoint',
        participants: ['Player 1', 'Player 2', 'Player 3']
      }
    ],
    bookmarks: [
      {
        id: 'bmk-1',
        timestamp: Date.now() - 7000000,
        label: 'Route Decision',
        description: 'Players chose the eastern approach',
        type: 'decision',
        color: 'bg-orange-500'
      }
    ],
    participants: ['GM', 'Player 1', 'Player 2', 'Player 3'],
    metadata: {
      creatorMode: 'road',
      scenarios: ['The Crimson Trade Wars'],
      totalEvents: 25,
      avgEventsPerHour: 25
    }
  };

  const mockInsights: SessionInsight[] = [
    {
      type: 'pacing',
      title: 'Well-Paced Session',
      description: 'Good balance between action and dialogue with 25 events per hour.',
      severity: 'success',
      metric: 25,
      suggestion: 'Consider adding more decision points to increase player agency.'
    },
    {
      type: 'participation',
      title: 'Balanced Participation',
      description: 'All players contributed equally to the session.',
      severity: 'success',
      metric: 100
    },
    {
      type: 'content',
      title: 'High Discovery Rate',
      description: 'Players discovered 8 new story elements.',
      severity: 'info',
      metric: 8,
      suggestion: 'Great use of environmental storytelling!'
    }
  ];

  // Recording functions
  const startRecording = useCallback(() => {
    const now = Date.now();
    setIsRecording(true);
    setIsPaused(false);
    setRecordingStartTime(now);
    
    const newRecording: SessionRecording = {
      id: `rec-${now}`,
      sessionId,
      sessionName: `Session Recording ${new Date().toLocaleDateString()}`,
      startTime: now,
      duration: 0,
      events: [],
      bookmarks: [],
      participants: ['GM'],
      metadata: {
        creatorMode: 'road',
        scenarios: [],
        totalEvents: 0,
        avgEventsPerHour: 0
      }
    };
    
    setCurrentRecording(newRecording);
    onRecordingStart?.();
    
    // Start duration tracking
    recordingInterval.current = setInterval(() => {
      setCurrentRecording(prev => prev ? {
        ...prev,
        duration: Date.now() - prev.startTime
      } : null);
    }, 1000);
  }, [sessionId, onRecordingStart]);

  const stopRecording = useCallback(() => {
    if (!currentRecording) return;
    
    const now = Date.now();
    const finalRecording: SessionRecording = {
      ...currentRecording,
      endTime: now,
      duration: now - currentRecording.startTime,
      metadata: {
        ...currentRecording.metadata,
        totalEvents: currentRecording.events.length,
        avgEventsPerHour: (currentRecording.events.length / ((now - currentRecording.startTime) / 3600000))
      }
    };
    
    setIsRecording(false);
    setIsPaused(false);
    setCurrentRecording(null);
    setRecordings(prev => [...prev, finalRecording]);
    
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
    
    onRecordingStop?.(finalRecording);
    
    // Generate insights
    generateInsights(finalRecording);
  }, [currentRecording, onRecordingStop]);

  const pauseRecording = useCallback(() => {
    setIsPaused(!isPaused);
  }, [isPaused]);

  const recordEvent = useCallback((eventData: Partial<SessionEvent>) => {
    if (!isRecording || isPaused || !currentRecording) return;
    
    const event: SessionEvent = {
      id: `evt-${Date.now()}`,
      timestamp: Date.now(),
      type: eventData.type || 'action',
      actor: eventData.actor || 'gm',
      actorName: eventData.actorName || 'GM',
      content: eventData.content || '',
      importance: eventData.importance || 'medium',
      tags: eventData.tags || [],
      location: eventData.location,
      participants: eventData.participants || ['GM']
    };
    
    setCurrentRecording(prev => prev ? {
      ...prev,
      events: [...prev.events, event]
    } : null);
    
    onEventRecord?.(event);
  }, [isRecording, isPaused, currentRecording, onEventRecord]);

  // Playback functions
  const startPlayback = useCallback((recording: SessionRecording) => {
    setSelectedRecording(recording);
    setIsPlaying(true);
    setCurrentEventIndex(0);
    setPlaybackPosition(0);
    
    playbackInterval.current = setInterval(() => {
      setPlaybackPosition(prev => {
        const newPosition = prev + (100 * playbackSpeed);
        if (newPosition >= recording.duration) {
          setIsPlaying(false);
          return recording.duration;
        }
        return newPosition;
      });
    }, 100);
  }, [playbackSpeed]);

  const pausePlayback = useCallback(() => {
    setIsPlaying(!isPlaying);
    
    if (isPlaying && playbackInterval.current) {
      clearInterval(playbackInterval.current);
      playbackInterval.current = null;
    } else if (!isPlaying && selectedRecording) {
      startPlayback(selectedRecording);
    }
  }, [isPlaying, selectedRecording, startPlayback]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    setPlaybackPosition(0);
    setCurrentEventIndex(0);
    
    if (playbackInterval.current) {
      clearInterval(playbackInterval.current);
      playbackInterval.current = null;
    }
  }, []);

  const seekToPosition = useCallback((position: number) => {
    setPlaybackPosition(position);
    
    if (selectedRecording) {
      const targetTime = selectedRecording.startTime + (position / 100) * selectedRecording.duration;
      const eventIndex = selectedRecording.events.findIndex(event => event.timestamp >= targetTime);
      setCurrentEventIndex(Math.max(0, eventIndex));
    }
  }, [selectedRecording]);

  // Bookmark functions
  const addBookmark = useCallback((type: string, label: string, description: string) => {
    if (!currentRecording) return;
    
    const bookmark: SessionBookmark = {
      id: `bmk-${Date.now()}`,
      timestamp: Date.now(),
      label,
      description,
      type: type as any,
      color: BOOKMARK_TYPES.find(t => t.value === type)?.color || 'bg-blue-500'
    };
    
    setCurrentRecording(prev => prev ? {
      ...prev,
      bookmarks: [...prev.bookmarks, bookmark]
    } : null);
    
    setShowBookmarkDialog(false);
    setNewBookmark({});
  }, [currentRecording]);

  // Insights generation
  const generateInsights = useCallback((recording: SessionRecording) => {
    // Simulate AI-powered insights generation
    setInsights(mockInsights);
  }, []);

  // Export functions
  const exportRecording = useCallback((recording: SessionRecording) => {
    const exportData = {
      recording,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.sessionName.replace(/\s+/g, '_')}_recording.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  // Effects
  useEffect(() => {
    // Load existing recordings
    setRecordings([mockRecording]);
    setInsights(mockInsights);
  }, []);

  useEffect(() => {
    // Cleanup intervals on unmount
    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-400" />
          Session Recorder
        </CardTitle>
        <CardDescription className="text-slate-300">
          Record, analyze, and replay your gaming sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-slate-700 h-auto p-1">
            <TabsTrigger value="recorder" className="text-white text-xs sm:text-sm px-2 py-2 min-w-0" data-testid="tab-recorder">Record</TabsTrigger>
            <TabsTrigger value="playback" className="text-white text-xs sm:text-sm px-2 py-2 min-w-0" data-testid="tab-playback">
              <span className="hidden sm:inline">Playback</span>
              <span className="sm:hidden">Play</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="text-white text-xs sm:text-sm px-2 py-2 whitespace-nowrap overflow-hidden text-ellipsis min-w-0" data-testid="tab-library">
              <span className="hidden md:inline">Library</span>
              <span className="md:hidden">Lib</span>
              {' '}({recordings.length})
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-white text-xs sm:text-sm px-2 py-2 min-w-0" data-testid="tab-insights">
              <span className="hidden sm:inline">Insights</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recorder" className="mt-6 space-y-4">
            {/* Recording Controls */}
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-4">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={pauseRecording}
                      variant="outline"
                      className="border-slate-600"
                    >
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>
                    <Button
                      onClick={stopRecording}
                      variant="outline"
                      className="border-slate-600"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {isRecording && (
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500'} animate-pulse`}></div>
                    <span className="text-white font-mono">
                      {formatDuration(currentRecording?.duration || 0)}
                    </span>
                  </div>
                )}
              </div>
              
              {isRecording && (
                <Button
                  onClick={() => setShowBookmarkDialog(true)}
                  variant="outline"
                  size="sm"
                  className="border-slate-600"
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Add Bookmark
                </Button>
              )}
            </div>

            {/* Quick Event Recording */}
            {isRecording && !isPaused && (
              <div className="space-y-3">
                <h4 className="text-white font-medium">Quick Event Recording</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(EVENT_ICONS).map(([type, Icon]) => (
                    <Button
                      key={type}
                      onClick={() => recordEvent({ type: type as any })}
                      variant="outline"
                      size="sm"
                      className="border-slate-600 justify-start"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Current Recording Events */}
            {currentRecording && currentRecording.events.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-white font-medium">Recent Events ({currentRecording.events.length})</h4>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {currentRecording.events.slice(-5).map((event) => {
                      const EventIcon = EVENT_ICONS[event.type];
                      return (
                        <div key={event.id} className="flex items-start gap-3 p-2 bg-slate-700/30 rounded">
                          <EventIcon className="h-4 w-4 text-blue-400 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white text-sm font-medium">{event.actorName}</span>
                              <Badge variant="outline" className="text-xs">
                                {event.type}
                              </Badge>
                            </div>
                            <p className="text-slate-300 text-sm">{event.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="playback" className="mt-6 space-y-4">
            {selectedRecording ? (
              <>
                {/* Playback Controls */}
                <div className="space-y-4 p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium">{selectedRecording.sessionName}</h3>
                    <span className="text-slate-400 text-sm">
                      {formatDuration(selectedRecording.duration)}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <Slider
                      value={[playbackPosition]}
                      onValueChange={([value]) => seekToPosition(value)}
                      max={100}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{formatDuration((playbackPosition / 100) * selectedRecording.duration)}</span>
                      <span>{formatDuration(selectedRecording.duration)}</span>
                    </div>
                  </div>
                  
                  {/* Control Buttons */}
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      onClick={() => seekToPosition(Math.max(0, playbackPosition - 10))}
                      variant="outline"
                      size="sm"
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={pausePlayback}
                      variant="outline"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      onClick={stopPlayback}
                      variant="outline"
                      size="sm"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => seekToPosition(Math.min(100, playbackPosition + 10))}
                      variant="outline"
                      size="sm"
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Speed Control */}
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-400 text-sm">Speed:</span>
                    <select 
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                      className="bg-slate-600 text-white text-sm rounded px-2 py-1"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
                  </div>
                </div>
                
                {/* Current Event Display */}
                {selectedRecording.events[currentEventIndex] && (
                  <Card className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {(() => {
                          const event = selectedRecording.events[currentEventIndex];
                          const EventIcon = EVENT_ICONS[event.type];
                          return (
                            <>
                              <EventIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-white font-medium">{event.actorName}</span>
                                  <Badge variant="outline">{event.type}</Badge>
                                  <span className="text-slate-400 text-sm">
                                    {new Date(event.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-slate-300">{event.content}</p>
                                {event.location && (
                                  <p className="text-slate-400 text-sm mt-1">📍 {event.location}</p>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Bookmarks */}
                {selectedRecording.bookmarks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-white font-medium">Bookmarks</h4>
                    <div className="space-y-1">
                      {selectedRecording.bookmarks.map((bookmark) => (
                        <Button
                          key={bookmark.id}
                          onClick={() => {
                            const position = ((bookmark.timestamp - selectedRecording.startTime) / selectedRecording.duration) * 100;
                            seekToPosition(position);
                          }}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left"
                        >
                          <Bookmark className="h-4 w-4 mr-2 text-yellow-400" />
                          <div>
                            <div className="text-white">{bookmark.label}</div>
                            <div className="text-slate-400 text-xs">{bookmark.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select a recording from the library to start playback</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="library" className="mt-6 space-y-4">
            <div className="space-y-3">
              {recordings.map((recording) => (
                <Card key={recording.id} className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-medium mb-1">{recording.sessionName}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(recording.duration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {recording.participants.length} participants
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {recording.events.length} events
                          </span>
                        </div>
                        <div className="flex gap-1 mt-2">
                          {recording.metadata.scenarios.map((scenario, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {scenario}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => startPlayback(recording)}
                          size="sm"
                          variant="outline"
                          className="border-slate-600"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => exportRecording(recording)}
                          size="sm"
                          variant="outline"
                          className="border-slate-600"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {recordings.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recordings yet</p>
                  <p className="text-sm">Start your first session recording to build your library</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="mt-6 space-y-4">
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <Alert key={index} className={`border-slate-600 ${
                  insight.severity === 'success' ? 'bg-green-900/20' :
                  insight.severity === 'warning' ? 'bg-yellow-900/20' :
                  'bg-blue-900/20'
                }`}>
                  <BarChart3 className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-white">{insight.title}</h4>
                        {insight.metric && (
                          <Badge variant="outline" className="text-xs">
                            {insight.metric}
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm">{insight.description}</p>
                      {insight.suggestion && (
                        <p className="text-blue-300 text-sm italic">💡 {insight.suggestion}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
              
              {insights.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No insights available</p>
                  <p className="text-sm">Complete a recording to generate AI-powered insights</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default SessionRecorder;
