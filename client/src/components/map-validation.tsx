
/**
 * Map Validation Component
 * 
 * Provides validation rules and visual feedback for map editing operations
 */

import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

interface ValidationRule {
  id: string;
  name: string;
  severity: 'error' | 'warning' | 'info';
  validator: (cities: any[], mapState?: any) => ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  affectedCities?: string[];
  suggestions?: string[];
}

interface MapValidationProps {
  cities: any[];
  mapState?: any;
  rules?: ValidationRule[];
  showSummary?: boolean;
}

// Default validation rules
const DEFAULT_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'min-distance',
    name: 'Minimum Distance',
    severity: 'error',
    validator: (cities) => {
      const minDistance = 50;
      const conflicts: string[] = [];
      
      for (let i = 0; i < cities.length; i++) {
        for (let j = i + 1; j < cities.length; j++) {
          const city1 = cities[i];
          const city2 = cities[j];
          const distance = Math.sqrt(
            Math.pow(city1.x - city2.x, 2) + Math.pow(city1.y - city2.y, 2)
          );
          
          if (distance < minDistance) {
            conflicts.push(`${city1.name} and ${city2.name}`);
          }
        }
      }
      
      return {
        valid: conflicts.length === 0,
        message: conflicts.length > 0 
          ? `Cities too close together: ${conflicts.join(', ')}`
          : 'All cities maintain proper spacing',
        affectedCities: conflicts.flatMap(c => c.split(' and ')),
        suggestions: conflicts.length > 0 ? ['Move conflicting cities further apart'] : []
      };
    }
  },
  {
    id: 'resource-distribution',
    name: 'Resource Distribution',
    severity: 'warning',
    validator: (cities) => {
      const resourceCounts: Record<string, number> = {};
      
      cities.forEach(city => {
        if (city.resources) {
          city.resources.forEach((resource: string) => {
            resourceCounts[resource] = (resourceCounts[resource] || 0) + 1;
          });
        }
      });
      
      const criticalResources = ['water', 'food', 'medicine', 'fuel'];
      const missingCritical = criticalResources.filter(resource => !resourceCounts[resource]);
      
      return {
        valid: missingCritical.length === 0,
        message: missingCritical.length > 0
          ? `Missing critical resources: ${missingCritical.join(', ')}`
          : 'Good resource distribution across cities',
        suggestions: missingCritical.length > 0 
          ? [`Add cities with ${missingCritical.join(', ')} resources`]
          : []
      };
    }
  },
  {
    id: 'political-balance',
    name: 'Political Balance',
    severity: 'info',
    validator: (cities) => {
      const stanceCounts: Record<string, number> = {};
      
      cities.forEach(city => {
        if (city.politicalStance) {
          stanceCounts[city.politicalStance] = (stanceCounts[city.politicalStance] || 0) + 1;
        }
      });
      
      const hostileCount = stanceCounts.hostile || 0;
      const friendlyCount = (stanceCounts.friendly || 0) + (stanceCounts.allied || 0);
      const neutralCount = stanceCounts.neutral || 0;
      
      const totalCount = hostileCount + friendlyCount + neutralCount;
      const isBalanced = totalCount > 0 && 
        Math.abs(hostileCount - friendlyCount) <= Math.ceil(totalCount * 0.3);
      
      return {
        valid: isBalanced,
        message: isBalanced
          ? 'Political stances are well balanced'
          : 'Political stances are heavily skewed',
        suggestions: !isBalanced ? [
          'Consider balancing hostile and friendly factions',
          'Add neutral cities to buffer conflicts'
        ] : []
      };
    }
  },
  {
    id: 'threat-level-distribution',
    name: 'Threat Level Distribution',
    severity: 'warning',
    validator: (cities) => {
      const threatCounts: Record<number, number> = {};
      
      cities.forEach(city => {
        threatCounts[city.threatLevel] = (threatCounts[city.threatLevel] || 0) + 1;
      });
      
      const highThreatCount = (threatCounts[4] || 0) + (threatCounts[5] || 0);
      const totalCount = cities.length;
      const highThreatRatio = totalCount > 0 ? highThreatCount / totalCount : 0;
      
      return {
        valid: highThreatRatio <= 0.4, // Max 40% high threat
        message: highThreatRatio > 0.4
          ? `Too many high-threat areas (${Math.round(highThreatRatio * 100)}%)`
          : 'Threat levels are appropriately distributed',
        suggestions: highThreatRatio > 0.4 ? [
          'Reduce threat levels in some cities',
          'Add more safe zones for player respite'
        ] : []
      };
    }
  },
  {
    id: 'population-distribution',
    name: 'Population Distribution',
    severity: 'info',
    validator: (cities) => {
      const populations = cities
        .filter(city => city.population && city.population > 0)
        .map(city => city.population);
      
      if (populations.length === 0) {
        return {
          valid: false,
          message: 'No population data available',
          suggestions: ['Add population data to cities']
        };
      }
      
      const totalPopulation = populations.reduce((sum, pop) => sum + pop, 0);
      const avgPopulation = totalPopulation / populations.length;
      const maxPopulation = Math.max(...populations);
      
      // Check if there's at least one major city (10x average)
      const hasMajorCity = maxPopulation >= avgPopulation * 10;
      
      return {
        valid: hasMajorCity,
        message: hasMajorCity
          ? 'Good population distribution with clear urban hierarchy'
          : 'Consider adding at least one major population center',
        suggestions: !hasMajorCity ? [
          'Designate one city as a major population center',
          'Create clear distinction between settlements and cities'
        ] : []
      };
    }
  }
];

