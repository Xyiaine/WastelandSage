
/**
 * Advanced Search Component - Intelligent content discovery and relationship mapping
 * 
 * Features:
 * - Semantic search across scenarios, regions, NPCs, and quests
 * - AI-powered content suggestions based on context
 * - Visual relationship mapping
 * - Smart filtering with natural language queries
 * - Content recommendation engine
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Search, 
  Brain, 
  MapPin, 
  Users, 
  Target, 
  AlertTriangle, 
  Lightbulb, 
  Network,
  Filter,
  Zap,
  Clock,
  Star,
  TrendingUp
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

// Types for search results
interface SearchResult {
  id: string;
  type: 'scenario' | 'region' | 'npc' | 'quest' | 'condition';
  title: string;
  description: string;
  relevanceScore: number;
  context: any;
  tags: string[];
  relationships: SearchRelationship[];
}

interface SearchRelationship {
  targetId: string;
  targetType: string;
  targetTitle: string;
  relationshipType: 'contains' | 'controls' | 'conflicts_with' | 'trades_with' | 'depends_on';
  strength: number;
}

interface SearchSuggestion {
  id: string;
  query: string;
  type: 'semantic' | 'related' | 'trending';
  relevance: number;
  context: string;
}

interface ContentRecommendation {
  id: string;
  title: string;
  type: string;
  reason: string;
  confidence: number;
  suggestedAction: string;
}

interface AdvancedSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  onSuggestionApply?: (suggestion: SearchSuggestion) => void;
  currentContext?: {
    sessionId?: string;
    scenarioId?: string;
    creatorMode?: 'road' | 'city';
  };
}

const SEARCH_TYPES = [
  { value: 'all', label: 'Everything', icon: Search },
  { value: 'scenario', label: 'Scenarios', icon: MapPin },
  { value: 'region', label: 'Regions', icon: MapPin },
  { value: 'npc', label: 'NPCs', icon: Users },
  { value: 'quest', label: 'Quests', icon: Target },
  { value: 'condition', label: 'Conditions', icon: AlertTriangle }
];

const RELATIONSHIP_ICONS = {
  contains: MapPin,
  controls: Users,
  conflicts_with: AlertTriangle,
  trades_with: Target,
  depends_on: Network
};

export function AdvancedSearch({ 
  onResultSelect, 
  onSuggestionApply, 
  currentContext 
}: AdvancedSearchProps) {
  const { t } = useTranslation();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recommendations, setRecommendations] = useState<ContentRecommendation[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('results');
  
  // Debounced search to avoid excessive API calls
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  // Mock data for demonstration (would connect to real APIs)
  const mockSearchResults: SearchResult[] = [
    {
      id: 'scenario-1',
      type: 'scenario',
      title: 'The Crimson Trade Wars',
      description: 'A scenario focused on inter-city conflicts over rare earth metals and water rights.',
      relevanceScore: 0.95,
      context: { creatorMode: 'city', themes: ['politics', 'trade', 'warfare'] },
      tags: ['politics', 'trade', 'city-states', 'resources'],
      relationships: [
        {
          targetId: 'region-1',
          targetType: 'region',
          targetTitle: 'Industrial City - Les Forgerons d\'Acier',
          relationshipType: 'contains',
          strength: 0.9
        }
      ]
    },
    {
      id: 'npc-1',
      type: 'npc',
      title: 'Marcus "Iron Hand" Voss',
      description: 'Ruthless faction leader controlling northern trade routes and metal refineries.',
      relevanceScore: 0.88,
      context: { importance: 'critical', faction: 'Steel Merchants Guild' },
      tags: ['leader', 'trade', 'industry', 'antagonist'],
      relationships: [
        {
          targetId: 'region-1',
          targetType: 'region',
          targetTitle: 'Industrial City',
          relationshipType: 'controls',
          strength: 0.85
        }
      ]
    },
    {
      id: 'region-1',
      type: 'region',
      title: 'Industrial City - Les Forgerons d\'Acier',
      description: 'Massive industrial complex specializing in metal work, machinery, and weapons manufacturing.',
      relevanceScore: 0.82,
      context: { type: 'industrial', threatLevel: 3, population: 45000 },
      tags: ['industrial', 'manufacturing', 'weapons', 'city-state'],
      relationships: []
    }
  ];

  const mockSuggestions: SearchSuggestion[] = [
    {
      id: 'sug-1',
      query: 'fuel shortage crisis',
      type: 'semantic',
      relevance: 0.9,
      context: 'Based on your current scenario themes'
    },
    {
      id: 'sug-2',
      query: 'Mediterranean trade disputes',
      type: 'related',
      relevance: 0.85,
      context: 'Related to your current setting'
    },
    {
      id: 'sug-3',
      query: 'NPC faction leaders',
      type: 'trending',
      relevance: 0.8,
      context: 'Popular with other GMs this week'
    }
  ];

  const mockRecommendations: ContentRecommendation[] = [
    {
      id: 'rec-1',
      title: 'Water Rights Negotiation Quest',
      type: 'quest',
      reason: 'Complements your current trade-focused scenario',
      confidence: 0.92,
      suggestedAction: 'Add to current scenario'
    },
    {
      id: 'rec-2',
      title: 'Dr. Elena Vasquez - Water Engineer',
      type: 'npc',
      reason: 'Expert character for water-related storylines',
      confidence: 0.87,
      suggestedAction: 'Generate full character sheet'
    }
  ];

  // Search function with AI-enhanced relevance
  const performSearch = useCallback(async (query: string, type: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      // Simulate API call with intelligent filtering
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let filteredResults = mockSearchResults;
      
      // Apply type filter
      if (type !== 'all') {
        filteredResults = filteredResults.filter(result => result.type === type);
      }
      
      // Apply text search with relevance scoring
      const searchTerms = query.toLowerCase().split(' ');
      filteredResults = filteredResults.filter(result => {
        const searchableText = `${result.title} ${result.description} ${result.tags.join(' ')}`.toLowerCase();
        return searchTerms.some(term => searchableText.includes(term));
      });
      
      // Sort by relevance score
      filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      setResults(filteredResults);
      
      // Update search history
      if (!searchHistory.includes(query)) {
        setSearchHistory(prev => [query, ...prev.slice(0, 4)]);
      }
      
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchHistory]);

  // Generate AI suggestions based on context
  const generateSuggestions = useCallback(async () => {
    try {
      // Simulate AI-powered suggestion generation
      setSuggestions(mockSuggestions);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    }
  }, [currentContext]);

  // Generate content recommendations
  const generateRecommendations = useCallback(async () => {
    try {
      // Simulate AI-powered recommendations
      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    }
  }, [currentContext]);

  // Effects
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery, searchType);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, searchType, performSearch]);

  useEffect(() => {
    generateSuggestions();
    generateRecommendations();
  }, [generateSuggestions, generateRecommendations]);

  // Handlers
  const handleResultClick = (result: SearchResult) => {
    setSelectedResult(result);
    onResultSelect?.(result);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.query);
    onSuggestionApply?.(suggestion);
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = SEARCH_TYPES.find(t => t.value === type);
    return typeConfig?.icon || Search;
  };

  const getRelationshipIcon = (type: string) => {
    return RELATIONSHIP_ICONS[type as keyof typeof RELATIONSHIP_ICONS] || Network;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500';
    if (confidence >= 0.7) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-400" />
          Intelligent Search
        </CardTitle>
        <CardDescription className="text-slate-300">
          AI-powered content discovery with relationship mapping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search scenarios, NPCs, regions, quests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white pl-10"
            />
          </div>
          <Select value={searchType} onValueChange={setSearchType}>
            <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {SEARCH_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value} className="text-white">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-slate-400 mr-2">Recent:</span>
            {searchHistory.map((query, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery(query)}
                className="h-6 px-2 text-xs text-slate-300 hover:text-white"
              >
                {query}
              </Button>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-slate-700">
            <TabsTrigger value="results" className="text-white">
              Results ({results.length})
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="text-white">
              Suggestions ({suggestions.length})
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="text-white">
              AI Recommendations ({recommendations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="mt-4">
            <ScrollArea className="h-96">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((result) => {
                    const TypeIcon = getTypeIcon(result.type);
                    return (
                      <Card 
                        key={result.id} 
                        className={`bg-slate-700/50 border-slate-600 cursor-pointer transition-colors hover:border-purple-500/50 ${
                          selectedResult?.id === result.id ? 'border-purple-500' : ''
                        }`}
                        onClick={() => handleResultClick(result)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <TypeIcon className="h-4 w-4 text-purple-400" />
                              <h4 className="font-medium text-white">{result.title}</h4>
                              <Badge variant="outline" className="text-xs text-slate-300">
                                {result.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-400" />
                              <span className="text-xs text-slate-400">
                                {Math.round(result.relevanceScore * 100)}%
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-slate-300 text-sm mb-2 line-clamp-2">
                            {result.description}
                          </p>
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            {result.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs bg-purple-500/20 text-purple-300">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {result.relationships.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-600">
                              <div className="text-xs text-slate-400 mb-1">Related:</div>
                              <div className="flex flex-wrap gap-1">
                                {result.relationships.slice(0, 3).map((rel, index) => {
                                  const RelIcon = getRelationshipIcon(rel.relationshipType);
                                  return (
                                    <div key={index} className="flex items-center gap-1 text-xs text-slate-300">
                                      <RelIcon className="h-3 w-3" />
                                      <span>{rel.targetTitle}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : searchQuery ? (
                <div className="text-center py-8 text-slate-400">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No results found for "{searchQuery}"</p>
                  <p className="text-sm">Try different keywords or check suggestions</p>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Start typing to search</p>
                  <p className="text-sm">Search across scenarios, NPCs, regions, and more</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="suggestions" className="mt-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <Card 
                    key={suggestion.id} 
                    className="bg-slate-700/50 border-slate-600 cursor-pointer hover:border-blue-500/50 transition-colors"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-blue-400" />
                          <span className="text-white font-medium">{suggestion.query}</span>
                          <Badge variant="outline" className="text-xs text-blue-300">
                            {suggestion.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-400" />
                          <span className="text-xs text-slate-400">
                            {Math.round(suggestion.relevance * 100)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-300 text-sm">{suggestion.context}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <Card key={rec.id} className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-white mb-1">{rec.title}</h4>
                          <Badge variant="outline" className="text-xs text-slate-300 mb-2">
                            {rec.type}
                          </Badge>
                          <p className="text-slate-300 text-sm">{rec.reason}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${getConfidenceColor(rec.confidence)}`}></div>
                            <span className="text-xs text-slate-400">
                              {Math.round(rec.confidence * 100)}%
                            </span>
                          </div>
                          <Button size="sm" variant="outline" className="text-xs">
                            {rec.suggestedAction}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default AdvancedSearch;
