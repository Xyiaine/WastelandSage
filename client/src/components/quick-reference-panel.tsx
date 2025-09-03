/**
 * Quick Reference Panel Component
 * 
 * Instant access to rules, NPCs, faction relationships, and key game information
 * Designed to minimize GM lookup time during active play
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { 
  Search, Users, Shield, Coins, MapPin, 
  Crown, Zap, AlertTriangle, Info, BookOpen 
} from 'lucide-react';

interface QuickReferenceProps {
  currentScenario?: any;
  regions?: any[];
  onNPCSelect?: (npc: any) => void;
  onRuleReference?: (rule: string) => void;
}

const FACTION_RELATIONSHIPS = {
  'Les Blouses Blanches': {
    name: 'Medical City',
    resource: 'Medical Supplies',
    relationships: {
      'Les Raffineurs': 'neutral',
      'Les Forgerons d\'Acier': 'friendly',
      'Les Gardiens de la Source': 'allied',
      'Les Faiseurs de Rêves': 'neutral'
    },
    strength: 'Advanced medical technology',
    weakness: 'Limited military capacity'
  },
  'Les Raffineurs': {
    name: 'Fuel City',
    resource: 'Fuel & Energy',
    relationships: {
      'Les Blouses Blanches': 'neutral',
      'Les Arsenaux': 'hostile',
      'Les Forgerons d\'Acier': 'allied',
      'Le Réacteur à Ciel Ouvert': 'hostile'
    },
    strength: 'Energy independence',
    weakness: 'Environmental damage'
  }
};

const QUICK_RULES = [
  {
    category: 'Combat',
    rules: [
      { name: 'Initiative', description: 'Roll 1d10 + Reflexes modifier. Act in descending order.' },
      { name: 'Attack Roll', description: 'Roll 2d6 + skill. Target number varies by difficulty.' },
      { name: 'Damage', description: 'Weapon damage + margin of success. Subtract armor.' },
      { name: 'Called Shots', description: '+2 difficulty for +1 damage to specific locations.' }
    ]
  },
  {
    category: 'Skills',
    rules: [
      { name: 'Skill Checks', description: 'Roll 2d6 + attribute + skill vs. difficulty (6-12).' },
      { name: 'Opposed Rolls', description: 'Both roll 2d6 + modifiers. Higher total wins.' },
      { name: 'Extended Actions', description: 'Multiple rolls needed. Each failure adds +1 difficulty.' },
      { name: 'Teamwork', description: 'Helpers add +1 to main actor\'s roll (max +3).' }
    ]
  },
  {
    category: 'Survival',
    rules: [
      { name: 'Radiation', description: 'Save vs. Endurance or take 1 damage per hour exposed.' },
      { name: 'Dehydration', description: '1 damage per day without water in wasteland.' },
      { name: 'Vehicle Fuel', description: 'Consumes 1 fuel per 50km traveled.' },
      { name: 'Repair Rolls', description: 'Technology + Intelligence vs. damage severity.' }
    ]
  },
  {
    category: 'Social',
    rules: [
      { name: 'Persuasion', description: 'Presence + Social vs. target\'s Willpower + 6.' },
      { name: 'Intimidation', description: 'Presence + Intimidate vs. Willpower + Composure.' },
      { name: 'Reputation', description: 'Modify social rolls by +/-2 based on faction standing.' },
      { name: 'Trade', description: 'Intelligence + Trade vs. 8. Success improves deal by 10%.' }
    ]
  }
];

const DIFFICULTY_LEVELS = [
  { name: 'Trivial', target: 4, description: 'No skill required' },
  { name: 'Easy', target: 6, description: 'Basic competence' },
  { name: 'Average', target: 8, description: 'Trained individual' },
  { name: 'Hard', target: 10, description: 'Expert level' },
  { name: 'Extreme', target: 12, description: 'Master level' },
  { name: 'Impossible', target: 15, description: 'Legendary feat' }
];

export function QuickReferencePanel({ 
  currentScenario, 
  regions, 
  onNPCSelect, 
  onRuleReference 
}: QuickReferenceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('rules');
  const [filteredRules, setFilteredRules] = useState(QUICK_RULES);

  useEffect(() => {
    if (searchTerm) {
      const filtered = QUICK_RULES.map(category => ({
        ...category,
        rules: category.rules.filter(rule => 
          rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rule.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(category => category.rules.length > 0);
      setFilteredRules(filtered);
    } else {
      setFilteredRules(QUICK_RULES);
    }
  }, [searchTerm]);

  const getFactionRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case 'allied': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'friendly': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'neutral': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      case 'hostile': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getDifficultyColor = (target: number) => {
    if (target <= 6) return 'text-green-400';
    if (target <= 8) return 'text-yellow-400';
    if (target <= 10) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <Card className="w-full bg-slate-800 border-slate-600" data-testid="quick-reference-panel">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-white">
          <BookOpen className="h-5 w-5" />
          Quick Reference
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search rules, NPCs, factions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-700 border-slate-600 text-white"
            data-testid="input-search-reference"
          />
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 bg-slate-700">
            <TabsTrigger value="rules" className="text-white" data-testid="tab-rules">
              Rules
            </TabsTrigger>
            <TabsTrigger value="factions" className="text-white" data-testid="tab-factions">
              Factions
            </TabsTrigger>
            <TabsTrigger value="difficulty" className="text-white" data-testid="tab-difficulty">
              Difficulty
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-4">
            <ScrollArea className="h-80" data-testid="scroll-rules">
              <div className="space-y-4">
                {filteredRules.map((category) => (
                  <div key={category.category}>
                    <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                      {category.category === 'Combat' && <Shield className="h-4 w-4" />}
                      {category.category === 'Skills' && <Zap className="h-4 w-4" />}
                      {category.category === 'Survival' && <AlertTriangle className="h-4 w-4" />}
                      {category.category === 'Social' && <Users className="h-4 w-4" />}
                      {category.category}
                    </h4>
                    <div className="space-y-2">
                      {category.rules.map((rule) => (
                        <div 
                          key={rule.name}
                          className="p-3 bg-slate-700/30 rounded border border-slate-600 cursor-pointer hover:bg-slate-700/50 transition-colors"
                          onClick={() => onRuleReference?.(rule.name)}
                          data-testid={`rule-${rule.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          <div className="font-medium text-white text-sm">{rule.name}</div>
                          <div className="text-slate-300 text-xs mt-1">{rule.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="factions" className="mt-4">
            <ScrollArea className="h-80" data-testid="scroll-factions">
              <div className="space-y-4">
                {Object.entries(FACTION_RELATIONSHIPS).map(([factionKey, faction]) => (
                  <div 
                    key={factionKey}
                    className="p-4 bg-slate-700/30 rounded border border-slate-600"
                    data-testid={`faction-${factionKey.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        {faction.name}
                      </h4>
                      <Badge variant="outline" className="text-orange-400 border-orange-400">
                        {faction.resource}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-green-400 font-medium mb-1">Strength</div>
                        <div className="text-slate-300">{faction.strength}</div>
                      </div>
                      <div>
                        <div className="text-red-400 font-medium mb-1">Weakness</div>
                        <div className="text-slate-300">{faction.weakness}</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-slate-400 font-medium mb-2 text-xs">Relationships</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(faction.relationships).map(([ally, relationship]) => (
                          <Badge 
                            key={ally}
                            variant="outline"
                            className={`text-xs ${getFactionRelationshipColor(relationship)}`}
                          >
                            {ally.replace('Les ', '').replace('Le ', '')} • {relationship}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="difficulty" className="mt-4">
            <div className="space-y-3">
              <div className="text-sm text-slate-300 mb-4">
                Standard difficulty levels for 2d6 + modifier rolls
              </div>
              {DIFFICULTY_LEVELS.map((level) => (
                <div 
                  key={level.name}
                  className="flex items-center justify-between p-3 bg-slate-700/30 rounded border border-slate-600"
                  data-testid={`difficulty-${level.name.toLowerCase()}`}
                >
                  <div>
                    <div className="font-medium text-white">{level.name}</div>
                    <div className="text-slate-400 text-xs">{level.description}</div>
                  </div>
                  <div className={`font-bold text-lg ${getDifficultyColor(level.target)}`}>
                    {level.target}+
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
              <div className="font-medium text-blue-300 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Quick Reference
              </div>
              <div className="text-blue-200 text-xs space-y-1">
                <div>• Roll 2d6 + Attribute + Skill vs. Target Number</div>
                <div>• Success = Meet or exceed target</div>
                <div>• Critical Success = Natural 12 or beat target by 5+</div>
                <div>• Botch = Natural 2 and fail by 3+</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}