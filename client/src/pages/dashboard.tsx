import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useTranslation } from 'react-i18next';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CreatorModeToggle } from "@/components/creator-mode-toggle";
import { SessionBuilder } from "@/components/session-builder";
import { NodeGraph } from "@/components/node-graph";
import { TimelineManager } from "@/components/timeline-manager";
import { PacingControls } from "@/components/pacing-controls";
import { AiEventGenerator } from "@/components/ai-event-generator";
import { CreatorSpecificControls } from "@/components/creator-specific-controls";
import { NPCGenerator } from "@/components/npc-generator";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Skull, Download, Save, Undo, HelpCircle, MapPin, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";
import type { CreatorMode, AiMode, SessionData, NodeData, ConnectionData, TimelineEventData } from "@/lib/types";
import type { Session, Node, Connection, TimelineEvent } from "@shared/schema";
import { SessionScenarioLinker } from "@/components/session-scenario-linker";
import { LinkedScenariosPanel } from "@/components/linked-scenarios-panel";
import { SessionNotes } from "@/components/session-notes";
import { SessionTracker } from "@/components/session-tracker";

export default function Dashboard() {
  const { sessionId } = useParams();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId || null);
  const [creatorMode, setCreatorMode] = useState<CreatorMode>('road');
  const [sessionDuration, setSessionDuration] = useState(0);

  // Create new session if none exists
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/sessions', {
        name: `Wasteland Session ${new Date().toLocaleDateString()}`,
        creatorMode: 'road',
        currentPhase: 0,
        duration: 0,
        aiMode: 'continuity'
      });
      return response.json();
    },
    onSuccess: (session: SessionData) => {
      setCurrentSessionId(session.id);
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      toast({
        title: t('messages.sessionCreated'),
        description: `${session.name} is ready for adventure.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Session",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Session data queries
  const { data: session, isLoading: sessionLoading } = useQuery<Session>({
    queryKey: ['/api/sessions', currentSessionId],
    enabled: !!currentSessionId,
  });

  const { data: nodes = [], isLoading: nodesLoading } = useQuery<Node[]>({
    queryKey: ['/api/sessions', currentSessionId, 'nodes'],
    enabled: !!currentSessionId,
  });

  const { data: connections = [], isLoading: connectionsLoading } = useQuery<Connection[]>({
    queryKey: ['/api/sessions', currentSessionId, 'connections'],
    enabled: !!currentSessionId,
  });

  const { data: timelineEvents = [], isLoading: timelineLoading } = useQuery<TimelineEvent[]>({
    queryKey: ['/api/sessions', currentSessionId, 'timeline'],
    enabled: !!currentSessionId,
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (updates: Partial<Session>) => {
      const response = await apiRequest('PATCH', `/api/sessions/${currentSessionId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', currentSessionId] });
    }
  });

  // Initialize session if needed
  useEffect(() => {
    if (!currentSessionId && !createSessionMutation.isPending) {
      createSessionMutation.mutate();
    }
  }, [currentSessionId]);

  // Update creator mode when session changes
  useEffect(() => {
    if (session && session.creatorMode !== creatorMode) {
      setCreatorMode(session.creatorMode as CreatorMode);
    }
  }, [session]);

  // Update session duration timer
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [session]);

  const handleCreatorModeChange = (mode: CreatorMode) => {
    setCreatorMode(mode);
    if (currentSessionId) {
      updateSessionMutation.mutate({ creatorMode: mode });
    }
  };

  const handleExportSession = () => {
    if (!session || !timelineEvents.length) {
      toast({
        title: "Nothing to Export",
        description: "No session data or timeline events found.",
        variant: "destructive",
      });
      return;
    }

    const exportData = {
      session,
      nodes,
      connections,
      timelineEvents,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Session Exported",
      description: "Session data has been downloaded.",
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (createSessionMutation.isPending) {
    return (
      <div className="min-h-screen bg-steel-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-rust-500 rounded-lg flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Skull className="text-steel-800 text-xl" />
          </div>
          <p className="text-rust-400 font-mono">{t('session.loading')}</p>
        </div>
      </div>
    );
  }

  const isLoading = sessionLoading || nodesLoading || connectionsLoading || timelineLoading;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimalist Header */}
      <header className="header-minimal sticky top-0 z-50 py-4">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 gradient-rust rounded-lg flex items-center justify-center shadow-lg">
              <Skull className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-light tracking-wide text-foreground">{t('app.title')}</h1>
              <p className="text-xs text-muted-foreground font-mono opacity-75">{t('app.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* AI Status - Minimal */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30">
              <div className="status-dot status-active"></div>
              <span className="text-xs font-medium">AI</span>
            </div>

            {/* Session Timer - Minimal */}
            <div className="px-3 py-1.5 rounded-full bg-muted/30 font-mono text-xs">
              {formatDuration(sessionDuration + (session?.duration || 0))}
            </div>

            {/* Clean Action Buttons */}
            <div className="flex items-center gap-2">
              <Link href="/scenarios">
                <Button
                  variant="ghost"
                  size="sm"
                  className="btn-ghost"
                  data-testid="button-scenario-builder"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </Link>

              <Button
                onClick={handleExportSession}
                variant="ghost"
                size="sm"
                className="btn-ghost"
                disabled={!session}
                data-testid="button-export"
              >
                <Download className="h-4 w-4" />
              </Button>

              {session && (
                <Button
                  onClick={() => {
                    const linkerElement = document.querySelector('[data-component="session-scenario-linker"]');
                    if (linkerElement) {
                      linkerElement.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className="btn-ghost"
                  data-testid="button-manage-scenarios"
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Creator Mode Toggle - Minimal */}
        <div className="flex justify-center mb-8">
          <div className="glass-card rounded-full p-1">
            <CreatorModeToggle
              currentMode={creatorMode}
              onModeChange={handleCreatorModeChange}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="metal-panel rounded-lg p-6 h-96 animate-pulse">
                <div className="h-6 bg-steel-600 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-steel-600 rounded"></div>
                  <div className="h-4 bg-steel-600 rounded w-3/4"></div>
                  <div className="h-4 bg-steel-600 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

            {/* Left Column - Session Management */}
            <div className="xl:col-span-4 space-y-6 animate-fade-in-up">
              {/* Session Builder */}
              {session && (
                <div className="card-minimal">
                  <SessionBuilder
                    session={session as SessionData}
                    onSessionUpdate={(updates) => updateSessionMutation.mutate(updates)}
                  />
                </div>
              )}

              {/* Linked Scenarios Quick Access */}
              {session && (
                <div className="card-minimal">
                  <LinkedScenariosPanel sessionId={session.id} />
                </div>
              )}

              {/* Session Notes & Progress */}
              {session && (
                <div className="card-minimal">
                  <SessionNotes
                    sessionId={session.id}
                    scenarioId={undefined}
                    players={['Player 1', 'Player 2', 'Player 3']}
                  />
                </div>
              )}
            </div>

            {/* Center Column - Node Graph */}
            <div className="xl:col-span-5 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              {currentSessionId && (
                <div className="card-minimal h-[800px]">
                  <NodeGraph
                    sessionId={currentSessionId}
                    nodes={nodes as NodeData[]}
                    connections={connections as ConnectionData[]}
                  />
                </div>
              )}
            </div>

            {/* Right Column - AI Tools & Controls */}
            <div className="xl:col-span-3 space-y-6 animate-slide-in-right">
              {/* Session Tracker */}
              {session && (
                <div className="card-compact">
                  <SessionTracker
                    sessionId={session.id}
                    scenarioId={undefined}
                    players={['Player 1', 'Player 2', 'Player 3']}
                  />
                </div>
              )}

              {/* Session-Scenario Linker */}
              <div className="card-compact">
                <SessionScenarioLinker
                  currentSessionId={session?.id}
                  onLinkedScenariosUpdate={(scenarios) => {
                    console.log('Linked scenarios updated:', scenarios);
                  }}
                />
              </div>

              {/* Creator-Specific Controls */}
              <div className="card-compact">
                <CreatorSpecificControls
                  session={session}
                  onSessionUpdate={(updates) => updateSessionMutation.mutate(updates)}
                />
              </div>

              {/* Timeline Manager */}
              {session && (
                <div className="card-compact">
                  <TimelineManager
                    sessionId={session.id}
                    currentPhase={session.currentPhase}
                    onPhaseChange={(phase) => updateSessionMutation.mutate({ currentPhase: phase })}
                  />
                </div>
              )}

              {/* Pacing Controls */}
              <div className="card-compact">
                <PacingControls
                  sessionId={currentSessionId}
                  creatorMode={creatorMode}
                />
              </div>

              {/* AI Event Generator */}
              <div className="card-compact">
                <AiEventGenerator
                  sessionId={currentSessionId}
                  creatorMode={creatorMode}
                  aiMode={(session?.aiMode as AiMode) || 'continuity'}
                  nodes={nodes as NodeData[]}
                  timelineEvents={timelineEvents as TimelineEventData[]}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Menu - Minimalist */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3">
        <Button
          className="fab w-12 h-12 rounded-full shadow-2xl"
          data-testid="button-quick-save"
        >
          <Save className="h-5 w-5 text-white" />
        </Button>
        <Button
          className="glass-card w-10 h-10 rounded-full hover:bg-muted/20 border-0"
          data-testid="button-undo"
        >
          <Undo className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button
          className="glass-card w-10 h-10 rounded-full hover:bg-muted/20 border-0"
          data-testid="button-help"
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}