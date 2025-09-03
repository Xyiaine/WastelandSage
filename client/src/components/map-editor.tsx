
/**
 * Advanced Map Editor Component
 * 
 * Features:
 * - Image import and processing
 * - Drag & drop city placement/editing
 * - Zoom, pan, and grid overlay
 * - Undo/redo system
 * - City metadata management
 * - Performance optimized rendering
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { 
  Upload, Download, Save, Undo2, Redo2, Grid3x3, ZoomIn, ZoomOut,
  Move, Plus, Trash2, Edit, Settings, MapPin, Users, Crown,
  AlertCircle, Check, X, RotateCcw, Image as ImageIcon, Maximize2, Minimize2
} from 'lucide-react';

// Types for the map system
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
  metadata?: Record<string, any>;
}

interface MapState {
  cities: CityData[];
  mapImage?: string; // Base64 or URL
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
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [editingCity, setEditingCity] = useState<CityData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isAddingCity, setIsAddingCity] = useState(false);
  const [showCityForm, setShowCityForm] = useState(false);
  const [mapDimensions, setMapDimensions] = useState({ width: 800, height: 500 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Form state for city editing
  const [cityForm, setCityForm] = useState<Partial<CityData>>({
    name: '',
    type: 'city',
    population: 0,
    controllingFaction: '',
    resources: [],
    threatLevel: 1,
    politicalStance: 'neutral',
    description: ''
  });

  // Update map dimensions based on fullscreen state
  useEffect(() => {
    if (isFullscreen) {
      setMapDimensions({ width: 1920, height: 1080 });
    } else {
      setMapDimensions({ width: 800, height: 500 });
    }
  }, [isFullscreen]);

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
    
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEntry);
    
    // Limit history size
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(prev => prev + 1);
    }
    
    setHistory(newHistory);
  }, [history, historyIndex]);

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
  const updateMapState = useCallback((updates: Partial<MapState>, action: string) => {
    const newState = { ...mapState, ...updates };
    setMapState(newState);
    addToHistory(newState, action);
    onMapStateChange?.(newState);
    if (updates.cities) {
      onCitiesChange?.(updates.cities);
    }
  }, [mapState, addToHistory, onMapStateChange, onCitiesChange]);

  const addCity = useCallback((x: number, y: number, cityData?: Partial<CityData>) => {
    if (readOnly) return;
    
    const snapped = snapToGrid(x, y);
    const newCity: CityData = {
      id: `city-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: cityData?.name || `New City ${mapState.cities.length + 1}`,
      x: snapped.x,
      y: snapped.y,
      type: cityData?.type || 'city',
      population: cityData?.population || 1000,
      controllingFaction: cityData?.controllingFaction || '',
      resources: cityData?.resources || [],
      threatLevel: cityData?.threatLevel || 1,
      politicalStance: cityData?.politicalStance || 'neutral',
      description: cityData?.description || '',
      metadata: cityData?.metadata || {}
    };

    updateMapState({ 
      cities: [...mapState.cities, newCity] 
    }, `Add city: ${newCity.name}`);
    
    setSelectedCity(newCity);
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
    }
  }, [readOnly, mapState.cities, selectedCity, updateMapState]);

  const moveCity = useCallback((cityId: string, x: number, y: number) => {
    if (readOnly) return;
    
    const snapped = snapToGrid(x, y);
    updateCity(cityId, { x: snapped.x, y: snapped.y });
  }, [readOnly, snapToGrid, updateCity]);

  // Map image handling
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      
      // Create an image to get dimensions
      const img = new Image();
      img.onload = () => {
        setMapDimensions({ width: img.width, height: img.height });
        updateMapState({ 
          mapImage: result,
          zoom: 1,
          panX: 0,
          panY: 0
        }, 'Import map image');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  }, [updateMapState]);

  // Event handlers
  const handleMapClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    
    const rect = mapCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const worldCoords = reverseTransformCoordinates(x, y);

    if (isAddingCity) {
      const newCity = addCity(worldCoords.x, worldCoords.y, cityForm);
      setIsAddingCity(false);
      setShowCityForm(true);
      setEditingCity(newCity);
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
  }, [readOnly, isAddingCity, addCity, cityForm, mapState.cities, reverseTransformCoordinates]);

  const handleCityDragStart = useCallback((city: CityData, event: React.MouseEvent) => {
    if (readOnly) return;
    
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
    
    dragStartPos.current = { x: city.x, y: city.y };
  }, [readOnly, reverseTransformCoordinates]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedCity || readOnly) return;

    const rect = mapCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const worldCoords = reverseTransformCoordinates(x, y);

    const newX = worldCoords.x - dragOffset.x;
    const newY = worldCoords.y - dragOffset.y;

    // Update city position in real-time during drag
    setMapState(prev => ({
      ...prev,
      cities: prev.cities.map(city =>
        city.id === selectedCity.id
          ? { ...city, x: newX, y: newY }
          : city
      )
    }));
  }, [isDragging, selectedCity, readOnly, reverseTransformCoordinates, dragOffset]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && selectedCity) {
      const city = mapState.cities.find(c => c.id === selectedCity.id);
      if (city) {
        const snapped = snapToGrid(city.x, city.y);
        const finalCities = mapState.cities.map(c =>
          c.id === selectedCity.id ? { ...c, x: snapped.x, y: snapped.y } : c
        );
        
        updateMapState({ cities: finalCities }, `Move city: ${selectedCity.name}`);
      }
    }
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, [isDragging, selectedCity, mapState.cities, snapToGrid, updateMapState]);

  // Zoom and pan
  const handleZoom = useCallback((delta: number) => {
    const newZoom = Math.max(0.1, Math.min(5, mapState.zoom + delta));
    updateMapState({ zoom: newZoom }, `Zoom: ${newZoom.toFixed(1)}x`);
  }, [mapState.zoom, updateMapState]);

  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    updateMapState({
      panX: mapState.panX + deltaX,
      panY: mapState.panY + deltaY
    }, 'Pan map');
  }, [mapState.panX, mapState.panY, updateMapState]);

  // Canvas rendering
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas transform
    ctx.save();
    ctx.scale(mapState.zoom, mapState.zoom);
    ctx.translate(-mapState.panX, -mapState.panY);

    // Draw map image if available
    if (mapState.mapImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, img.width, img.height);
        renderCitiesAndGrid();
      };
      img.src = mapState.mapImage;
    } else {
      // Draw Mediterranean Sea background
      ctx.fillStyle = '#1e3a8a'; // Deep blue base
      ctx.fillRect(0, 0, mapDimensions.width, mapDimensions.height);
      
      // Add Mediterranean coastlines
      ctx.fillStyle = '#065f46'; // Dark green for land
      ctx.beginPath();
      // North Africa coastline
      ctx.moveTo(0, mapDimensions.height * 0.7);
      ctx.bezierCurveTo(
        mapDimensions.width * 0.3, mapDimensions.height * 0.6,
        mapDimensions.width * 0.7, mapDimensions.height * 0.8,
        mapDimensions.width, mapDimensions.height * 0.75
      );
      ctx.lineTo(mapDimensions.width, mapDimensions.height);
      ctx.lineTo(0, mapDimensions.height);
      ctx.closePath();
      ctx.fill();
      
      // European coastline
      ctx.beginPath();
      ctx.moveTo(0, mapDimensions.height * 0.3);
      ctx.bezierCurveTo(
        mapDimensions.width * 0.2, mapDimensions.height * 0.2,
        mapDimensions.width * 0.8, mapDimensions.height * 0.4,
        mapDimensions.width, mapDimensions.height * 0.3
      );
      ctx.lineTo(mapDimensions.width, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      
      // Islands
      ctx.fillStyle = '#059669'; // Slightly lighter green for islands
      // Sicily
      ctx.beginPath();
      ctx.arc(mapDimensions.width * 0.6, mapDimensions.height * 0.65, 15, 0, 2 * Math.PI);
      ctx.fill();
      
      // Sardinia
      ctx.beginPath();
      ctx.arc(mapDimensions.width * 0.45, mapDimensions.height * 0.55, 12, 0, 2 * Math.PI);
      ctx.fill();
      
      // Cyprus
      ctx.beginPath();
      ctx.arc(mapDimensions.width * 0.85, mapDimensions.height * 0.6, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      renderCitiesAndGrid();
    }

    function renderCitiesAndGrid() {
      // Draw grid if visible
      if (mapState.gridVisible) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1 / mapState.zoom;
        
        for (let x = 0; x <= mapDimensions.width; x += mapState.gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, mapDimensions.height);
          ctx.stroke();
        }
        
        for (let y = 0; y <= mapDimensions.height; y += mapState.gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(mapDimensions.width, y);
          ctx.stroke();
        }
      }

      // Draw cities
      mapState.cities.forEach(city => {
        const typeConfig = CITY_TYPES.find(t => t.value === city.type);
        const stanceConfig = POLITICAL_STANCES.find(s => s.value === city.politicalStance);
        
        // City marker
        ctx.fillStyle = typeConfig?.color || '#3B82F6';
        ctx.strokeStyle = stanceConfig?.color || '#6B7280';
        ctx.lineWidth = 3 / mapState.zoom;
        
        ctx.beginPath();
        ctx.arc(city.x, city.y, 8 / mapState.zoom, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Selection indicator
        if (selectedCity?.id === city.id) {
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 2 / mapState.zoom;
          ctx.beginPath();
          ctx.arc(city.x, city.y, 12 / mapState.zoom, 0, 2 * Math.PI);
          ctx.stroke();
        }

        // City name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${12 / mapState.zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(city.name, city.x, city.y - 15 / mapState.zoom);

        // Threat level indicator
        if (city.threatLevel > 3) {
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(city.x + 10 / mapState.zoom, city.y - 10 / mapState.zoom, 3 / mapState.zoom, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }

    ctx.restore();
  }, [mapState, mapDimensions, selectedCity]);

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

  const loadMapState = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.mapState) {
          setMapState(data.mapState);
          addToHistory(data.mapState, 'Load map');
          onMapStateChange?.(data.mapState);
          onCitiesChange?.(data.mapState.cities);
        }
      } catch (error) {
        alert('Invalid map file format');
      }
    };
    reader.readAsText(file);
  }, [addToHistory, onMapStateChange, onCitiesChange]);

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

      if (event.key === 'F11' || (event.key === 'f' && (event.ctrlKey || event.metaKey))) {
        event.preventDefault();
        setIsFullscreen(prev => !prev);
      }

      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveMapState, selectedCity, deleteCity, readOnly, isFullscreen]);

  return (
    <div className={`
      ${isFullscreen 
        ? 'fixed inset-0 z-50 bg-slate-900' 
        : 'w-full h-full bg-slate-900 rounded-lg overflow-hidden'
      }
    `}>
      <div className="flex h-full">
        {/* Map Canvas Area */}
        <div className="flex-1 relative bg-slate-800">
          {/* Toolbar */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-800/90 backdrop-blur-sm rounded-lg p-2 border border-slate-600">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-300 hover:text-white"
              title="Import Map Image"
            >
              <Upload className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={undo}
              disabled={!canUndo}
              className="text-slate-300 hover:text-white disabled:opacity-50"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={redo}
              disabled={!canRedo}
              className="text-slate-300 hover:text-white disabled:opacity-50"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-slate-600" />

            <Button
              size="sm"
              variant={isAddingCity ? "default" : "ghost"}
              onClick={() => setIsAddingCity(!isAddingCity)}
              disabled={readOnly}
              className="text-slate-300 hover:text-white"
              title="Add City"
            >
              <Plus className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant={mapState.gridVisible ? "default" : "ghost"}
              onClick={() => updateMapState({ gridVisible: !mapState.gridVisible }, 'Toggle grid')}
              className="text-slate-300 hover:text-white"
              title="Toggle Grid"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-slate-600" />

            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleZoom(0.1)}
              className="text-slate-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleZoom(-0.1)}
              className="text-slate-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <span className="text-xs text-slate-400 min-w-[3rem]">
              {Math.round(mapState.zoom * 100)}%
            </span>

            <div className="w-px h-6 bg-slate-600" />

            <Button
              size="sm"
              variant="ghost"
              onClick={saveMapState}
              className="text-slate-300 hover:text-white"
              title="Save Map (Ctrl+S)"
            >
              <Save className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-slate-600" />

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-slate-300 hover:text-white"
              title={isFullscreen ? "Exit Fullscreen (F11/Esc)" : "Fullscreen (F11)"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>

          {/* Map Canvas */}
          <canvas
            ref={mapCanvasRef}
            width={isFullscreen ? 1920 : 800}
            height={isFullscreen ? 1080 : 500}
            className="w-full h-full cursor-crosshair"
            onClick={handleMapClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ 
              cursor: isAddingCity ? 'crosshair' : isDragging ? 'grabbing' : 'default' 
            }}
          />

          {/* Status Bar */}
          <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur-sm rounded-lg p-2 border border-slate-600">
            <div className="flex items-center gap-4 text-xs text-slate-300">
              <span>Cities: {mapState.cities.length}</span>
              <span>Zoom: {Math.round(mapState.zoom * 100)}%</span>
              {selectedCity && (
                <span>Selected: {selectedCity.name}</span>
              )}
              {isAddingCity && (
                <span className="text-orange-400">Click to place city</span>
              )}
              {isFullscreen && (
                <span className="text-blue-400">Fullscreen Mode</span>
              )}
            </div>
          </div>

          {/* Fullscreen City Quick Info */}
          {isFullscreen && selectedCity && (
            <div className="absolute top-20 right-4 w-72 bg-slate-800/95 backdrop-blur-sm rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-400" />
                  {selectedCity.name}
                </h4>
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
                    className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedCity(null)}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Type:</span>
                  <div className="flex items-center gap-1">
                    <span>{CITY_TYPES.find(t => t.value === selectedCity.type)?.icon}</span>
                    <span className="text-white capitalize">{selectedCity.type.replace('_', ' ')}</span>
                  </div>
                </div>
                
                {selectedCity.population && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Population:</span>
                    <span className="text-white">{selectedCity.population.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Threat Level:</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      selectedCity.threatLevel > 3 ? 'bg-red-400' : 
                      selectedCity.threatLevel > 1 ? 'bg-yellow-400' : 'bg-green-400'
                    }`} />
                    <span className="text-white">{selectedCity.threatLevel}/5</span>
                  </div>
                </div>

                {selectedCity.politicalStance && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Stance:</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
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

                {selectedCity.controllingFaction && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Faction:</span>
                    <span className="text-white text-xs flex items-center gap-1">
                      <Crown className="h-3 w-3 text-yellow-400" />
                      {selectedCity.controllingFaction}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fullscreen City List */}
          {isFullscreen && (
            <div className="absolute top-20 left-4 w-64 max-h-96 bg-slate-800/95 backdrop-blur-sm rounded-lg border border-slate-600 overflow-hidden">
              <div className="p-3 border-b border-slate-600">
                <h4 className="text-white font-medium text-sm">Cities ({mapState.cities.length})</h4>
              </div>
              <ScrollArea className="max-h-80">
                <div className="p-2 space-y-1">
                  {mapState.cities.map((city) => (
                    <div
                      key={city.id}
                      className={`p-2 rounded cursor-pointer transition-colors text-sm ${
                        selectedCity?.id === city.id
                          ? 'bg-orange-500/20 border border-orange-500/50'
                          : 'bg-slate-600/50 hover:bg-slate-600'
                      }`}
                      onClick={() => setSelectedCity(city)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">
                            {CITY_TYPES.find(t => t.value === city.type)?.icon}
                          </span>
                          <span className="text-white font-medium">
                            {city.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {city.threatLevel > 3 && (
                            <AlertCircle className="h-3 w-3 text-red-400" />
                          )}
                          <span className="text-xs text-slate-400">
                            {city.population ? `${(city.population / 1000).toFixed(0)}k` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {mapState.cities.length === 0 && (
                    <div className="text-center py-4 text-slate-400">
                      <MapPin className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No cities on the map</p>
                      <p className="text-xs">Click the + button to add cities</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Right Panel - City Information & Controls */}
        {!isFullscreen && (
          <div className="w-80 bg-slate-800 border-l border-slate-700 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* Panel Header */}
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-orange-400" />
                Map Controls
              </h3>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* Map Settings */}
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm">Map Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-300 text-sm">Grid Overlay</Label>
                      <Switch
                        checked={mapState.gridVisible}
                        onCheckedChange={(checked) => 
                          updateMapState({ gridVisible: checked }, 'Toggle grid')
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300 text-sm">Grid Size</Label>
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
                      <span className="text-xs text-slate-400">{mapState.gridSize}px</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-slate-300 text-sm">Snap to Grid</Label>
                      <Switch
                        checked={mapState.snapToGrid}
                        onCheckedChange={(checked) => 
                          updateMapState({ snapToGrid: checked }, 'Toggle snap to grid')
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Selected City Information */}
                {selectedCity && (
                  <Card className="bg-slate-700/50 border-slate-600">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white text-sm flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-orange-400" />
                          {selectedCity.name}
                        </CardTitle>
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
                            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCity(selectedCity.id)}
                            disabled={readOnly}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-slate-400 text-xs">Type</Label>
                          <div className="flex items-center gap-1">
                            <span className="text-sm">
                              {CITY_TYPES.find(t => t.value === selectedCity.type)?.icon}
                            </span>
                            <span className="text-white text-sm capitalize">
                              {selectedCity.type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-slate-400 text-xs">Threat Level</Label>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${
                              selectedCity.threatLevel > 3 ? 'bg-red-400' : 
                              selectedCity.threatLevel > 1 ? 'bg-yellow-400' : 'bg-green-400'
                            }`} />
                            <span className="text-white text-sm">{selectedCity.threatLevel}/5</span>
                          </div>
                        </div>
                      </div>

                      {selectedCity.population && (
                        <div>
                          <Label className="text-slate-400 text-xs">Population</Label>
                          <p className="text-white text-sm">
                            {selectedCity.population.toLocaleString()}
                          </p>
                        </div>
                      )}

                      {selectedCity.controllingFaction && (
                        <div>
                          <Label className="text-slate-400 text-xs">Controlling Faction</Label>
                          <p className="text-white text-sm flex items-center gap-1">
                            <Crown className="h-3 w-3 text-yellow-400" />
                            {selectedCity.controllingFaction}
                          </p>
                        </div>
                      )}

                      {selectedCity.politicalStance && (
                        <div>
                          <Label className="text-slate-400 text-xs">Political Stance</Label>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
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
                          <Label className="text-slate-400 text-xs">Resources</Label>
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
                          <Label className="text-slate-400 text-xs">Description</Label>
                          <p className="text-slate-300 text-sm">
                            {selectedCity.description}
                          </p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-600">
                        <Label className="text-slate-400 text-xs">Coordinates</Label>
                        <p className="text-slate-300 text-sm">
                          X: {Math.round(selectedCity.x)}, Y: {Math.round(selectedCity.y)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* City List */}
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-sm">All Cities ({mapState.cities.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {mapState.cities.map((city) => (
                        <div
                          key={city.id}
                          className={`p-2 rounded cursor-pointer transition-colors ${
                            selectedCity?.id === city.id
                              ? 'bg-orange-500/20 border border-orange-500/50'
                              : 'bg-slate-600/50 hover:bg-slate-600'
                          }`}
                          onClick={() => setSelectedCity(city)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {CITY_TYPES.find(t => t.value === city.type)?.icon}
                              </span>
                              <span className="text-white text-sm font-medium">
                                {city.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {city.threatLevel > 3 && (
                                <AlertCircle className="h-3 w-3 text-red-400" />
                              )}
                              <span className="text-xs text-slate-400">
                                {city.population ? `${(city.population / 1000).toFixed(0)}k` : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {mapState.cities.length === 0 && (
                        <div className="text-center py-4 text-slate-400">
                          <MapPin className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No cities on the map</p>
                          <p className="text-xs">Click the + button to add cities</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </div>
        )}
      </div>

      {/* City Edit Modal */}
      {showCityForm && editingCity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-white">
                {editingCity.id.startsWith('city-') ? 'Edit City' : 'New City'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Name</Label>
                  <Input
                    value={cityForm.name || ''}
                    onChange={(e) => setCityForm(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Type</Label>
                  <Select
                    value={cityForm.type}
                    onValueChange={(value) => setCityForm(prev => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Threat Level (1-5)</Label>
                  <Select
                    value={String(cityForm.threatLevel || 1)}
                    onValueChange={(value) => setCityForm(prev => ({ ...prev, threatLevel: parseInt(value) }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <SelectItem key={level} value={String(level)}>
                          Level {level}
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
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Political Stance</Label>
                  <Select
                    value={cityForm.politicalStance}
                    onValueChange={(value) => setCityForm(prev => ({ ...prev, politicalStance: value as any }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
                  className="bg-slate-700 border-slate-600 text-white"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCityForm(false);
                    setEditingCity(null);
                    setCityForm({
                      name: '',
                      type: 'city',
                      population: 0,
                      controllingFaction: '',
                      resources: [],
                      threatLevel: 1,
                      politicalStance: 'neutral',
                      description: ''
                    });
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
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
