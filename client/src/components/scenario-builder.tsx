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
import { Plus, Save, Trash2, Edit3, Edit, MapPin, Users, Shield, Coins, AlertTriangle, Crown, Zap, Target, Clock, Skull, Settings, Download, Upload, Shuffle, Lightbulb, Copy, FileText, Globe, Search } from 'lucide-react';
// Temporary local interfaces until we fix schema import
interface ScenarioNPC {
  id: string;
  scenarioId: string;
  name: string;
  role: string;
  description: string;
  location: string | null;
  faction: string | null;
  importance: 'minor' | 'major' | 'critical';
  status: 'alive' | 'dead' | 'missing' | 'unknown';
  createdAt?: Date;
}

interface ScenarioQuest {
  id: string;
  scenarioId: string;
  title: string;
  description: string;
  status: 'not_started' | 'active' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  rewards: string | null;
  requirements: string | null;
  createdAt?: Date;
}

interface EnvironmentalCondition {
  id: string;
  scenarioId: string;
  name: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe' | 'extreme';
  affectedRegions: string[];
  duration: string | null;
  createdAt?: Date;
}
import { LanguageSwitcher } from './LanguageSwitcher';
import { InteractiveLibrary } from './interactive-library';
import { ImportExportControls } from './import-export-controls';
import { CharacterManager } from './character-manager';
import { PlayerManager } from './player-manager';
import { MediterraneanMap } from './mediterranean-map';
import { MapManager } from './map-manager';

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

// Types imported from shared schema

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
  { value: 'trade_hub', label: 'Trade Hub', icon: '🏪' },
  { value: 'industrial', label: 'Industrial', icon: '🏭' }
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
  'materials', 'information', 'labor', 'transportation', 'metal', 'energy'
];

const NPC_ROLES = [
  { value: 'leader', label: 'Leader', icon: '👑' },
  { value: 'merchant', label: 'Merchant', icon: '💼' },
  { value: 'trader', label: 'Trader', icon: '🛒' },
  { value: 'warrior', label: 'Warrior', icon: '⚔️' },
  { value: 'guard', label: 'Guard', icon: '🛡️' },
  { value: 'scientist', label: 'Scientist', icon: '🔬' },
  { value: 'engineer', label: 'Engineer', icon: '🔧' },
  { value: 'informant', label: 'Informant', icon: '🕵️' },
  { value: 'medic', label: 'Medic', icon: '🏥' },
  { value: 'guide', label: 'Guide', icon: '🗺️' },
  { value: 'survivor', label: 'Survivor', icon: '🏃' },
  { value: 'antagonist', label: 'Antagonist', icon: '💀' }
];

const IMPORTANCE_LEVELS = [
  { value: 'minor', label: 'Minor', color: 'secondary' },
  { value: 'major', label: 'Major', color: 'default' },
  { value: 'critical', label: 'Critical', color: 'destructive' }
];

const QUEST_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'secondary' },
  { value: 'medium', label: 'Medium', color: 'default' },
  { value: 'high', label: 'High', color: 'outline' },
  { value: 'critical', label: 'Critical', color: 'destructive' }
];

const CONDITION_SEVERITIES = [
  { value: 'mild', label: 'Mild', color: 'default' },
  { value: 'moderate', label: 'Moderate', color: 'secondary' },
  { value: 'severe', label: 'Severe', color: 'outline' },
  { value: 'extreme', label: 'Extreme', color: 'destructive' }
];

const SCENARIO_TEMPLATES = [
  {
    id: 'post-apocalyptic-survival',
    name: '🏜️ Post-Apocalyptic Survival',
    description: 'Resource scarcity, harsh environment, small communities struggling to survive',
    keyThemes: ['survival', 'resource scarcity', 'community building'],
    worldContext: 'The world has been devastated by nuclear war. Small pockets of survivors cluster around vital resources.',
    politicalSituation: 'No central authority exists. Local strongmen and resource controllers hold power.'
  },
  {
    id: 'dieselpunk-trade-wars',
    name: '⚙️ Dieselpunk Trade Wars',
    description: 'Industrial city-states compete for resources and trade dominance',
    keyThemes: ['trade & economics', 'technology', 'power struggle'],
    worldContext: 'Massive industrial city-states dominate the landscape, connected by dangerous trade routes.',
    politicalSituation: 'Uneasy alliances between city-states, with constant competition for resources and territory.'
  },
  {
    id: 'wasteland-exploration',
    name: '🗺️ Wasteland Exploration',
    description: 'Adventure and discovery in the dangerous wasteland',
    keyThemes: ['exploration', 'lost knowledge', 'environmental hazards'],
    worldContext: 'Vast unexplored wastelands hide ancient ruins, lost technology, and deadly secrets.',
    politicalSituation: 'Exploration guilds and scavenger organizations compete to claim valuable discoveries.'
  },
  {
    id: 'faction-warfare',
    name: '⚔️ Faction Warfare',
    description: 'Large-scale conflicts between opposing factions',
    keyThemes: ['warfare', 'politics', 'betrayal'],
    worldContext: 'Multiple factions control different territories, constantly vying for supremacy.',
    politicalSituation: 'Open warfare between major factions, with smaller groups forced to choose sides.'
  },
  {
    id: 'underground-resistance',
    name: '🕵️ Underground Resistance',
    description: 'Secret operations against oppressive regimes',
    keyThemes: ['betrayal', 'social hierarchy', 'redemption'],
    worldContext: 'Totalitarian city-states oppress their populations while underground movements fight for freedom.',
    politicalSituation: 'Authoritarian governments maintain control through fear, while resistance cells operate in secret.'
  }
];

