
/**
 * Custom hook for managing map editor state and operations
 * Provides reusable map editing functionality with persistence and validation
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface CityData {
  id: string;
  name: string;
  x: number;
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

interface UseMapEditorOptions {
  initialState?: Partial<MapState>;
  maxHistorySize?: number;
  autoSave?: boolean;
  autoSaveDelay?: number;
  storageKey?: string;
}

export function useMapEditor(options: UseMapEditorOptions = {}) {
  const {
    initialState = {},
    maxHistorySize = 50,
    autoSave = false,
    autoSaveDelay = 1000,
    storageKey = 'map-editor-state'
  } = options;

  // Default state
  const defaultState: MapState = {
    cities: [],
    zoom: 1,
    panX: 0,
    panY: 0,
    gridVisible: false,
    gridSize: 20,
    snapToGrid: true,
    ...initialState
  };

  // Core state
  const [mapState, setMapState] = useState<MapState>(defaultState);
  const [history, setHistory] = useState<HistoryEntry[]>([
    { state: defaultState, action: 'Initial', timestamp: Date.now() }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Refs for auto-save
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedStateRef = useRef<MapState>(defaultState);

  // Load from localStorage on mount
  useEffect(() => {
    if (autoSave) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsedState = JSON.parse(saved);
          setMapState(parsedState);
          lastSavedStateRef.current = parsedState;
        }
      } catch (error) {
        console.warn('Failed to load map state from localStorage:', error);
      }
    }
  }, [autoSave, storageKey]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && mapState !== lastSavedStateRef.current) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(mapState));
          lastSavedStateRef.current = mapState;
        } catch (error) {
          console.warn('Failed to auto-save map state:', error);
        }
      }, autoSaveDelay);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [mapState, autoSave, storageKey, autoSaveDelay]);

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
    if (newHistory.length > maxHistorySize) {
      newHistory.shift();
    } else {
      setHistoryIndex(prev => prev + 1);
    }
    
    setHistory(newHistory);
  }, [history, historyIndex, maxHistorySize]);

  // State update with history
  const updateMapState = useCallback((updates: Partial<MapState>, action: string) => {
    const newState = { ...mapState, ...updates };
    setMapState(newState);
    addToHistory(newState, action);
  }, [mapState, addToHistory]);

  // Undo/Redo
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setMapState(history[newIndex].state);
    }
  }, [canUndo, historyIndex, history]);

  const redo = useCallback(() => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setMapState(history[newIndex].state);
    }
  }, [canRedo, historyIndex, history]);

  // Utility functions
  const snapToGrid = useCallback((x: number, y: number) => {
    if (!mapState.snapToGrid) return { x, y };
    const gridSize = mapState.gridSize;
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
  }, [mapState.snapToGrid, mapState.gridSize]);

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

  // City management
  const addCity = useCallback((x: number, y: number, cityData?: Partial<CityData>) => {
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
    
    return newCity;
  }, [snapToGrid, mapState.cities, updateMapState]);

  const updateCity = useCallback((cityId: string, updates: Partial<CityData>) => {
    const updatedCities = mapState.cities.map(city => 
      city.id === cityId ? { ...city, ...updates } : city
    );
    
    updateMapState({ cities: updatedCities }, `Update city: ${updates.name || cityId}`);
  }, [mapState.cities, updateMapState]);

  const deleteCity = useCallback((cityId: string) => {
    const cityToDelete = mapState.cities.find(c => c.id === cityId);
    const updatedCities = mapState.cities.filter(city => city.id !== cityId);
    
    updateMapState({ cities: updatedCities }, `Delete city: ${cityToDelete?.name || cityId}`);
  }, [mapState.cities, updateMapState]);

  const moveCity = useCallback((cityId: string, x: number, y: number) => {
    const snapped = snapToGrid(x, y);
    updateCity(cityId, { x: snapped.x, y: snapped.y });
  }, [snapToGrid, updateCity]);

  // Validation
  const validateCityPlacement = useCallback((x: number, y: number, excludeCityId?: string) => {
    const minDistance = 50; // Minimum distance between cities
    
    for (const city of mapState.cities) {
      if (excludeCityId && city.id === excludeCityId) continue;
      
      const distance = Math.sqrt(
        Math.pow(x - city.x, 2) + Math.pow(y - city.y, 2)
      );
      
      if (distance < minDistance) {
        return {
          valid: false,
          error: `Too close to existing city "${city.name}"`
        };
      }
    }
    
    return { valid: true };
  }, [mapState.cities]);

  // Bulk operations
  const selectCitiesInArea = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    return mapState.cities.filter(city => 
      city.x >= minX && city.x <= maxX && city.y >= minY && city.y <= maxY
    );
  }, [mapState.cities]);

  const bulkUpdateCities = useCallback((cityIds: string[], updates: Partial<CityData>) => {
    const updatedCities = mapState.cities.map(city => 
      cityIds.includes(city.id) ? { ...city, ...updates } : city
    );
    
    updateMapState({ cities: updatedCities }, `Bulk update ${cityIds.length} cities`);
  }, [mapState.cities, updateMapState]);

  // Export/Import
  const exportMapData = useCallback(() => {
    return {
      mapState,
      metadata: {
        version: '1.0',
        created: new Date().toISOString(),
        cityCount: mapState.cities.length
      }
    };
  }, [mapState]);

  const importMapData = useCallback((data: any) => {
    try {
      if (data.mapState) {
        setMapState(data.mapState);
        addToHistory(data.mapState, 'Import map data');
        return { success: true };
      } else {
        return { success: false, error: 'Invalid map data format' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to parse map data' };
    }
  }, [addToHistory]);

  // Manual save/load
  const saveToStorage = useCallback((key?: string) => {
    try {
      localStorage.setItem(key || storageKey, JSON.stringify(mapState));
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to save to storage' };
    }
  }, [mapState, storageKey]);

  const loadFromStorage = useCallback((key?: string) => {
    try {
      const saved = localStorage.getItem(key || storageKey);
      if (saved) {
        const parsedState = JSON.parse(saved);
        setMapState(parsedState);
        addToHistory(parsedState, 'Load from storage');
        return { success: true };
      } else {
        return { success: false, error: 'No saved data found' };
      }
    } catch (error) {
      return { success: false, error: 'Failed to load from storage' };
    }
  }, [storageKey, addToHistory]);

  // Reset functionality
  const resetToDefault = useCallback(() => {
    setMapState(defaultState);
    setHistory([{ state: defaultState, action: 'Reset', timestamp: Date.now() }]);
    setHistoryIndex(0);
  }, [defaultState]);

  return {
    // State
    mapState,
    history,
    historyIndex,
    
    // History operations
    canUndo,
    canRedo,
    undo,
    redo,
    
    // State updates
    updateMapState,
    
    // City operations
    addCity,
    updateCity,
    deleteCity,
    moveCity,
    
    // Utility functions
    snapToGrid,
    transformCoordinates,
    reverseTransformCoordinates,
    validateCityPlacement,
    
    // Bulk operations
    selectCitiesInArea,
    bulkUpdateCities,
    
    // Data operations
    exportMapData,
    importMapData,
    saveToStorage,
    loadFromStorage,
    resetToDefault
  };
}
