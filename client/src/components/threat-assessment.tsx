
/**
 * Threat Assessment Component - Real-time risk analysis and threat monitoring
 * 
 * Features:
 * - Dynamic threat level calculations based on player actions
 * - Multi-factor risk assessment (political, environmental, combat, resource)
 * - Predictive threat modeling using AI
 * - Real-time alerts and recommendations
 * - Historical threat tracking and patterns
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Users,
  Coins,
  MapPin,
  Clock,
  Target,
  Brain,
  Activity,
  Gauge,
  Eye,
  AlertCircle
} from 'lucide-react';

// Types for threat assessment
interface ThreatFactor {
  id: string;
  category: 'political' | 'environmental' | 'combat' | 'resource' | 'social' | 'economic';
  name: string;
  description: string;
  currentLevel: number; // 0-100
  baseLevel: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  impact: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  lastUpdated: number;
  confidence: number; // 0-100
}

interface ThreatEvent {
  id: string;
  timestamp: number;
  type: 'escalation' | 'de-escalation' | 'new_threat' | 'threat_resolved' | 'alert';
  factorId: string;
  factorName: string;
  previousLevel: number;
  newLevel: number;
  trigger: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

interface ThreatAlert {
  id: string;
  type: 'immediate' | 'warning' | 'advisory' | 'opportunity';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendations: string[];
  expires?: number;
  acknowledged: boolean;
}

interface ThreatPrediction {
  id: string;
  factorId: string;
  factorName: string;
  timeframe: '1hour' | '4hours' | '12hours' | '24hours';
  predictedLevel: number;
  confidence: number;
  reasoning: string;
  triggers: string[];
  mitigations: string[];
}

interface ThreatAssessmentProps {
  sessionId?: string;
  scenarioId?: string;
  region?: string;
  onThreatChange?: (overallThreat: number, factors: ThreatFactor[]) => void;
  onAlertGenerated?: (alert: ThreatAlert) => void;
}

const CATEGORY_ICONS = {
  political: Users,
  environmental: MapPin,
  combat: Shield,
  resource: Coins,
  social: Users,
  economic: TrendingUp
};

const CATEGORY_COLORS = {
  political: 'bg-purple-500',
  environmental: 'bg-green-500',
  combat: 'bg-red-500',
  resource: 'bg-yellow-500',
  social: 'bg-blue-500',
  economic: 'bg-orange-500'
};

const SEVERITY_COLORS = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
};

const THREAT_LEVELS = [
  { min: 0, max: 25, label: 'Minimal', color: 'text-green-400', bgColor: 'bg-green-500' },
  { min: 26, max: 50, label: 'Low', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  { min: 51, max: 75, label: 'Moderate', color: 'text-orange-400', bgColor: 'bg-orange-500' },
  { min: 76, max: 90, label: 'High', color: 'text-red-400', bgColor: 'bg-red-500' },
  { min: 91, max: 100, label: 'Critical', color: 'text-red-300', bgColor: 'bg-red-600' }
];

export function ThreatAssessment({ 
  sessionId, 
  scenarioId, 
  region, 
  onThreatChange, 
  onAlertGenerated 
}: ThreatAssessmentProps) {
  const { t } = useTranslation();
  
  // State management
  const [threatFactors, setThreatFactors] = useState<ThreatFactor[]>([]);
  const [threatEvents, setThreatEvents] = useState<ThreatEvent[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<ThreatAlert[]>([]);
  const [predictions, setPredictions] = useState<ThreatPrediction[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1hour' | '4hours' | '12hours' | '24hours'>('4hours');
  
  // Mock data for demonstration
  const mockThreatFactors: ThreatFactor[] = [
    {
      id: 'political-tension',
      category: 'political',
      name: 'Inter-City Tensions',
      description: 'Political stress between Mediterranean city-states over trade agreements',
      currentLevel: 72,
      baseLevel: 45,
      trend: 'increasing',
      impact: 'high',
      source: 'Recent player actions in Industrial City',
      lastUpdated: Date.now() - 300000,
      confidence: 85
    },
    {
      id: 'resource-scarcity',
      category: 'resource',
      name: 'Water Supply Stress',
      description: 'Decreasing water reserves affecting multiple settlements',
      currentLevel: 68,
      baseLevel: 30,
      trend: 'increasing',
      impact: 'critical',
      source: 'Environmental conditions + player choices',
      lastUpdated: Date.now() - 180000,
      confidence: 92
    },
    {
      id: 'raider-activity',
      category: 'combat',
      name: 'Raider Movements',
      description: 'Increased hostile activity on eastern trade routes',
      currentLevel: 45,
      baseLevel: 35,
      trend: 'stable',
      impact: 'medium',
      source: 'Intelligence reports',
      lastUpdated: Date.now() - 600000,
      confidence: 78
    },
    {
      id: 'radiation-storm',
      category: 'environmental',
      name: 'Radiation Weather',
      description: 'Elevated radiation levels due to seasonal weather patterns',
      currentLevel: 35,
      baseLevel: 20,
      trend: 'decreasing',
      impact: 'medium',
      source: 'Environmental monitoring',
      lastUpdated: Date.now() - 120000,
      confidence: 95
    }
  ];

  const mockAlerts: ThreatAlert[] = [
    {
      id: 'alert-1',
      type: 'warning',
      title: 'Political Escalation Detected',
      message: 'Relations with Industrial City have deteriorated significantly. Consider diplomatic intervention.',
      severity: 'high',
      factors: ['political-tension'],
      recommendations: [
        'Send diplomatic envoy',
        'Offer trade concessions',
        'Avoid provocative actions'
      ],
      acknowledged: false
    },
    {
      id: 'alert-2',
      type: 'immediate',
      title: 'Critical Water Shortage',
      message: 'Water reserves approaching crisis levels. Immediate action required.',
      severity: 'critical',
      factors: ['resource-scarcity'],
      recommendations: [
        'Negotiate emergency water access',
        'Implement rationing protocols',
        'Seek alternative water sources'
      ],
      acknowledged: false
    }
  ];

  const mockPredictions: ThreatPrediction[] = [
    {
      id: 'pred-1',
      factorId: 'political-tension',
      factorName: 'Inter-City Tensions',
      timeframe: '4hours',
      predictedLevel: 85,
      confidence: 78,
      reasoning: 'Current trajectory suggests continued escalation without intervention',
      triggers: ['Trade route disputes', 'Resource competition'],
      mitigations: ['Diplomatic engagement', 'Economic incentives']
    },
    {
      id: 'pred-2',
      factorId: 'resource-scarcity',
      factorName: 'Water Supply Stress',
      timeframe: '12hours',
      predictedLevel: 80,
      confidence: 88,
      reasoning: 'Consumption rate exceeds supply replenishment',
      triggers: ['Continued high usage', 'No new sources'],
      mitigations: ['Conservation measures', 'Alternative sources', 'Trade agreements']
    }
  ];

  // Calculate overall threat level
  const overallThreatLevel = useMemo(() => {
    if (threatFactors.length === 0) return 0;
    
    const weightedSum = threatFactors.reduce((sum, factor) => {
      const weight = factor.impact === 'critical' ? 3 : 
                   factor.impact === 'high' ? 2 : 
                   factor.impact === 'medium' ? 1.5 : 1;
      return sum + (factor.currentLevel * weight);
    }, 0);
    
    const totalWeight = threatFactors.reduce((sum, factor) => {
      return sum + (factor.impact === 'critical' ? 3 : 
                   factor.impact === 'high' ? 2 : 
                   factor.impact === 'medium' ? 1.5 : 1);
    }, 0);
    
    return Math.round(weightedSum / totalWeight);
  }, [threatFactors]);

  // Get threat level info
  const getThreatLevelInfo = (level: number) => {
    return THREAT_LEVELS.find(t => level >= t.min && level <= t.max) || THREAT_LEVELS[0];
  };

  // Simulate real-time threat updates
  const updateThreatFactors = useCallback(() => {
    setIsAnalyzing(true);
    
    setTimeout(() => {
      setThreatFactors(prev => 
        prev.map(factor => {
          // Simulate small random changes
          const change = (Math.random() - 0.5) * 5;
          const newLevel = Math.max(0, Math.min(100, factor.currentLevel + change));
          const trend = newLevel > factor.currentLevel ? 'increasing' : 
                       newLevel < factor.currentLevel ? 'decreasing' : 'stable';
          
          return {
            ...factor,
            currentLevel: Math.round(newLevel),
            trend,
            lastUpdated: Date.now()
          };
        })
      );
      setIsAnalyzing(false);
    }, 1000);
  }, []);

  // Generate threat event
  const generateThreatEvent = useCallback((factor: ThreatFactor, previousLevel: number) => {
    const levelChange = factor.currentLevel - previousLevel;
    
    if (Math.abs(levelChange) >= 5) {
      const event: ThreatEvent = {
        id: `event-${Date.now()}`,
        timestamp: Date.now(),
        type: levelChange > 0 ? 'escalation' : 'de-escalation',
        factorId: factor.id,
        factorName: factor.name,
        previousLevel,
        newLevel: factor.currentLevel,
        trigger: 'Player actions and environmental factors',
        description: `${factor.name} ${levelChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(levelChange)} points`,
        severity: Math.abs(levelChange) >= 15 ? 'high' : 
                 Math.abs(levelChange) >= 10 ? 'medium' : 'low',
        recommendations: [
          'Monitor situation closely',
          'Consider preventive measures',
          'Adjust strategy as needed'
        ]
      };
      
      setThreatEvents(prev => [event, ...prev.slice(0, 19)]);
    }
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string) => {
    setActiveAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
  }, []);

  // Dismiss alert
  const dismissAlert = useCallback((alertId: string) => {
    setActiveAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  // Get category icon
  const getCategoryIcon = (category: string) => {
    return CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || AlertTriangle;
  };

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return TrendingUp;
      case 'decreasing': return TrendingDown;
      default: return Activity;
    }
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // Effects
  useEffect(() => {
    setThreatFactors(mockThreatFactors);
    setActiveAlerts(mockAlerts);
    setThreatEvents([]);
    setPredictions(mockPredictions);
  }, []);

  useEffect(() => {
    // Auto-update threats every 30 seconds
    const interval = setInterval(updateThreatFactors, 30000);
    return () => clearInterval(interval);
  }, [updateThreatFactors]);

  useEffect(() => {
    // Notify parent of threat changes
    onThreatChange?.(overallThreatLevel, threatFactors);
  }, [overallThreatLevel, threatFactors, onThreatChange]);

  const currentThreatInfo = getThreatLevelInfo(overallThreatLevel);

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Gauge className="h-5 w-5 text-orange-400" />
          Threat Assessment
        </CardTitle>
        <CardDescription className="text-slate-300">
          Real-time risk analysis and threat monitoring
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Overall Threat Level */}
        <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">Overall Threat Level</h3>
            <div className="flex items-center gap-2">
              {isAnalyzing && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-400"></div>
              )}
              <Button
                onClick={updateThreatFactors}
                size="sm"
                variant="outline"
                className="border-slate-600"
                disabled={isAnalyzing}
              >
                <Brain className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-lg font-bold ${currentThreatInfo.color}`}>
                {currentThreatInfo.label}
              </span>
              <span className="text-2xl font-mono text-white">
                {overallThreatLevel}%
              </span>
            </div>
            <Progress 
              value={overallThreatLevel} 
              className="h-3"
              style={{
                background: `linear-gradient(to right, 
                  ${currentThreatInfo.bgColor} 0%, 
                  ${currentThreatInfo.bgColor} ${overallThreatLevel}%, 
                  rgb(71 85 105) ${overallThreatLevel}%)`
              }}
            />
          </div>
        </div>

        {/* Active Alerts */}
        {activeAlerts.filter(alert => !alert.acknowledged).length > 0 && (
          <div className="mb-4 space-y-2">
            <h4 className="text-white font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              Active Alerts ({activeAlerts.filter(alert => !alert.acknowledged).length})
            </h4>
            {activeAlerts.filter(alert => !alert.acknowledged).slice(0, 3).map((alert) => (
              <Alert key={alert.id} className={`border-slate-600 ${
                alert.severity === 'critical' ? 'bg-red-900/20' :
                alert.severity === 'high' ? 'bg-orange-900/20' :
                'bg-yellow-900/20'
              }`}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-white mb-1">{alert.title}</h5>
                      <p className="text-slate-300 text-sm mb-2">{alert.message}</p>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {alert.type}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${SEVERITY_COLORS[alert.severity]} text-white`}
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1 ml-4">
                      <Button
                        onClick={() => acknowledgeAlert(alert.id)}
                        size="sm"
                        variant="outline"
                        className="text-xs border-slate-600"
                      >
                        Acknowledge
                      </Button>
                      <Button
                        onClick={() => dismissAlert(alert.id)}
                        size="sm"
                        variant="ghost"
                        className="text-xs text-slate-400"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-slate-700 h-auto p-1">
            <TabsTrigger value="overview" className="text-white text-xs sm:text-sm px-2 py-2 min-w-0" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="factors" className="text-white text-xs sm:text-sm px-2 py-2 whitespace-nowrap overflow-hidden text-ellipsis min-w-0" data-testid="tab-factors">
              <span className="hidden md:inline">Factors</span>
              <span className="md:hidden">F</span>
              {' '}({threatFactors.length})
            </TabsTrigger>
            <TabsTrigger value="predictions" className="text-white text-xs sm:text-sm px-2 py-2 min-w-0" data-testid="tab-predictions">
              <span className="hidden sm:inline">Predictions</span>
              <span className="sm:hidden">Pred</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-white text-xs sm:text-sm px-2 py-2 min-w-0" data-testid="tab-history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Threat Factor Summary */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(CATEGORY_ICONS).map(([category, Icon]) => {
                const categoryFactors = threatFactors.filter(f => f.category === category);
                const avgLevel = categoryFactors.length > 0 
                  ? categoryFactors.reduce((sum, f) => sum + f.currentLevel, 0) / categoryFactors.length 
                  : 0;
                
                return (
                  <div key={category} className="p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-blue-400" />
                        <span className="text-white text-sm font-medium capitalize">
                          {category}
                        </span>
                      </div>
                      <span className="text-white font-mono text-sm">
                        {Math.round(avgLevel)}%
                      </span>
                    </div>
                    <Progress value={avgLevel} className="h-2" />
                    <div className="text-xs text-slate-400 mt-1">
                      {categoryFactors.length} factor{categoryFactors.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Changes */}
            <div className="space-y-2">
              <h4 className="text-white font-medium">Recent Changes</h4>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {threatEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-center gap-3 p-2 bg-slate-700/30 rounded text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        event.type === 'escalation' ? 'bg-red-400' : 'bg-green-400'
                      }`}></div>
                      <div className="flex-1">
                        <span className="text-white">{event.factorName}</span>
                        <span className="text-slate-300 ml-2">{event.description}</span>
                      </div>
                      <span className="text-slate-400 text-xs">
                        {formatTimeAgo(event.timestamp)}
                      </span>
                    </div>
                  ))}
                  {threatEvents.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-sm">
                      No recent changes
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="factors" className="mt-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {threatFactors.map((factor) => {
                  const CategoryIcon = getCategoryIcon(factor.category);
                  const TrendIcon = getTrendIcon(factor.trend);
                  const levelInfo = getThreatLevelInfo(factor.currentLevel);
                  
                  return (
                    <Card key={factor.id} className="bg-slate-700/50 border-slate-600">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="h-4 w-4 text-blue-400" />
                            <h4 className="font-medium text-white">{factor.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {factor.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendIcon className={`h-4 w-4 ${
                              factor.trend === 'increasing' ? 'text-red-400' :
                              factor.trend === 'decreasing' ? 'text-green-400' :
                              'text-slate-400'
                            }`} />
                            <span className={`font-mono ${levelInfo.color}`}>
                              {factor.currentLevel}%
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-slate-300 text-sm mb-3">{factor.description}</p>
                        
                        <div className="space-y-2">
                          <Progress value={factor.currentLevel} className="h-2" />
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>Base: {factor.baseLevel}%</span>
                            <span>Confidence: {factor.confidence}%</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(factor.lastUpdated)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {factor.source}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="predictions" className="mt-4">
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-medium">AI Predictions</h4>
                <select 
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                  className="bg-slate-600 text-white text-sm rounded px-2 py-1"
                >
                  <option value="1hour">1 Hour</option>
                  <option value="4hours">4 Hours</option>
                  <option value="12hours">12 Hours</option>
                  <option value="24hours">24 Hours</option>
                </select>
              </div>
            </div>
            
            <ScrollArea className="h-80">
              <div className="space-y-3">
                {predictions.filter(p => p.timeframe === selectedTimeframe).map((prediction) => (
                  <Card key={prediction.id} className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-white">{prediction.factorName}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {prediction.timeframe}
                          </Badge>
                          <span className="font-mono text-orange-400">
                            {prediction.predictedLevel}%
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-slate-300 text-sm mb-3">{prediction.reasoning}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Brain className="h-3 w-3" />
                          <span>Confidence: {prediction.confidence}%</span>
                        </div>
                        
                        <div className="text-xs">
                          <div className="text-slate-400 mb-1">Key Triggers:</div>
                          <div className="flex flex-wrap gap-1">
                            {prediction.triggers.map((trigger, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {trigger}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="text-xs">
                          <div className="text-slate-400 mb-1">Possible Mitigations:</div>
                          <div className="flex flex-wrap gap-1">
                            {prediction.mitigations.map((mitigation, index) => (
                              <Badge key={index} variant="outline" className="text-xs text-green-300">
                                {mitigation}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {predictions.filter(p => p.timeframe === selectedTimeframe).length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No predictions available for this timeframe</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {threatEvents.map((event) => (
                  <Card key={event.id} className="bg-slate-700/50 border-slate-600">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            event.type === 'escalation' ? 'bg-red-400' :
                            event.type === 'de-escalation' ? 'bg-green-400' :
                            'bg-blue-400'
                          }`}></div>
                          <h4 className="font-medium text-white">{event.factorName}</h4>
                          <Badge variant="outline" className="text-xs">
                            {event.type}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      
                      <p className="text-slate-300 text-sm mb-2">{event.description}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>
                          {event.previousLevel}% → {event.newLevel}%
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${SEVERITY_COLORS[event.severity]} text-white`}
                        >
                          {event.severity}
                        </Badge>
                      </div>
                      
                      {event.recommendations.length > 0 && (
                        <div className="mt-2 text-xs">
                          <div className="text-slate-400 mb-1">Recommendations:</div>
                          <ul className="text-slate-300 space-y-1">
                            {event.recommendations.slice(0, 2).map((rec, index) => (
                              <li key={index} className="flex items-start gap-1">
                                <span>•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {threatEvents.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No threat events recorded yet</p>
                    <p className="text-sm">Events will appear as threats change over time</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ThreatAssessment;
