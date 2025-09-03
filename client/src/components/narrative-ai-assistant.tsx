/**
 * Narrative AI Assistant Component
 * 
 * Context-aware AI suggestions for events, complications, and story development
 * Uses current session state to generate relevant narrative elements
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { 
  Lightbulb, Zap, AlertTriangle, Users, 
  MapPin, RefreshCw, Copy, CheckCircle, Sparkles 
} from 'lucide-react';

interface NarrativeSuggestion {
  id: string;
  type: 'event' | 'complication' | 'npc' | 'opportunity';
  title: string;
  description: string;
  context: string;
  urgency: 'low' | 'medium' | 'high';
  implementationTips?: string[];
}

interface NarrativeAIProps {
  currentScenario?: any;
  sessionMode?: 'road' | 'city';
  currentPhase?: string;
  elapsedTime?: number;
  regions?: any[];
  onSuggestionImplement?: (suggestion: NarrativeSuggestion) => void;
}

const ROAD_SUGGESTIONS: NarrativeSuggestion[] = [
  {
    id: 'road-1',
    type: 'event',
    title: 'Abandoned Convoy Spotted',
    description: 'Characters discover a burned-out convoy with one survivor barely clinging to life. The survivor whispers about raiders with military-grade weapons before losing consciousness.',
    context: 'Early journey phase - builds tension',
    urgency: 'medium',
    implementationTips: [
      'Use this to introduce a major antagonist faction',
      'The survivor can provide crucial information if helped',
      'Create moral dilemma: help survivor vs. avoid detection'
    ]
  },
  {
    id: 'road-2',
    type: 'complication',
    title: 'Vehicle Breakdown',
    description: 'The party\'s primary vehicle starts making concerning noises. Oil leak detected. Immediate repair needed or risk complete breakdown in dangerous territory.',
    context: 'Mid-journey - resource management pressure',
    urgency: 'high',
    implementationTips: [
      'Requires Technology + Intelligence roll to diagnose',
      'Need spare parts or creative solutions',
      'Opportunity for teamwork and character development'
    ]
  },
  {
    id: 'road-3',
    type: 'opportunity',
    title: 'Hidden Cache Discovery',
    description: 'Sharp-eyed character notices unusual rock formation that conceals a pre-war emergency cache. Contains valuable supplies but may be trapped or claimed by others.',
    context: 'Reward observant players',
    urgency: 'low',
    implementationTips: [
      'Require Perception roll to notice',
      'Include mix of useful and expired supplies',
      'Add environmental storytelling clues'
    ]
  }
];

const CITY_SUGGESTIONS: NarrativeSuggestion[] = [
  {
    id: 'city-1',
    type: 'event',
    title: 'Political Assassination Attempt',
    description: 'During a routine meeting, shots ring out targeting a faction leader. The characters must decide whether to intervene, flee, or exploit the chaos.',
    context: 'High-stakes political drama',
    urgency: 'high',
    implementationTips: [
      'Creates immediate moral choice for players',
      'Multiple factions will react differently',
      'Consequences ripple through entire session'
    ]
  },
  {
    id: 'city-2',
    type: 'npc',
    title: 'Mysterious Information Broker',
    description: 'A well-dressed stranger approaches with an offer: valuable intelligence about enemy movements in exchange for a "small favor" to be collected later.',
    context: 'Social intrigue and future plot hooks',
    urgency: 'medium',
    implementationTips: [
      'Keep the "favor" deliberately vague',
      'Information should be genuinely useful',
      'Character has connections across multiple factions'
    ]
  },
  {
    id: 'city-3',
    type: 'complication',
    title: 'Resource Shortage Crisis',
    description: 'The city announces emergency rationing of the resource they control. Prices skyrocket, black markets emerge, and tensions between residents and outsiders escalate.',
    context: 'Economic pressure and social conflict',
    urgency: 'high',
    implementationTips: [
      'Affects all character interactions in the city',
      'Creates opportunities for smuggling or diplomacy',
      'NPCs become more desperate and unpredictable'
    ]
  }
];

export function NarrativeAIAssistant({ 
  currentScenario, 
  sessionMode = 'road', 
  currentPhase,
  elapsedTime,
  regions,
  onSuggestionImplement 
}: NarrativeAIProps) {
  const [suggestions, setSuggestions] = useState<NarrativeSuggestion[]>(
    sessionMode === 'road' ? ROAD_SUGGESTIONS : CITY_SUGGESTIONS
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [implementedSuggestions, setImplementedSuggestions] = useState<Set<string>>(new Set());

  // In a real implementation, this would make an API call to OpenAI
  const generateContextualSuggestion = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock contextual suggestion based on current state
    const contextualSuggestion: NarrativeSuggestion = {
      id: `generated-${Date.now()}`,
      type: 'event',
      title: sessionMode === 'road' ? 'Dust Storm Approaching' : 'Market Day Riot',
      description: sessionMode === 'road' 
        ? 'A massive dust storm appears on the horizon. The characters have minutes to find shelter or face reduced visibility, equipment damage, and potential separation.'
        : 'A dispute over water prices erupts into a full riot in the market district. Guards are overwhelmed, creating chaos but also opportunities.',
      context: `Generated for ${sessionMode} session, phase: ${currentPhase}`,
      urgency: 'high',
      implementationTips: [
        'Adapt difficulty based on character preparation',
        'Use environment to create dramatic moments',
        'Allow creative problem-solving approaches'
      ]
    };

    setSuggestions(prev => [contextualSuggestion, ...prev]);
    setIsGenerating(false);
  };

  const implementSuggestion = (suggestion: NarrativeSuggestion) => {
    setImplementedSuggestions(prev => new Set(prev).add(suggestion.id));
    onSuggestionImplement?.(suggestion);
    
    // Copy to clipboard for easy reference
    const fullText = `${suggestion.title}\n\n${suggestion.description}\n\nImplementation Tips:\n${suggestion.implementationTips?.join('\n') || 'None'}`;
    navigator.clipboard.writeText(fullText);
  };

  const getTypeIcon = (type: NarrativeSuggestion['type']) => {
    switch (type) {
      case 'event': return <Zap className="h-4 w-4" />;
      case 'complication': return <AlertTriangle className="h-4 w-4" />;
      case 'npc': return <Users className="h-4 w-4" />;
      case 'opportunity': return <MapPin className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: NarrativeSuggestion['type']) => {
    switch (type) {
      case 'event': return 'bg-blue-500';
      case 'complication': return 'bg-red-500';
      case 'npc': return 'bg-green-500';
      case 'opportunity': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyColor = (urgency: NarrativeSuggestion['urgency']) => {
    switch (urgency) {
      case 'high': return 'border-red-500 text-red-400';
      case 'medium': return 'border-yellow-500 text-yellow-400';
      case 'low': return 'border-green-500 text-green-400';
      default: return 'border-gray-500 text-gray-400';
    }
  };

  return (
    <Card className="w-full bg-slate-800 border-slate-600" data-testid="narrative-ai-assistant">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-white">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Narrative AI Assistant
          </span>
          <Badge variant="outline" className="text-blue-400 border-blue-400">
            {sessionMode === 'road' ? 'On the Road' : 'City Politics'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Generate New Suggestion */}
        <div className="flex items-center gap-3">
          <Button
            onClick={generateContextualSuggestion}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="button-generate-suggestion"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate Contextual Suggestion
          </Button>
          <div className="text-xs text-slate-400">
            Based on current session: {currentPhase || 'Active'}
          </div>
        </div>

        {/* Custom Prompt */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-white">Custom Prompt</div>
          <Textarea
            placeholder="Describe the current situation or what kind of narrative element you need..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
            rows={3}
            data-testid="textarea-custom-prompt"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!customPrompt.trim()}
            className="text-slate-300 border-slate-600"
            data-testid="button-generate-from-prompt"
          >
            Generate from Prompt
          </Button>
        </div>

        {/* Suggestions List */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white">
            Available Suggestions ({suggestions.length})
          </h4>
          <ScrollArea className="h-96" data-testid="scroll-suggestions">
            <div className="space-y-3">
              {suggestions.map((suggestion) => {
                const isImplemented = implementedSuggestions.has(suggestion.id);
                return (
                  <div 
                    key={suggestion.id}
                    className={`p-4 rounded-lg border transition-all ${
                      isImplemented 
                        ? 'bg-slate-700/30 border-green-500/30 opacity-60' 
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                    data-testid={`suggestion-${suggestion.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${getTypeColor(suggestion.type)}`}>
                          {getTypeIcon(suggestion.type)}
                        </div>
                        <h5 className="font-medium text-white">{suggestion.title}</h5>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getUrgencyColor(suggestion.urgency)}`}
                        >
                          {suggestion.urgency}
                        </Badge>
                        {isImplemented && <CheckCircle className="h-4 w-4 text-green-400" />}
                      </div>
                    </div>

                    <p className="text-slate-300 text-sm mb-3">{suggestion.description}</p>

                    <div className="text-xs text-slate-400 mb-3">
                      Context: {suggestion.context}
                    </div>

                    {suggestion.implementationTips && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-slate-300 mb-1">Implementation Tips:</div>
                        <ul className="text-xs text-slate-400 space-y-1">
                          {suggestion.implementationTips.map((tip, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-slate-500">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => implementSuggestion(suggestion)}
                        disabled={isImplemented}
                        className={
                          isImplemented 
                            ? "bg-green-600 text-white cursor-not-allowed" 
                            : "bg-blue-600 hover:bg-blue-700"
                        }
                        data-testid={`button-implement-${suggestion.id}`}
                      >
                        {isImplemented ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Implemented
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Use This
                          </>
                        )}
                      </Button>
                      <div className="text-xs text-slate-500">
                        {isImplemented ? 'Copied to clipboard' : 'Click to copy details'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}