
/**
 * Map Manager Component
 * 
 * High-level wrapper that integrates the map editor with the scenario system
 * Handles data synchronization and provides additional management features
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { MapEditor } from './map-editor';
import { MediterraneanMap } from './mediterranean-map';
import { 
  Map, Globe, Settings, Import, Export, 
  RotateCcw, Save, AlertCircle, Maximize2 
} from 'lucide-react';

interface Region {
  id: string;
  scenarioId: string | null;
  name: string;
  type: 'city' | 'settlement' | 'wasteland' | 'fortress' | 'trade_hub' | 'industrial';
  description: string | null;
  controllingFaction: string | null;
  population: number | null;
  resources: string[] | null;
  threatLevel: number;
  politicalStance: 'hostile' | 'neutral' | 'friendly' | 'allied' | null;
  tradeRoutes: string[] | null;
  createdAt: Date;
}

interface MapManagerProps {
  currentScenario: any;
  regions: Region[];
  onRegionUpdate?: (regionId: string) => void;
  onRegionsChange?: (regions: Region[]) => void;
}

export function MapManager({ 
  currentScenario, 
  regions, 
  onRegionUpdate,
  onRegionsChange 
}: MapManagerProps) {
  const [activeMapMode, setActiveMapMode] = useState<'legacy' | 'editor'>('editor');
  const [mapCities, setMapCities] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error'>('synced');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Convert regions to map cities format with Mediterranean positioning
  const convertRegionsToMapCities = useCallback((regions: Region[]) => {
    // Mediterranean city positions based on real geography
    const cityPositions: { [key: string]: { x: number; y: number } } = {
      'Cité Médicale': { x: 200, y: 300 }, // Southern France area
      'Cité du Carburant': { x: 350, y: 250 }, // Central Italy area
      'Cité Industrielle': { x: 450, y: 200 }, // Northern Italy area
      'Cité de l\'Eau & Alimentation': { x: 150, y: 250 }, // Eastern Spain area
      'Cité du Divertissement': { x: 550, y: 350 }, // Sicily area
      'Nuke City': { x: 100, y: 150 }, // Northeastern Spain area
      'Cité des Métaux & Recyclage': { x: 300, y: 400 }, // North Africa area
      'Cité de l\'Armement & Défense': { x: 600, y: 250 }, // Greece area
      'L\'Île des Anciens': { x: 700, y: 350 }, // Cyprus area
      'Bunker Oméga': { x: 400, y: 150 }, // Alpine region
    };

    return regions.map((region, index) => {
      const position = cityPositions[region.name] || {
        // Fallback to circular distribution for unknown cities
        x: 400 + 200 * Math.cos((index * 2 * Math.PI) / regions.length),
        y: 300 + 150 * Math.sin((index * 2 * Math.PI) / regions.length)
      };

      return {
        id: region.id,
        name: region.name,
        x: position.x,
        y: position.y,
        type: region.type,
        population: region.population || 0,
        controllingFaction: region.controllingFaction || '',
        resources: region.resources || [],
        threatLevel: region.threatLevel,
        politicalStance: region.politicalStance || 'neutral',
        description: region.description || '',
        metadata: {
          scenarioId: region.scenarioId,
          tradeRoutes: region.tradeRoutes,
          createdAt: region.createdAt
        }
      };
    });
  }, []);

  // Convert map cities back to regions format
  const convertMapCitiesToRegions = useCallback((cities: any[]): Region[] => {
    return cities.map(city => ({
      id: city.id,
      scenarioId: currentScenario?.id || null,
      name: city.name,
      type: city.type,
      description: city.description || null,
      controllingFaction: city.controllingFaction || null,
      population: city.population || null,
      resources: city.resources?.length > 0 ? city.resources : null,
      threatLevel: city.threatLevel,
      politicalStance: city.politicalStance || null,
      tradeRoutes: city.metadata?.tradeRoutes || null,
      createdAt: city.metadata?.createdAt || new Date()
    }));
  }, [currentScenario]);

  // Sync regions to map cities when regions change
  useEffect(() => {
    const newMapCities = convertRegionsToMapCities(regions);
    setMapCities(newMapCities);
    setSyncStatus('synced');
  }, [regions, convertRegionsToMapCities]);

  // Handle cities change from map editor
  const handleCitiesChange = useCallback((cities: any[]) => {
    setMapCities(cities);
    setSyncStatus('pending');
    
    // Convert and update regions
    const newRegions = convertMapCitiesToRegions(cities);
    onRegionsChange?.(newRegions);
    
    // Auto-sync after a delay
    setTimeout(() => {
      setSyncStatus('synced');
    }, 1000);
  }, [convertMapCitiesToRegions, onRegionsChange]);

  // Manual sync function
  const syncChanges = useCallback(async () => {
    try {
      setSyncStatus('pending');
      const newRegions = convertMapCitiesToRegions(mapCities);
      
      // Here you would typically make API calls to update the regions
      // For now, we'll just call the callback
      onRegionsChange?.(newRegions);
      
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      console.error('Failed to sync map changes:', error);
    }
  }, [mapCities, convertMapCitiesToRegions, onRegionsChange]);

  // Reset to original data
  const resetToOriginal = useCallback(() => {
    const originalMapCities = convertRegionsToMapCities(regions);
    setMapCities(originalMapCities);
    setSyncStatus('synced');
  }, [regions, convertRegionsToMapCities]);

  // Keyboard shortcuts for fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
  }, [isFullscreen]);

  return (
    <div className={`
      ${isFullscreen 
        ? 'fixed inset-0 z-50 bg-slate-900' 
        : 'w-full h-full bg-slate-900 rounded-lg overflow-hidden'
      }
    `}>
      <div className="h-full flex flex-col">
        {/* Header with mode toggle and sync status */}
        {!isFullscreen && (
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Map className="h-5 w-5 text-orange-400" />
              Map Manager
            </h2>
            
            <Tabs value={activeMapMode} onValueChange={(value) => setActiveMapMode(value as any)}>
              <TabsList className="bg-slate-700">
                <TabsTrigger value="editor" className="text-white">
                  Advanced Editor
                </TabsTrigger>
                <TabsTrigger value="legacy" className="text-white">
                  Legacy View
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                syncStatus === 'synced' ? 'bg-green-400' :
                syncStatus === 'pending' ? 'bg-yellow-400 animate-pulse' :
                'bg-red-400'
              }`} />
              <span className="text-sm text-slate-300">
                {syncStatus === 'synced' ? 'Synced' :
                 syncStatus === 'pending' ? 'Syncing...' :
                 'Error'}
              </span>
            </div>

            {/* Action Buttons */}
            {syncStatus === 'pending' && (
              <Button
                size="sm"
                onClick={syncChanges}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            )}

            {syncStatus === 'error' && (
              <Button
                size="sm"
                variant="outline"
                onClick={resetToOriginal}
                className="border-red-500 text-red-400 hover:bg-red-500/10"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}

            <Badge variant="outline" className="text-slate-300">
              {mapCities.length} locations
            </Badge>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-slate-300 hover:text-white"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        )}

        {/* Fullscreen Mode Controls */}
        {isFullscreen && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-slate-800/90 backdrop-blur-sm rounded-lg p-2 border border-slate-600">
            <Tabs value={activeMapMode} onValueChange={(value) => setActiveMapMode(value as any)}>
              <TabsList className="bg-slate-700 h-8">
                <TabsTrigger value="editor" className="text-white text-xs px-3">
                  Editor
                </TabsTrigger>
                <TabsTrigger value="legacy" className="text-white text-xs px-3">
                  Legacy
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                syncStatus === 'synced' ? 'bg-green-400' :
                syncStatus === 'pending' ? 'bg-yellow-400 animate-pulse' :
                'bg-red-400'
              }`} />
              <span className="text-xs text-slate-300">{mapCities.length} locations</span>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFullscreen(false)}
              className="text-slate-300 hover:text-white"
              title="Exit Fullscreen (ESC)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Map Content */}
        <div className="flex-1 overflow-hidden">
          {activeMapMode === 'editor' ? (
            <MapEditor
              initialCities={mapCities}
              onCitiesChange={handleCitiesChange}
              onMapStateChange={(state) => {
                // Handle map state changes (zoom, pan, etc.)
                console.log('Map state changed:', state);
              }}
            />
          ) : (
            <MediterraneanMap
              currentScenario={currentScenario}
              regions={regions}
              onRegionUpdate={onRegionUpdate}
            />
          )}
        </div>

        {/* Status Bar */}
        {!isFullscreen && (
          <div className="p-2 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Mode: {activeMapMode === 'editor' ? 'Advanced Editor' : 'Legacy View'}
            </span>
            
            <div className="flex items-center gap-4">
              {currentScenario && (
                <span>Scenario: {currentScenario.title}</span>
              )}
              
              <span>
                Last updated: {new Date().toLocaleTimeString()}
              </span>
              
              {syncStatus === 'error' && (
                <span className="text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Sync failed
                </span>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
