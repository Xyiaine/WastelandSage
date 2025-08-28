/**
 * Scenario Builder Component - Interactive scenario and world-building interface
 * 
 * This component provides a comprehensive interface for creating and managing:
 * - Main scenario concepts and themes
 * - World context and political situations
 * - Cities, settlements, and regions
 * - Interactive library of reusable elements
 * 
 * Features:
 * - Real-time scenario creation and editing
 * - Dynamic region management with drag-and-drop
 * - Smart categorization and filtering
 * - Adaptive event generation based on scenario context
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription } from './ui/alert';
import { Plus, Save, Trash2, Edit3, Edit, MapPin, Users, Shield, Coins, AlertTriangle } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { InteractiveLibrary } from './interactive-library';
import { ImportExportControls } from './import-export-controls';

// Types for scenario management
interface Scenario {
  id: string;
  userId: string | null;
  title: string;
  mainIdea: string;
  worldContext: string | null;
  politicalSituation: string | null;
  keyThemes: string[] | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

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

interface CreateScenarioData {
  title: string;
  mainIdea: string;
  worldContext?: string;
  politicalSituation?: string;
  keyThemes?: string[];
  status?: 'draft' | 'active' | 'completed' | 'archived';
  userId?: string;
}

interface CreateRegionData {
  name: string;
  type: 'city' | 'settlement' | 'wasteland' | 'fortress' | 'trade_hub' | 'industrial';
  description?: string;
  controllingFaction?: string;
  population?: number;
  resources?: string[];
  threatLevel?: number;
  politicalStance?: 'hostile' | 'neutral' | 'friendly' | 'allied';
  tradeRoutes?: string[];
  scenarioId?: string;
}

// Constants for form options
const REGION_TYPES = [
  { value: 'city', label: 'City', icon: '🏙️' },
  { value: 'settlement', label: 'Settlement', icon: '🏘️' },
  { value: 'wasteland', label: 'Wasteland', icon: '🏜️' },
  { value: 'fortress', label: 'Fortress', icon: '🏰' },
  { value: 'trade_hub', label: 'Trade Hub', icon: '🏪' }
];

const POLITICAL_STANCES = [
  { value: 'hostile', label: 'Hostile', color: 'destructive' },
  { value: 'neutral', label: 'Neutral', color: 'secondary' },
  { value: 'friendly', label: 'Friendly', color: 'outline' },
  { value: 'allied', label: 'Allied', color: 'default' }
];

const COMMON_THEMES = [
  'survival', 'politics', 'mystery', 'exploration', 'trade', 'warfare', 
  'technology', 'magic', 'religion', 'betrayal', 'discovery', 'revenge'
];

const COMMON_RESOURCES = [
  'water', 'fuel', 'weapons', 'medicine', 'food', 'technology', 
  'materials', 'information', 'labor', 'transportation'
];

export function ScenarioBuilder() {
  // State management
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form state
  const [scenarioForm, setScenarioForm] = useState<CreateScenarioData>({
    title: '',
    mainIdea: '',
    worldContext: '',
    politicalSituation: '',
    keyThemes: [],
    status: 'draft'
  });
  
  const [regionForm, setRegionForm] = useState<CreateRegionData>({
    name: '',
    type: 'city',
    description: '',
    controllingFaction: '',
    population: 0,
    resources: [],
    threatLevel: 1,
    politicalStance: 'neutral'
  });
  
  const [showCreateScenario, setShowCreateScenario] = useState(false);
  const [showEditScenario, setShowEditScenario] = useState(false);
  const [showCreateRegion, setShowCreateRegion] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);

  // API Functions
  const fetchScenarios = async () => {
    try {
      setLoading(true);
      // For demo purposes, using a static user ID - in production this would come from auth
      const response = await fetch('/api/scenarios?userId=demo-user');
      if (!response.ok) throw new Error('Failed to fetch scenarios');
      const data = await response.json();
      setScenarios(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scenarios');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async (scenarioId: string) => {
    try {
      const response = await fetch(`/api/scenarios/${scenarioId}/regions`);
      if (!response.ok) throw new Error('Failed to fetch regions');
      const data = await response.json();
      setRegions(data);
      
      // Auto-generate regions if none exist
      if (data.length === 0) {
        console.log('No regions found, generating default regions based on lore...');
        await generateDefaultRegions(scenarioId);
        // Fetch regions again to display the newly created ones
        const newResponse = await fetch(`/api/scenarios/${scenarioId}/regions`);
        if (newResponse.ok) {
          const newData = await newResponse.json();
          setRegions(newData);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch regions');
    }
  };

  const createScenario = async (data: CreateScenarioData) => {
    try {
      setLoading(true);
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: 'demo-user' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.details && Array.isArray(errorData.details)) {
          // Format Zod validation errors
          const validationErrors = errorData.details.map((detail: any) => 
            `${detail.path.join('.')}: ${detail.message}`
          ).join(', ');
          throw new Error(`Validation failed: ${validationErrors}`);
        }
        throw new Error(errorData.error || 'Failed to create scenario');
      }
      
      const scenario = await response.json();
      setScenarios(prev => [scenario, ...prev]);
      setCurrentScenario(scenario);
      setShowCreateScenario(false);
      resetScenarioForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scenario');
    } finally {
      setLoading(false);
    }
  };

  const updateScenario = async (scenarioId: string, data: CreateScenarioData) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/scenarios/${scenarioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.details && Array.isArray(errorData.details)) {
          // Format Zod validation errors
          const validationErrors = errorData.details.map((detail: any) => 
            `${detail.path.join('.')}: ${detail.message}`
          ).join(', ');
          throw new Error(`Validation failed: ${validationErrors}`);
        }
        throw new Error(errorData.error || 'Failed to update scenario');
      }
      
      const updatedScenario = await response.json();
      setScenarios(prev => prev.map(s => s.id === scenarioId ? updatedScenario : s));
      setCurrentScenario(updatedScenario);
      setShowEditScenario(false);
      resetScenarioForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update scenario');
    } finally {
      setLoading(false);
    }
  };

  const createRegion = async (data: CreateRegionData) => {
    try {
      setLoading(true);
      const response = await fetch('/api/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, scenarioId: currentScenario?.id })
      });
      if (!response.ok) throw new Error('Failed to create region');
      const region = await response.json();
      setRegions(prev => [...prev, region]);
      setShowCreateRegion(false);
      resetRegionForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create region');
    } finally {
      setLoading(false);
    }
  };

  const updateRegion = async (regionId: string, data: Partial<CreateRegionData>) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/regions/${regionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update region');
      const updatedRegion = await response.json();
      setRegions(prev => prev.map(r => r.id === regionId ? updatedRegion : r));
      setEditingRegion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update region');
    } finally {
      setLoading(false);
    }
  };

  const deleteRegion = async (regionId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/regions/${regionId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete region');
      setRegions(prev => prev.filter(r => r.id !== regionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete region');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const resetScenarioForm = () => {
    setScenarioForm({
      title: '',
      mainIdea: '',
      worldContext: '',
      politicalSituation: '',
      keyThemes: [],
      status: 'draft'
    });
  };

  // Validation helpers
  const validateScenarioForm = () => {
    const errors: string[] = [];
    
    if (!scenarioForm.title.trim()) {
      errors.push('Title is required');
    } else if (scenarioForm.title.length > 200) {
      errors.push('Title must be under 200 characters');
    }
    
    if (!scenarioForm.mainIdea.trim()) {
      errors.push('Main idea is required');
    } else if (scenarioForm.mainIdea.length < 10) {
      errors.push('Main idea must be at least 10 characters');
    } else if (scenarioForm.mainIdea.length > 10000) {
      errors.push('Main idea must be under 10000 characters');
    }
    
    if (scenarioForm.worldContext && scenarioForm.worldContext.length > 10000) {
      errors.push('World context must be under 10000 characters');
    }
    
    if (scenarioForm.politicalSituation && scenarioForm.politicalSituation.length > 10000) {
      errors.push('Political situation must be under 10000 characters');
    }
    
    return errors;
  };

  const isFormValid = () => {
    return validateScenarioForm().length === 0;
  };

  // Function to populate form with scenario data for editing
  const populateEditForm = (scenario: Scenario) => {
    setScenarioForm({
      title: scenario.title,
      mainIdea: scenario.mainIdea,
      worldContext: scenario.worldContext || '',
      politicalSituation: scenario.politicalSituation || '',
      keyThemes: scenario.keyThemes || [],
      status: scenario.status
    });
  };

  // Automatic region generation based on lore
  const generateDefaultRegions = async (scenarioId: string) => {
    const defaultRegions = [
      {
        name: "Cité Médicale",
        type: "city" as const,
        description: "« Les Blouses Blanches » - Spécialité : médicaments, chirurgie, prothèses, vaccins. Indispensable pour soigner blessures, maladies et radiations. Dirigée par un conseil de docteurs et apothicaires autoritaires.",
        controllingFaction: "Les Blouses Blanches",
        population: 15000,
        resources: ["medicine", "technology"],
        threatLevel: 2,
        politicalStance: "neutral" as const
      },
      {
        name: "Cité du Carburant",
        type: "industrial" as const,
        description: "« Les Raffineurs » - Spécialité : mazout, carburant synthétique, huiles. Contrôle les convois motorisés. Leurs raffineries sont aussi des forteresses mobiles.",
        controllingFaction: "Les Raffineurs",
        population: 12000,
        resources: ["fuel", "technology"],
        threatLevel: 3,
        politicalStance: "hostile" as const
      },
      {
        name: "Cité Industrielle",
        type: "industrial" as const,
        description: "« Les Forgerons d'Acier » - Spécialité : machines, pièces détachées, mécanique lourde. Maîtrise la production de véhicules et générateurs. Usines colossales, villes entières noyées dans la fumée.",
        controllingFaction: "Les Forgerons d'Acier",
        population: 25000,
        resources: ["metal", "technology", "energy"],
        threatLevel: 2,
        politicalStance: "neutral" as const
      },
      {
        name: "Cité de l'Eau & Alimentation",
        type: "fortress" as const,
        description: "« Les Gardiens de la Source » - Spécialité : serres blindées, puits, élevages, semences rares. Nourriture et eau = pouvoir vital. Fortifications autour de vastes réservoirs souterrains.",
        controllingFaction: "Les Gardiens de la Source",
        population: 18000,
        resources: ["food", "water"],
        threatLevel: 4,
        politicalStance: "friendly" as const
      },
      {
        name: "Cité du Divertissement",
        type: "trade_hub" as const,
        description: "« Les Faiseurs de Rêves » - Spécialité : arènes, spectacles, cinéma, propagande. Influence culturelle et morale énorme. Connue pour ses radios et journaux de masse.",
        controllingFaction: "Les Faiseurs de Rêves",
        population: 20000,
        resources: ["information"],
        threatLevel: 1,
        politicalStance: "neutral" as const
      },
      {
        name: "Nuke City",
        type: "city" as const,
        description: "« Le Réacteur à Ciel Ouvert » - Unique cité nucléaire de surface. Énergie colossale, défenses électrifiées, armes avancées. Ville lumineuse dans le désert, crainte de tous.",
        controllingFaction: "Le Réacteur à Ciel Ouvert",
        population: 8000,
        resources: ["fuel", "technology", "weapons"],
        threatLevel: 5,
        politicalStance: "hostile" as const
      },
      {
        name: "Cité des Métaux & Recyclage",
        type: "industrial" as const,
        description: "« Les Fossoyeurs » - Spécialité : récupération dans les ruines, fonderies, mines. Fournit tous les métaux et alliages rares. Cité construite dans un cimetière de gratte-ciels effondrés.",
        controllingFaction: "Les Fossoyeurs",
        population: 10000,
        resources: ["metal"],
        threatLevel: 3,
        politicalStance: "neutral" as const
      },
      {
        name: "Cité de l'Armement & Défense",
        type: "fortress" as const,
        description: "« Les Arsenaux » - Spécialité : armes à feu, explosifs, blindages, véhicules de guerre. Puissance militaire écrasante. La cité est un gigantesque complexe militaire.",
        controllingFaction: "Les Arsenaux",
        population: 22000,
        resources: ["weapons", "metal", "technology"],
        threatLevel: 5,
        politicalStance: "hostile" as const
      },
      {
        name: "L'Île des Anciens",
        type: "city" as const,
        description: "« Le Paradis Perdu » - Technologie pré-apocalyptique intacte, agriculture abondante. Autosuffisante, riche, civilisée. Certains doutent même qu'elle existe vraiment.",
        controllingFaction: "Le Paradis Perdu",
        population: 5000,
        resources: ["technology", "food"],
        threatLevel: 1,
        politicalStance: "neutral" as const
      },
      {
        name: "Bunker Oméga",
        type: "fortress" as const,
        description: "« Les Fantômes d'Acier » - Cité souterraine ultra-avancée, énergie nucléaire. Technologie la plus avancée du monde (armes, drones, IA rudimentaires). N'intervient pas officiellement, mais manipule la surface via espions et agents secrets.",
        controllingFaction: "Les Fantômes d'Acier",
        population: 3000,
        resources: ["technology", "fuel", "information"],
        threatLevel: 5,
        politicalStance: "hostile" as const
      }
    ];

    try {
      for (const regionData of defaultRegions) {
        await createRegion({ ...regionData, scenarioId });
      }
      console.log(`Generated ${defaultRegions.length} default regions for scenario ${scenarioId}`);
    } catch (error) {
      console.error('Failed to generate default regions:', error);
    }
  };

  const resetRegionForm = () => {
    setRegionForm({
      name: '',
      type: 'city',
      description: '',
      controllingFaction: '',
      population: 0,
      resources: [],
      threatLevel: 1,
      politicalStance: 'neutral'
    });
  };

  const handleThemeToggle = (theme: string) => {
    const currentThemes = scenarioForm.keyThemes || [];
    if (currentThemes.includes(theme)) {
      setScenarioForm(prev => ({
        ...prev,
        keyThemes: currentThemes.filter(t => t !== theme)
      }));
    } else {
      setScenarioForm(prev => ({
        ...prev,
        keyThemes: [...currentThemes, theme]
      }));
    }
  };

  const handleResourceToggle = (resource: string) => {
    const currentResources = regionForm.resources || [];
    if (currentResources.includes(resource)) {
      setRegionForm(prev => ({
        ...prev,
        resources: currentResources.filter(r => r !== resource)
      }));
    } else {
      setRegionForm(prev => ({
        ...prev,
        resources: [...currentResources, resource]
      }));
    }
  };

  const getThreatLevelColor = (level: number) => {
    if (level <= 2) return 'default';
    if (level <= 3) return 'secondary';
    return 'destructive';
  };

  const getRegionIcon = (type: string) => {
    const regionType = REGION_TYPES.find(t => t.value === type);
    return regionType?.icon || '📍';
  };

  // Effects
  useEffect(() => {
    fetchScenarios();
  }, []);

  useEffect(() => {
    if (currentScenario) {
      fetchRegions(currentScenario.id);
    }
  }, [currentScenario]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Scenario Builder
          </h1>
          <p className="text-slate-400 text-lg">
            Create immersive worlds with interactive scenarios, cities, and regions
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6 border-red-500 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-300">
              {error}
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-2 text-red-300 hover:text-red-100"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scenario Library Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700 h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-400" />
                    Scenario Library
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateScenario(true)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {scenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all mb-2 ${
                        currentScenario?.id === scenario.id
                          ? 'bg-orange-500/20 border-orange-500/50 border'
                          : 'bg-slate-700/50 hover:bg-slate-700'
                      }`}
                      onClick={() => setCurrentScenario(scenario)}
                    >
                      <h3 className="font-semibold text-white mb-1">{scenario.title}</h3>
                      <p className="text-sm text-slate-300 mb-2 line-clamp-3 whitespace-pre-wrap leading-relaxed">{scenario.mainIdea}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={scenario.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {scenario.status}
                        </Badge>
                        {scenario.keyThemes && scenario.keyThemes.length > 0 && (
                          <span className="text-xs text-slate-400">
                            +{scenario.keyThemes.length} themes
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {scenarios.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No scenarios yet</p>
                      <p className="text-sm">Create your first scenario to get started</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {currentScenario ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>{currentScenario.title}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          populateEditForm(currentScenario);
                          setShowEditScenario(true);
                        }}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Badge variant={currentScenario.status === 'active' ? 'default' : 'secondary'}>
                        {currentScenario.status}
                      </Badge>
                    </div>
                  </CardTitle>
                  <CardDescription className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {currentScenario.mainIdea}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-3 bg-slate-700">
                      <TabsTrigger value="overview" className="text-white">Overview</TabsTrigger>
                      <TabsTrigger value="regions" className="text-white">Regions</TabsTrigger>
                      <TabsTrigger value="library" className="text-white">Library</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="mt-6">
                      <div className="space-y-6">
                        {/* World Context */}
                        {currentScenario.worldContext && (
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-2">World Context</h3>
                            <p className="text-slate-300 bg-slate-700/50 p-4 rounded-lg whitespace-pre-wrap leading-relaxed">
                              {currentScenario.worldContext}
                            </p>
                          </div>
                        )}
                        
                        {/* Political Situation */}
                        {currentScenario.politicalSituation && (
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Political Situation</h3>
                            <p className="text-slate-300 bg-slate-700/50 p-4 rounded-lg whitespace-pre-wrap leading-relaxed">
                              {currentScenario.politicalSituation}
                            </p>
                          </div>
                        )}
                        
                        {/* Key Themes */}
                        {currentScenario.keyThemes && currentScenario.keyThemes.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Key Themes</h3>
                            <div className="flex flex-wrap gap-2">
                              {currentScenario.keyThemes.map((theme) => (
                                <Badge key={theme} variant="outline" className="text-orange-300 border-orange-400">
                                  {theme}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="regions" className="mt-6">
                      <div className="space-y-6">
                        {/* Regions Header */}
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-white">Regions & Locations</h3>
                          <Button
                            onClick={() => setShowCreateRegion(true)}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Region
                          </Button>
                        </div>
                        
                        {/* Regions Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {regions.map((region) => (
                            <Card key={region.id} className="bg-slate-700/50 border-slate-600">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-white flex items-center gap-2 text-lg">
                                    <span className="text-xl">{getRegionIcon(region.type)}</span>
                                    {region.name}
                                  </CardTitle>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingRegion(region)}
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deleteRegion(region.id)}
                                    >
                                      <Trash2 className="h-3 w-3 text-red-400" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{region.type}</Badge>
                                  <Badge variant={getThreatLevelColor(region.threatLevel)}>
                                    Threat {region.threatLevel}
                                  </Badge>
                                  {region.politicalStance && (
                                    <Badge variant="secondary">
                                      {region.politicalStance}
                                    </Badge>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                {region.description && (
                                  <p className="text-slate-300 text-sm mb-3">
                                    {region.description}
                                  </p>
                                )}
                                
                                <div className="space-y-2 text-sm">
                                  {region.controllingFaction && (
                                    <div className="flex items-center gap-2 text-slate-300">
                                      <Shield className="h-3 w-3" />
                                      <span>Controlled by {region.controllingFaction}</span>
                                    </div>
                                  )}
                                  
                                  {region.population !== null && (
                                    <div className="flex items-center gap-2 text-slate-300">
                                      <Users className="h-3 w-3" />
                                      <span>Population: {region.population?.toLocaleString()}</span>
                                    </div>
                                  )}
                                  
                                  {region.resources && region.resources.length > 0 && (
                                    <div className="flex items-center gap-2 text-slate-300">
                                      <Coins className="h-3 w-3" />
                                      <div className="flex flex-wrap gap-1">
                                        {region.resources.map((resource) => (
                                          <Badge key={resource} variant="outline" className="text-xs">
                                            {resource}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        
                        {regions.length === 0 && (
                          <div className="text-center py-12 text-slate-400">
                            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">No regions yet</h3>
                            <p className="mb-4">Add cities, settlements, and locations to bring your world to life</p>
                            <Button
                              onClick={() => setShowCreateRegion(true)}
                              className="bg-orange-500 hover:bg-orange-600"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create First Region
                            </Button>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="library" className="mt-6">
                      <InteractiveLibrary showTitle={false} />
                    </TabsContent>
                    
                    <TabsContent value="import-export" className="mt-6">
                      <ImportExportControls
                        onImportComplete={(result) => {
                          console.log('Import completed:', result);
                          // Refresh scenarios after import
                          fetchScenarios();
                          if (currentScenario) {
                            fetchRegions(currentScenario.id);
                          }
                        }}
                        onExportComplete={() => {
                          console.log('Export completed successfully');
                        }}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-24 text-center">
                  <MapPin className="h-16 w-16 mx-auto mb-6 opacity-50 text-orange-400" />
                  <h2 className="text-2xl font-semibold text-white mb-4">Select or Create a Scenario</h2>
                  <p className="text-slate-400 mb-6 max-w-md mx-auto">
                    Choose an existing scenario from the library or create a new one to start building your world
                  </p>
                  <Button
                    onClick={() => setShowCreateScenario(true)}
                    className="bg-orange-500 hover:bg-orange-600"
                    size="lg"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create New Scenario
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Create Scenario Modal */}
        {showCreateScenario && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white">Create New Scenario</CardTitle>
                <CardDescription className="text-slate-300">
                  Define your main story concept and world-building elements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-white">Title *</Label>
                  <Input
                    id="title"
                    value={scenarioForm.title}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter scenario title..."
                    className={`bg-slate-700 border-slate-600 text-white ${
                      scenarioForm.title.length > 200 ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="text-xs text-slate-400 mt-1">
                    {scenarioForm.title.length}/200 characters
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="mainIdea" className="text-white">Main Idea *</Label>
                  <Textarea
                    id="mainIdea"
                    value={scenarioForm.mainIdea}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, mainIdea: e.target.value }))}
                    placeholder="Describe the core concept and central themes (minimum 10 characters)..."
                    className={`bg-slate-700 border-slate-600 text-white h-32 ${
                      scenarioForm.mainIdea.length < 10 && scenarioForm.mainIdea.length > 0 ? 'border-yellow-500' :
                      scenarioForm.mainIdea.length > 10000 ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="text-xs text-slate-400 mt-1">
                    {scenarioForm.mainIdea.length}/10000 characters
                    {scenarioForm.mainIdea.length < 10 && (
                      <span className="text-yellow-400 ml-2">
                        (minimum 10 characters required)
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="worldContext" className="text-white">World Context</Label>
                  <Textarea
                    id="worldContext"
                    value={scenarioForm.worldContext}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, worldContext: e.target.value }))}
                    placeholder="Background setting information..."
                    className={`bg-slate-700 border-slate-600 text-white h-32 ${
                      (scenarioForm.worldContext?.length || 0) > 10000 ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="text-xs text-slate-400 mt-1">
                    {scenarioForm.worldContext?.length || 0}/10000 characters
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="politicalSituation" className="text-white">Political Situation</Label>
                  <Textarea
                    id="politicalSituation"
                    value={scenarioForm.politicalSituation}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, politicalSituation: e.target.value }))}
                    placeholder="Current political climate and tensions..."
                    className={`bg-slate-700 border-slate-600 text-white h-32 ${
                      (scenarioForm.politicalSituation?.length || 0) > 10000 ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="text-xs text-slate-400 mt-1">
                    {scenarioForm.politicalSituation?.length || 0}/10000 characters
                  </div>
                </div>
                
                <div>
                  <Label className="text-white mb-3 block">Key Themes</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_THEMES.map((theme) => (
                      <Badge
                        key={theme}
                        variant={scenarioForm.keyThemes?.includes(theme) ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${
                          scenarioForm.keyThemes?.includes(theme)
                            ? "bg-orange-500 text-white border-orange-500"
                            : "text-slate-300 border-slate-500 hover:border-orange-400"
                        }`}
                        onClick={() => handleThemeToggle(theme)}
                      >
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Separator className="bg-slate-600" />
                
                {/* Validation Errors */}
                {validateScenarioForm().length > 0 && (
                  <div className="bg-red-900/20 border border-red-500 rounded-md p-3">
                    <div className="text-red-400 text-sm font-medium mb-2">Please fix the following issues:</div>
                    <ul className="text-red-300 text-sm space-y-1">
                      {validateScenarioForm().map((error, index) => (
                        <li key={index} className="flex items-center">
                          <span className="mr-2">•</span>
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateScenario(false);
                      resetScenarioForm();
                    }}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createScenario(scenarioForm)}
                    disabled={!isFormValid() || loading}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Creating...' : 'Create Scenario'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Scenario Modal */}
        {showEditScenario && currentScenario && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white">Edit Scenario</CardTitle>
                <CardDescription className="text-slate-300">
                  Update your story concept and world-building elements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edit-title" className="text-white">Title *</Label>
                  <Input
                    id="edit-title"
                    value={scenarioForm.title}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter scenario title..."
                    className={`bg-slate-700 border-slate-600 text-white ${
                      scenarioForm.title.length > 200 ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="text-xs text-slate-400 mt-1">
                    {scenarioForm.title.length}/200 characters
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-mainIdea" className="text-white">Main Idea *</Label>
                  <Textarea
                    id="edit-mainIdea"
                    value={scenarioForm.mainIdea}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, mainIdea: e.target.value }))}
                    placeholder="Describe the core concept and central themes (minimum 10 characters)..."
                    className={`bg-slate-700 border-slate-600 text-white h-32 ${
                      scenarioForm.mainIdea.length < 10 && scenarioForm.mainIdea.length > 0 ? 'border-yellow-500' :
                      scenarioForm.mainIdea.length > 10000 ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="text-xs text-slate-400 mt-1">
                    {scenarioForm.mainIdea.length}/10000 characters
                    {scenarioForm.mainIdea.length < 10 && (
                      <span className="text-yellow-400 ml-2">
                        (minimum 10 characters required)
                      </span>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-worldContext" className="text-white">World Context</Label>
                  <Textarea
                    id="edit-worldContext"
                    value={scenarioForm.worldContext}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, worldContext: e.target.value }))}
                    placeholder="Detail the setting, geography, and environmental conditions..."
                    className={`bg-slate-700 border-slate-600 text-white h-24 ${
                      (scenarioForm.worldContext || '').length > 10000 ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="text-xs text-slate-400 mt-1">
                    {(scenarioForm.worldContext || '').length}/10000 characters
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-politicalSituation" className="text-white">Political Situation</Label>
                  <Textarea
                    id="edit-politicalSituation"
                    value={scenarioForm.politicalSituation}
                    onChange={(e) => setScenarioForm(prev => ({ ...prev, politicalSituation: e.target.value }))}
                    placeholder="Describe the power dynamics, conflicts, and alliances..."
                    className={`bg-slate-700 border-slate-600 text-white h-24 ${
                      (scenarioForm.politicalSituation || '').length > 10000 ? 'border-red-500' : ''
                    }`}
                  />
                  <div className="text-xs text-slate-400 mt-1">
                    {(scenarioForm.politicalSituation || '').length}/10000 characters
                  </div>
                </div>
                
                <div>
                  <Label className="text-white">Key Themes</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      'Survival', 'Resource Scarcity', 'Technology vs Nature',
                      'Social Hierarchy', 'Redemption', 'Exploration',
                      'Power Struggle', 'Community Building', 'Trade & Economics',
                      'Environmental Hazards', 'Mutants & Radiation', 'Lost Knowledge'
                    ].map((theme) => (
                      <Button
                        key={theme}
                        variant={scenarioForm.keyThemes?.includes(theme) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleThemeToggle(theme)}
                        className={scenarioForm.keyThemes?.includes(theme) 
                          ? "bg-orange-600 hover:bg-orange-700" 
                          : "border-slate-600 text-slate-300 hover:bg-slate-700"
                        }
                      >
                        {theme}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-status" className="text-white">Status</Label>
                  <Select 
                    value={scenarioForm.status} 
                    onValueChange={(value: 'draft' | 'active' | 'completed' | 'archived') => 
                      setScenarioForm(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="draft" className="text-white">Draft</SelectItem>
                      <SelectItem value="active" className="text-white">Active</SelectItem>
                      <SelectItem value="completed" className="text-white">Completed</SelectItem>
                      <SelectItem value="archived" className="text-white">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Validation Errors */}
                {(() => {
                  const errors = validateScenarioForm();
                  return errors.length > 0 && (
                    <div className="bg-red-900/20 border border-red-400 rounded p-3">
                      <div className="text-red-400 text-sm font-medium mb-2">Please fix the following issues:</div>
                      <ul className="text-red-300 text-sm space-y-1">
                        {errors.map((error, index) => (
                          <li key={index} className="flex items-center">
                            <span className="mr-2">•</span>
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
                
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditScenario(false);
                      resetScenarioForm();
                    }}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => updateScenario(currentScenario.id, scenarioForm)}
                    disabled={!isFormValid() || loading}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Updating...' : 'Update Scenario'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Region Modal */}
        {(showCreateRegion || editingRegion) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white">
                  {editingRegion ? 'Edit Region' : 'Create New Region'}
                </CardTitle>
                <CardDescription className="text-slate-300">
                  {editingRegion ? 'Update region details' : 'Add a new location to your scenario'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="regionName" className="text-white">Name *</Label>
                    <Input
                      id="regionName"
                      value={editingRegion?.name || regionForm.name}
                      onChange={(e) => {
                        if (editingRegion) {
                          setEditingRegion(prev => prev ? { ...prev, name: e.target.value } : prev);
                        } else {
                          setRegionForm(prev => ({ ...prev, name: e.target.value }));
                        }
                      }}
                      placeholder="Enter region name..."
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="regionType" className="text-white">Type *</Label>
                    <Select
                      value={editingRegion?.type || regionForm.type}
                      onValueChange={(value) => {
                        if (editingRegion) {
                          setEditingRegion(prev => prev ? { ...prev, type: value as any } : prev);
                        } else {
                          setRegionForm(prev => ({ ...prev, type: value as any }));
                        }
                      }}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {REGION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-white">
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="regionDescription" className="text-white">Description</Label>
                  <Textarea
                    id="regionDescription"
                    value={editingRegion?.description || regionForm.description}
                    onChange={(e) => {
                      if (editingRegion) {
                        setEditingRegion(prev => prev ? { ...prev, description: e.target.value } : prev);
                      } else {
                        setRegionForm(prev => ({ ...prev, description: e.target.value }));
                      }
                    }}
                    placeholder="Describe this region..."
                    className="bg-slate-700 border-slate-600 text-white h-24"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="controllingFaction" className="text-white">Controlling Faction</Label>
                    <Input
                      id="controllingFaction"
                      value={editingRegion?.controllingFaction || regionForm.controllingFaction}
                      onChange={(e) => {
                        if (editingRegion) {
                          setEditingRegion(prev => prev ? { ...prev, controllingFaction: e.target.value } : prev);
                        } else {
                          setRegionForm(prev => ({ ...prev, controllingFaction: e.target.value }));
                        }
                      }}
                      placeholder="Who controls this region..."
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="population" className="text-white">Population</Label>
                    <Input
                      id="population"
                      type="number"
                      value={editingRegion?.population || regionForm.population}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        if (editingRegion) {
                          setEditingRegion(prev => prev ? { ...prev, population: value } : prev);
                        } else {
                          setRegionForm(prev => ({ ...prev, population: value }));
                        }
                      }}
                      placeholder="0"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="threatLevel" className="text-white">Threat Level (1-5)</Label>
                    <Select
                      value={String(editingRegion?.threatLevel || regionForm.threatLevel)}
                      onValueChange={(value) => {
                        const level = parseInt(value);
                        if (editingRegion) {
                          setEditingRegion(prev => prev ? { ...prev, threatLevel: level } : prev);
                        } else {
                          setRegionForm(prev => ({ ...prev, threatLevel: level }));
                        }
                      }}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <SelectItem key={level} value={String(level)} className="text-white">
                            Level {level} {level <= 2 ? '(Safe)' : level <= 3 ? '(Moderate)' : '(Dangerous)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="politicalStance" className="text-white">Political Stance</Label>
                    <Select
                      value={editingRegion?.politicalStance || regionForm.politicalStance}
                      onValueChange={(value) => {
                        if (editingRegion) {
                          setEditingRegion(prev => prev ? { ...prev, politicalStance: value as any } : prev);
                        } else {
                          setRegionForm(prev => ({ ...prev, politicalStance: value as any }));
                        }
                      }}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {POLITICAL_STANCES.map((stance) => (
                          <SelectItem key={stance.value} value={stance.value} className="text-white">
                            {stance.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label className="text-white mb-3 block">Available Resources</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_RESOURCES.map((resource) => {
                      const currentResources = editingRegion?.resources || regionForm.resources || [];
                      const isSelected = currentResources.includes(resource);
                      return (
                        <Badge
                          key={resource}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? "bg-orange-500 text-white border-orange-500"
                              : "text-slate-300 border-slate-500 hover:border-orange-400"
                          }`}
                          onClick={() => {
                            if (editingRegion) {
                              const resources = editingRegion.resources || [];
                              const newResources = isSelected 
                                ? resources.filter(r => r !== resource)
                                : [...resources, resource];
                              setEditingRegion(prev => prev ? { ...prev, resources: newResources } : prev);
                            } else {
                              handleResourceToggle(resource);
                            }
                          }}
                        >
                          {resource}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                
                <Separator className="bg-slate-600" />
                
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateRegion(false);
                      setEditingRegion(null);
                      resetRegionForm();
                    }}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (editingRegion) {
                        updateRegion(editingRegion.id, {
                          name: editingRegion.name,
                          type: editingRegion.type,
                          description: editingRegion.description || undefined,
                          controllingFaction: editingRegion.controllingFaction || undefined,
                          population: editingRegion.population || undefined,
                          resources: editingRegion.resources || undefined,
                          threatLevel: editingRegion.threatLevel,
                          politicalStance: editingRegion.politicalStance || undefined
                        });
                      } else {
                        createRegion(regionForm);
                      }
                    }}
                    disabled={
                      editingRegion 
                        ? !editingRegion.name || loading
                        : !regionForm.name || loading
                    }
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading 
                      ? editingRegion ? 'Updating...' : 'Creating...'
                      : editingRegion ? 'Update Region' : 'Create Region'
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}