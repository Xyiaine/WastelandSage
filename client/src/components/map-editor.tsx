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
    description: ''
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
    }
  }, [readOnly, mapState.cities, selectedCity, updateMapState]);

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