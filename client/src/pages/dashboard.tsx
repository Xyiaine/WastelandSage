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
    <div className="min-h-screen bg-steel-800 text-gray-200 font-sans">
      {/* Header */}
      <header className="metal-panel border-b-2 border-rust-500 p-4 mb-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-rust-500 rounded-lg flex items-center justify-center">
              <Skull className="text-steel-800 text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-rust-400">{t('app.title')}</h1>
              <p className="text-sm text-gray-400 font-mono">{t('app.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* AI Status Indicator */}
            <div className="flex items-center space-x-2 bg-steel-700 px-3 py-2 rounded-lg">
              <div className="w-2 h-2 bg-toxic-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-mono">AI Online</span>
            </div>

            {/* Session Timer */}
            <div className="bg-steel-700 px-3 py-2 rounded-lg font-mono text-sm">
              <span>{formatDuration(sessionDuration + (session?.duration || 0))}</span>
            </div>

            {/* Scenario Builder Button */}
            <Link href="/scenarios">
              <Button
                className="industrial-button px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
                data-testid="button-scenario-builder"
                onClick={(e) => {
                  console.log('Scenario Builder button clicked, navigating to /scenarios');
                  e.stopPropagation();
                }}
              >
                <MapPin className="mr-2 h-4 w-4" />
                {t('navigation.scenarios')}
              </Button>
            </Link>

            {/* Quick Export Button */}
            <Button
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/api/scenarios/export?userId=demo-user';
                link.download = `scenarios_export_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="industrial-button px-4 py-2 rounded-lg text-sm font-medium"
              data-testid="button-quick-export"
            >
              <Download className="mr-2 h-4 w-4" />
              {t('scenario.export')}
            </Button>

            {/* Export Button */}
            <Button
              onClick={handleExportSession}
              className="industrial-button px-4 py-2 rounded-lg text-sm font-medium"
              disabled={!session}
              data-testid="button-export"
            >
              <Download className="mr-2 h-4 w-4" />
              {t('common.save')}
            </Button>

            {/* Quick Session-Scenario Link Button */}
            {session && (
              <Button
                onClick={() => {
                  // Scroll to session-scenario linker component
                  const linkerElement = document.querySelector('[data-component="session-scenario-linker"]');
                  if (linkerElement) {
                    linkerElement.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="industrial-button px-4 py-2 rounded-lg text-sm font-medium"
                data-testid="button-manage-scenarios"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Link Scenarios
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pb-8">

        {/* Creator Mode Toggle */}
        <div className="flex justify-center mb-6">
          <CreatorModeToggle
            currentMode={creatorMode}
            onModeChange={handleCreatorModeChange}
          />
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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Left Column - Session Management */}
            <div className="space-y-6">
              {/* Session Builder */}
              {session && (
                <SessionBuilder
                  session={session as SessionData}
                  onSessionUpdate={(updates) => updateSessionMutation.mutate(updates)}
                />
              )}

              {/* Linked Scenarios Quick Access */}
              {session && (
                <LinkedScenariosPanel sessionId={session.id} />
              )}

              {/* Timeline Manager */}
              {session && (
                <TimelineManager
                  sessionId={session.id}
                  currentPhase={session.currentPhase}
                  onPhaseChange={(phase) => updateSessionMutation.mutate({ currentPhase: phase })}
                />
              )}
            </div>

            {/* Center Column - Node Graph */}
            <div className="xl:col-span-1">
              {currentSessionId && (
                <NodeGraph
                  sessionId={currentSessionId}
                  nodes={nodes as NodeData[]}
                  connections={connections as ConnectionData[]}
                />
              )}
            </div>

            {/* Right Column - AI Tools & Controls */}
            <div className="space-y-6">
              {/* Session-Scenario Linker */}
              <SessionScenarioLinker
                currentSessionId={session?.id}
                onLinkedScenariosUpdate={(scenarios) => {
                  console.log('Linked scenarios updated:', scenarios);
                }}
              />

              {/* Creator Mode Toggle */}
              <CreatorModeToggle
                currentMode={creatorMode}
                onModeChange={handleCreatorModeChange}
              />

              {/* Creator-Specific Controls */}
              <CreatorSpecificControls
                session={session}
                onSessionUpdate={(updates) => updateSessionMutation.mutate(updates)}
              />

              {/* Pacing Controls */}
              <PacingControls
                sessionId={currentSessionId}
                creatorMode={creatorMode}
              />

              {/* AI Event Generator */}
              <AiEventGenerator
                sessionId={currentSessionId}
                creatorMode={creatorMode}
                aiMode={(session?.aiMode as AiMode) || 'continuity'}
                nodes={nodes as NodeData[]}
                timelineEvents={timelineEvents as TimelineEventData[]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Menu */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        <Button
          className="industrial-button w-12 h-12 rounded-full flex items-center justify-center rust-glow"
          data-testid="button-quick-save"
        >
          <Save className="text-rust-400 h-5 w-5" />
        </Button>
        <Button
          className="industrial-button w-12 h-12 rounded-full flex items-center justify-center"
          data-testid="button-undo"
        >
          <Undo className="text-gray-400 h-5 w-5" />
        </Button>
        <Button
          className="industrial-button w-12 h-12 rounded-full flex items-center justify-center"
          data-testid="button-help"
        >
          <HelpCircle className="text-gray-400 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}