const ScenarioBuilder: React.FC = React.memo(() => {
  const { t } = useTranslation();

  // State management
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [npcs, setNpcs] = useState<ScenarioNPC[]>([]); // Keep this for potential future use or API consistency
  const [regionNpcs, setRegionNpcs] = useState<{ [regionId: string]: ScenarioNPC[] }>({}); // Store NPCs per region
  const [quests, setQuests] = useState<ScenarioQuest[]>([]);
  const [environmentalConditions, setEnvironmentalConditions] = useState<EnvironmentalCondition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<{ [regionId: string]: boolean }>({});
  const [activeRegionTab, setActiveRegionTab] = useState<{ [regionId: string]: string }>({});

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

  const [npcForm, setNpcForm] = useState({
    name: '',
    role: 'survivor',
    description: '',
    location: '',
    faction: '',
    importance: 'minor',
    status: 'alive'
  });

  const [questForm, setQuestForm] = useState({
    title: '',
    description: '',
    status: 'not_started',
    priority: 'medium',
    rewards: '',
    requirements: ''
  });

  const [conditionForm, setConditionForm] = useState({
    name: '',
    description: '',
    severity: 'moderate',
    affectedRegions: [] as string[],
    duration: ''
  });

  const [showCreateScenario, setShowCreateScenario] = useState(false);
  const [showEditScenario, setShowEditScenario] = useState(false);
  const [showCreateRegion, setShowCreateRegion] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [showCreateNPC, setShowCreateNPC] = useState(false);
  const [editingNPC, setEditingNPC] = useState<ScenarioNPC | null>(null);
  const [showCreateQuest, setShowCreateQuest] = useState(false);
  const [editingQuest, setEditingQuest] = useState<ScenarioQuest | null>(null);
  const [showCreateCondition, setShowCreateCondition] = useState(false);
  const [editingCondition, setEditingCondition] = useState<EnvironmentalCondition | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [generatingNpcsForRegion, setGeneratingNpcsForRegion] = useState<string | null>(null);

  // NPC role templates for different region types
  const getRegionNPCRoles = (regionType: string): string[] => {
    const baseRoles = ['leader', 'guard', 'merchant', 'survivor'];
    const rolesByType: {[key: string]: string[]} = {
      'city': ['leader', 'trader', 'guard', 'scientist', 'merchant', 'engineer', 'medic', 'informant', 'warrior', 'guide'],
      'settlement': ['leader', 'survivor', 'guard', 'trader', 'medic', 'merchant', 'warrior', 'engineer', 'guide', 'scientist'],
      'fortress': ['leader', 'warrior', 'guard', 'engineer', 'medic', 'trader', 'informant', 'scientist', 'survivor', 'guide'],
      'trade_hub': ['trader', 'merchant', 'leader', 'guard', 'informant', 'guide', 'survivor', 'engineer', 'medic', 'scientist'],
      'wasteland': ['survivor', 'guide', 'warrior', 'medic', 'trader', 'leader', 'guard', 'merchant', 'engineer', 'informant'],
      'industrial': ['engineer', 'leader', 'trader', 'scientist', 'warrior', 'guard', 'medic', 'survivor', 'informant', 'merchant']
    };
    return rolesByType[regionType] || baseRoles;
  };

  // Generate NPC names based on Mediterranean theme
  const generateNPCName = (): string => {
    const firstNames = [
      'Alessandro', 'Bianca', 'Carlos', 'Diana', 'Elena', 'Franco', 'Giulia', 'Hassan',
      'Isabella', 'Jacques', 'Kamila', 'Lorenzo', 'Maria', 'Nicolas', 'Olivia', 'Paolo',
      'Qadira', 'Roberto', 'Sofia', 'Tariq', 'Ursula', 'Vincent', 'Yasmin', 'Zara'
    ];
    const lastNames = [
      'Rossi', 'Martinez', 'Dubois', 'Schmidt', 'Petrov', 'Hassan', 'Al-Rashid', 'Dimitriou',
      'Fernandez', 'Costa', 'Romano', 'Silva', 'Moreau', 'Weber', 'Novak', 'Popov'
    ];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${firstName} ${lastName}`;
  };

  // Filter content based on search query and filter type
  const filteredContent = React.useMemo(() => {
    let content: any[] = [];

    if (filterType === 'all' || filterType === 'regions') {
      content = [...content, ...regions.map(r => ({ ...r, type: 'region' }))];
    }
    if (filterType === 'all' || filterType === 'quests') {
      content = [...content, ...quests.map(q => ({ ...q, type: 'quest' }))];
    }
    if (filterType === 'all' || filterType === 'conditions') {
      content = [...content, ...environmentalConditions.map(c => ({ ...c, type: 'condition' }))];
    }

    if (searchQuery) {
      return content.filter(item => 
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return content;
  }, [regions, quests, environmentalConditions, searchQuery, filterType]);

  // API Functions
  const fetchScenarios = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/scenarios?userId=demo-user');
      if (!response.ok) {
        throw new Error(`Failed to fetch scenarios: ${response.status}`);
      }

      const data = await response.json();
      setScenarios(Array.isArray(data) ? data : []);

    } catch (err) {
      console.error('Error fetching scenarios:', err);
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

      // Log if no regions are found (default regions should be available from server)
      if (data.length === 0) {
        console.log('No regions found for scenario:', scenarioId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch regions');
    }
  };

  // Fetch NPCs for a specific region
  const fetchRegionNPCs = async (regionId: string, regionName: string) => {
    try {
      if (!currentScenario) return;

      const response = await fetch(`/api/scenarios/${currentScenario.id}/npcs`);
      if (!response.ok) {
        // Don't throw an error here if it's a 404 or similar, just log and return empty
        if (response.status === 404) {
            console.warn(`NPCs not found for scenario ${currentScenario.id}`);
            setRegionNpcs(prev => ({ ...prev, [regionId]: [] }));
            return [];
        }
        throw new Error(`Failed to fetch NPCs: ${response.status}`);
      }

      const allNpcs = await response.json();
      const regionSpecificNpcs = allNpcs.filter((npc: ScenarioNPC) => 
        npc.location === regionName || npc.location === regionId // Allow matching by name or ID if applicable
      );

      setRegionNpcs(prev => ({
        ...prev,
        [regionId]: regionSpecificNpcs
      }));

      return regionSpecificNpcs;
    } catch (err) {
      console.error('Error fetching region NPCs:', err);
      // Ensure that even if fetching fails, we have an entry for the region
      setRegionNpcs(prev => ({ ...prev, [regionId]: [] }));
      return [];
    }
  };

  // Auto-generate 10 NPCs for a region
  const generateRegionNPCs = async (region: Region) => {
    if (!currentScenario) return;

    try {
      setGeneratingNpcsForRegion(region.id);
      const roles = getRegionNPCRoles(region.type);
      const newNpcs: ScenarioNPC[] = [];

      for (let i = 0; i < 10; i++) {
        const role = roles[i % roles.length];
        const name = generateNPCName();
        // Assign importance: first 3 are major, next 3 are minor, rest are minor
        const importance = i < 3 ? 'major' : i < 6 ? 'minor' : 'minor';

        const npcData = {
          scenarioId: currentScenario.id,
          name,
          role,
          description: `A ${role} operating in ${region.name}. ${getDescriptionByRole(role, region)}`,
          location: region.name,
          faction: region.controllingFaction || 'Independent',
          importance,
          status: 'alive' as const
        };

        // Use a more robust API call for creating NPCs
        const response = await fetch('/api/scenario-npcs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(npcData)
        });

        if (response.ok) {
          const npc = await response.json();
          newNpcs.push(npc);
        } else {
          console.error(`Failed to create NPC: ${npcData.name}`, await response.json());
        }
      }

      // Update region NPCs state
      setRegionNpcs(prev => ({
        ...prev,
        [region.id]: newNpcs
      }));

      setError(null); // Clear any previous errors
      console.log(`Generated ${newNpcs.length} NPCs for ${region.name}`);

    } catch (err) {
      console.error('Error generating NPCs:', err);
      setError(`Failed to generate NPCs for ${region.name}`);
    } finally {
      setGeneratingNpcsForRegion(null);
    }
  };

  // Get description based on role and region
  const getDescriptionByRole = (role: string, region: Region): string => {
    const descriptions: {[key: string]: string} = {
      'leader': `Commands respect and makes crucial decisions affecting ${region.name}'s future.`,
      'trader': `Manages commerce and trade relationships with other settlements.`,
      'guard': `Protects the settlement from threats and maintains order.`,
      'scientist': `Works with technology and research to improve life in the wasteland.`,
      'merchant': `Deals in goods and services essential for survival.`,
      'engineer': `Maintains and repairs the vital machinery keeping the settlement running.`,
      'medic': `Provides medical care and treatments in this harsh environment.`,
      'informant': `Gathers and trades information from across the wasteland.`,
      'warrior': `A skilled fighter who defends against raiders and hostile forces.`,
      'guide': `Knows the dangerous paths through the wasteland between settlements.`,
      'survivor': `Has endured the harsh realities of post-apocalyptic life.`
    };
    return descriptions[role] || 'A resident of this settlement trying to survive.';
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

      // Auto-generate 10 important NPCs for the new region
      if (region.name && region.type && region.controllingFaction) {
        await generateRegionNPCs(region);
      }

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
      // If the region name or type changed, we might need to re-fetch NPCs for this region
      if (data.name || data.type || data.controllingFaction) {
        await fetchRegionNPCs(updatedRegion.id, updatedRegion.name);
      }
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
      // Optionally clear NPCs related to this region from state
      setRegionNpcs(prev => {
        const newState = { ...prev };
        delete newState[regionId];
        return newState;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete region');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all necessary data for the current scenario
  const fetchScenarioData = async (scenarioId: string) => {
    if (!scenarioId) return;
    try {
      setLoading(true);
      setError(null);
      // Fetching all data in parallel
      const [
        regionsResponse,
        npcsResponse, // Fetch all NPCs from a central API endpoint
        questsResponse,
        conditionsResponse
      ] = await Promise.all([
        fetch(`/api/scenarios/${scenarioId}/regions`),
        fetch(`/api/scenarios/${scenarioId}/npcs`), // Assuming a central endpoint for all NPCs
        fetch(`/api/scenarios/${scenarioId}/quests`),
        fetch(`/api/scenarios/${scenarioId}/environmental-conditions`)
      ]);

      const dataPromises = [
        regionsResponse.ok ? regionsResponse.json() : Promise.reject(new Error('Failed to fetch regions')),
        npcsResponse.ok ? npcsResponse.json() : Promise.reject(new Error('Failed to fetch NPCs')),
        questsResponse.ok ? questsResponse.json() : Promise.reject(new Error('Failed to fetch quests')),
        conditionsResponse.ok ? conditionsResponse.json() : Promise.reject(new Error('Failed to fetch conditions'))
      ];

      const [fetchedRegions, fetchedNpcs, fetchedQuests, fetchedConditions] = await Promise.all(dataPromises);

      setRegions(fetchedRegions);
      setNpcs(fetchedNpcs); // Set the global NPCs state
      setQuests(fetchedQuests);
      setEnvironmentalConditions(fetchedConditions);

      // Process NPCs to populate regionNpcs state
      const regionNpcsMap: { [regionId: string]: ScenarioNPC[] } = {};
      fetchedRegions.forEach((region: Region) => {
        regionNpcsMap[region.id] = fetchedNpcs.filter((npc: ScenarioNPC) => npc.location === region.name || npc.location === region.id);
      });
      setRegionNpcs(regionNpcsMap);

    } catch (err) {
      console.error('Error fetching scenario data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load scenario data');
      setRegions([]);
      setNpcs([]);
      setQuests([]);
      setEnvironmentalConditions([]);
      setRegionNpcs({});
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

  // Handle NPC form submission (create or update)
  const handleCreateOrUpdateNPC = async () => {
    if (!currentScenario || !npcForm.name || !npcForm.role) return;

    try {
      setLoading(true);
      setError(null);

      const npcData = {
        scenarioId: currentScenario.id,
        ...npcForm
      };

      let response;
      if (editingNPC) {
        response = await fetch(`/api/scenario-npcs/${editingNPC.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(npcData)
        });
      } else {
        response = await fetch('/api/scenario-npcs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(npcData)
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to ${editingNPC ? 'update' : 'create'} NPC: ${response.status}`);
      }

      const savedNpc = await response.json();

      // Refresh NPCs data
      await fetchScenarioData(currentScenario.id); // Re-fetch all scenario data to ensure consistency

      setShowCreateNPC(false);
      setEditingNPC(null);
      setNpcForm({
        name: '',
        role: 'survivor',
        description: '',
        location: '',
        faction: '',
        importance: 'minor',
        status: 'alive'
      });

    } catch (err) {
      console.error('Error with NPC:', err);
      setError(err instanceof Error ? err.message : `Failed to ${editingNPC ? 'update' : 'create'} NPC`);
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchScenarios();
  }, []);

  useEffect(() => {
    if (currentScenario) {
      fetchScenarioData(currentScenario.id);
    }
  }, [currentScenario]);

  // Fetch NPCs for all regions when regions change
  useEffect(() => {
    if (regions.length > 0 && currentScenario) {
      regions.forEach(region => {
        fetchRegionNPCs(region.id, region.name);
      });
    }
  }, [regions, currentScenario]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Minimalist Header */}
        <div className="header-minimal rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-wide mb-2">
                <span className="bg-gradient-to-r from-rust to-brass bg-clip-text text-transparent">
                  Scenario Builder
                </span>
              </h1>
              <p className="text-minimal">
                Create immersive worlds with interactive scenarios, cities, and regions
              </p>
            </div>

            {/* Clean Toolbar */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => window.location.href = '/'}
                className="btn-ghost"
                size="sm"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Back to Session
              </Button>

              <Button
                onClick={() => setShowTemplateSelector(true)}
                className="btn-ghost"
                size="sm"
              >
                <Globe className="h-4 w-4 mr-2" />
                Templates
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAISuggestions(true)}
                className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                AI Suggest
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBulkActions(true)}
                className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                disabled={selectedRegions.length === 0}
              >
                <Settings className="h-4 w-4 mr-2" />
                Bulk Actions ({selectedRegions.length})
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  // Quick duplicate scenario
                  if (currentScenario) {
                    const duplicatedScenario = {
                      ...currentScenario,
                      id: `${currentScenario.id}-copy-${Date.now()}`,
                      title: `${currentScenario.title} (Copy)`,
                      status: 'draft' as const,
                      createdAt: new Date(),
                      updatedAt: new Date()
                    };
                    setScenarios(prev => [duplicatedScenario, ...prev]);
                    setCurrentScenario(duplicatedScenario);
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
                disabled={!currentScenario}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
            </div>
          </div>

          {/* Search and Filter Bar */}
          {currentScenario && (
            <div className="flex items-center gap-4 mt-4 p-4 bg-slate-800/30 rounded-lg">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search regions, NPCs, quests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white pl-10"
                  />
                </div>
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="all" className="text-white">All Content</SelectItem>
                  <SelectItem value="regions" className="text-white">Regions & NPCs</SelectItem>
                  <SelectItem value="quests" className="text-white">Quests Only</SelectItem>
                  <SelectItem value="conditions" className="text-white">Conditions Only</SelectItem>
                </SelectContent>
              </Select>

              <Badge variant="outline" className="text-slate-300">
                {regions.length} regions • {npcs.length} NPCs • {quests.length + environmentalConditions.length} other items
              </Badge>
            </div>
          )}
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
                    <TabsList className="grid w-full grid-cols-9 bg-slate-700">
                      <TabsTrigger value="overview" className="text-white">{t('tabs.overview')}</TabsTrigger>
                      <TabsTrigger value="regions" className="text-white">{t('tabs.regions')} ({regions.length})</TabsTrigger>
                      <TabsTrigger value="map" className="text-white">Mediterranean Map</TabsTrigger>
                      <TabsTrigger value="politics" className="text-white">Politics & Conflicts</TabsTrigger>
                      <TabsTrigger value="quests" className="text-white">{t('tabs.quests')} ({quests.length})</TabsTrigger>
                      <TabsTrigger value="environment" className="text-white">{t('tabs.environment')} ({environmentalConditions.length})</TabsTrigger>
                      <TabsTrigger value="connections" className="text-white">{t('tabs.connections')}</TabsTrigger>
                      <TabsTrigger value="ai-tools" className="text-white">{t('tabs.aiTools')}</TabsTrigger>
                      <TabsTrigger value="import-export" className="text-white">{t('tabs.importExport')}</TabsTrigger>
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

                    <TabsContent value="politics" className="mt-6">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Crown className="h-5 w-5 text-red-400" />
                            Political Situation & Active Conflicts
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-red-300 border-red-400">
                              High Tension
                            </Badge>
                            <Badge variant="outline" className="text-yellow-300 border-yellow-400">
                              {regions.filter(r => r.politicalStance === 'hostile').length} Hostile Factions
                            </Badge>
                          </div>
                        </div>

                        {/* Current Political Crisis */}
                        {currentScenario.politicalSituation && (
                          <Card className="bg-red-900/20 border-red-500/50">
                            <CardHeader>
                              <CardTitle className="text-red-300 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                Current Crisis Status
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-red-100 whitespace-pre-wrap leading-relaxed">
                                {currentScenario.politicalSituation}
                              </p>
                            </CardContent>
                          </Card>
                        )}

                        {/* Political Alliances Map */}
                        <Card className="bg-slate-700/50 border-slate-600">
                          <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                              <Users className="h-5 w-5 text-blue-400" />
                              Faction Alliances & Rivalries
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid gap-4">
                              {/* Life Alliance */}
                              <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                                <h4 className="font-semibold text-green-300 mb-2 flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Life Alliance (Fragile)
                                </h4>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {regions.filter(r => 
                                    r.name.includes('Médicale') || r.name.includes('Eau & Alimentation')
                                  ).map(region => (
                                    <Badge key={region.id} variant="outline" className="text-green-300 border-green-400">
                                      {region.name}
                                    </Badge>
                                  ))}
                                </div>
                                <p className="text-sm text-green-200">
                                  UNDER STRAIN: Medical rationing policies and water monopoly disputes threaten unity. 
                                  Secret negotiations with other factions detected.
                                </p>
                              </div>

                              {/* Industrial Axis */}
                              <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                                <h4 className="font-semibold text-orange-300 mb-2 flex items-center gap-2">
                                  <Zap className="h-4 w-4" />
                                  Industrial Axis (Rising)
                                </h4>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {regions.filter(r => 
                                    r.name.includes('Industrielle') || r.name.includes('Nuke City')
                                  ).map(region => (
                                    <Badge key={region.id} variant="outline" className="text-orange-300 border-orange-400">
                                      {region.name}
                                    </Badge>
                                  ))}
                                </div>
                                <p className="text-sm text-orange-200">
                                  EXPANDING: Steel production + Nuclear power = military dominance. 
                                  Plotting autonomous resource independence.
                                </p>
                              </div>

                              {/* Neutral Powers */}
                              <div className="p-4 bg-slate-700/30 border border-slate-500/30 rounded-lg">
                                <h4 className="font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                  <Target className="h-4 w-4" />
                                  Neutral Powers (Opportunistic)
                                </h4>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {regions.filter(r => 
                                    r.name.includes('Divertissement') || r.name.includes('Information')
                                  ).map(region => (
                                    <Badge key={region.id} variant="outline" className="text-slate-300 border-slate-400">
                                      {region.name}
                                    </Badge>
                                  ))}
                                </div>
                                <p className="text-sm text-slate-300">
                                  PLAYING ALL SIDES: Entertainment spreads propaganda while Information brokers 
                                  sell intelligence to highest bidders.
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Active Threats & Tensions */}
                        <Card className="bg-slate-700/50 border-slate-600">
                          <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                              <Skull className="h-5 w-5 text-red-400" />
                              Active Threats & Flashpoints
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="p-3 bg-red-900/20 border-l-4 border-red-500 rounded">
                                <h5 className="font-semibold text-red-300 mb-1">Water Wars Escalation</h5>
                                <p className="text-sm text-red-200">
                                  Three city-states discovered alternative water sources. Guardians of the Source 
                                  face internal rebellion. Armed convoys reported near water facilities.
                                </p>
                              </div>
                              
                              <div className="p-3 bg-orange-900/20 border-l-4 border-orange-500 rounded">
                                <h5 className="font-semibold text-orange-300 mb-1">Nuclear Ultimatum</h5>
                                <p className="text-sm text-orange-200">
                                  Nuke City activated "Doomsday Protocol" - dead man's switch threatens 
                                  Mediterranean irradiation if city is attacked. Secret uranium sales detected.
                                </p>
                              </div>

                              <div className="p-3 bg-yellow-900/20 border-l-4 border-yellow-500 rounded">
                                <h5 className="font-semibold text-yellow-300 mb-1">Medical Blackmail Campaign</h5>
                                <p className="text-sm text-yellow-200">
                                  Medical City withholding treatments for political leverage. Epidemic in 
                                  Salvage City blamed on rationing policies. Bio-weapon research suspected.
                                </p>
                              </div>

                              <div className="p-3 bg-purple-900/20 border-l-4 border-purple-500 rounded">
                                <h5 className="font-semibold text-purple-300 mb-1">Information Warfare</h5>
                                <p className="text-sm text-purple-200">
                                  Two faction leader assassinations this month. Double agents spreading 
                                  dissent. Entertainment City propaganda campaign detected.
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Resource Control Matrix */}
                        <Card className="bg-slate-700/50 border-slate-600">
                          <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                              <Coins className="h-5 w-5 text-yellow-400" />
                              Resource Dependencies & Leverage
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-600">
                                    <th className="text-left p-2 text-slate-300">Region</th>
                                    <th className="text-left p-2 text-slate-300">Controls</th>
                                    <th className="text-left p-2 text-slate-300">Depends On</th>
                                    <th className="text-left p-2 text-slate-300">Leverage</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {regions.map(region => (
                                    <tr key={region.id} className="border-b border-slate-700">
                                      <td className="p-2 text-white font-medium">{region.name}</td>
                                      <td className="p-2">
                                        <div className="flex flex-wrap gap-1">
                                          {region.resources?.map(resource => (
                                            <Badge key={resource} variant="secondary" className="text-xs">
                                              {resource}
                                            </Badge>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="p-2 text-slate-300 text-xs">
                                        {region.threatLevel >= 4 ? 'Military protection' : 
                                         region.name.includes('Nuke') ? 'Nothing (autonomous)' :
                                         region.name.includes('Médicale') ? 'Food, materials' :
                                         region.name.includes('Eau') ? 'Energy, weapons' :
                                         'Water, medicine, energy'}
                                      </td>
                                      <td className="p-2">
                                        <Badge 
                                          variant={
                                            region.name.includes('Eau') || region.name.includes('Médicale') ? 'destructive' :
                                            region.name.includes('Nuke') ? 'destructive' : 'secondary'
                                          }
                                          className="text-xs"
                                        >
                                          {region.name.includes('Eau') ? 'Critical' :
                                           region.name.includes('Médicale') ? 'High' :
                                           region.name.includes('Nuke') ? 'Ultimate' : 'Moderate'}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>

                        {/* GM Quick Reference */}
                        <Card className="bg-blue-900/20 border-blue-500/50">
                          <CardHeader>
                            <CardTitle className="text-blue-300 flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              GM Quick Reference
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h6 className="font-semibold text-blue-200 mb-2">Escalation Triggers</h6>
                                <ul className="text-sm text-blue-100 space-y-1">
                                  <li>• Water rationing protests</li>
                                  <li>• Medical treatment denials</li>
                                  <li>• Trade route sabotage</li>
                                  <li>• Faction leader assassination</li>
                                  <li>• Resource convoy attacks</li>
                                </ul>
                              </div>
                              <div>
                                <h6 className="font-semibold text-blue-200 mb-2">De-escalation Options</h6>
                                <ul className="text-sm text-blue-100 space-y-1">
                                  <li>• Emergency medical aid</li>
                                  <li>• Resource sharing agreements</li>
                                  <li>• Diplomatic marriages</li>
                                  <li>• Technology exchanges</li>
                                  <li>• Joint external threats</li>
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="map" className="mt-6">
                      <div className="h-[600px] bg-slate-800 rounded-lg border border-slate-700">
                        <MapManager 
                          currentScenario={currentScenario}
                          regions={regions}
                          onRegionUpdate={(regionId) => {
                            // Optionally refresh region data when updated
                            if (currentScenario) {
                              fetchScenarioData(currentScenario.id);
                            }
                          }}
                          onRegionsChange={(newRegions) => {
                            setRegions(newRegions);
                          }}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="regions" className="mt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-white">Regions & Their NPCs ({regions.length})</h3>
                          <Button
                            onClick={() => setShowCreateRegion(true)}
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Region
                          </Button>
                        </div>

                        <div className="grid gap-4">
                          {regions.map((region) => (
                            <Card key={region.id} className="bg-slate-700/50 border-slate-600">
                              <CardContent className="p-4">
                                {/* Region Header */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-auto p-1 text-slate-400 hover:text-white"
                                      onClick={() => setExpandedRegions(prev => ({
                                        ...prev,
                                        [region.id]: !prev[region.id]
                                      }))}
                                    >
                                      {expandedRegions[region.id] ? '▼' : '▶'}
                                    </Button>
                                    <div className="flex items-center gap-2">
                                      <span className="text-2xl">
                                        {getRegionIcon(region.type)}
                                      </span>
                                      <div>
                                        <h4 className="font-semibold text-white">{region.name}</h4>
                                        <p className="text-sm text-slate-300 capitalize">{region.type.replace('_', ' ')}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        <AlertTriangle className="h-4 w-4 text-red-400" />
                                        <span className="text-sm text-slate-300">{region.threatLevel}/5</span>
                                      </div>
                                      {region.population !== null && (
                                        <div className="flex items-center gap-1">
                                          <Users className="h-4 w-4 text-blue-400" />
                                          <span className="text-sm text-slate-300">{region.population.toLocaleString()}</span>
                                        </div>
                                      )}
                                      {/* Political Tension Indicator */}
                                      {region.description && region.description.includes('CRISIS') && (
                                        <Badge variant="destructive" className="text-xs animate-pulse">
                                          <Crown className="h-3 w-3 mr-1" />
                                          CRISIS
                                        </Badge>
                                      )}
                                      {region.description && region.description.includes('UNDER SIEGE') && (
                                        <Badge variant="destructive" className="text-xs">
                                          <Shield className="h-3 w-3 mr-1" />
                                          SIEGE
                                        </Badge>
                                      )}
                                      {region.description && region.description.includes('WILDCARD') && (
                                        <Badge variant="outline" className="text-xs text-purple-300 border-purple-400">
                                          <Zap className="h-3 w-3 mr-1" />
                                          WILDCARD
                                        </Badge>
                                      )}
                                      <Badge variant="outline" className="text-xs text-slate-300">
                                        {regionNpcs[region.id]?.length || 0} NPCs
                                      </Badge>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingRegion(region)}
                                      className="text-slate-400 hover:text-white"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                {region.description && (
                                  <p className="text-slate-300 text-sm mb-3 line-clamp-2">{region.description}</p>
                                )}

                                <div className="flex flex-wrap gap-2 mb-3">
                                  {region.controllingFaction && (
                                    <Badge variant="outline" className="text-blue-300 border-blue-400">
                                      <Crown className="h-3 w-3 mr-1" />
                                      {region.controllingFaction}
                                    </Badge>
                                  )}
                                  {region.politicalStance && (
                                    <Badge 
                                      variant="outline" 
                                      className={`border-${
                                        region.politicalStance === 'hostile' ? 'red' : 
                                        region.politicalStance === 'friendly' ? 'green' : 
                                        region.politicalStance === 'allied' ? 'blue' : 'gray'
                                      }-400 text-${
                                        region.politicalStance === 'hostile' ? 'red' : 
                                        region.politicalStance === 'friendly' ? 'green' : 
                                        region.politicalStance === 'allied' ? 'blue' : 'gray'
                                      }-300`}
                                    >
                                      {region.politicalStance}
                                    </Badge>
                                  )}
                                </div>

                                {region.resources && region.resources.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {region.resources.map((resource, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs bg-orange-500/20 text-orange-300">
                                        {resource}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                {/* Expanded Region Content */}
                                {expandedRegions[region.id] && (
                                  <div className="mt-4 pt-4 border-t border-slate-600">
                                    <Tabs 
                                      value={activeRegionTab[region.id] || 'npcs'} 
                                      onValueChange={(value) => setActiveRegionTab(prev => ({
                                        ...prev,
                                        [region.id]: value
                                      }))}
                                    >
                                      <TabsList className="grid w-full grid-cols-3 bg-slate-600">
                                        <TabsTrigger value="npcs" className="text-white">
                                          <Users className="h-4 w-4 mr-2" />
                                          NPCs ({regionNpcs[region.id]?.length || 0})
                                        </TabsTrigger>
                                        <TabsTrigger value="details" className="text-white">
                                          <Settings className="h-4 w-4 mr-2" />
                                          Details
                                        </TabsTrigger>
                                        <TabsTrigger value="connections" className="text-white">
                                          <MapPin className="h-4 w-4 mr-2" />
                                          Trade Routes
                                        </TabsTrigger>
                                      </TabsList>

                                      <TabsContent value="npcs" className="mt-4">
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <h5 className="font-medium text-white">Regional NPCs</h5>
                                            <div className="flex gap-2">
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => generateRegionNPCs(region)}
                                                disabled={generatingNpcsForRegion === region.id}
                                                className="border-orange-500 text-orange-400 hover:bg-orange-500/10"
                                              >
                                                {generatingNpcsForRegion === region.id ? (
                                                  <>
                                                    <Shuffle className="h-4 w-4 mr-2 animate-spin" />
                                                    Generating...
                                                  </>
                                                ) : (
                                                  <>
                                                    <Lightbulb className="h-4 w-4 mr-2" />
                                                    Generate 10 NPCs
                                                  </>
                                                )}
                                              </Button>
                                              <Button
                                                size="sm"
                                                onClick={() => {
                                                  setNpcForm(prev => ({
                                                    ...prev,
                                                    location: region.name,
                                                    faction: region.controllingFaction || ''
                                                  }));
                                                  setShowCreateNPC(true);
                                                }}
                                                className="bg-green-500 hover:bg-green-600"
                                              >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add NPC
                                              </Button>
                                            </div>
                                          </div>

                                          <div className="grid gap-3 max-h-64 overflow-y-auto">
                                            {(regionNpcs[region.id] || []).map((npc) => (
                                              <Card key={npc.id} className="bg-slate-600/50 border-slate-500">
                                                <CardContent className="p-3">
                                                  <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                      <div className={`w-2 h-2 rounded-full ${
                                                        npc.importance === 'critical' ? 'bg-red-400' :
                                                        npc.importance === 'major' ? 'bg-orange-400' : 'bg-green-400'
                                                      }`} />
                                                      <h6 className="font-medium text-white text-sm">{npc.name}</h6>
                                                      <Badge variant="outline" className="text-xs text-slate-300">
                                                        {npc.role}
                                                      </Badge>
                                                    </div>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={() => setEditingNPC(npc)}
                                                      className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                                                    >
                                                      <Edit className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                  {npc.description && (
                                                    <p className="text-slate-300 text-xs line-clamp-2">{npc.description}</p>
                                                  )}
                                                  <div className="flex items-center gap-2 mt-2">
                                                    {npc.faction && (
                                                      <Badge variant="secondary" className="text-xs bg-blue-500/20 text-blue-300">
                                                        {npc.faction}
                                                      </Badge>
                                                    )}
                                                    <Badge 
                                                      variant="outline" 
                                                      className={`text-xs ${
                                                        npc.status === 'alive' ? 'text-green-300 border-green-400' :
                                                        npc.status === 'dead' ? 'text-red-300 border-red-400' :
                                                        'text-yellow-300 border-yellow-400'
                                                      }`}
                                                    >
                                                      {npc.status}
                                                    </Badge>
                                                  </div>
                                                </CardContent>
                                              </Card>
                                            ))}
                                            {(!regionNpcs[region.id] || regionNpcs[region.id].length === 0) && (
                                              <div className="text-center py-6 text-slate-400">
                                                <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No NPCs in this region yet</p>
                                                <p className="text-xs">Generate or create NPCs to populate this area</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </TabsContent>

                                      <TabsContent value="details" className="mt-4">
                                        <div className="space-y-4 text-sm">
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <Label className="text-slate-300">Type</Label>
                                              <p className="text-white capitalize">{region.type.replace('_', ' ')}</p>
                                            </div>
                                            <div>
                                              <Label className="text-slate-300">Threat Level</Label>
                                              <p className="text-white">{region.threatLevel}/5</p>
                                            </div>
                                            {region.population !== null && (
                                              <div>
                                                <Label className="text-slate-300">Population</Label>
                                                <p className="text-white">{region.population.toLocaleString()}</p>
                                              </div>
                                            )}
                                            {region.controllingFaction && (
                                              <div>
                                                <Label className="text-slate-300">Controlling Faction</Label>
                                                <p className="text-white">{region.controllingFaction}</p>
                                              </div>
                                            )}
                                          </div>
                                          {region.description && (
                                            <div>
                                              <Label className="text-slate-300">Description</Label>
                                              <p className="text-white">{region.description}</p>
                                            </div>
                                          )}
                                        </div>
                                      </TabsContent>

                                      <TabsContent value="connections" className="mt-4">
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <Label className="text-slate-300">Trade Routes & Connections</Label>
                                            <Button size="sm" variant="outline" className="text-slate-400">
                                              <Plus className="h-4 w-4 mr-1" />
                                              Add Route
                                            </Button>
                                          </div>
                                          {region.tradeRoutes && region.tradeRoutes.length > 0 ? (
                                            <div className="space-y-2">
                                              {region.tradeRoutes.map((route, index) => (
                                                <div key={index} className="flex items-center gap-2 p-2 bg-slate-600/50 rounded">
                                                  <MapPin className="h-4 w-4 text-orange-400" />
                                                  <span className="text-white text-sm">{route}</span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-center py-4 text-slate-400">
                                              <MapPin className="h-6 w-6 mx-auto mb-2 opacity-50" />
                                              <p className="text-sm">No trade routes established</p>
                                            </div>
                                          )}
                                        </div>
                                      </TabsContent>
                                    </Tabs>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                          {regions.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No regions yet</p>
                              <p className="text-sm">Create your first region to start building your world</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="quests" className="mt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-white">Quests & Objectives</h3>
                          <Button
                            size="sm"
                            onClick={() => setShowCreateQuest(true)}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Quest
                          </Button>
                        </div>

                        <div className="grid gap-4">
                          {quests.map((quest) => (
                            <Card key={quest.id} className="bg-slate-700/50 border-slate-600">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-semibold text-white">{quest.title}</h4>
                                      <Badge variant={QUEST_PRIORITIES.find(p => p.value === quest.priority)?.color as any}>
                                        {quest.priority}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {quest.status.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    <p className="text-slate-300 text-sm mb-2">{quest.description}</p>
                                    <div className="text-xs text-slate-400 space-y-1">
                                      {quest.requirements && (
                                        <div><strong>Requirements:</strong> {quest.requirements}</div>
                                      )}
                                      {quest.rewards && (
                                        <div><strong>Rewards:</strong> {quest.rewards}</div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingQuest(quest)}
                                      className="text-slate-400 hover:text-white"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {quests.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No quests defined yet</p>
                              <p className="text-sm">Create objectives to guide your story</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="environment" className="mt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-white">Environmental Conditions</h3>
                          <Button
                            size="sm"
                            onClick={() => setShowCreateCondition(true)}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Condition
                          </Button>
                        </div>

                        <div className="grid gap-4">
                          {environmentalConditions.map((condition) => (
                            <Card key={condition.id} className="bg-slate-700/50 border-slate-600">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-semibold text-white">{condition.name}</h4>
                                      <Badge variant={CONDITION_SEVERITIES.find(s => s.value === condition.severity)?.color as any}>
                                        {condition.severity}
                                      </Badge>
                                    </div>
                                    <p className="text-slate-300 text-sm mb-2">{condition.description}</p>
                                    <div className="text-xs text-slate-400 space-y-1">
                                      {condition.duration && (
                                        <div><strong>Duration:</strong> {condition.duration}</div>
                                      )}
                                      <div><strong>Affected Regions:</strong> {condition.affectedRegions.length} regions</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingCondition(condition)}
                                      className="text-slate-400 hover:text-white"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          {environmentalConditions.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No environmental conditions set</p>
                              <p className="text-sm">Add weather, hazards, or climate effects</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="connections" className="mt-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">World Connections</h3>
                        <p className="text-slate-300">Manage trade routes, alliances, and conflicts between regions.</p>
                        {/* Placeholder for future connection management UI */}
                      </div>
                    </TabsContent>

                    <TabsContent value="ai-tools" className="mt-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">AI Tools</h3>
                        <p className="text-slate-300">Utilize AI for generating ideas, descriptions, and more.</p>
                        {/* Placeholder for AI tools */}
                      </div>
                    </TabsContent>

                    <TabsContent value="import-export" className="mt-6">
                      <ImportExportControls
                        onImportComplete={(result) => {
                          console.log('Import completed:', result);
                          // Refresh scenarios after import
                          fetchScenarios();
                          if (currentScenario) {
                            fetchScenarioData(currentScenario.id);
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
                    placeholder="Describe the setting, geography, and environmental conditions..."
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
                    placeholder="Describe the power dynamics, conflicts, and alliances..."
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
                      value={editingRegion?.name ?? regionForm.name}
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
                      value={editingRegion?.type ?? regionForm.type}
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
                    value={editingRegion?.description ?? regionForm.description}
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
                      value={editingRegion?.controllingFaction ?? regionForm.controllingFaction}
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
                      value={editingRegion?.population ?? regionForm.population}
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
                      value={String(editingRegion?.threatLevel ?? regionForm.threatLevel)}
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
                      value={editingRegion?.politicalStance ?? regionForm.politicalStance}
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
                      const currentResources = editingRegion?.resources ?? regionForm.resources ?? [];
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
                          population: editingRegion.population !== null ? editingRegion.population : undefined,
                          resources: editingRegion.resources || undefined,
                          threatLevel: editingRegion.threatLevel,
                          politicalStance: editingRegion.politicalStance || undefined
                        });
                      } else {
                        createRegion(regionForm);
                      }
                    }}
                    disabled={
                      (editingRegion ? !editingRegion.name : !regionForm.name) || loading
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

        {/* Create NPC Modal */}
        {showCreateNPC && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white">
                  {editingNPC ? 'Edit NPC' : 'Create New NPC'}
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Add characters to populate your scenario regions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="npc-name" className="text-white">Name *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="npc-name"
                      value={npcForm.name}
                      onChange={(e) => setNpcForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter NPC name..."
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNpcForm(prev => ({ ...prev, name: generateNPCName() }))}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Shuffle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="npc-role" className="text-white">Role *</Label>
                    <Select
                      value={npcForm.role}
                      onValueChange={(value) => setNpcForm(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {NPC_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.icon} {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="npc-importance" className="text-white">Importance</Label>
                    <Select
                      value={npcForm.importance}
                      onValueChange={(value) => setNpcForm(prev => ({ ...prev, importance: value }))}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select importance" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {IMPORTANCE_LEVELS.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="npc-location" className="text-white">Location/Region</Label>
                    <Select
                      value={npcForm.location}
                      onValueChange={(value) => {
                        setNpcForm(prev => ({ ...prev, location: value }));
                        // Auto-set faction based on region
                        const region = regions.find(r => r.name === value);
                        if (region?.controllingFaction) {
                          setNpcForm(prev => ({ ...prev, faction: region.controllingFaction || '' }));
                        }
                      }}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {regions.map((region) => (
                          <SelectItem key={region.id} value={region.name}>
                            {getRegionIcon(region.type)} {region.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="other">
                          🌍 Other Location
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="npc-faction" className="text-white">Faction</Label>
                    <Input
                      id="npc-faction"
                      value={npcForm.faction}
                      onChange={(e) => setNpcForm(prev => ({ ...prev, faction: e.target.value }))}
                      placeholder="Which faction do they belong to?"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="npc-description" className="text-white">Description</Label>
                  <Textarea
                    id="npc-description"
                    value={npcForm.description}
                    onChange={(e) => setNpcForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the NPC's appearance, personality, and motivations..."
                    className="bg-slate-700 border-slate-600 text-white min-h-24"
                  />
                  {npcForm.role && npcForm.location && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 border-orange-500 text-orange-400 hover:bg-orange-500/10"
                      onClick={() => {
                        const region = regions.find(r => r.name === npcForm.location);
                        if (region) {
                          const autoDescription = getDescriptionByRole(npcForm.role, region);
                          setNpcForm(prev => ({ 
                            ...prev, 
                            description: autoDescription 
                          }));
                        }
                      }}
                    >
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Auto-generate description
                    </Button>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateNPC(false);
                      setEditingNPC(null);
                      setNpcForm({
                        name: '',
                        role: 'survivor',
                        description: '',
                        location: '',
                        faction: '',
                        importance: 'minor',
                        status: 'alive'
                      });
                    }}
                    className="border-slate-600 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateOrUpdateNPC}
                    disabled={!npcForm.name || !npcForm.role || loading}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingNPC ? 'Update NPC' : 'Create NPC'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Quest Modal */}
        {(showCreateQuest || editingQuest) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white">
                  {editingQuest ? 'Edit Quest' : 'Create New Quest'}
                </CardTitle>
                <CardDescription className="text-slate-300">
                  {editingQuest ? 'Update quest details' : 'Add a new objective to your scenario'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="questTitle" className="text-white">Title *</Label>
                  <Input
                    id="questTitle"
                    value={editingQuest?.title ?? questForm.title}
                    onChange={(e) => {
                      if (editingQuest) {
                        setEditingQuest(prev => prev ? { ...prev, title: e.target.value } : prev);
                      } else {
                        setQuestForm(prev => ({ ...prev, title: e.target.value }));
                      }
                    }}
                    placeholder="Enter quest title..."
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="questDescription" className="text-white">Description *</Label>
                  <Textarea
                    id="questDescription"
                    value={editingQuest?.description ?? questForm.description}
                    onChange={(e) => {
                      if (editingQuest) {
                        setEditingQuest(prev => prev ? { ...prev, description: e.target.value } : prev);
                      } else {
                        setQuestForm(prev => ({ ...prev, description: e.target.value }));
                      }
                    }}
                    placeholder="Describe the quest objective and what needs to be accomplished..."
                    className="bg-slate-700 border-slate-600 text-white h-24"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="questPriority" className="text-white">Priority</Label>
                    <Select
                      value={editingQuest?.priority ?? questForm.priority}
                      onValueChange={(value) => {
                        if (editingQuest) {
                          setEditingQuest(prev => prev ? { ...prev, priority: value as any } : prev);
                        } else {
                          setQuestForm(prev => ({ ...prev, priority: value as any }));
                        }
                      }}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {QUEST_PRIORITIES.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value} className="text-white">
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="questStatus" className="text-white">Status</Label>
                    <Select
                      value={editingQuest?.status ?? questForm.status}
                      onValueChange={(value) => {
                        if (editingQuest) {
                          setEditingQuest(prev => prev ? { ...prev, status: value as any } : prev);
                        } else {
                          setQuestForm(prev => ({ ...prev, status: value as any }));
                        }
                      }}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="not_started" className="text-white">Not Started</SelectItem>
                        <SelectItem value="active" className="text-white">Active</SelectItem>
                        <SelectItem value="completed" className="text-white">Completed</SelectItem>
                        <SelectItem value="failed" className="text-white">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="questRequirements" className="text-white">Requirements</Label>
                  <Input
                    id="questRequirements"
                    value={editingQuest?.requirements ?? questForm.requirements}
                    onChange={(e) => {
                      if (editingQuest) {
                        setEditingQuest(prev => prev ? { ...prev, requirements: e.target.value } : prev);
                      } else {
                        setQuestForm(prev => ({ ...prev, requirements: e.target.value }));
                      }
                    }}
                    placeholder="What is needed to complete this quest?"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="questRewards" className="text-white">Rewards</Label>
                  <Input
                    id="questRewards"
                    value={editingQuest?.rewards ?? questForm.rewards}
                    onChange={(e) => {
                      if (editingQuest) {
                        setEditingQuest(prev => prev ? { ...prev, rewards: e.target.value } : prev);
                      } else {
                        setQuestForm(prev => ({ ...prev, rewards: e.target.value }));
                      }
                    }}
                    placeholder="What rewards will be given?"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateQuest(false);
                      setEditingQuest(null);
                      setQuestForm({ title: '', description: '', status: 'not_started', priority: 'medium', rewards: '', requirements: '' });
                    }}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      // For demo - would normally call API
                      const newQuest: ScenarioQuest = {
                        id: Date.now().toString(),
                        scenarioId: currentScenario!.id,
                        title: editingQuest?.title ?? questForm.title,
                        description: editingQuest?.description ?? questForm.description,
                        status: (editingQuest?.status ?? questForm.status) as 'not_started' | 'active' | 'completed' | 'failed',
                        priority: (editingQuest?.priority ?? questForm.priority) as 'low' | 'medium' | 'high' | 'critical',
                        rewards: (editingQuest?.rewards ?? questForm.rewards) || null,
                        requirements: (editingQuest?.requirements ?? questForm.requirements) || null,
                        createdAt: new Date()
                      };

                      if (editingQuest) {
                        setQuests(prev => prev.map(q => q.id === editingQuest.id ? newQuest : q));
                        setEditingQuest(null);
                      } else {
                        setQuests(prev => [...prev, newQuest]);
                        setShowCreateQuest(false);
                      }
                      setQuestForm({ title: '', description: '', status: 'not_started', priority: 'medium', rewards: '', requirements: '' });
                    }}
                    disabled={!(editingQuest?.title && editingQuest?.description) && !(questForm.title && questForm.description)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingQuest ? 'Update' : 'Create'} Quest
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Environmental Condition Modal */}
        {(showCreateCondition || editingCondition) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-2xl bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white">
                  {editingCondition ? 'Edit Environmental Condition' : 'Create Environmental Condition'}
                </CardTitle>
                <CardDescription className="text-slate-300">
                  {editingCondition ? 'Update condition details' : 'Add weather, hazards, or climate effects'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="conditionName" className="text-white">Name *</Label>
                  <Input
                    id="conditionName"
                    value={editingCondition?.name ?? conditionForm.name}
                    onChange={(e) => {
                      if (editingCondition) {
                        setEditingCondition(prev => prev ? { ...prev, name: e.target.value } : prev);
                      } else {
                        setConditionForm(prev => ({ ...prev, name: e.target.value }));
                      }
                    }}
                    placeholder="e.g., Radiation Storm, Acid Rain..."
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="conditionDescription" className="text-white">Description *</Label>
                  <Textarea
                    id="conditionDescription"
                    value={editingCondition?.description ?? conditionForm.description}
                    onChange={(e) => {
                      if (editingCondition) {
                        setEditingCondition(prev => prev ? { ...prev, description: e.target.value } : prev);
                      } else {
                        setConditionForm(prev => ({ ...prev, description: e.target.value }));
                      }
                    }}
                    placeholder="Describe the environmental condition and its effects..."
                    className="bg-slate-700 border-slate-600 text-white h-24"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="conditionSeverity" className="text-white">Severity</Label>
                    <Select
                      value={editingCondition?.severity ?? conditionForm.severity}
                      onValueChange={(value) => {
                        if (editingCondition) {
                          setEditingCondition(prev => prev ? { ...prev, severity: value as any } : prev);
                        } else {
                          setConditionForm(prev => ({ ...prev, severity: value as any }));
                        }
                      }}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {CONDITION_SEVERITIES.map((severity) => (
                          <SelectItem key={severity.value} value={severity.value} className="text-white">
                            {severity.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="conditionDuration" className="text-white">Duration</Label>
                    <Input
                      id="conditionDuration"
                      value={editingCondition?.duration ?? conditionForm.duration}
                      onChange={(e) => {
                        if (editingCondition) {
                          setEditingCondition(prev => prev ? { ...prev, duration: e.target.value } : prev);
                        } else {
                          setConditionForm(prev => ({ ...prev, duration: e.target.value }));
                        }
                      }}
                      placeholder="e.g., 3 days, permanent, seasonal..."
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white mb-3 block">Affected Regions</Label>
                  <div className="flex flex-wrap gap-2">
                    {regions.map((region) => {
                      const currentAffected = editingCondition?.affectedRegions ?? conditionForm.affectedRegions;
                      const isSelected = currentAffected.includes(region.id);
                      return (
                        <Badge
                          key={region.id}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? "bg-orange-500 text-white border-orange-500"
                              : "text-slate-300 border-slate-500 hover:border-orange-400"
                          }`}
                          onClick={() => {
                            if (editingCondition) {
                              const affected = editingCondition.affectedRegions || [];
                              const newAffected = isSelected 
                                ? affected.filter(r => r !== region.id)
                                : [...affected, region.id];
                              setEditingCondition(prev => prev ? { ...prev, affectedRegions: newAffected } : prev);
                            } else {
                              const affected = conditionForm.affectedRegions;
                              const newAffected = isSelected 
                                ? affected.filter(r => r !== region.id)
                                : [...affected, region.id];
                              setConditionForm(prev => ({ ...prev, affectedRegions: newAffected }));
                            }
                          }}
                        >
                          {getRegionIcon(region.type)} {region.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateCondition(false);
                      setEditingCondition(null);
                      setConditionForm({ name: '', description: '', severity: 'moderate', affectedRegions: [] as string[], duration: '' });
                    }}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      // For demo - would normally call API
                      const newCondition: EnvironmentalCondition = {
                        id: Date.now().toString(),
                        scenarioId: currentScenario!.id,
                        name: editingCondition?.name ?? conditionForm.name,
                        description: editingCondition?.description ?? conditionForm.description,
                        severity: (editingCondition?.severity ?? conditionForm.severity) as 'mild' | 'moderate' | 'severe' | 'extreme',
                        affectedRegions: editingCondition?.affectedRegions ?? conditionForm.affectedRegions,
                        duration: (editingCondition?.duration ?? conditionForm.duration) || null,
                        createdAt: new Date()
                      };

                      if (editingCondition) {
                        setEnvironmentalConditions(prev => prev.map(c => c.id === editingCondition.id ? newCondition : c));
                        setEditingCondition(null);
                      } else {
                        setEnvironmentalConditions(prev => [...prev, newCondition]);
                        setShowCreateCondition(false);
                      }
                      setConditionForm({ name: '', description: '', severity: 'moderate', affectedRegions: [] as string[], duration: '' });
                    }}
                    disabled={!(editingCondition?.name && editingCondition?.description) && !(conditionForm.name && conditionForm.description)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingCondition ? 'Update' : 'Create'} Condition
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Template Selector Modal */}
        {showTemplateSelector && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-orange-400" />
                  Scenario Templates
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Choose a pre-built scenario template to get started quickly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SCENARIO_TEMPLATES.map((template) => (
                    <Card key={template.id} className="bg-slate-700/50 border-slate-600 hover:border-orange-500/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setScenarioForm({
                          title: template.name.replace(/[\u2600-\u27bf\ud83c\ud83d\ud83e][\ud800-\udfff]?/g, '').trim(),
                          mainIdea: template.description,
                          worldContext: template.worldContext,
                          politicalSituation: template.politicalSituation,
                          keyThemes: template.keyThemes,
                          status: 'draft'
                        });
                        setShowTemplateSelector(false);
                        setShowCreateScenario(true);
                      }}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-white mb-2">{template.name}</h3>
                        <p className="text-sm text-slate-300 mb-3">{template.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {template.keyThemes.map((theme) => (
                            <Badge key={theme} variant="outline" className="text-xs text-orange-300 border-orange-400">
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowTemplateSelector(false)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Suggestions Modal */}
        {showAISuggestions && currentScenario && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-3xl bg-slate-800 border-slate-700 max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-purple-400" />
                  AI-Powered Suggestions
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Get intelligent recommendations based on your current scenario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Suggested NPCs
                  </h3>
                  <div className="grid gap-3">
                    {[
                      { name: 'Marcus "Iron Hand" Voss', role: 'leader', description: 'Ruthless faction leader controlling northern trade routes' },
                      { name: 'Dr. Elena Vasquez', role: 'scientist', description: 'Brilliant researcher studying pre-war technology' },
                      { name: 'Raider Queen Scar', role: 'antagonist', description: 'Feared leader of the Crimson Skulls raider gang' }
                    ].map((npc, index) => (
                      <Card key={index} className="bg-slate-700/30 border-slate-600">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-white">{npc.name}</h4>
                              <p className="text-sm text-slate-300">{npc.description}</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                const newNPC: ScenarioNPC = {
                                  id: Date.now().toString() + index,
                                  scenarioId: currentScenario.id,
                                  name: npc.name,
                                  role: npc.role,
                                  description: npc.description,
                                  location: null,
                                  faction: null,
                                  importance: 'major',
                                  status: 'alive',
                                  createdAt: new Date()
                                };
                                setNpcs(prev => [...prev, newNPC]);
                                // Optionally update regionNpcs as well if location is known/set
                                if (newNPC.location) {
                                  setRegionNpcs(prev => ({
                                    ...prev,
                                    [newNPC.location!]: [...(prev[newNPC.location!] || []), newNPC]
                                  }));
                                }
                              }}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" /> Suggested Quests
                  </h3>
                  <div className="grid gap-3">
                    {[
                      { title: 'The Lost Convoy', description: 'Investigate the disappearance of a vital supply convoy', priority: 'high' },
                      { title: 'Water Rights Negotiation', description: 'Mediate between factions fighting over water access', priority: 'critical' },
                      { title: 'Scavenge the Ruins', description: 'Explore ancient ruins for valuable pre-war technology', priority: 'medium' }
                    ].map((quest, index) => (
                      <Card key={index} className="bg-slate-700/30 border-slate-600">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-white">{quest.title}</h4>
                              <p className="text-sm text-slate-300">{quest.description}</p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                const newQuest: ScenarioQuest = {
                                  id: Date.now().toString() + index + 100,
                                  scenarioId: currentScenario.id,
                                  title: quest.title,
                                  description: quest.description,
                                  status: 'not_started',
                                  priority: quest.priority as 'low' | 'medium' | 'high' | 'critical',
                                  rewards: null,
                                  requirements: null,
                                  createdAt: new Date()
                                };
                                setQuests(prev => [...prev, newQuest]);
                              }}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowAISuggestions(false)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
});

ScenarioBuilder.displayName = 'ScenarioBuilder';

export default ScenarioBuilder;