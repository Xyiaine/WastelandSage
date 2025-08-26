import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Skull, 
  Zap, 
  Search, 
  Fuel,
  Users,
  Building,
  Shield,
  Crown,
  Construction,
  Building2
} from "lucide-react";
import type { CreatorMode } from "@/lib/types";

interface CreatorSpecificControlsProps {
  creatorMode: CreatorMode;
  sessionId: string | null;
}

type RoadEventType = 'combat' | 'hazard' | 'discovery' | 'resource';
type CityEventType = 'politics' | 'trade' | 'conflict' | 'intrigue';
type ThreatLevel = 'low' | 'medium' | 'high';
type Environment = 'wasteland' | 'ruins' | 'highway' | 'canyon' | 'settlement' | 'bunker' | 'market' | 'fortress';

export function CreatorSpecificControls({ creatorMode, sessionId }: CreatorSpecificControlsProps) {
  const { toast } = useToast();
  const [roadEnvironment, setRoadEnvironment] = useState<Environment>('wasteland');
  const [cityEnvironment, setCityEnvironment] = useState<Environment>('settlement');
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>('medium');

  const generateEventMutation = useMutation({
    mutationFn: async (eventType: RoadEventType | CityEventType) => {
      if (!sessionId) throw new Error('No active session');

      const eventTemplates = {
        // Construction events
        combat: {
          name: 'Combat Encounter',
          description: creatorMode === 'road' 
            ? `Hostile forces emerge from the ${roadEnvironment}. Players must fight or flee.`
            : 'Armed conflict breaks out in the settlement.'
        },
        hazard: {
          name: 'Environmental Hazard',
          description: `Dangerous ${roadEnvironment} conditions threaten the party. Navigation and survival skills required.`
        },
        discovery: {
          name: 'Discovery',
          description: `The party uncovers something significant in the ${roadEnvironment}. Investigation reveals secrets.`
        },
        resource: {
          name: 'Resource Opportunity',
          description: `Fuel, supplies, or equipment become available. Players must decide how to acquire them.`
        },
        // City events
        politics: {
          name: 'Political Maneuvering',
          description: `Factional tensions rise in the ${cityEnvironment}. Players must navigate competing interests.`
        },
        trade: {
          name: 'Trade Opportunity',
          description: `Merchants offer valuable exchanges in the ${cityEnvironment}. Negotiation skills important.`
        },
        conflict: {
          name: 'Settlement Conflict',
          description: `Violence threatens the peace of the ${cityEnvironment}. Players must choose sides or mediate.`
        },
        intrigue: {
          name: 'Intrigue',
          description: `Hidden agendas and secrets surface in the ${cityEnvironment}. Investigation and social skills needed.`
        }
      };

      const template = eventTemplates[eventType];
      const duration = threatLevel === 'low' ? 20 : threatLevel === 'high' ? 40 : 30;

      const response = await apiRequest('POST', '/api/timeline-events', {
        sessionId,
        name: template.name,
        description: template.description,
        phase: 'exploration',
        duration,
        orderIndex: Date.now(),
        creatorMode,
        isCompleted: 'false'
      });
      
      return response.json();
    },
    onSuccess: (event) => {
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'timeline'] });
      }
      toast({
        title: "Event Generated",
        description: `${event.name} has been added to the timeline.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Generate Event",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (creatorMode === 'road') {
    return (
      <div className="metal-panel rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Construction className="h-5 w-5 text-rust-400" />
          <h2 className="text-xl font-bold text-rust-400">Construction Events</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Environment</label>
            <Select value={roadEnvironment} onValueChange={(value: Environment) => setRoadEnvironment(value)}>
              <SelectTrigger className="w-full bg-steel-700 border-steel-500" data-testid="select-road-environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wasteland">Open Wasteland</SelectItem>
                <SelectItem value="ruins">Urban Ruins</SelectItem>
                <SelectItem value="highway">Highway System</SelectItem>
                <SelectItem value="canyon">Rocky Canyons</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Threat Level</label>
            <div className="flex space-x-2">
              <Button 
                onClick={() => setThreatLevel('low')}
                className={`flex-1 industrial-button py-2 px-3 rounded-lg text-sm ${
                  threatLevel === 'low' ? 'border-toxic-400 bg-toxic-400/20' : ''
                }`}
                data-testid="button-threat-low"
              >
                Low
              </Button>
              <Button 
                onClick={() => setThreatLevel('medium')}
                className={`flex-1 industrial-button py-2 px-3 rounded-lg text-sm ${
                  threatLevel === 'medium' ? 'border-brass-400 bg-brass-400/20' : ''
                }`}
                data-testid="button-threat-medium"
              >
                Medium
              </Button>
              <Button 
                onClick={() => setThreatLevel('high')}
                className={`flex-1 industrial-button py-2 px-3 rounded-lg text-sm ${
                  threatLevel === 'high' ? 'border-red-400 bg-red-400/20' : ''
                }`}
                data-testid="button-threat-high"
              >
                High
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => generateEventMutation.mutate('combat')}
              disabled={!sessionId || generateEventMutation.isPending}
              className="industrial-button p-3 rounded-lg text-center text-sm flex flex-col space-y-1"
              data-testid="button-generate-combat"
            >
              <Skull className="text-rust-400 h-5 w-5" />
              <span>Combat</span>
            </Button>
            <Button 
              onClick={() => generateEventMutation.mutate('hazard')}
              disabled={!sessionId || generateEventMutation.isPending}
              className="industrial-button p-3 rounded-lg text-center text-sm flex flex-col space-y-1"
              data-testid="button-generate-hazard"
            >
              <Zap className="text-yellow-400 h-5 w-5" />
              <span>Hazard</span>
            </Button>
            <Button 
              onClick={() => generateEventMutation.mutate('discovery')}
              disabled={!sessionId || generateEventMutation.isPending}
              className="industrial-button p-3 rounded-lg text-center text-sm flex flex-col space-y-1"
              data-testid="button-generate-discovery"
            >
              <Search className="text-brass-400 h-5 w-5" />
              <span>Discovery</span>
            </Button>
            <Button 
              onClick={() => generateEventMutation.mutate('resource')}
              disabled={!sessionId || generateEventMutation.isPending}
              className="industrial-button p-3 rounded-lg text-center text-sm flex flex-col space-y-1"
              data-testid="button-generate-resource"
            >
              <Fuel className="text-green-400 h-5 w-5" />
              <span>Resource</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // City/Camp mode
  return (
    <div className="metal-panel rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Building2 className="h-5 w-5 text-brass-400" />
        <h2 className="text-xl font-bold text-brass-400">City Events</h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Settlement Type</label>
          <Select value={cityEnvironment} onValueChange={(value: Environment) => setCityEnvironment(value)}>
            <SelectTrigger className="w-full bg-steel-700 border-steel-500" data-testid="select-city-environment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="settlement">Trading Settlement</SelectItem>
              <SelectItem value="bunker">Underground Bunker</SelectItem>
              <SelectItem value="market">Merchant Hub</SelectItem>
              <SelectItem value="fortress">Fortified Compound</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Tension Level</label>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setThreatLevel('low')}
              className={`flex-1 industrial-button py-2 px-3 rounded-lg text-sm ${
                threatLevel === 'low' ? 'border-toxic-400 bg-toxic-400/20' : ''
              }`}
              data-testid="button-tension-low"
            >
              Peaceful
            </Button>
            <Button 
              onClick={() => setThreatLevel('medium')}
              className={`flex-1 industrial-button py-2 px-3 rounded-lg text-sm ${
                threatLevel === 'medium' ? 'border-brass-400 bg-brass-400/20' : ''
              }`}
              data-testid="button-tension-medium"
            >
              Tense
            </Button>
            <Button 
              onClick={() => setThreatLevel('high')}
              className={`flex-1 industrial-button py-2 px-3 rounded-lg text-sm ${
                threatLevel === 'high' ? 'border-red-400 bg-red-400/20' : ''
              }`}
              data-testid="button-tension-high"
            >
              Volatile
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={() => generateEventMutation.mutate('politics')}
            disabled={!sessionId || generateEventMutation.isPending}
            className="industrial-button p-3 rounded-lg text-center text-sm flex flex-col space-y-1"
            data-testid="button-generate-politics"
          >
            <Crown className="text-brass-400 h-5 w-5" />
            <span>Politics</span>
          </Button>
          <Button 
            onClick={() => generateEventMutation.mutate('trade')}
            disabled={!sessionId || generateEventMutation.isPending}
            className="industrial-button p-3 rounded-lg text-center text-sm flex flex-col space-y-1"
            data-testid="button-generate-trade"
          >
            <Building className="text-green-400 h-5 w-5" />
            <span>Trade</span>
          </Button>
          <Button 
            onClick={() => generateEventMutation.mutate('conflict')}
            disabled={!sessionId || generateEventMutation.isPending}
            className="industrial-button p-3 rounded-lg text-center text-sm flex flex-col space-y-1"
            data-testid="button-generate-conflict"
          >
            <Shield className="text-red-400 h-5 w-5" />
            <span>Conflict</span>
          </Button>
          <Button 
            onClick={() => generateEventMutation.mutate('intrigue')}
            disabled={!sessionId || generateEventMutation.isPending}
            className="industrial-button p-3 rounded-lg text-center text-sm flex flex-col space-y-1"
            data-testid="button-generate-intrigue"
          >
            <Users className="text-purple-400 h-5 w-5" />
            <span>Intrigue</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
