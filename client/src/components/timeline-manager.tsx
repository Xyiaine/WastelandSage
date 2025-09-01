import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Download, Edit, Clock } from "lucide-react";
import type { TimelineEventData, SessionPhase, CreatorMode } from "@/lib/types";

interface TimelineManagerProps {
  sessionId: string;
  events: TimelineEventData[];
}

export function TimelineManager({ sessionId, events }: TimelineManagerProps) {
  const { toast } = useToast();
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEventData | null>(null);
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    phase: 'exploration' as SessionPhase,
    duration: 30,
    creatorMode: 'road' as CreatorMode
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: typeof newEvent) => {
      const response = await apiRequest('POST', '/api/timeline-events', {
        sessionId,
        ...eventData,
        orderIndex: (events && events.length) || 0,
        isCompleted: 'false'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'timeline'] });
      setIsAddingEvent(false);
      setNewEvent({
        name: '',
        description: '',
        phase: 'exploration',
        duration: 30,
        creatorMode: 'road'
      });
      toast({
        title: "Event Added",
        description: "Timeline event has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Event",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TimelineEventData> }) => {
      const response = await apiRequest('PATCH', `/api/timeline-events/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'timeline'] });
      setEditingEvent(null);
      toast({
        title: "Event Updated",
        description: "Timeline event has been modified.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Event",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const exportTimeline = () => {
    if (events.length === 0) {
      toast({
        title: "No Events to Export",
        description: "Timeline is empty.",
        variant: "destructive",
      });
      return;
    }

    const timelineText = events
      .map((event, index) => {
        return `${index + 1}. ${event.name} (${event.phase}, ${event.duration}min)\n   ${event.description || 'No description'}\n   Mode: ${event.creatorMode} | Status: ${event.isCompleted === 'true' ? 'Completed' : 'Pending'}\n`;
      })
      .join('\n');

    const blob = new Blob([timelineText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Timeline Exported",
      description: "Timeline has been downloaded as text file.",
    });
  };

  const toggleEventCompletion = (event: TimelineEventData) => {
    updateEventMutation.mutate({
      id: event.id,
      updates: { isCompleted: event.isCompleted === 'true' ? 'false' : 'true' }
    });
  };

  const getPhaseColor = (phase: SessionPhase) => {
    switch (phase) {
      case 'hook': return 'border-toxic-400';
      case 'exploration': return 'border-rust-400';
      case 'rising_tension': return 'border-yellow-400';
      case 'climax': return 'border-red-400';
      case 'resolution': return 'border-blue-400';
      default: return 'border-gray-400';
    }
  };

  const getModeColor = (mode: CreatorMode) => {
    return mode === 'road' ? 'bg-rust-500' : 'bg-brass-500';
  };

  const handleCreateEvent = () => {
    if (!newEvent.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter an event name.",
        variant: "destructive",
      });
      return;
    }
    createEventMutation.mutate(newEvent);
  };

  return (
    <div className="metal-panel rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-rust-400">Session Timeline</h2>
        <Button 
          onClick={exportTimeline}
          size="sm"
          className="industrial-button"
          disabled={!events || events.length === 0}
          data-testid="button-export-timeline"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Timeline Events */}
      <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
        {!events || events.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No timeline events yet.</p>
            <p className="text-sm">Generate or create events to build your session timeline.</p>
          </div>
        ) : (
          events?.map((event, index) => (
            <div 
              key={event.id}
              className={`flex items-start space-x-3 p-3 bg-steel-700 rounded-lg border-l-4 ${getPhaseColor(event.phase)} ${
                event.isCompleted === 'true' ? 'opacity-75' : ''
              }`}
              data-testid={`timeline-event-${index}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 ${getModeColor(event.creatorMode)} rounded-full flex items-center justify-center text-xs font-mono text-white`}>
                {index + 1}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{event.name}</h4>
                  <span className="text-xs text-gray-400 font-mono">
                    {new Date(event.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                {event.description && (
                  <p className="text-xs text-gray-300 mt-1">{event.description}</p>
                )}
                <div className="flex items-center space-x-2 mt-2">
                  <span className={`${getModeColor(event.creatorMode)} text-white px-2 py-1 rounded text-xs`}>
                    {event.creatorMode === 'road' ? 'Road' : 'City'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {event.duration} min • {event.phase.replace('_', ' ')}
                  </span>
                  {event.isCompleted === 'true' && (
                    <span className="text-xs text-toxic-400">✓ Completed</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                <Button 
                  onClick={() => toggleEventCompletion(event)}
                  size="sm"
                  variant="ghost"
                  className="p-1 h-auto text-gray-400 hover:text-white"
                  data-testid={`button-toggle-event-${index}`}
                >
                  {event.isCompleted === 'true' ? '↶' : '✓'}
                </Button>
                <Button 
                  onClick={() => setEditingEvent(event)}
                  size="sm"
                  variant="ghost"
                  className="p-1 h-auto text-gray-400 hover:text-white"
                  data-testid={`button-edit-event-${index}`}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-steel-600 text-center">
        <Dialog open={isAddingEvent} onOpenChange={setIsAddingEvent}>
          <DialogTrigger asChild>
            <Button 
              className="industrial-button px-4 py-2 rounded-lg text-sm"
              data-testid="button-add-timeline-event"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Manual Event
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-steel-800 border-steel-600">
            <DialogHeader>
              <DialogTitle className="text-rust-400">Create Timeline Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Event Name</label>
                <Input
                  value={newEvent.name}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-steel-700 border-steel-500"
                  placeholder="Enter event name..."
                  data-testid="input-event-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-steel-700 border-steel-500"
                  placeholder="Describe what happens..."
                  data-testid="textarea-event-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Phase</label>
                  <Select value={newEvent.phase} onValueChange={(value: SessionPhase) => setNewEvent(prev => ({ ...prev, phase: value }))}>
                    <SelectTrigger className="bg-steel-700 border-steel-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hook">Hook</SelectItem>
                      <SelectItem value="exploration">Exploration</SelectItem>
                      <SelectItem value="rising_tension">Rising Tension</SelectItem>
                      <SelectItem value="climax">Climax</SelectItem>
                      <SelectItem value="resolution">Resolution</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Creator Mode</label>
                  <Select value={newEvent.creatorMode} onValueChange={(value: CreatorMode) => setNewEvent(prev => ({ ...prev, creatorMode: value }))}>
                    <SelectTrigger className="bg-steel-700 border-steel-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="road">Road</SelectItem>
                      <SelectItem value="city">City</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                <Input
                  type="number"
                  value={newEvent.duration}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                  className="bg-steel-700 border-steel-500"
                  min="5"
                  max="120"
                  data-testid="input-event-duration"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  onClick={() => setIsAddingEvent(false)}
                  variant="outline"
                  className="border-steel-500"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateEvent}
                  disabled={createEventMutation.isPending}
                  className="btn-rust"
                  data-testid="button-create-timeline-event"
                >
                  {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Event Dialog */}
      {editingEvent && (
        <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
          <DialogContent className="bg-steel-800 border-steel-600">
            <DialogHeader>
              <DialogTitle className="text-rust-400">Edit Timeline Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Event Name</label>
                <Input
                  value={editingEvent.name}
                  onChange={(e) => setEditingEvent(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="bg-steel-700 border-steel-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={editingEvent.description || ''}
                  onChange={(e) => setEditingEvent(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="bg-steel-700 border-steel-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  onClick={() => setEditingEvent(null)}
                  variant="outline"
                  className="border-steel-500"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (editingEvent) {
                      updateEventMutation.mutate({
                        id: editingEvent.id,
                        updates: {
                          name: editingEvent.name,
                          description: editingEvent.description
                        }
                      });
                    }
                  }}
                  disabled={updateEventMutation.isPending}
                  className="btn-rust"
                >
                  {updateEventMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
