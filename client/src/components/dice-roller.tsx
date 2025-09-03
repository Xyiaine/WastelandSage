/**
 * Integrated Dice Rolling System
 * 
 * Quick dice rolling for gameplay resolution with RPG-focused features
 * Includes common dice types, modifiers, and roll history
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  Dices, Plus, Minus, RotateCcw, 
  Target, Zap, Shield, Activity 
} from 'lucide-react';

interface DiceRoll {
  id: string;
  timestamp: Date;
  notation: string;
  result: number;
  individual: number[];
  modifier: number;
  type: string;
  critical?: boolean;
  fumble?: boolean;
}

interface DiceRollerProps {
  onRollComplete?: (roll: DiceRoll) => void;
}

const COMMON_DICE = [
  { sides: 4, color: 'bg-blue-500' },
  { sides: 6, color: 'bg-green-500' },
  { sides: 8, color: 'bg-orange-500' },
  { sides: 10, color: 'bg-purple-500' },
  { sides: 12, color: 'bg-red-500' },
  { sides: 20, color: 'bg-yellow-500' },
  { sides: 100, color: 'bg-pink-500' }
];

const QUICK_ROLLS = [
  { name: 'Attribute Check', notation: '2d6+0', description: 'Standard attribute check' },
  { name: 'Combat Attack', notation: '1d20+5', description: 'Attack roll with +5 bonus' },
  { name: 'Damage Roll', notation: '2d6+2', description: 'Weapon damage' },
  { name: 'Luck Roll', notation: '1d100', description: 'Percentile luck check' },
  { name: 'Initiative', notation: '1d10+2', description: 'Combat initiative' },
  { name: 'Skill Check', notation: '2d6+3', description: 'Skilled action attempt' }
];

export function DiceRoller({ onRollComplete }: DiceRollerProps) {
  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);
  const [customDice, setCustomDice] = useState({ count: 1, sides: 6 });
  const [modifier, setModifier] = useState(0);
  const [rollType, setRollType] = useState('Custom');

  const rollDice = (count: number, sides: number, mod: number = 0, type: string = 'Custom') => {
    const individual: number[] = [];
    let total = mod;

    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      individual.push(roll);
      total += roll;
    }

    // Determine critical hits/fumbles for d20 rolls
    const critical = sides === 20 && count === 1 && individual[0] === 20;
    const fumble = sides === 20 && count === 1 && individual[0] === 1;

    const diceRoll: DiceRoll = {
      id: Date.now().toString() + Math.random().toString(36),
      timestamp: new Date(),
      notation: `${count}d${sides}${mod >= 0 ? '+' : ''}${mod}`,
      result: total,
      individual,
      modifier: mod,
      type,
      critical,
      fumble
    };

    setRollHistory(prev => [diceRoll, ...prev.slice(0, 19)]); // Keep last 20 rolls
    onRollComplete?.(diceRoll);

    return diceRoll;
  };

  const parseNotation = (notation: string): { count: number; sides: number; modifier: number } | null => {
    // Parse dice notation like "2d6+3" or "1d20-2"
    const match = notation.match(/(\d+)d(\d+)([\+\-]\d+)?/i);
    if (!match) return null;

    return {
      count: parseInt(match[1]),
      sides: parseInt(match[2]),
      modifier: match[3] ? parseInt(match[3]) : 0
    };
  };

  const rollFromNotation = (notation: string, type: string = 'Quick Roll') => {
    const parsed = parseNotation(notation);
    if (parsed) {
      rollDice(parsed.count, parsed.sides, parsed.modifier, type);
    }
  };

  const clearHistory = () => {
    setRollHistory([]);
  };

  return (
    <Card className="w-full bg-slate-800 border-slate-600" data-testid="dice-roller">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-white">
          <Dices className="h-5 w-5" />
          Dice Roller
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Roll Buttons */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white">Quick Rolls</h4>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ROLLS.map((roll) => (
              <Button
                key={roll.name}
                variant="outline"
                size="sm"
                onClick={() => rollFromNotation(roll.notation, roll.name)}
                className="text-left p-2 h-auto border-slate-600 hover:bg-slate-700"
                data-testid={`button-quick-roll-${roll.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div>
                  <div className="font-medium text-white text-xs">{roll.name}</div>
                  <div className="text-slate-400 text-xs">{roll.notation}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Common Dice */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white">Standard Dice</h4>
          <div className="flex flex-wrap gap-2">
            {COMMON_DICE.map((die) => (
              <Button
                key={die.sides}
                onClick={() => rollDice(1, die.sides, 0, `d${die.sides}`)}
                className={`${die.color} hover:opacity-80 text-white font-bold w-12 h-12`}
                data-testid={`button-dice-d${die.sides}`}
              >
                d{die.sides}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Roll */}
        <div className="space-y-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
          <h4 className="text-sm font-semibold text-white">Custom Roll</h4>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomDice(prev => ({ ...prev, count: Math.max(1, prev.count - 1) }))}
                className="w-8 h-8 p-0"
                data-testid="button-decrease-dice-count"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-white text-sm w-8 text-center">{customDice.count}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomDice(prev => ({ ...prev, count: prev.count + 1 }))}
                className="w-8 h-8 p-0"
                data-testid="button-increase-dice-count"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            
            <span className="text-white">d</span>
            
            <Input
              type="number"
              value={customDice.sides}
              onChange={(e) => setCustomDice(prev => ({ ...prev, sides: parseInt(e.target.value) || 6 }))}
              className="w-16 bg-slate-600 border-slate-500 text-white text-center"
              min="2"
              max="100"
              data-testid="input-dice-sides"
            />
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModifier(prev => prev - 1)}
                className="w-8 h-8 p-0"
                data-testid="button-decrease-modifier"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-white text-sm w-10 text-center">
                {modifier >= 0 ? '+' : ''}{modifier}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModifier(prev => prev + 1)}
                className="w-8 h-8 p-0"
                data-testid="button-increase-modifier"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            
            <Button
              onClick={() => rollDice(customDice.count, customDice.sides, modifier, 'Custom')}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-roll-custom"
            >
              Roll
            </Button>
          </div>
          
          <div className="text-xs text-slate-400">
            Rolling: {customDice.count}d{customDice.sides}{modifier >= 0 ? '+' : ''}{modifier}
          </div>
        </div>

        {/* Roll History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Roll History</h4>
            {rollHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-slate-400 hover:text-white"
                data-testid="button-clear-history"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          
          <ScrollArea className="h-40" data-testid="scroll-roll-history">
            <div className="space-y-2">
              {rollHistory.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-4">
                  No rolls yet. Try rolling some dice!
                </div>
              ) : (
                rollHistory.map((roll) => (
                  <div 
                    key={roll.id}
                    className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600"
                    data-testid={`roll-history-${roll.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {roll.type}
                      </Badge>
                      <span className="text-white text-sm font-mono">
                        {roll.notation}
                      </span>
                      {roll.critical && <Target className="h-3 w-3 text-yellow-400" />}
                      {roll.fumble && <Zap className="h-3 w-3 text-red-400" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">
                        [{roll.individual.join(', ')}]
                      </span>
                      <span className={`font-bold ${
                        roll.critical ? 'text-yellow-400' : 
                        roll.fumble ? 'text-red-400' : 
                        'text-white'
                      }`}>
                        {roll.result}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}