/**
 * Advanced Map Editor Component - Redesigned for Better UX
 * 
 * Features:
 * - Full-page immersive experience
 * - Intuitive drag & drop city placement
 * - Clear visual feedback and controls
 * - Simplified toolbar with tooltips
 * - Better city management workflow
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { 
  Plus, Trash2, Edit, Save, Undo2, Redo2, Grid3x3, ZoomIn, ZoomOut,
  Move, Upload, Download, MapPin, Crown, AlertCircle, X, Check,
  Eye, EyeOff, Settings, Info, MousePointer2, Hand
} from 'lucide-react';

// Types for the map system
interface CityRatings {
  food: number;        // 0-10: City's ability to feed population
  wealth: number;      // 0-10: Economic health and prosperity
  health: number;      // 0-10: Medical care and population well-being
  industry: number;    // 0-10: Industrial development and production
  security: number;    // 0-10: Safety, law enforcement, and stability
  morale: number;      // 0-10: Population satisfaction and loyalty
  environment: number; // 0-10: Environmental health and sustainability
}

interface CityQuest {
  id: string;
  title: string;
  description: string;
  type: 'improve' | 'decrease';
  rating: keyof CityRatings;
  impact: number; // How much the rating changes (+/- 1-3)
  difficulty: 'easy' | 'medium' | 'hard';
  requirements?: string[];
  rewards?: string[];
}

interface CityData {
  id: string;
  name: string;
  x: number; // Pixel coordinates on map
  y: number;
  type: 'city' | 'settlement' | 'wasteland' | 'fortress' | 'trade_hub' | 'industrial';
  population?: number;
  controllingFaction?: string;
  resources?: string[];
  threatLevel: number;
  politicalStance?: 'hostile' | 'neutral' | 'friendly' | 'allied';
  description?: string;
  ratings: CityRatings;
  completedQuests?: string[];
  metadata?: Record<string, any>;
}

interface MapState {
  cities: CityData[];
  mapImage?: string;
  zoom: number;
  panX: number;
  panY: number;
  gridVisible: boolean;
  gridSize: number;
  snapToGrid: boolean;
}

interface HistoryEntry {
  state: MapState;
  action: string;
  timestamp: number;
}

interface MapEditorProps {
  initialCities?: CityData[];
  onCitiesChange?: (cities: CityData[]) => void;
  onMapStateChange?: (state: MapState) => void;
  readOnly?: boolean;
}

// Simplified city types with clear icons and colors
const CITY_TYPES = [
  { value: 'city', label: 'City', icon: '🏙️', color: '#3B82F6' },
  { value: 'settlement', label: 'Settlement', icon: '🏘️', color: '#10B981' },
  { value: 'wasteland', label: 'Wasteland', icon: '🏜️', color: '#F59E0B' },
  { value: 'fortress', label: 'Fortress', icon: '🏰', color: '#EF4444' },
  { value: 'trade_hub', label: 'Trade Hub', icon: '🏪', color: '#8B5CF6' },
  { value: 'industrial', label: 'Industrial', icon: '🏭', color: '#6B7280' }
];

const POLITICAL_STANCES = [
  { value: 'hostile', label: 'Hostile', color: '#EF4444' },
  { value: 'neutral', label: 'Neutral', color: '#6B7280' },
  { value: 'friendly', label: 'Friendly', color: '#10B981' },
  { value: 'allied', label: 'Allied', color: '#3B82F6' }
];

// City Rating System Configuration
const RATING_CATEGORIES = [
  { 
    key: 'food' as keyof CityRatings, 
    label: 'Food', 
    icon: '🍞', 
    color: '#10B981',
    description: 'Agricultural capacity and food security'
  },
  { 
    key: 'wealth' as keyof CityRatings, 
    label: 'Wealth', 
    icon: '💰', 
    color: '#F59E0B',
    description: 'Economic prosperity and trade'
  },
  { 
    key: 'health' as keyof CityRatings, 
    label: 'Health', 
    icon: '❤️', 
    color: '#EF4444',
    description: 'Medical infrastructure and population wellness'
  },
  { 
    key: 'industry' as keyof CityRatings, 
    label: 'Industry', 
    icon: '🏭', 
    color: '#6B7280',
    description: 'Manufacturing and production capabilities'
  },
  { 
    key: 'security' as keyof CityRatings, 
    label: 'Security', 
    icon: '🛡️', 
    color: '#3B82F6',
    description: 'Defense, law enforcement, and stability'
  },
  { 
    key: 'morale' as keyof CityRatings, 
    label: 'Morale', 
    icon: '😊', 
    color: '#8B5CF6',
    description: 'Population satisfaction and loyalty'
  },
  { 
    key: 'environment' as keyof CityRatings, 
    label: 'Environment', 
    icon: '🌿', 
    color: '#059669',
    description: 'Ecological health and sustainability'
  }
];

// Quest Templates for different ratings
const QUEST_TEMPLATES: Record<keyof CityRatings, CityQuest[]> = {
  food: [
    {
      id: 'secure-farm',
      title: 'Secure Abandoned Farmland',
      description: 'Explore and reclaim fertile farmland to boost food production.',
      type: 'improve',
      rating: 'food',
      impact: 2,
      difficulty: 'medium',
      requirements: ['Security forces', 'Agricultural equipment'],
      rewards: ['Increased food production', 'Trade opportunities']
    },
    {
      id: 'raid-convoy',
      title: 'Raid Food Convoy',
      description: 'Intercept a supply convoy to steal food resources.',
      type: 'decrease',
      rating: 'food',
      impact: -1,
      difficulty: 'easy',
      requirements: ['Armed forces'],
      rewards: ['Immediate food supplies', 'Enemy intelligence']
    },
    {
      id: 'establish-trade',
      title: 'Establish Trade Routes',
      description: 'Negotiate safe passage for food caravans with neighboring settlements.',
      type: 'improve',
      rating: 'food',
      impact: 1,
      difficulty: 'hard',
      requirements: ['Diplomatic relations', 'Security guarantees'],
      rewards: ['Stable food supply', 'Economic growth']
    }
  ],
  wealth: [
    {
      id: 'rebuild-market',
      title: 'Rebuild Trading Post',
      description: 'Restore the central marketplace to attract merchants and traders.',
      type: 'improve',
      rating: 'wealth',
      impact: 2,
      difficulty: 'medium',
      requirements: ['Construction materials', 'Skilled workers'],
      rewards: ['Increased commerce', 'Tax revenue']
    },
    {
      id: 'sabotage-bank',
      title: 'Sabotage Financial Center',
      description: 'Disrupt the city\'s economic infrastructure to weaken their wealth.',
      type: 'decrease',
      rating: 'wealth',
      impact: -2,
      difficulty: 'hard',
      requirements: ['Infiltration team', 'Inside information'],
      rewards: ['Economic disruption', 'Strategic advantage']
    }
  ],
  health: [
    {
      id: 'secure-hospital',
      title: 'Secure Abandoned Hospital',
      description: 'Reclaim and restore a pre-war medical facility.',
      type: 'improve',
      rating: 'health',
      impact: 3,
      difficulty: 'hard',
      requirements: ['Medical supplies', 'Trained personnel', 'Power source'],
      rewards: ['Improved healthcare', 'Population growth']
    },
    {
      id: 'poison-water',
      title: 'Contaminate Water Supply',
      description: 'Introduce toxins into the city\'s water system.',
      type: 'decrease',
      rating: 'health',
      impact: -3,
      difficulty: 'medium',
      requirements: ['Chemical knowledge', 'Access to water infrastructure'],
      rewards: ['Weakened population', 'Reduced resistance']
    },
    {
      id: 'medical-convoy',
      title: 'Escort Medical Convoy',
      description: 'Protect a shipment of vital medical supplies and vaccines.',
      type: 'improve',
      rating: 'health',
      impact: 1,
      difficulty: 'easy',
      requirements: ['Armed escort', 'Transportation'],
      rewards: ['Community trust', 'Medical stockpile']
    }
  ],
  industry: [
    {
      id: 'rebuild-factory',
      title: 'Rebuild Production Facility',
      description: 'Restore an abandoned factory to boost manufacturing capacity.',
      type: 'improve',
      rating: 'industry',
      impact: 2,
      difficulty: 'hard',
      requirements: ['Raw materials', 'Technical expertise', 'Power grid'],
      rewards: ['Increased production', 'Job creation']
    },
    {
      id: 'sabotage-plant',
      title: 'Sabotage Industrial Plant',
      description: 'Disable key machinery to cripple the city\'s industrial output.',
      type: 'decrease',
      rating: 'industry',
      impact: -2,
      difficulty: 'medium',
      requirements: ['Explosives', 'Technical knowledge'],
      rewards: ['Strategic disadvantage for enemy', 'Resource disruption']
    }
  ],
  security: [
    {
      id: 'train-militia',
      title: 'Train Civilian Militia',
      description: 'Organize and train citizens to defend their community.',
      type: 'improve',
      rating: 'security',
      impact: 2,
      difficulty: 'medium',
      requirements: ['Weapons', 'Training facilities', 'Leadership'],
      rewards: ['Enhanced defense', 'Community cohesion']
    },
    {
      id: 'infiltrate-guards',
      title: 'Infiltrate Security Forces',
      description: 'Plant spies within the city\'s security apparatus.',
      type: 'decrease',
      rating: 'security',
      impact: -2,
      difficulty: 'hard',
      requirements: ['Skilled operatives', 'Long-term planning'],
      rewards: ['Inside intelligence', 'Security vulnerabilities']
    }
  ],
  morale: [
    {
      id: 'public-festival',
      title: 'Organize Public Festival',
      description: 'Host a celebration to boost community spirit and unity.',
      type: 'improve',
      rating: 'morale',
      impact: 2,
      difficulty: 'easy',
      requirements: ['Entertainment', 'Food supplies', 'Security'],
      rewards: ['Improved loyalty', 'Cultural preservation']
    },
    {
      id: 'spread-propaganda',
      title: 'Spread Dissent',
      description: 'Launch a propaganda campaign to turn citizens against leadership.',
      type: 'decrease',
      rating: 'morale',
      impact: -2,
      difficulty: 'medium',
      requirements: ['Communication network', 'Persuasive materials'],
      rewards: ['Internal conflict', 'Reduced effectiveness']
    },
    {
      id: 'memorial-service',
      title: 'Honor the Fallen',
      description: 'Organize a memorial service for those lost in recent conflicts.',
      type: 'improve',
      rating: 'morale',
      impact: 1,
      difficulty: 'easy',
      requirements: ['Community leaders', 'Memorial materials'],
      rewards: ['Healing process', 'Unity']
    }
  ],
  environment: [
    {
      id: 'cleanup-waste',
      title: 'Environmental Cleanup',
      description: 'Remove toxic waste and restore polluted areas.',
      type: 'improve',
      rating: 'environment',
      impact: 2,
      difficulty: 'hard',
      requirements: ['Cleanup equipment', 'Protective gear', 'Disposal site'],
      rewards: ['Healthier ecosystem', 'Sustainable future']
    },
    {
      id: 'dump-toxins',
      title: 'Dump Industrial Waste',
      description: 'Secretly dispose of hazardous materials in the city\'s surroundings.',
      type: 'decrease',
      rating: 'environment',
      impact: -2,
      difficulty: 'easy',
      requirements: ['Transport', 'Cover operation'],
      rewards: ['Cost savings', 'Environmental damage']
    }
  ]
};

// Helper function to generate contextual quests for a city
const generateQuestsForRating = (city: CityData, rating: keyof CityRatings): CityQuest[] => {
  const baseQuests = QUEST_TEMPLATES[rating] || [];
  const currentRating = city.ratings[rating];
  const completedQuests = city.completedQuests || [];
  
  // Filter out completed quests and adjust based on current rating
  return baseQuests
    .filter(quest => !completedQuests.includes(quest.id))
    .map(quest => ({
      ...quest,
      // Adjust impact based on current rating (diminishing returns)
      impact: currentRating > 7 ? Math.ceil(quest.impact * 0.5) : quest.impact
    }));
};

// Helper function to get rating color based on value
const getRatingColor = (value: number): string => {
  if (value >= 8) return '#10B981'; // Green - Excellent
  if (value >= 6) return '#F59E0B'; // Yellow - Good
  if (value >= 4) return '#EF4444'; // Orange - Fair
  return '#DC2626'; // Red - Poor
};

// Helper function to get default ratings based on city type
const getDefaultRatings = (cityType: CityData['type']): CityRatings => {
  const baseRatings: Record<CityData['type'], CityRatings> = {
    city: { food: 6, wealth: 7, health: 6, industry: 7, security: 6, morale: 6, environment: 5 },
    settlement: { food: 5, wealth: 4, health: 4, industry: 3, security: 4, morale: 5, environment: 6 },
    wasteland: { food: 2, wealth: 2, health: 2, industry: 1, security: 2, morale: 3, environment: 2 },
    fortress: { food: 4, wealth: 5, health: 5, industry: 4, security: 9, morale: 6, environment: 4 },
    trade_hub: { food: 7, wealth: 9, health: 6, industry: 6, security: 5, morale: 7, environment: 5 },
    industrial: { food: 4, wealth: 6, health: 4, industry: 9, security: 5, morale: 4, environment: 2 }
  };
  
  return baseRatings[cityType];
};

type EditorMode = 'view' | 'add' | 'edit' | 'pan';

export function MapEditor({ 
  initialCities = [], 
  onCitiesChange, 
  onMapStateChange,
  readOnly = false 
}: MapEditorProps) {
  // Core state
  const [mapState, setMapState] = useState<MapState>({
    cities: initialCities,
    zoom: 1,
    panX: 0,
    panY: 0,
    gridVisible: false,
    gridSize: 20,
    snapToGrid: true
  });

  // History for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([
    { state: mapState, action: 'Initial', timestamp: Date.now() }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // UI state
  const [editorMode, setEditorMode] = useState<EditorMode>('view');
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [editingCity, setEditingCity] = useState<CityData | null>(null);
  const [showCityForm, setShowCityForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  
  // Quest system state
  const [selectedRating, setSelectedRating] = useState<keyof CityRatings | null>(null);
  const [showQuests, setShowQuests] = useState(false);
  const [availableQuests, setAvailableQuests] = useState<CityQuest[]>([]);

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for city editing
  const [cityForm, setCityForm] = useState<Partial<CityData>>({
    name: '',
    type: 'city',
    population: 1000,
    controllingFaction: '',
    resources: [],
    threatLevel: 1,
    politicalStance: 'neutral',
    description: '',
    ratings: getDefaultRatings('city'),
    completedQuests: []
  });

  // Memoized calculations
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const transformCoordinates = useCallback((x: number, y: number) => {
    return {
      x: (x - mapState.panX) * mapState.zoom,
      y: (y - mapState.panY) * mapState.zoom
    };
  }, [mapState.panX, mapState.panY, mapState.zoom]);

  const reverseTransformCoordinates = useCallback((x: number, y: number) => {
    return {
      x: x / mapState.zoom + mapState.panX,
      y: y / mapState.zoom + mapState.panY
    };
  }, [mapState.panX, mapState.panY, mapState.zoom]);

  // History management
  const addToHistory = useCallback((newState: MapState, action: string) => {
    const newEntry: HistoryEntry = {
      state: { ...newState },
      action,
      timestamp: Date.now()
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEntry);

    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(prev => prev + 1);
    }

    setHistory(newHistory);
  }, [history, historyIndex]);

  const updateMapState = useCallback((updates: Partial<MapState>, action: string) => {
    const newState = { ...mapState, ...updates };
    setMapState(newState);
    addToHistory(newState, action);
    onMapStateChange?.(newState);
    if (updates.cities) {
      onCitiesChange?.(updates.cities);
    }
  }, [mapState, addToHistory, onMapStateChange, onCitiesChange]);

  const undo = useCallback(() => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousState = history[newIndex].state;
      setMapState(previousState);
      onMapStateChange?.(previousState);
      onCitiesChange?.(previousState.cities);
    }
  }, [canUndo, historyIndex, history, onMapStateChange, onCitiesChange]);

  const redo = useCallback(() => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextState = history[newIndex].state;
      setMapState(nextState);
      onMapStateChange?.(nextState);
      onCitiesChange?.(nextState.cities);
    }
  }, [canRedo, historyIndex, history, onMapStateChange, onCitiesChange]);

  // Grid snapping utility
  const snapToGrid = useCallback((x: number, y: number) => {
    if (!mapState.snapToGrid) return { x, y };
    const gridSize = mapState.gridSize;
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
  }, [mapState.snapToGrid, mapState.gridSize]);

  // City management
  const addCity = useCallback((x: number, y: number, cityData?: Partial<CityData>) => {
    if (readOnly) return;

    const snapped = snapToGrid(x, y);
    const cityType = cityData?.type || 'city';
    const newCity: CityData = {
      id: `city-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: cityData?.name || `New City ${mapState.cities.length + 1}`,
      x: snapped.x,
      y: snapped.y,
      type: cityType,
      population: cityData?.population || 1000,
      controllingFaction: cityData?.controllingFaction || '',
      resources: cityData?.resources || [],
      threatLevel: cityData?.threatLevel || 1,
      politicalStance: cityData?.politicalStance || 'neutral',
      description: cityData?.description || '',
      ratings: cityData?.ratings || getDefaultRatings(cityType),
      completedQuests: cityData?.completedQuests || [],
      metadata: cityData?.metadata || {}
    };

    updateMapState({ 
      cities: [...mapState.cities, newCity] 
    }, `Add city: ${newCity.name}`);

    setSelectedCity(newCity);
    setEditingCity(newCity);
    setShowCityForm(true);
    setEditorMode('view');
    return newCity;
  }, [readOnly, snapToGrid, mapState.cities, updateMapState]);

  const updateCity = useCallback((cityId: string, updates: Partial<CityData>) => {
    if (readOnly) return;

    const updatedCities = mapState.cities.map(city => 
      city.id === cityId ? { ...city, ...updates } : city
    );

    updateMapState({ cities: updatedCities }, `Update city: ${updates.name || cityId}`);
  }, [readOnly, mapState.cities, updateMapState]);

  const deleteCity = useCallback((cityId: string) => {
    if (readOnly) return;

    const cityToDelete = mapState.cities.find(c => c.id === cityId);
    const updatedCities = mapState.cities.filter(city => city.id !== cityId);

    updateMapState({ cities: updatedCities }, `Delete city: ${cityToDelete?.name || cityId}`);

    if (selectedCity?.id === cityId) {
      setSelectedCity(null);
      setShowQuests(false);
      setSelectedRating(null);
    }
  }, [readOnly, mapState.cities, selectedCity, updateMapState]);

  // Quest management functions
  const handleRatingClick = useCallback((rating: keyof CityRatings) => {
    if (!selectedCity) return;
    
    const quests = generateQuestsForRating(selectedCity, rating);
    setAvailableQuests(quests);
    setSelectedRating(rating);
    setShowQuests(true);
  }, [selectedCity]);

  const executeQuest = useCallback((quest: CityQuest) => {
    if (!selectedCity || readOnly) return;

    const updatedRating = Math.max(0, Math.min(10, selectedCity.ratings[quest.rating] + quest.impact));
    const updatedCompletedQuests = [...(selectedCity.completedQuests || []), quest.id];

    const updatedCity = {
      ...selectedCity,
      ratings: {
        ...selectedCity.ratings,
        [quest.rating]: updatedRating
      },
      completedQuests: updatedCompletedQuests
    };

    updateCity(selectedCity.id, updatedCity);
    setSelectedCity(updatedCity);

    // Refresh available quests
    if (selectedRating) {
      const newQuests = generateQuestsForRating(updatedCity, selectedRating);
      setAvailableQuests(newQuests);
    }
  }, [selectedCity, readOnly, updateCity, selectedRating]);

  // Map interaction handlers
  const handleMapClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    const rect = mapCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const worldCoords = reverseTransformCoordinates(x, y);

    if (editorMode === 'add') {
      addCity(worldCoords.x, worldCoords.y, cityForm);
    } else {
      // Check if clicking on existing city
      const clickedCity = mapState.cities.find(city => {
        const distance = Math.sqrt(
          Math.pow(worldCoords.x - city.x, 2) + Math.pow(worldCoords.y - city.y, 2)
        );
        return distance < 20; // 20px click tolerance
      });

      setSelectedCity(clickedCity || null);
    }
  }, [readOnly, editorMode, addCity, cityForm, mapState.cities, reverseTransformCoordinates]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = mapCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setCursorPosition({ x, y });

    if (isDragging && selectedCity && !readOnly) {
      const worldCoords = reverseTransformCoordinates(x, y);
      const newX = worldCoords.x - dragOffset.x;
      const newY = worldCoords.y - dragOffset.y;

      setMapState(prev => ({
        ...prev,
        cities: prev.cities.map(city =>
          city.id === selectedCity.id
            ? { ...city, x: newX, y: newY }
            : city
        )
      }));
    }
  }, [isDragging, selectedCity, readOnly, reverseTransformCoordinates, dragOffset]);

  const handleCityDragStart = useCallback((city: CityData, event: React.MouseEvent) => {
    if (readOnly || editorMode !== 'view') return;

    event.stopPropagation();
    setIsDragging(true);
    setSelectedCity(city);

    const rect = mapCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const worldCoords = reverseTransformCoordinates(x, y);

    setDragOffset({
      x: worldCoords.x - city.x,
      y: worldCoords.y - city.y
    });
  }, [readOnly, editorMode, reverseTransformCoordinates]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && selectedCity) {
      const city = mapState.cities.find(c => c.id === selectedCity.id);
      if (city) {
        const snapped = snapToGrid(city.x, city.y);
        updateCity(selectedCity.id, { x: snapped.x, y: snapped.y });
      }
    }
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, [isDragging, selectedCity, mapState.cities, snapToGrid, updateCity]);

  // Zoom and pan
  const handleZoom = useCallback((delta: number) => {
    const newZoom = Math.max(0.5, Math.min(3, mapState.zoom + delta));
    updateMapState({ zoom: newZoom }, `Zoom: ${newZoom.toFixed(1)}x`);
  }, [mapState.zoom, updateMapState]);

  // Canvas rendering
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Set canvas size to full container
    const container = mapContainerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas transform
    ctx.save();
    ctx.scale(mapState.zoom, mapState.zoom);
    ctx.translate(-mapState.panX, -mapState.panY);

    // Draw background
    if (mapState.mapImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width / mapState.zoom, canvas.height / mapState.zoom);
        renderCitiesAndGrid();
      };
      img.src = mapState.mapImage;
    } else {
      // Draw Mediterranean Sea background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width / mapState.zoom, canvas.height / mapState.zoom);
      gradient.addColorStop(0, '#1e40af');
      gradient.addColorStop(1, '#1e3a8a');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width / mapState.zoom, canvas.height / mapState.zoom);

      // Add landmasses
      ctx.fillStyle = '#065f46';
      // North Africa
      ctx.fillRect(0, canvas.height / mapState.zoom * 0.7, canvas.width / mapState.zoom, canvas.height / mapState.zoom * 0.3);
      // Europe
      ctx.fillRect(0, 0, canvas.width / mapState.zoom, canvas.height / mapState.zoom * 0.3);

      renderCitiesAndGrid();
    }

    function renderCitiesAndGrid() {
      // Draw grid if visible
      if (mapState.gridVisible) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1 / mapState.zoom;

        for (let x = 0; x <= canvas.width / mapState.zoom; x += mapState.gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height / mapState.zoom);
          ctx.stroke();
        }

        for (let y = 0; y <= canvas.height / mapState.zoom; y += mapState.gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width / mapState.zoom, y);
          ctx.stroke();
        }
      }

      // Draw cities
      mapState.cities.forEach(city => {
        const typeConfig = CITY_TYPES.find(t => t.value === city.type);
        const stanceConfig = POLITICAL_STANCES.find(s => s.value === city.politicalStance);

        // City marker with glow effect
        const radius = 12 / mapState.zoom;

        // Glow effect for selected city
        if (selectedCity?.id === city.id) {
          ctx.shadowColor = '#F59E0B';
          ctx.shadowBlur = 15 / mapState.zoom;
        } else {
          ctx.shadowBlur = 0;
        }

        // City circle
        ctx.fillStyle = typeConfig?.color || '#3B82F6';
        ctx.strokeStyle = stanceConfig?.color || '#6B7280';
        ctx.lineWidth = 2 / mapState.zoom;

        ctx.beginPath();
        ctx.arc(city.x, city.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;

        // City name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${14 / mapState.zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3 / mapState.zoom;
        ctx.strokeText(city.name, city.x, city.y - 20 / mapState.zoom);
        ctx.fillText(city.name, city.x, city.y - 20 / mapState.zoom);

        // Threat level indicator
        if (city.threatLevel > 3) {
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(city.x + 15 / mapState.zoom, city.y - 15 / mapState.zoom, 4 / mapState.zoom, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }

    ctx.restore();
  }, [mapState, selectedCity]);

  // Get cursor style based on mode
  const getCursorStyle = () => {
    switch (editorMode) {
      case 'add': return 'crosshair';
      case 'pan': return isDragging ? 'grabbing' : 'grab';
      case 'edit': return 'pointer';
      default: return isDragging ? 'grabbing' : 'default';
    }
  };

  // Save/Load functionality
  const saveMapState = useCallback(() => {
    const data = {
      mapState,
      metadata: {
        version: '1.0',
        created: new Date().toISOString(),
        cityCount: mapState.cities.length
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `map-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mapState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault();
            if (event.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 's':
            event.preventDefault();
            saveMapState();
            break;
        }
      }

      if (event.key === 'Delete' && selectedCity && !readOnly) {
        deleteCity(selectedCity.id);
      }

      // Mode switching
      if (event.key === 'v') setEditorMode('view');
      if (event.key === 'a' && !readOnly) setEditorMode('add');
      if (event.key === 'Escape') {
        setEditorMode('view');
        setSelectedCity(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveMapState, selectedCity, deleteCity, readOnly]);

  // Initialize with default Mediterranean Basin scenario cities
  useEffect(() => {
    if (initialCities.length === 0) {
      // Load default Mediterranean cities from the scenario
      const defaultCities = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Cité Médicale',
          x: 200,
          y: 300,
          type: 'city' as const,
          population: 35000,
          controllingFaction: 'Les Blouses Blanches',
          resources: ['medicine', 'medical technology', 'pharmaceuticals', 'biological weapons'],
          threatLevel: 3,
          politicalStance: 'allied' as const,
          description: '« Les Blouses Blanches » - POLITICAL CRISIS: Internal power struggle between Director Vasquez (pro-isolation) and Chief Surgeon Romano (aggressive expansion). Recent epidemic in Salvage City blamed on their "medical rationing" policy.',
          ratings: { food: 4, wealth: 6, health: 9, industry: 5, security: 4, morale: 5, environment: 6 },
          completedQuests: [],
          metadata: {
            scenarioId: '550e8400-e29b-41d4-a716-446655440000',
            tradeRoutes: ['Emergency medical corridors', 'Pharmaceutical smuggling routes'],
            createdAt: new Date()
          }
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Cité du Carburant',
          x: 350,
          y: 400,
          type: 'settlement' as const,
          population: 12000,
          controllingFaction: 'Les Raffineurs',
          resources: ['fuel', 'technology'],
          threatLevel: 3,
          politicalStance: 'hostile' as const,
          description: '« Les Raffineurs » - SECURITY ALERT: Frequent pirate raids targeting fuel convoys. Rumors of "Fuel City" supplying refined petroleum to rogue factions.',
          ratings: { food: 3, wealth: 7, health: 4, industry: 6, security: 3, morale: 4, environment: 3 },
          completedQuests: [],
          metadata: {
            scenarioId: '550e8400-e29b-41d4-a716-446655440000',
            tradeRoutes: ['Armored fuel convoys', 'Smuggled fuel pipelines'],
            createdAt: new Date()
          }
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          name: 'Cité Industrielle',
          x: 450,
          y: 280,
          type: 'industrial' as const,
          population: 25000,
          controllingFaction: 'Les Forgerons d\'Acier',
          resources: ['metal', 'technology', 'machinery', 'weapons manufacturing'],
          threatLevel: 4,
          politicalStance: 'neutral' as const,
          description: '« Les Forgerons d\'Acier » - TECHNOLOGICAL ARMS RACE: Developing advanced autonomous drones and weapons. Considers the Treaty of Two Braziers obsolete.',
          ratings: { food: 4, wealth: 6, health: 4, industry: 9, security: 5, morale: 4, environment: 2 },
          completedQuests: [],
          metadata: {
            scenarioId: '550e8400-e29b-41d4-a716-446655440000',
            tradeRoutes: ['Component supply lines', 'Weapons export routes'],
            createdAt: new Date()
          }
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'Cité de l\'Eau & Alimentation',
          x: 300,
          y: 220,
          type: 'fortress' as const,
          population: 18000,
          controllingFaction: 'Les Gardiens de la Source',
          resources: ['food', 'water', 'seeds', 'agricultural technology'],
          threatLevel: 4,
          politicalStance: 'friendly' as const,
          description: '« Les Gardiens de la Source » - INTERNAL REBELLION: Facing widespread discontent due to water rationing and perceived favoritism towards allied states.',
          ratings: { food: 9, wealth: 5, health: 6, industry: 4, security: 8, morale: 3, environment: 7 },
          completedQuests: [],
          metadata: {
            scenarioId: '550e8400-e29b-41d4-a716-446655440000',
            tradeRoutes: ['Vital water caravans', 'Food distribution networks'],
            createdAt: new Date()
          }
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440005',
          name: 'Cité du Divertissement',
          x: 550,
          y: 450,
          type: 'trade_hub' as const,
          population: 20000,
          controllingFaction: 'Les Faiseurs de Rêves',
          resources: ['information', 'entertainment', 'propaganda', 'espionage'],
          threatLevel: 1,
          politicalStance: 'neutral' as const,
          description: '« Les Faiseurs de Rêves » - PROPAGANDA WARFARE: Broadcasting heavily biased news and entertainment to influence public opinion across the basin.',
          ratings: { food: 7, wealth: 8, health: 6, industry: 6, security: 5, morale: 8, environment: 5 },
          completedQuests: [],
          metadata: {
            scenarioId: '550e8400-e29b-41d4-a716-446655440000',
            tradeRoutes: ['Information smuggling', 'Cultural exchange (controlled)'],
            createdAt: new Date()
          }
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          name: 'Nuke City',
          x: 150,
          y: 180,
          type: 'city' as const,
          population: 8000,
          controllingFaction: 'Le Réacteur à Ciel Ouvert',
          resources: ['energy', 'technology', 'weapons', 'nuclear materials'],
          threatLevel: 5,
          politicalStance: 'hostile' as const,
          description: '« Le Réacteur à Ciel Ouvert » - NUCLEAR DETERRENCE: Possesses the last functional nuclear arsenal. Maintains strict isolation.',
          ratings: { food: 3, wealth: 5, health: 3, industry: 8, security: 7, morale: 2, environment: 1 },
          completedQuests: [],
          metadata: {
            scenarioId: '550e8400-e29b-41d4-a716-446655440000',
            tradeRoutes: ['Restricted energy conduits', 'Black market tech sales'],
            createdAt: new Date()
          }
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440007',
          name: 'Cité des Métaux & Recyclage',
          x: 400,
          y: 500,
          type: 'settlement' as const,
          population: 10000,
          controllingFaction: 'Les Fossoyeurs',
          resources: ['metal', 'rare_materials', 'salvage', 'radiation shielding'],
          threatLevel: 3,
          politicalStance: 'neutral' as const,
          description: '« Les Fossoyeurs » - RESOURCE DEPENDENCY: Crucial supplier of metals and salvage, but relies heavily on Fuel City for energy.',
          ratings: { food: 3, wealth: 4, health: 3, industry: 5, security: 4, morale: 5, environment: 4 },
          completedQuests: [],
          metadata: {
            scenarioId: '550e8400-e29b-41d4-a716-446655440000',
            tradeRoutes: ['Scrap metal shipments', 'Salvaged technology exchange'],
            createdAt: new Date()
          }
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440008',
          name: 'Cité de l\'Armement & Défense',
          x: 600,
          y: 280,
          type: 'fortress' as const,
          population: 22000,
          controllingFaction: 'Les Arsenaux',
          resources: ['weapons', 'explosives', 'armor', 'military hardware'],
          threatLevel: 5,
          politicalStance: 'hostile' as const,
          description: '« Les Arsenaux » - MILITARY HEGEMONY & DEBT: Dominates regional security through its powerful military, but is heavily indebted to Industrial City.',
          ratings: { food: 4, wealth: 3, health: 5, industry: 7, security: 9, morale: 6, environment: 4 },
          completedQuests: [],
          metadata: {
            scenarioId: '550e8400-e29b-41d4-a716-446655440000',
            tradeRoutes: ['Arms shipments', 'Mercenary recruitment'],
            createdAt: new Date()
          }
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440009',
          name: 'L\'Île des Anciens',
          x: 700,
          y: 350,
          type: 'city' as const,
          population: 5000,
          controllingFaction: 'Le Paradis Perdu',
          resources: ['pre_war_tech', 'abundant_food', 'clean_water', 'advanced AI'],
          threatLevel: 1,
          politicalStance: 'neutral' as const,
          description: '« Le Paradis Perdu » - ISOLATIONIST MYSTERY: Highly advanced, self-sufficient, and enigmatic. Rarely interacts with other city-states.',
          ratings: { food: 10, wealth: 8, health: 10, industry: 9, security: 8, morale: 9, environment: 10 },
          completedQuests: [],
          metadata: {
            scenarioId: '550e8400-e29b-41d4-a716-446655440000',
            tradeRoutes: ['Rumored hyperspace routes', 'Sealed diplomatic channels'],
            createdAt: new Date()
          }
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          name: 'Bunker Oméga',
          x: 500,
          y: 200,
          type: 'fortress' as const,
          population: 3000,
          controllingFaction: 'Les Fantômes d\'Acier',
          resources: ['advanced_tech', 'ai', 'espionage', 'cyber warfare'],
          threatLevel: 5,
          politicalStance: 'hostile' as const,
          description: '« Les Fantômes d\'Acier » - SHADOW WARFARE & MANIPULATION: Operates from subterranean bases, wielding advanced surveillance and cyber warfare capabilities.',
          ratings: { food: 4, wealth: 5, health: 5, industry: 8, security: 9, morale: 6, environment: 4 },
          completedQuests: [],
          metadata: {
            scenarioId: '550e8400-e29b-41d4-a716-446655440000',
            tradeRoutes: ['Encrypted data streams', 'Covert agent networks'],
            createdAt: new Date()
          }
        }
      ];

      setMapState(prev => ({
        ...prev,
        cities: defaultCities
      }));

      console.log(`[MapEditor] Preloaded ${defaultCities.length} Mediterranean cities from default scenario`);
    }
  }, [initialCities]);

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          {/* Left: Mode Controls */}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white mr-6">Map Editor</h1>

            <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
              <Button
                size="sm"
                variant={editorMode === 'view' ? 'default' : 'ghost'}
                onClick={() => setEditorMode('view')}
                className="text-xs"
                title="View Mode (V) - Click cities to select"
              >
                <MousePointer2 className="h-4 w-4 mr-1" />
                View
              </Button>

              <Button
                size="sm"
                variant={editorMode === 'add' ? 'default' : 'ghost'}
                onClick={() => setEditorMode('add')}
                disabled={readOnly}
                className="text-xs"
                title="Add Mode (A) - Click to place new cities"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Cities
              </Button>

              <Button
                size="sm"
                variant={editorMode === 'pan' ? 'default' : 'ghost'}
                onClick={() => setEditorMode('pan')}
                className="text-xs"
                title="Pan Mode - Drag to move the map"
              >
                <Hand className="h-4 w-4 mr-1" />
                Pan
              </Button>
            </div>

            {editorMode === 'add' && (
              <div className="flex items-center gap-2 ml-4 text-orange-400">
                <Info className="h-4 w-4" />
                <span className="text-sm">Click anywhere on the map to place a new city</span>
              </div>
            )}
          </div>

          {/* Center: Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={undo}
              disabled={!canUndo}
              className="text-slate-300 hover:text-white"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={redo}
              disabled={!canRedo}
              className="text-slate-300 hover:text-white"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-slate-600" />

            <Button
              size="sm"
              variant={mapState.gridVisible ? "default" : "ghost"}
              onClick={() => updateMapState({ gridVisible: !mapState.gridVisible }, 'Toggle grid')}
              className="text-slate-300 hover:text-white"
              title="Toggle Grid"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleZoom(-0.2)}
                className="text-slate-300 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>

              <span className="text-xs text-slate-400 min-w-[3rem] text-center">
                {Math.round(mapState.zoom * 100)}%
              </span>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleZoom(0.2)}
                className="text-slate-300 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right: File Operations */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-300 hover:text-white"
              title="Import Map Image"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Image
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={saveMapState}
              className="text-slate-300 hover:text-white"
              title="Save Map (Ctrl+S)"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(!showSettings)}
              className="text-slate-300 hover:text-white"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Canvas */}
        <div 
          ref={mapContainerRef}
          className="flex-1 relative bg-slate-900 overflow-hidden"
        >
          <canvas
            ref={mapCanvasRef}
            className="w-full h-full"
            style={{ cursor: getCursorStyle() }}
            onClick={handleMapClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onMouseDown={(e) => {
              if (editorMode === 'view') {
                const rect = mapCanvasRef.current?.getBoundingClientRect();
                if (!rect) return;
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const worldCoords = reverseTransformCoordinates(x, y);
                const clickedCity = mapState.cities.find(city => {
                  const distance = Math.sqrt(
                    Math.pow(worldCoords.x - city.x, 2) + Math.pow(worldCoords.y - city.y, 2)
                  );
                  return distance < 20;
                });
                if (clickedCity) {
                  handleCityDragStart(clickedCity, e);
                }
              }
            }}
          />

          {/* Status Indicator */}
          <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-600">
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <span>Cities: {mapState.cities.length}</span>
              <span>Mode: {editorMode}</span>
              {selectedCity && (
                <span className="text-orange-400">Selected: {selectedCity.name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - City Info & Controls */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
          {/* Selected City Panel */}
          {selectedCity ? (
            <div className="flex-1 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-400" />
                    {selectedCity.name}
                  </h3>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingCity(selectedCity);
                        setCityForm(selectedCity);
                        setShowCityForm(true);
                      }}
                      disabled={readOnly}
                      className="text-slate-400 hover:text-white"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteCity(selectedCity.id)}
                      disabled={readOnly}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedCity(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400 text-sm">Type</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg">
                        {CITY_TYPES.find(t => t.value === selectedCity.type)?.icon}
                      </span>
                      <span className="text-white capitalize">
                        {selectedCity.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-sm">Threat Level</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedCity.threatLevel > 3 ? 'bg-red-400' : 
                        selectedCity.threatLevel > 1 ? 'bg-yellow-400' : 'bg-green-400'
                      }`} />
                      <span className="text-white">{selectedCity.threatLevel}/5</span>
                    </div>
                  </div>
                </div>

                {/* City Ratings System */}
                <div className="border-t border-slate-600 pt-4">
                  <Label className="text-white text-base font-semibold">Development & Influence</Label>
                  <p className="text-slate-400 text-xs mt-1 mb-3">Click on any rating to view available quests</p>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {RATING_CATEGORIES.map((category) => {
                      const value = selectedCity.ratings[category.key];
                      return (
                        <button
                          key={category.key}
                          onClick={() => handleRatingClick(category.key)}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors group"
                          title={category.description}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{category.icon}</span>
                            <span className="text-white text-sm font-medium">{category.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 10 }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-4 rounded-sm ${
                                    i < value ? getRatingColor(value) : 'bg-slate-600'
                                  }`}
                                  style={{ 
                                    backgroundColor: i < value ? getRatingColor(value) : undefined 
                                  }}
                                />
                              ))}
                            </div>
                            <span 
                              className="text-sm font-bold min-w-[2rem] text-center"
                              style={{ color: getRatingColor(value) }}
                            >
                              {value}/10
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedCity.population && (
                  <div>
                    <Label className="text-slate-400 text-sm">Population</Label>
                    <p className="text-white text-lg font-medium">
                      {selectedCity.population.toLocaleString()}
                    </p>
                  </div>
                )}

                {selectedCity.controllingFaction && (
                  <div>
                    <Label className="text-slate-400 text-sm">Controlling Faction</Label>
                    <p className="text-white flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-400" />
                      {selectedCity.controllingFaction}
                    </p>
                  </div>
                )}

                {selectedCity.politicalStance && (
                  <div>
                    <Label className="text-slate-400 text-sm">Political Stance</Label>
                    <Badge 
                      variant="outline" 
                      className={`mt-1 ${
                        selectedCity.politicalStance === 'hostile' ? 'text-red-300 border-red-400' :
                        selectedCity.politicalStance === 'friendly' ? 'text-green-300 border-green-400' :
                        selectedCity.politicalStance === 'allied' ? 'text-blue-300 border-blue-400' :
                        'text-gray-300 border-gray-400'
                      }`}
                    >
                      {selectedCity.politicalStance}
                    </Badge>
                  </div>
                )}

                {selectedCity.resources && selectedCity.resources.length > 0 && (
                  <div>
                    <Label className="text-slate-400 text-sm">Resources</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedCity.resources.map((resource, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {resource}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCity.description && (
                  <div>
                    <Label className="text-slate-400 text-sm">Description</Label>
                    <p className="text-slate-300 text-sm mt-1">
                      {selectedCity.description}
                    </p>
                  </div>
                )}

                {selectedCity.completedQuests && selectedCity.completedQuests.length > 0 && (
                  <div>
                    <Label className="text-slate-400 text-sm">Completed Quests ({selectedCity.completedQuests.length})</Label>
                    <div className="text-slate-500 text-xs mt-1">
                      Recent activities have shaped this city's development
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* No City Selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-400">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium">No City Selected</h3>
                <p className="text-sm mt-2">Click on a city to view its details</p>
                {!readOnly && (
                  <p className="text-xs mt-2">Or switch to Add Mode to create new cities</p>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="p-4 border-t border-slate-700 bg-slate-800/50">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Total Cities</span>
                <div className="text-white font-medium">{mapState.cities.length}</div>
              </div>
              <div>
                <span className="text-slate-400">Zoom Level</span>
                <div className="text-white font-medium">{Math.round(mapState.zoom * 100)}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-64 bg-slate-800 border-l border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Settings</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-white">Grid</Label>
                  <Switch
                    checked={mapState.gridVisible}
                    onCheckedChange={(checked) => 
                      updateMapState({ gridVisible: checked }, 'Toggle grid')
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400 text-sm">Grid Size: {mapState.gridSize}px</Label>
                  <Slider
                    value={[mapState.gridSize]}
                    onValueChange={([value]) => 
                      updateMapState({ gridSize: value }, 'Change grid size')
                    }
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between mt-3">
                  <Label className="text-slate-400 text-sm">Snap to Grid</Label>
                  <Switch
                    checked={mapState.snapToGrid}
                    onCheckedChange={(checked) => 
                      updateMapState({ snapToGrid: checked }, 'Toggle snap to grid')
                    }
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Keyboard Shortcuts</Label>
                <div className="mt-2 space-y-1 text-xs text-slate-400">
                  <div>V - View Mode</div>
                  <div>A - Add Mode</div>
                  <div>Ctrl+Z - Undo</div>
                  <div>Ctrl+S - Save</div>
                  <div>Del - Delete Selected</div>
                  <div>Esc - Cancel/Deselect</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quest System Modal */}
      {showQuests && selectedCity && selectedRating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-3xl max-h-[80vh] bg-slate-800 border-slate-700 overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-3">
                  <span className="text-2xl">
                    {RATING_CATEGORIES.find(c => c.key === selectedRating)?.icon}
                  </span>
                  <div>
                    <div>{RATING_CATEGORIES.find(c => c.key === selectedRating)?.label} Quests</div>
                    <div className="text-sm text-slate-400 font-normal">
                      Current: {selectedCity.ratings[selectedRating]}/10 • {selectedCity.name}
                    </div>
                  </div>
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowQuests(false);
                    setSelectedRating(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {availableQuests.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Available Quests</h3>
                    <p className="text-slate-400">
                      All quests for this rating have been completed or there are no suitable opportunities available.
                    </p>
                  </div>
                ) : (
                  availableQuests.map((quest) => (
                    <div
                      key={quest.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        quest.type === 'improve' 
                          ? 'bg-green-900/20 border-green-700 hover:bg-green-900/30' 
                          : 'bg-red-900/20 border-red-700 hover:bg-red-900/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            quest.type === 'improve' ? 'bg-green-700' : 'bg-red-700'
                          }`}>
                            {quest.type === 'improve' ? '⬆️' : '⬇️'}
                          </div>
                          <div>
                            <h4 className="text-white font-semibold">{quest.title}</h4>
                            <div className="flex items-center gap-3 text-sm text-slate-400">
                              <span className={`px-2 py-1 rounded text-xs ${
                                quest.difficulty === 'easy' ? 'bg-green-700/50 text-green-200' :
                                quest.difficulty === 'medium' ? 'bg-yellow-700/50 text-yellow-200' :
                                'bg-red-700/50 text-red-200'
                              }`}>
                                {quest.difficulty.toUpperCase()}
                              </span>
                              <span className={quest.type === 'improve' ? 'text-green-400' : 'text-red-400'}>
                                {quest.impact > 0 ? '+' : ''}{quest.impact} {RATING_CATEGORIES.find(c => c.key === selectedRating)?.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => executeQuest(quest)}
                          disabled={readOnly}
                          className={quest.type === 'improve' ? 
                            'bg-green-600 hover:bg-green-700 text-white' : 
                            'bg-red-600 hover:bg-red-700 text-white'
                          }
                        >
                          Execute
                        </Button>
                      </div>

                      <p className="text-slate-300 text-sm mb-3">
                        {quest.description}
                      </p>

                      {quest.requirements && quest.requirements.length > 0 && (
                        <div className="mb-2">
                          <Label className="text-slate-400 text-xs">Requirements:</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {quest.requirements.map((req, index) => (
                              <Badge key={index} variant="outline" className="text-xs text-slate-300 border-slate-600">
                                {req}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {quest.rewards && quest.rewards.length > 0 && (
                        <div>
                          <Label className="text-slate-400 text-xs">Rewards:</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {quest.rewards.map((reward, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {reward}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* City Edit Modal */}
      {showCityForm && editingCity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">
                Edit City: {editingCity.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Name</Label>
                  <Input
                    value={cityForm.name || ''}
                    onChange={(e) => setCityForm(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-white">Type</Label>
                  <Select
                    value={cityForm.type}
                    onValueChange={(value) => setCityForm(prev => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CITY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Population</Label>
                  <Input
                    type="number"
                    value={cityForm.population || 0}
                    onChange={(e) => setCityForm(prev => ({ ...prev, population: parseInt(e.target.value) || 0 }))}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-white">Threat Level (1-5)</Label>
                  <Select
                    value={String(cityForm.threatLevel || 1)}
                    onValueChange={(value) => setCityForm(prev => ({ ...prev, threatLevel: parseInt(value) }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <SelectItem key={level} value={String(level)}>
                          Level {level} {level > 3 ? '(High Risk)' : level > 1 ? '(Moderate)' : '(Safe)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Controlling Faction</Label>
                  <Input
                    value={cityForm.controllingFaction || ''}
                    onChange={(e) => setCityForm(prev => ({ ...prev, controllingFaction: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-white">Political Stance</Label>
                  <Select
                    value={cityForm.politicalStance}
                    onValueChange={(value) => setCityForm(prev => ({ ...prev, politicalStance: value as any }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POLITICAL_STANCES.map((stance) => (
                        <SelectItem key={stance.value} value={stance.value}>
                          {stance.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-white">Description</Label>
                <Textarea
                  value={cityForm.description || ''}
                  onChange={(e) => setCityForm(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  rows={3}
                  placeholder="Describe this city..."
                />
              </div>

              {/* City Ratings Configuration */}
              <div className="border-t border-slate-600 pt-4">
                <Label className="text-white text-base font-semibold mb-3 block">City Ratings</Label>
                <div className="grid grid-cols-1 gap-4">
                  {RATING_CATEGORIES.map((category) => (
                    <div key={category.key}>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-slate-300 text-sm flex items-center gap-2">
                          <span>{category.icon}</span>
                          {category.label}
                        </Label>
                        <span className="text-white font-medium">
                          {cityForm.ratings?.[category.key] || 0}/10
                        </span>
                      </div>
                      <Slider
                        value={[cityForm.ratings?.[category.key] || 0]}
                        onValueChange={([value]) => 
                          setCityForm(prev => ({
                            ...prev,
                            ratings: { ...prev.ratings, [category.key]: value } as CityRatings
                          }))
                        }
                        min={0}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-slate-400 text-xs mt-1">{category.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCityForm(false);
                    setEditingCity(null);
                  }}
                  className="border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (editingCity) {
                      updateCity(editingCity.id, cityForm);
                      setSelectedCity({ ...editingCity, ...cityForm } as CityData);
                    }
                    setShowCityForm(false);
                    setEditingCity(null);
                  }}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file');
            return;
          }

          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            updateMapState({ mapImage: result }, 'Import map image');
          };
          reader.readAsDataURL(file);
        }}
        className="hidden"
      />
    </div>
  );
}