export function MapValidation({ 
  cities, 
  mapState, 
  rules = DEFAULT_VALIDATION_RULES,
  showSummary = true 
}: MapValidationProps) {
  // Run all validation rules
  const validationResults = rules.map(rule => ({
    rule,
    result: rule.validator(cities, mapState)
  }));

  // Categorize results
  const errors = validationResults.filter(v => v.rule.severity === 'error' && !v.result.valid);
  const warnings = validationResults.filter(v => v.rule.severity === 'warning' && !v.result.valid);
  const infos = validationResults.filter(v => v.rule.severity === 'info' && !v.result.valid);
  const passed = validationResults.filter(v => v.result.valid);

  const getIcon = (severity: string, valid: boolean) => {
    if (valid) return <CheckCircle className="h-4 w-4 text-green-400" />;
    
    switch (severity) {
      case 'error': return <XCircle className="h-4 w-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'info': return <Info className="h-4 w-4 text-blue-400" />;
      default: return <Info className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-400 border-red-400';
      case 'warning': return 'text-yellow-400 border-yellow-400';
      case 'info': return 'text-blue-400 border-blue-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      {showSummary && (
        <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-green-400">{passed.length} Passed</span>
            </div>
            
            {errors.length > 0 && (
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-red-400">{errors.length} Errors</span>
              </div>
            )}
            
            {warnings.length > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <span className="text-yellow-400">{warnings.length} Warnings</span>
              </div>
            )}
            
            {infos.length > 0 && (
              <div className="flex items-center gap-1">
                <Info className="h-4 w-4 text-blue-400" />
                <span className="text-blue-400">{infos.length} Info</span>
              </div>
            )}
          </div>

          <div className="ml-auto">
            <Badge 
              variant={errors.length > 0 ? 'destructive' : warnings.length > 0 ? 'secondary' : 'default'}
              className="text-xs"
            >
              {errors.length > 0 ? 'Issues Found' : 'Validation Passed'}
            </Badge>
          </div>
        </div>
      )}

      {/* Detailed Results */}
      <div className="space-y-3">
        {/* Errors first */}
        {errors.map(({ rule, result }) => (
          <Alert key={rule.id} className="border-red-500 bg-red-500/10">
            <div className="flex items-start gap-3">
              {getIcon(rule.severity, result.valid)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-red-300">{rule.name}</h4>
                  <Badge variant="outline" className={getSeverityColor(rule.severity)}>
                    {rule.severity}
                  </Badge>
                </div>
                <AlertDescription className="text-red-200">
                  {result.message}
                </AlertDescription>
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-red-300 mb-1">Suggestions:</p>
                    <ul className="text-xs text-red-200 space-y-1">
                      {result.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </Alert>
        ))}

        {/* Then warnings */}
        {warnings.map(({ rule, result }) => (
          <Alert key={rule.id} className="border-yellow-500 bg-yellow-500/10">
            <div className="flex items-start gap-3">
              {getIcon(rule.severity, result.valid)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-yellow-300">{rule.name}</h4>
                  <Badge variant="outline" className={getSeverityColor(rule.severity)}>
                    {rule.severity}
                  </Badge>
                </div>
                <AlertDescription className="text-yellow-200">
                  {result.message}
                </AlertDescription>
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-yellow-300 mb-1">Suggestions:</p>
                    <ul className="text-xs text-yellow-200 space-y-1">
                      {result.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </Alert>
        ))}

        {/* Then info messages */}
        {infos.map(({ rule, result }) => (
          <Alert key={rule.id} className="border-blue-500 bg-blue-500/10">
            <div className="flex items-start gap-3">
              {getIcon(rule.severity, result.valid)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-blue-300">{rule.name}</h4>
                  <Badge variant="outline" className={getSeverityColor(rule.severity)}>
                    {rule.severity}
                  </Badge>
                </div>
                <AlertDescription className="text-blue-200">
                  {result.message}
                </AlertDescription>
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-blue-300 mb-1">Suggestions:</p>
                    <ul className="text-xs text-blue-200 space-y-1">
                      {result.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </Alert>
        ))}
      </div>
    </div>
  );
}

// Export validation utilities for use in other components
export { DEFAULT_VALIDATION_RULES };
export type { ValidationRule, ValidationResult };
