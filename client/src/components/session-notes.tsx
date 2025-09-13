
/**
 * Session Notes Component - Real-time note-taking and progress tracking
 * 
 * This component provides game masters with:
 * - Real-time note-taking during sessions
 * - Player choice tracking and decision history
 * - Scenario progression markers
 * - Quick search through session history
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { 
  Plus, 
  Save, 
  Search, 
  Clock, 
  Users, 
  MapPin, 
  BookOpen, 
  Edit3,
  Trash2,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react';

interface SessionNote {
  id: string;
  sessionId: string;
  type: 'general' | 'player_choice' | 'progress' | 'npc_interaction' | 'location' | 'combat';
  title: string;
  content: string;
  timestamp: Date;
  tags: string[];
  playersInvolved?: string[];
  location?: string;
  importance: 'low' | 'medium' | 'high';
}

interface PlayerChoice {
  id: string;
  sessionId: string;
  description: string;
  consequences: string;
  timestamp: Date;
  playersInvolved: string[];
  scenarioContext?: string;
}

interface ProgressMarker {
  id: string;
  sessionId: string;
  scenarioId?: string;
  milestone: string;
  description: string;
  completed: boolean;
  timestamp: Date;
  nextSteps?: string[];
}

interface SessionNotesProps {
  sessionId: string;
  scenarioId?: string;
  players?: string[];
}

export function SessionNotes({ sessionId, scenarioId, players = [] }: SessionNotesProps) {
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [playerChoices, setPlayerChoices] = useState<PlayerChoice[]>([]);
  const [progressMarkers, setProgressMarkers] = useState<ProgressMarker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('notes');

  // Note form state
  const [newNote, setNewNote] = useState({
    type: 'general' as SessionNote['type'],
    title: '',
    content: '',
    tags: [] as string[],
    playersInvolved: [] as string[],
    location: '',
    importance: 'medium' as SessionNote['importance']
  });

  // Player choice form state
  const [newChoice, setNewChoice] = useState({
    description: '',
    consequences: '',
    playersInvolved: [] as string[],
    scenarioContext: ''
  });

  // Progress marker form state
  const [newProgress, setNewProgress] = useState({
    milestone: '',
    description: '',
    nextSteps: [] as string[]
  });

  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [showNewChoiceForm, setShowNewChoiceForm] = useState(false);
  const [showNewProgressForm, setShowNewProgressForm] = useState(false);

  // Load session data from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem(`session-notes-${sessionId}`);
    const savedChoices = localStorage.getItem(`session-choices-${sessionId}`);
    const savedProgress = localStorage.getItem(`session-progress-${sessionId}`);

    if (savedNotes) setNotes(JSON.parse(savedNotes));
    if (savedChoices) setPlayerChoices(JSON.parse(savedChoices));
    if (savedProgress) setProgressMarkers(JSON.parse(savedProgress));
  }, [sessionId]);

  // Save to localStorage
  const saveToStorage = () => {
    localStorage.setItem(`session-notes-${sessionId}`, JSON.stringify(notes));
    localStorage.setItem(`session-choices-${sessionId}`, JSON.stringify(playerChoices));
    localStorage.setItem(`session-progress-${sessionId}`, JSON.stringify(progressMarkers));
  };

  useEffect(() => {
    saveToStorage();
  }, [notes, playerChoices, progressMarkers]);

  // Add new note
  const addNote = () => {
    if (!newNote.title || !newNote.content) return;

    const note: SessionNote = {
      id: `note-${Date.now()}`,
      sessionId,
      ...newNote,
      timestamp: new Date(),
      tags: newNote.tags.filter(tag => tag.trim() !== '')
    };

    setNotes(prev => [note, ...prev]);
    setNewNote({
      type: 'general',
      title: '',
      content: '',
      tags: [],
      playersInvolved: [],
      location: '',
      importance: 'medium'
    });
    setShowNewNoteForm(false);
  };

  // Add player choice
  const addPlayerChoice = () => {
    if (!newChoice.description) return;

    const choice: PlayerChoice = {
      id: `choice-${Date.now()}`,
      sessionId,
      ...newChoice,
      timestamp: new Date()
    };

    setPlayerChoices(prev => [choice, ...prev]);
    setNewChoice({
      description: '',
      consequences: '',
      playersInvolved: [],
      scenarioContext: ''
    });
    setShowNewChoiceForm(false);
  };

  // Add progress marker
  const addProgressMarker = () => {
    if (!newProgress.milestone) return;

    const marker: ProgressMarker = {
      id: `progress-${Date.now()}`,
      sessionId,
      scenarioId,
      ...newProgress,
      completed: false,
      timestamp: new Date(),
      nextSteps: newProgress.nextSteps.filter(step => step.trim() !== '')
    };

    setProgressMarkers(prev => [marker, ...prev]);
    setNewProgress({
      milestone: '',
      description: '',
      nextSteps: []
    });
    setShowNewProgressForm(false);
  };

  // Toggle progress completion
  const toggleProgress = (id: string) => {
    setProgressMarkers(prev =>
      prev.map(marker =>
        marker.id === id ? { ...marker, completed: !marker.completed } : marker
      )
    );
  };

  // Delete items
  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const deleteChoice = (id: string) => {
    setPlayerChoices(prev => prev.filter(choice => choice.id !== id));
  };

  const deleteProgress = (id: string) => {
    setProgressMarkers(prev => prev.filter(marker => marker.id !== id));
  };

  // Filter content based on search
  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredChoices = playerChoices.filter(choice =>
    choice.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    choice.consequences.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProgress = progressMarkers.filter(marker =>
    marker.milestone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    marker.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: SessionNote['type']) => {
    switch (type) {
      case 'player_choice': return <Users className="h-4 w-4" />;
      case 'progress': return <CheckCircle className="h-4 w-4" />;
      case 'npc_interaction': return <User className="h-4 w-4" />;
      case 'location': return <MapPin className="h-4 w-4" />;
      case 'combat': return <AlertCircle className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getImportanceColor = (importance: SessionNote['importance']) => {
    switch (importance) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="heading-minimal flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-rust" />
            Session Notes
          </h2>
          <p className="text-minimal mt-1">
            Track player choices, take notes, and monitor scenario progress
          </p>
        </div>
        <Button
          onClick={saveToStorage}
          size="sm"
          className="btn-rust"
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
      <Card>
      <CardContent>
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search notes, choices, and progress..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 glass-card rounded-lg p-1 h-auto">
            <TabsTrigger 
              value="notes" 
              className="text-foreground data-[state=active]:bg-rust-500/20 data-[state=active]:text-rust-500 text-xs sm:text-sm px-2 py-2 whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
              data-testid="tab-notes"
            >
              <span className="hidden sm:inline">Notes</span>
              <span className="sm:hidden">N</span>
              {' '}({filteredNotes.length})
            </TabsTrigger>
            <TabsTrigger 
              value="choices" 
              className="text-foreground data-[state=active]:bg-rust-500/20 data-[state=active]:text-rust-500 text-xs sm:text-sm px-2 py-2 whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
              data-testid="tab-choices"
            >
              <span className="hidden sm:inline">Choices</span>
              <span className="sm:hidden">C</span>
              {' '}({filteredChoices.length})
            </TabsTrigger>
            <TabsTrigger 
              value="progress" 
              className="text-foreground data-[state=active]:bg-rust-500/20 data-[state=active]:text-rust-500 text-xs sm:text-sm px-2 py-2 whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
              data-testid="tab-progress"
            >
              <span className="hidden sm:inline">Progress</span>
              <span className="sm:hidden">P</span>
              {' '}({filteredProgress.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Session Notes</h3>
                <Button
                  onClick={() => setShowNewNoteForm(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>

              {/* New Note Form */}
              {showNewNoteForm && (
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Type</Label>
                        <select
                          value={newNote.type}
                          onChange={(e) => setNewNote(prev => ({ ...prev, type: e.target.value as SessionNote['type'] }))}
                          className="input-minimal w-full"
                        >
                          <option value="general">General Note</option>
                          <option value="player_choice">Player Choice</option>
                          <option value="progress">Progress Update</option>
                          <option value="npc_interaction">NPC Interaction</option>
                          <option value="location">Location Note</option>
                          <option value="combat">Combat Note</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-white">Importance</Label>
                        <select
                          value={newNote.importance}
                          onChange={(e) => setNewNote(prev => ({ ...prev, importance: e.target.value as SessionNote['importance'] }))}
                          className="w-full bg-slate-600 border-slate-500 text-white rounded px-3 py-2"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-white">Title</Label>
                      <Input
                        value={newNote.title}
                        onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Brief note title..."
                        className="input-minimal"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Content</Label>
                      <Textarea
                        value={newNote.content}
                        onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Detailed note content..."
                        className="input-minimal h-24 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Tags (comma-separated)</Label>
                        <Input
                          value={newNote.tags.join(', ')}
                          onChange={(e) => setNewNote(prev => ({ 
                            ...prev, 
                            tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean) 
                          }))}
                          placeholder="combat, important, npc-name..."
                          className="bg-slate-600 border-slate-500 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Location</Label>
                        <Input
                          value={newNote.location}
                          onChange={(e) => setNewNote(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Current location..."
                          className="bg-slate-600 border-slate-500 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => setShowNewNoteForm(false)}
                        className="btn-ghost"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button onClick={addNote} className="btn-rust" size="sm">
                        Add Note
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes List */}
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredNotes.map((note) => (
                    <Card key={note.id} className="bg-slate-700/50 border-slate-600">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(note.type)}
                            <h4 className="font-semibold text-white">{note.title}</h4>
                            <Badge variant={getImportanceColor(note.importance)} className="text-xs">
                              {note.importance}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {new Date(note.timestamp).toLocaleTimeString()}
                            </span>
                            <Button
                              onClick={() => deleteNote(note.id)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-slate-300 text-sm mb-2">{note.content}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {note.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs text-orange-300 border-orange-400">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        {note.location && (
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <MapPin className="h-3 w-3" />
                            {note.location}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {filteredNotes.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No notes yet</p>
                      <p className="text-sm">Start documenting your session</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="choices" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Player Choices</h3>
                <Button
                  onClick={() => setShowNewChoiceForm(true)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record Choice
                </Button>
              </div>

              {/* New Choice Form */}
              {showNewChoiceForm && (
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label className="text-white">Player Decision</Label>
                      <Textarea
                        value={newChoice.description}
                        onChange={(e) => setNewChoice(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="What did the players decide to do?"
                        className="bg-slate-600 border-slate-500 text-white h-20"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Consequences & Outcomes</Label>
                      <Textarea
                        value={newChoice.consequences}
                        onChange={(e) => setNewChoice(prev => ({ ...prev, consequences: e.target.value }))}
                        placeholder="What were the results of their choice?"
                        className="bg-slate-600 border-slate-500 text-white h-20"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Scenario Context</Label>
                      <Input
                        value={newChoice.scenarioContext}
                        onChange={(e) => setNewChoice(prev => ({ ...prev, scenarioContext: e.target.value }))}
                        placeholder="Which scenario or situation?"
                        className="bg-slate-600 border-slate-500 text-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => setShowNewChoiceForm(false)}
                        variant="outline"
                        className="border-slate-600 text-slate-300"
                      >
                        Cancel
                      </Button>
                      <Button onClick={addPlayerChoice} className="bg-green-600 hover:bg-green-700">
                        Record Choice
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Choices List */}
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredChoices.map((choice) => (
                    <Card key={choice.id} className="bg-slate-700/50 border-slate-600">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-400" />
                            <span className="text-xs text-slate-400">
                              {new Date(choice.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <Button
                            onClick={() => deleteChoice(choice.id)}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <h5 className="font-medium text-white text-sm">Decision:</h5>
                            <p className="text-slate-300 text-sm">{choice.description}</p>
                          </div>
                          {choice.consequences && (
                            <div>
                              <h5 className="font-medium text-white text-sm">Consequences:</h5>
                              <p className="text-slate-300 text-sm">{choice.consequences}</p>
                            </div>
                          )}
                          {choice.scenarioContext && (
                            <div className="text-xs text-slate-400">
                              Context: {choice.scenarioContext}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredChoices.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No player choices recorded</p>
                      <p className="text-sm">Track important decisions and their outcomes</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Scenario Progress</h3>
                <Button
                  onClick={() => setShowNewProgressForm(true)}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </div>

              {/* New Progress Form */}
              {showNewProgressForm && (
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label className="text-white">Milestone</Label>
                      <Input
                        value={newProgress.milestone}
                        onChange={(e) => setNewProgress(prev => ({ ...prev, milestone: e.target.value }))}
                        placeholder="Achievement or progress milestone..."
                        className="bg-slate-600 border-slate-500 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Description</Label>
                      <Textarea
                        value={newProgress.description}
                        onChange={(e) => setNewProgress(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Detailed description of the progress..."
                        className="bg-slate-600 border-slate-500 text-white h-20"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Next Steps (one per line)</Label>
                      <Textarea
                        value={newProgress.nextSteps.join('\n')}
                        onChange={(e) => setNewProgress(prev => ({ 
                          ...prev, 
                          nextSteps: e.target.value.split('\n').filter(step => step.trim() !== '') 
                        }))}
                        placeholder="What should happen next..."
                        className="bg-slate-600 border-slate-500 text-white h-20"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => setShowNewProgressForm(false)}
                        variant="outline"
                        className="border-slate-600 text-slate-300"
                      >
                        Cancel
                      </Button>
                      <Button onClick={addProgressMarker} className="bg-purple-600 hover:bg-purple-700">
                        Add Milestone
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Progress List */}
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredProgress.map((marker) => (
                    <Card key={marker.id} className="bg-slate-700/50 border-slate-600">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => toggleProgress(marker.id)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                            >
                              <CheckCircle className={`h-4 w-4 ${marker.completed ? 'text-green-400' : 'text-slate-500'}`} />
                            </Button>
                            <h4 className={`font-semibold ${marker.completed ? 'text-green-400 line-through' : 'text-white'}`}>
                              {marker.milestone}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {new Date(marker.timestamp).toLocaleTimeString()}
                            </span>
                            <Button
                              onClick={() => deleteProgress(marker.id)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-slate-300 text-sm mb-2">{marker.description}</p>
                        {marker.nextSteps && marker.nextSteps.length > 0 && (
                          <div>
                            <h5 className="font-medium text-white text-sm mb-1">Next Steps:</h5>
                            <ul className="text-slate-300 text-sm space-y-1">
                              {marker.nextSteps.map((step, index) => (
                                <li key={index} className="flex items-center gap-2">
                                  <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {filteredProgress.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No progress markers yet</p>
                      <p className="text-sm">Track milestones and achievements</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </div>
  );
}
